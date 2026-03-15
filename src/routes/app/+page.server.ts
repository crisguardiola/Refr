import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) return { screenshots: [] };

	const screenshots = await db
		.select()
		.from(screenshot)
		.where(eq(screenshot.userId, session.user.id))
		.orderBy(desc(screenshot.createdAt));

	return { screenshots };
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		return redirect(302, '/demo/better-auth/login');
	},

	uploadScreenshot: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in to upload' };
		}

		const formData = await event.request.formData();
		const file = formData.get('screenshot') as File | null;

		if (!file || file.size === 0) {
			return { success: false, error: 'Please select an image to upload' };
		}

		if (!IMAGE_TYPES.includes(file.type)) {
			return { success: false, error: 'Please upload an image (PNG, JPEG, WebP, or GIF)' };
		}

		try {
			const ext = path.extname(file.name) || '.png';
			const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
			const uploadsDir = path.join(process.cwd(), 'static', 'uploads');
			await mkdir(uploadsDir, { recursive: true });
			const filePath = path.join(uploadsDir, uniqueName);
			const buffer = Buffer.from(await file.arrayBuffer());
			await writeFile(filePath, buffer);

			const url = `/uploads/${uniqueName}`;

			await db.insert(screenshot).values({
				userId: session.user.id,
				url,
				fileName: file.name
			});

			return { success: true };
		} catch (err) {
			console.error('Upload error:', err);
			return { success: false, error: 'Failed to save screenshot. Try again.' };
		}
	}
};
