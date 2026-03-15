import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot, folder, screenshotTag } from '$lib/server/db/schema';
import { enrichScreenshotsWithFolderAndTags } from '$lib/server/screenshot';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { v2 as cloudinary } from 'cloudinary';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

function getCloudinaryConfig(): { cloud_name: string; api_key: string; api_secret: string } | null {
	const url = env.CLOUDINARY_URL ?? process.env.CLOUDINARY_URL;
	if (url) {
		const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
		if (match) {
			return {
				cloud_name: match[3].trim(),
				api_key: match[1].trim(),
				api_secret: match[2].trim()
			};
		}
	}
	if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
		return {
			cloud_name: env.CLOUDINARY_CLOUD_NAME,
			api_key: env.CLOUDINARY_API_KEY,
			api_secret: env.CLOUDINARY_API_SECRET
		};
	}
	return null;
}

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) return redirect(302, '/demo/better-auth/login');

	const folderId = parseInt(event.params.folderId, 10);
	if (Number.isNaN(folderId)) return redirect(302, '/app');

	const [folderRow] = await db
		.select()
		.from(folder)
		.where(and(eq(folder.id, folderId), eq(folder.userId, session.user.id)))
		.limit(1);

	if (!folderRow) return redirect(302, '/app');

	const rows = await db
		.select()
		.from(screenshot)
		.where(
			and(
				eq(screenshot.userId, session.user.id),
				eq(screenshot.folderId, folderId),
				isNull(screenshot.deletedAt)
			)
		)
		.orderBy(desc(screenshot.createdAt));

	const screenshots = await enrichScreenshotsWithFolderAndTags(rows);
	return { folder: folderRow, screenshots };
};

export const actions: Actions = {
	uploadScreenshot: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in to upload' };
		}

		const paramFolderId = parseInt(event.params.folderId, 10);
		if (Number.isNaN(paramFolderId)) {
			return { success: false, error: 'Invalid folder' };
		}

		const [folderRow] = await db
			.select()
			.from(folder)
			.where(and(eq(folder.id, paramFolderId), eq(folder.userId, session.user.id)))
			.limit(1);
		if (!folderRow) {
			return { success: false, error: 'Folder not found' };
		}

		const cloudinaryConfig = getCloudinaryConfig();
		if (!cloudinaryConfig) {
			return { success: false, error: 'Cloudinary not configured. Add CLOUDINARY_URL to .env' };
		}

		cloudinary.config(cloudinaryConfig);

		const formData = await event.request.formData();
		const file = formData.get('screenshot') as File | null;
		const noteRaw = formData.get('note');
		const note = typeof noteRaw === 'string' ? noteRaw.trim() || null : null;
		const folderIdRaw = formData.get('folderId');
		const newFolderNameRaw = formData.get('newFolderName');
		const tagsRaw = formData.get('tags');

		let folderId: number | null = null;
		if (typeof folderIdRaw === 'string' && folderIdRaw.trim()) {
			const parsed = parseInt(folderIdRaw, 10);
			if (!Number.isNaN(parsed)) folderId = parsed;
		}

		const newFolderName =
			typeof newFolderNameRaw === 'string' ? newFolderNameRaw.trim() || null : null;

		let tagIds: number[] = [];
		if (typeof tagsRaw === 'string' && tagsRaw.trim()) {
			tagIds = tagsRaw
				.split(',')
				.map((s) => parseInt(s.trim(), 10))
				.filter((n) => !Number.isNaN(n));
		}

		if (!file || file.size === 0) {
			return { success: false, error: 'Please select an image to upload' };
		}

		if (!IMAGE_TYPES.includes(file.type)) {
			return { success: false, error: 'Please upload an image (PNG, JPEG, WebP, or GIF)' };
		}

		try {
			if (newFolderName) {
				const [created] = await db
					.insert(folder)
					.values({ userId: session.user.id, name: newFolderName })
					.returning({ id: folder.id });
				if (created) folderId = created.id;
			} else if (folderId !== null) {
				const [folderCheck] = await db
					.select()
					.from(folder)
					.where(and(eq(folder.id, folderId), eq(folder.userId, session.user.id)))
					.limit(1);
				if (!folderCheck) {
					return { success: false, error: 'Folder not found' };
				}
			}

			const buffer = Buffer.from(await file.arrayBuffer());

			const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{
							folder: 'refr/screenshots',
							resource_type: 'image'
						},
						(error, result) => (error ? reject(error) : resolve(result!))
					)
					.end(buffer);
			});

			const [inserted] = await db
				.insert(screenshot)
				.values({
					userId: session.user.id,
					folderId,
					url: result.secure_url,
					fileName: file.name,
					note
				})
				.returning({ id: screenshot.id });

			if (inserted && tagIds.length > 0) {
				await db.insert(screenshotTag).values(
					tagIds.map((tagId) => ({
						screenshotId: inserted.id,
						tagId
					}))
				);
			}

			return { success: true };
		} catch (err) {
			console.error('Upload error:', err);
			const message = err instanceof Error ? err.message : String(err);
			return { success: false, error: `Upload failed: ${message}` };
		}
	}
};
