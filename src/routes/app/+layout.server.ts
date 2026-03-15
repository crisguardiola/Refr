import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { folder } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/demo/better-auth/login');
	}
	const folders = await db
		.select()
		.from(folder)
		.where(eq(folder.userId, event.locals.user.id))
		.orderBy(asc(folder.createdAt));
	return { user: event.locals.user, folders };
};
