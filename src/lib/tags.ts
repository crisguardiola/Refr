/**
 * Predefined tags for UI Elements and color dimensions.
 * UI Elements from PLANNING.md documentation.
 */

export type TagDimension = 'ui_type' | 'color';

export type TagDefinition = {
	id: number;
	dimension: TagDimension;
	label: string;
	sortOrder: number;
};

/** UI Elements from PLANNING.md (Control, View, Overlay, Imagery) */
export const UI_ELEMENT_LABELS = [
	'Accordion',
	'Button',
	'Checkbox',
	'Color Picker',
	'Date Picker',
	'Floating Action Button',
	'Radio Button',
	'Rating Control',
	'Search Bar',
	'Segmented Control',
	'Slider',
	'Stepper',
	'Switch',
	'Tab',
	'Text Field',
	'Tile',
	'Time Picker',
	'Badge',
	'Banner',
	'Card',
	'Carousel',
	'Chip',
	'Divider',
	'Gallery',
	'Loading Indicator',
	'Map Pin',
	'Progress Indicator',
	'Side Navigation',
	'Skeleton',
	'Stacked List',
	'Status Dot',
	'Tab Bar',
	'Table',
	'Toolbar',
	'Top Navigation Bar',
	'Action Sheet',
	'Bottom Sheet',
	'Coach Marks',
	'Dialog',
	'Drawer',
	'Dropdown Menu',
	'Full-Screen Overlay',
	'Toast',
	'Tooltip',
	'Avatar',
	'Icon',
	'Illustration',
	'Logo',
	'Photo'
] as const;

/** Predefined labels per dimension */
export const PREDEFINED_TAG_LABELS: Record<TagDimension, readonly string[]> = {
	ui_type: UI_ELEMENT_LABELS,
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
	]
};
