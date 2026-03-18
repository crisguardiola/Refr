/** Data type used for drag-and-drop of screenshots between folders */
export const SCREENSHOT_DRAG_TYPE = 'application/x-refr-screenshot';

/** Data type used for drag-and-drop to reorder folders */
export const FOLDER_DRAG_TYPE = 'application/x-refr-folder';

export type ScreenshotDragData = {
	screenshotId: number;
	tagIds: number[];
};

/**
 * Moves a screenshot to a folder (or uncategorised/trash).
 * @param screenshotId - The screenshot ID to move
 * @param target - 'uncategorised' | 'trash' | number (folder id)
 * @param tagIds - Current tag IDs to preserve when moving to a folder
 * @returns true if successful
 */
export async function moveScreenshot(
	screenshotId: number,
	target: 'uncategorised' | 'trash' | number,
	tagIds: number[] = []
): Promise<boolean> {
	try {
		if (target === 'trash') {
			const formData = new FormData();
			formData.append('id', String(screenshotId));
			const res = await fetch('/app?/moveToTrash', { method: 'POST', body: formData });
			const data = await res.json();
			return data?.success === true;
		}

		const formData = new FormData();
		formData.append('id', String(screenshotId));
		formData.append('folderId', target === 'uncategorised' ? '' : String(target));
		formData.append('tags', tagIds.join(','));
		const res = await fetch('/app/screenshot/update', { method: 'POST', body: formData });
		const data = await res.json();
		return data?.success === true;
	} catch {
		return false;
	}
}

/**
 * Reorders folders by their IDs. The order of ids in the array is the new order.
 */
export async function reorderFolders(folderIds: number[]): Promise<boolean> {
	try {
		const formData = new FormData();
		formData.append('ids', folderIds.join(','));
		const res = await fetch('/app?/reorderFolders', { method: 'POST', body: formData });
		const text = await res.text();
		let parsed: unknown = null;
		try { parsed = JSON.parse(text); } catch { /* ignore */ }
		// SvelteKit form action returns { type, status, data } where data may be stringified
		const wrapper = parsed as { type?: string; data?: unknown } | null;
		let data: { success?: boolean | number } | null = null;
		if (typeof wrapper?.data === 'string') {
			try { data = JSON.parse(wrapper.data) as { success?: boolean | number }; } catch { /* ignore */ }
		} else {
			data = wrapper?.data as { success?: boolean | number } | null;
		}
		// Handle array format [result, ...] from SvelteKit
		if (Array.isArray(data)) data = (data[0] as { success?: boolean | number }) ?? null;
		return data?.success === true || data?.success === 1;
	} catch {
		return false;
	}
}
