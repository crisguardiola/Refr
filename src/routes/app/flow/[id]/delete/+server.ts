import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { flow } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const DELETE: RequestHandler = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const id = parseInt(event.params.id, 10);
	if (Number.isNaN(id)) {
		return json({ success: false, error: 'Invalid flow id' }, { status: 400 });
	}

	const [deleted] = await db
		.delete(flow)
		.where(and(eq(flow.id, id), eq(flow.userId, session.user.id)))
		.returning({ id: flow.id });

	if (!deleted) {
		return json({ success: false, error: 'Flow not found' }, { status: 404 });
	}

	return json({ success: true });
};
