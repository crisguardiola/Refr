import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { screenshot, screenshotTag } from '$lib/server/db/schema';
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

	const [inserted] = await db
		.insert(screenshot)
		.values({
			userId: session.user.id,
			folderId: existing.folderId,
			url: existing.url,
			fileName: existing.fileName,
			note: existing.note,
			favourite: existing.favourite,
			annotationData: existing.annotationData
		})
		.returning({ id: screenshot.id });

	if (!inserted) {
		return json({ success: false, error: 'Failed to duplicate' }, { status: 500 });
	}

	const [tags] = await db
		.select({ tagId: screenshotTag.tagId })
		.from(screenshotTag)
		.where(eq(screenshotTag.screenshotId, id));
	if (tags.length > 0) {
		await db.insert(screenshotTag).values(
			tags.map((t) => ({ screenshotId: inserted.id, tagId: t.tagId }))
		);
	}

	return json({ success: true, id: inserted.id });
};
