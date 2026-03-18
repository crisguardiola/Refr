import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { flow } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export type FlowData = {
	nodes: { id: number; x: number; y: number; width: number; height: number }[];
	arrows: { from: number; to: number }[];
	freeArrows?: { fromX: number; fromY: number; toX: number; toY: number }[];
	canvasMarkup?: { strokes?: unknown[] };
};

export const PUT: RequestHandler = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const id = parseInt(event.params.id, 10);
	if (Number.isNaN(id)) {
		return json({ success: false, error: 'Invalid flow id' }, { status: 400 });
	}

	let flowData: FlowData;
	try {
		const body = await event.request.json();
		flowData = body?.flowData;
		if (!flowData || !Array.isArray(flowData?.nodes) || !Array.isArray(flowData?.arrows)) {
			throw new Error('Invalid flow data');
		}
	} catch {
		return json({ success: false, error: 'Invalid flow data format' }, { status: 400 });
	}

	const [updated] = await db
		.update(flow)
		.set({ flowData })
		.where(and(eq(flow.id, id), eq(flow.userId, session.user.id)))
		.returning({ id: flow.id });

	if (!updated) {
		return json({ success: false, error: 'Flow not found' }, { status: 404 });
	}

	return json({ success: true });
};
