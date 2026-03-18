import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { flow, screenshot } from '$lib/server/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const id = parseInt(event.params.id, 10);
	if (Number.isNaN(id)) {
		return json({ success: false, error: 'Invalid flow id' }, { status: 400 });
	}

	const [row] = await db
		.select()
		.from(flow)
		.where(and(eq(flow.id, id), eq(flow.userId, session.user.id)))
		.limit(1);

	if (!row) {
		return json({ success: false, error: 'Flow not found' }, { status: 404 });
	}

	const data = row.flowData as { nodes?: { id: number }[] };
	const nodeIds = (data?.nodes ?? []).map((n) => n.id);
	const screenshots =
		nodeIds.length > 0
			? await db
					.select({ id: screenshot.id, url: screenshot.url, fileName: screenshot.fileName })
					.from(screenshot)
					.where(
						and(
							eq(screenshot.userId, session.user.id),
							inArray(screenshot.id, nodeIds),
							isNull(screenshot.deletedAt)
						)
					)
			: [];

	const orderedScreenshots = nodeIds
		.map((nid) => screenshots.find((s) => s.id === nid))
		.filter((s): s is (typeof screenshots)[0] => s != null);

	return json({
		success: true,
		flow: {
			id: row.id,
			folderId: row.folderId,
			name: row.name,
			flowData: row.flowData,
			createdAt: row.createdAt
		},
		screenshots: orderedScreenshots
	});
};
