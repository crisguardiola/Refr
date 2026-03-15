import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot } from '$lib/server/db/schema';
import { enrichScreenshotsWithFolderAndTags } from '$lib/server/screenshot';
import { eq, desc, and, isNotNull } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) return redirect(302, '/demo/better-auth/login');

	const rows = await db
		.select()
		.from(screenshot)
		.where(and(eq(screenshot.userId, session.user.id), isNotNull(screenshot.deletedAt)))
		.orderBy(desc(screenshot.deletedAt));

	const screenshots = await enrichScreenshotsWithFolderAndTags(rows);
	return { screenshots };
};

export const actions: Actions = {
	restore: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in to restore' };
		}

		const formData = await event.request.formData();
		const idRaw = formData.get('id');
		const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
		if (Number.isNaN(id)) {
			return { success: false, error: 'Invalid screenshot' };
		}

		await db
			.update(screenshot)
			.set({ deletedAt: null })
			.where(and(eq(screenshot.id, id), eq(screenshot.userId, session.user.id)));

		return { success: true };
	},

	permanentDelete: async (event) => {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (!session?.user) {
			return { success: false, error: 'You must be logged in to delete' };
		}

		const formData = await event.request.formData();
		const idRaw = formData.get('id');
		const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
		if (Number.isNaN(id)) {
			return { success: false, error: 'Invalid screenshot' };
		}

		await db
			.delete(screenshot)
			.where(and(eq(screenshot.id, id), eq(screenshot.userId, session.user.id)));

		return { success: true };
	}
};
