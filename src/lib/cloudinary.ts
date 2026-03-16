/**
 * Cloudinary URL optimization presets.
 * f_auto = best format (WebP/AVIF when supported)
 * q_auto = automatic quality optimization
 */
const PRESETS = {
	/** Thumbnail for masonry grid (~400px) */
	thumbnail: 'w_400,c_fill,f_auto,q_auto',
	/** Full-size for detail view (max 1200px) */
	detail: 'w_1200,f_auto,q_auto',
	/** Sidebar preview (~400px) */
	sidebar: 'w_400,c_fill,f_auto,q_auto',
	/** Fullscreen view (max 1920px) */
	fullscreen: 'w_1920,f_auto,q_auto'
} as const;

/**
 * Returns an optimized Cloudinary URL with the given transformation preset.
 * Non-Cloudinary URLs (e.g. legacy /uploads/...) are returned unchanged.
 */
export function cloudinaryUrl(url: string, preset: keyof typeof PRESETS): string {
	if (!url.includes('res.cloudinary.com')) return url;
	const transforms = PRESETS[preset];
	return url.replace('/upload/', `/upload/${transforms}/`);
}
