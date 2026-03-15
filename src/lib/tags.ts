/**
 * Predefined tags for UI type, color, and pattern dimensions.
 * Used for tag selectors in upload sheet and sidebar.
 */

export type TagDimension = 'ui_type' | 'color' | 'pattern';

export type TagDefinition = {
	id: number;
	dimension: TagDimension;
	label: string;
	sortOrder: number;
};

/** Predefined labels per dimension (used when seeding tags) */
export const PREDEFINED_TAG_LABELS: Record<TagDimension, string[]> = {
	ui_type: [
		'Button',
		'Card',
		'Form',
		'Input',
		'Modal',
		'Navigation',
		'Header',
		'Hero',
		'List',
		'Grid'
	],
	color: [
		'Red',
		'Orange',
		'Yellow',
		'Green',
		'Blue',
		'Purple',
		'Pink',
		'Neutral',
		'Dark',
		'Light'
	],
	pattern: [
		'Card layout',
		'List',
		'Grid',
		'Masonry',
		'Split screen',
		'Full bleed',
		'Centered'
	]
};
