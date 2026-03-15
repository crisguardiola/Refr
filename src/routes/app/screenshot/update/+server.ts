import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot, folder, screenshotTag } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		return json({ success: false, error: 'You must be logged in' }, { status: 401 });
	}

	const formData = await event.request.formData();
	const idRaw = formData.get('id');
	const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
	if (Number.isNaN(id)) {
		return json({ success: false, error: 'Invalid screenshot' }, { status: 400 });
	}

	const [existing] = await db
		.select()
		.from(screenshot)
		.where(and(eq(screenshot.id, id), eq(screenshot.userId, session.user.id)))
		.limit(1);
	if (!existing) {
		return json({ success: false, error: 'Screenshot not found' }, { status: 404 });
	}

	const folderIdRaw = formData.get('folderId');
	let folderId: number | null = null;
	if (typeof folderIdRaw === 'string' && folderIdRaw.trim()) {
		const parsed = parseInt(folderIdRaw, 10);
		if (!Number.isNaN(parsed)) {
			const [folderRow] = await db
				.select()
				.from(folder)
				.where(and(eq(folder.id, parsed), eq(folder.userId, session.user.id)))
				.limit(1);
			if (folderRow) folderId = parsed;
		}
	}

	const tagsRaw = formData.get('tags');
	let tagIds: number[] = [];
	if (typeof tagsRaw === 'string' && tagsRaw.trim()) {
		tagIds = tagsRaw
			.split(',')
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n));
	}

	const noteRaw = formData.get('note');
	const noteProvided = formData.has('note');
	const note = noteProvided && typeof noteRaw === 'string' ? noteRaw.trim() || null : undefined;

	const fileNameRaw = formData.get('fileName');
	const fileNameProvided = formData.has('fileName');
	const fileName = fileNameProvided && typeof fileNameRaw === 'string' && fileNameRaw.trim() ? fileNameRaw.trim() : undefined;

	const ratingRaw = formData.get('rating');
	const ratingProvided = formData.has('rating');
	let rating: number | null | undefined = undefined;
	if (ratingProvided && typeof ratingRaw === 'string') {
		if (ratingRaw.trim() === '') {
			rating = null;
		} else {
			const parsed = parseInt(ratingRaw, 10);
			if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
				rating = parsed;
			}
		}
	}

	const updateData: Record<string, unknown> = { folderId };
	if (note !== undefined) updateData.note = note;
	if (fileName !== undefined) updateData.fileName = fileName;
	if (rating !== undefined) updateData.rating = rating;

	await db.update(screenshot).set(updateData).where(eq(screenshot.id, id));

	await db.delete(screenshotTag).where(eq(screenshotTag.screenshotId, id));
	if (tagIds.length > 0) {
		await db.insert(screenshotTag).values(
			tagIds.map((tagId) => ({ screenshotId: id, tagId }))
		);
	}

	return json({ success: true });
};
