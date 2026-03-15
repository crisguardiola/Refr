import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot, folder } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
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

	const screenshots = await db
		.select()
		.from(screenshot)
		.where(and(eq(screenshot.userId, session.user.id), eq(screenshot.folderId, folderId)))
		.orderBy(desc(screenshot.createdAt));

	return { folder: folderRow, screenshots };
};

export const actions: Actions = {
	uploadScreenshot: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in to upload' };
		}

		const folderId = parseInt(event.params.folderId, 10);
		if (Number.isNaN(folderId)) {
			return { success: false, error: 'Invalid folder' };
		}

		const [folderRow] = await db
			.select()
			.from(folder)
			.where(and(eq(folder.id, folderId), eq(folder.userId, session.user.id)))
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

		if (!file || file.size === 0) {
			return { success: false, error: 'Please select an image to upload' };
		}

		if (!IMAGE_TYPES.includes(file.type)) {
			return { success: false, error: 'Please upload an image (PNG, JPEG, WebP, or GIF)' };
		}

		try {
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

			await db.insert(screenshot).values({
				userId: session.user.id,
				folderId,
				url: result.secure_url,
				fileName: file.name,
				note
			});

			return { success: true };
		} catch (err) {
			console.error('Upload error:', err);
			const message = err instanceof Error ? err.message : String(err);
			return { success: false, error: `Upload failed: ${message}` };
		}
	}
};
