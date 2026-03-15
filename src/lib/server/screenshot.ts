import { db } from '$lib/server/db';
import { folder, screenshotTag, tag } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

type ScreenshotRow = {
	id: number;
	folderId: number | null;
	userId: string;
	url: string;
	fileName: string;
	note: string | null;
	createdAt: Date;
	deletedAt: Date | null;
};

export async function enrichScreenshotsWithFolderAndTags(
	screenshots: ScreenshotRow[]
): Promise<(ScreenshotRow & { folder: { id: number; name: string } | null; tags: { id: number; dimension: string; label: string; sortOrder: number }[] })[]> {
	if (screenshots.length === 0) return [];
	const ids = screenshots.map((s) => s.id);
	const folderIds = [...new Set(screenshots.map((s) => s.folderId).filter(Boolean))] as number[];
	const [folders, links] = await Promise.all([
		folderIds.length
			? db.select().from(folder).where(inArray(folder.id, folderIds))
			: Promise.resolve([]),
		db.select().from(screenshotTag).where(inArray(screenshotTag.screenshotId, ids))
	]);
	const tagIds = [...new Set(links.map((l) => l.tagId))];
	const tags = tagIds.length ? await db.select().from(tag).where(inArray(tag.id, tagIds)) : [];
	const folderMap = Object.fromEntries(folders.map((f) => [f.id, f]));
	const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));
	const linksByScreenshot: Record<number, { tagId: number }[]> = {};
	for (const l of links) {
		if (!linksByScreenshot[l.screenshotId]) linksByScreenshot[l.screenshotId] = [];
		linksByScreenshot[l.screenshotId].push(l);
	}
	return screenshots.map((s) => {
		const f = s.folderId ? folderMap[s.folderId] : null;
		return {
			...s,
			folder: f ? { id: f.id, name: f.name } : null,
			tags: (linksByScreenshot[s.id] ?? []).map((l) => tagMap[l.tagId]).filter(Boolean)
		};
	});
}
