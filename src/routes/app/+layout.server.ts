import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { folder, screenshot } from '$lib/server/db/schema';
import { eq, asc, and, isNull, isNotNull } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/demo/better-auth/login');
	}
	const userId = event.locals.user.id;

	const [folders, countAll, countUncategorised, countTrash] = await Promise.all([
		db.select().from(folder).where(eq(folder.userId, userId)).orderBy(asc(folder.createdAt)),
		db.$count(
			screenshot,
			and(eq(screenshot.userId, userId), isNull(screenshot.deletedAt))
		),
		db.$count(
			screenshot,
			and(
				eq(screenshot.userId, userId),
				isNull(screenshot.folderId),
				isNull(screenshot.deletedAt)
			)
		),
		db.$count(
			screenshot,
			and(eq(screenshot.userId, userId), isNotNull(screenshot.deletedAt))
		)
	]);

	const foldersWithCount = await Promise.all(
		folders.map(async (f) => ({
			...f,
			count: await db.$count(
				screenshot,
				and(
					eq(screenshot.userId, userId),
					eq(screenshot.folderId, f.id),
					isNull(screenshot.deletedAt)
				)
			)
		}))
	);

	return {
		user: event.locals.user,
		folders: foldersWithCount,
		counts: { all: countAll, uncategorised: countUncategorised, trash: countTrash }
	};
};
