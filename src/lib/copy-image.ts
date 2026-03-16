/**
 * Copies an image from a URL to the clipboard.
 * Uses the Clipboard API with fetch to get the image blob.
 * @param imageUrl - Full URL of the image (e.g. Cloudinary URL)
 * @returns true if successful, false otherwise
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
	try {
		const response = await fetch(imageUrl, { mode: 'cors' });
		if (!response.ok) return false;
		const blob = await response.blob();
		// Clipboard API typically supports image/png; convert if needed for broader support
		const type = blob.type.startsWith('image/') ? blob.type : 'image/png';
		await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
		return true;
	} catch {
		return false;
	}
}
