import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { bug, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
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
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/demo/better-auth/login');
	}

	const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
	const userEmail = user.email?.trim().toLowerCase();
	const isAdmin = !!adminEmail && !!userEmail && userEmail === adminEmail;
	if (adminEmail && !isAdmin) {
		redirect(302, '/app');
	}

	const bugs = adminEmail
		? await db
				.select({
					id: bug.id,
					note: bug.note,
					reporterName: bug.reporterName,
					imageUrl: bug.imageUrl,
					createdAt: bug.createdAt,
					reporterEmail: user.email
				})
				.from(bug)
				.leftJoin(user, eq(bug.userId, user.id))
				.orderBy(desc(bug.createdAt))
		: await db
				.select()
				.from(bug)
				.where(eq(bug.userId, user.id))
				.orderBy(desc(bug.createdAt));

	return { bugs, isAdmin: !!adminEmail };
};

export const actions: Actions = {
	report: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in to report a bug' };
		}

		const formData = await event.request.formData();
		const noteRaw = formData.get('note');
		const note = typeof noteRaw === 'string' ? noteRaw.trim() : '';
		const reporterNameRaw = formData.get('reporterName');
		const reporterName =
			typeof reporterNameRaw === 'string' && reporterNameRaw.trim()
				? reporterNameRaw.trim()
				: null;
		const file = formData.get('image') as File | null;

		if (!note) {
			return { success: false, error: 'Note is required' };
		}

		let imageUrl: string | null = null;

		if (file && file.size > 0) {
			if (!IMAGE_TYPES.includes(file.type)) {
				return { success: false, error: 'Please upload an image (PNG, JPEG, WebP, or GIF)' };
			}

			const cloudinaryConfig = getCloudinaryConfig();
			if (!cloudinaryConfig) {
				return { success: false, error: 'Cloudinary not configured. Add CLOUDINARY_URL to .env' };
			}

			cloudinary.config(cloudinaryConfig);

			try {
				const buffer = Buffer.from(await file.arrayBuffer());
				const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
					cloudinary.uploader
						.upload_stream(
							{
								folder: 'refr/bugs',
								resource_type: 'image'
							},
							(error, result) => (error ? reject(error) : resolve(result!))
						)
						.end(buffer);
				});
				imageUrl = result.secure_url;
			} catch (err) {
				console.error('Bug image upload error:', err);
				const message =
					err instanceof Error ? err.message : String(err);
				return { success: false, error: `Image upload failed: ${message}` };
			}
		}

		try {
			await db.insert(bug).values({
				userId: session.user.id,
				note,
				reporterName,
				imageUrl
			});
			return { success: true };
		} catch (err) {
			console.error('Bug report error:', err);
			const message =
				err instanceof Error ? err.message : String(err);
			return { success: false, error: `Failed to save bug report: ${message}` };
		}
	},

	deleteBug: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in' };
		}

		const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
		if (!adminEmail || session.user.email?.toLowerCase() !== adminEmail) {
			return { success: false, error: 'Only admins can delete bugs' };
		}

		const formData = await event.request.formData();
		const bugIdRaw = formData.get('bugId');
		const bugId = typeof bugIdRaw === 'string' ? parseInt(bugIdRaw, 10) : NaN;
		if (Number.isNaN(bugId)) {
			return { success: false, error: 'Invalid bug' };
		}

		await db.delete(bug).where(eq(bug.id, bugId));
		return { success: true };
	}
};
