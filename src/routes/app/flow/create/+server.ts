import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { flow, folder } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export type FlowNode = { id: number; x: number; y: number; width: number; height: number };
export type FlowArrow = { from: number; to: number };
export type FlowFreeArrow = { fromX: number; fromY: number; toX: number; toY: number };
export type FlowData = {
	nodes: FlowNode[];
	arrows: FlowArrow[];
	freeArrows?: FlowFreeArrow[];
	canvasMarkup?: { strokes?: { points: { x: number; y: number }[]; color?: string; width?: number }[] };
};

export const POST: RequestHandler = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		return json({ success: false, error: 'You must be logged in' }, { status: 401 });
	}

	const formData = await event.request.formData();
	const flowDataRaw = formData.get('flowData');
	const folderIdRaw = formData.get('folderId');
	const nameRaw = formData.get('name');

	if (typeof flowDataRaw !== 'string' || !flowDataRaw.trim()) {
		return json({ success: false, error: 'Invalid flow data' }, { status: 400 });
	}

	let flowData: FlowData;
	try {
		flowData = JSON.parse(flowDataRaw) as FlowData;
		if (!Array.isArray(flowData?.nodes) || !Array.isArray(flowData?.arrows)) {
			throw new Error('Invalid structure');
		}
		if (flowData.freeArrows != null && !Array.isArray(flowData.freeArrows)) {
			throw new Error('Invalid freeArrows');
		}
	} catch {
		return json({ success: false, error: 'Invalid flow data format' }, { status: 400 });
	}

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

	const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;

	const [inserted] = await db
		.insert(flow)
		.values({
			userId: session.user.id,
			folderId,
			name,
			flowData
		})
		.returning({ id: flow.id });

	return json({ success: true, id: inserted?.id });
};
