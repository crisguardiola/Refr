import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { folder, screenshot, screenshotTag, tag } from '$lib/server/db/schema';
import { eq, asc, and, isNull, isNotNull, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/demo/better-auth/login');
	}
	const userId = event.locals.user.id;

	const [folders, tags, countAll, countUncategorised, countFavourites, countTrash, tagCountRows] = await Promise.all([
		db.select().from(folder).where(eq(folder.userId, userId)).orderBy(asc(folder.sortOrder), asc(folder.createdAt)),
		db.select().from(tag).orderBy(asc(tag.dimension), asc(tag.sortOrder)),
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
			and(eq(screenshot.userId, userId), eq(screenshot.favourite, true), isNull(screenshot.deletedAt))
		),
		db.$count(
			screenshot,
			and(eq(screenshot.userId, userId), isNotNull(screenshot.deletedAt))
		),
		db
			.select({
				tagId: screenshotTag.tagId,
				count: sql<number>`cast(count(${screenshotTag.screenshotId}) as int)`
			})
			.from(screenshotTag)
			.innerJoin(screenshot, eq(screenshotTag.screenshotId, screenshot.id))
			.where(and(eq(screenshot.userId, userId), isNull(screenshot.deletedAt)))
			.groupBy(screenshotTag.tagId)
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

	const tagCounts = Object.fromEntries(
		tagCountRows.map((r) => [r.tagId, r.count])
	) as Record<number, number>;

	const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
	const canViewBugs =
		!adminEmail || (event.locals.user?.email?.toLowerCase() === adminEmail);

	return {
		user: event.locals.user,
		folders: foldersWithCount,
		tags,
		tagCounts,
		counts: { all: countAll, uncategorised: countUncategorised, favourites: countFavourites, trash: countTrash },
		canViewBugs
	};
};
