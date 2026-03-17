import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot } from '$lib/server/db/schema';
import { enrichScreenshotsWithFolderAndTags } from '$lib/server/screenshot';
import { eq, desc, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) return redirect(302, '/demo/better-auth/login');

	const rows = await db
		.select()
		.from(screenshot)
		.where(
			and(
				eq(screenshot.userId, session.user.id),
				eq(screenshot.favourite, true),
				isNull(screenshot.deletedAt)
			)
		)
		.orderBy(desc(screenshot.createdAt));

	const screenshots = await enrichScreenshotsWithFolderAndTags(rows);
	return { screenshots };
};
