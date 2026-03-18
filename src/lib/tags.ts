/**
 * Predefined tags for UI Elements and color dimensions.
 * UI Elements from PLANNING.md documentation.
 */

export type TagDimension = 'ui_type' | 'color' | 'screen';

export type TagDefinition = {
	id: number;
	dimension: TagDimension;
	label: string;
	sortOrder: number;
};

/** UI Elements from PLANNING.md lines 69-72 only: Control, View, Overlay, Imagery */
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

/** Screens from PLANNING.md */
export const SCREEN_LABELS = [
	'Audio Player', 'Audio & Video Recorder', 'Browser', 'Calendar', 'Call', 'Camera & Scanner',
	'Chat Bot', 'Date & Time', 'Dynamic Island', 'Filters & Stickers', 'Live Activities',
	'Location & Address', 'Map', 'Media Editor', 'Reminder', 'Timeline & History', 'Timer & Clock',
	'Video Player', 'Widgets', 'Confetti', 'Dark Mode', 'Misc', 'Article Detail', 'Augmented Reality',
	'Browse & Discover', 'Class & Lesson Detail', 'Emails & Messages', 'Event Detail', 'Goal & Task',
	'Home', 'News Feed', 'Note Detail', 'Other Content', 'Post Detail', 'Product Detail', 'Quiz',
	'Recipe Detail', 'Song & Podcast Detail', 'Stories', 'TV Show & Movie Detail', 'Add & Create',
	'Ban & Block', 'Cancel', 'Delete', 'Draw & Annotate', 'Edit', 'Favorite & Pin', 'Filter & Sort',
	'Flag & Report', 'Follow & Subscribe', 'Invite & Refer Friends', 'Like & Upvote', 'Move',
	'Other Action', 'Reorder', 'Save', 'Search', 'Select', 'Set', 'Schedule', 'Share',
	'Transfer & Send Money', 'Upload & Download', 'Charts', 'Dashboard', 'Progress',
	'Bookmarks & Collections', 'Downloads & Available Offline', 'Playlists', 'Trash & Archive',
	'About', 'Acknowledgement & Success', 'Action Option', 'Confirmation', 'Empty State', 'Error',
	'Feature Info', 'Feedback', 'Help & Support', 'Loading', 'Permission', 'Privacy Policy',
	'Pull to Refresh', 'Billing', 'Cart & Bag', 'Checkout', 'Order Confirmation', 'Order Detail',
	'Order History', 'Payment Method', 'Pricing', 'Promotions & Rewards', 'Shop & Storefront',
	'Subscription & Paywall', 'Suggestions & Similar Items', 'Terms & Conditions', 'Wallet & Balance',
	'Achievements & Awards', 'Chat Detail', 'Comments', 'Followers & Following', 'Groups & Community',
	'Invite Teammates', 'Leaderboard', 'Notifications', 'Reviews & Ratings', 'Social Feed',
	'User / Group Profile', 'Account Setup', 'Guided Tour & Tutorial', 'Splash Screen', 'Signup',
	'Verification', 'Welcome & Get Started', 'Delete & Deactivate Account', 'Forgot Password',
	'Login', 'My Account & Profile', 'Settings & Preferences'
] as const;

/** UI Element sections from PLANNING.md */
export const UI_ELEMENT_SECTIONS: Record<string, string[]> = {
	Control: [
		'Accordion', 'Button', 'Checkbox', 'Color Picker', 'Date Picker', 'Floating Action Button',
		'Radio Button', 'Rating Control', 'Search Bar', 'Segmented Control', 'Slider', 'Stepper',
		'Switch', 'Tab', 'Text Field', 'Tile', 'Time Picker'
	],
	View: [
		'Badge', 'Banner', 'Card', 'Carousel', 'Chip', 'Divider', 'Gallery', 'Loading Indicator',
		'Map Pin', 'Progress Indicator', 'Side Navigation', 'Skeleton', 'Stacked List', 'Status Dot',
		'Tab Bar', 'Table', 'Toolbar', 'Top Navigation Bar'
	],
	Overlay: [
		'Action Sheet', 'Bottom Sheet', 'Coach Marks', 'Dialog', 'Drawer', 'Dropdown Menu',
		'Full-Screen Overlay', 'Toast', 'Tooltip'
	],
	Imagery: ['Avatar', 'Icon', 'Illustration', 'Logo', 'Photo']
};

/** Screen sections from PLANNING.md */
export const SCREEN_SECTIONS: Record<string, string[]> = {
	Utility: [
		'Audio Player', 'Audio & Video Recorder', 'Browser', 'Calendar', 'Call', 'Camera & Scanner',
		'Chat Bot', 'Date & Time', 'Dynamic Island', 'Filters & Stickers', 'Live Activities',
		'Location & Address', 'Map', 'Media Editor', 'Reminder', 'Timeline & History', 'Timer & Clock',
		'Video Player', 'Widgets'
	],
	Misc: ['Confetti', 'Dark Mode', 'Misc'],
	Content: [
		'Article Detail', 'Augmented Reality', 'Browse & Discover', 'Class & Lesson Detail',
		'Emails & Messages', 'Event Detail', 'Goal & Task', 'Home', 'News Feed', 'Note Detail',
		'Other Content', 'Post Detail', 'Product Detail', 'Quiz', 'Recipe Detail', 'Song & Podcast Detail',
		'Stories', 'TV Show & Movie Detail'
	],
	Actions: [
		'Add & Create', 'Ban & Block', 'Cancel', 'Delete', 'Draw & Annotate', 'Edit', 'Favorite & Pin',
		'Filter & Sort', 'Flag & Report', 'Follow & Subscribe', 'Invite & Refer Friends', 'Like & Upvote',
		'Move', 'Other Action', 'Reorder', 'Save', 'Search', 'Select', 'Set', 'Schedule', 'Share',
		'Transfer & Send Money', 'Upload & Download'
	],
	Data: ['Charts', 'Dashboard', 'Progress'],
	'User Collections': [
		'Bookmarks & Collections', 'Downloads & Available Offline', 'Playlists', 'Trash & Archive'
	],
	Communication: [
		'About', 'Acknowledgement & Success', 'Action Option', 'Confirmation', 'Empty State', 'Error',
		'Feature Info', 'Feedback', 'Help & Support', 'Loading', 'Permission', 'Privacy Policy',
		'Pull to Refresh'
	],
	'Commerce & Finance': [
		'Billing', 'Cart & Bag', 'Checkout', 'Order Confirmation', 'Order Detail', 'Order History',
		'Payment Method', 'Pricing', 'Promotions & Rewards', 'Shop & Storefront', 'Subscription & Paywall',
		'Suggestions & Similar Items', 'Terms & Conditions', 'Wallet & Balance'
	],
	Social: [
		'Achievements & Awards', 'Chat Detail', 'Comments', 'Followers & Following', 'Groups & Community',
		'Invite Teammates', 'Leaderboard', 'Notifications', 'Reviews & Ratings', 'Social Feed',
		'User / Group Profile'
	],
	'New User Experience': [
		'Account Setup', 'Guided Tour & Tutorial', 'Splash Screen', 'Signup', 'Verification',
		'Welcome & Get Started'
	],
	'Account Management': [
		'Delete & Deactivate Account', 'Forgot Password', 'Login', 'My Account & Profile',
		'Settings & Preferences'
	]
};

/** Get section for a UI element or screen label */
export function getSectionForLabel(
	dimension: 'ui_type' | 'screen',
	label: string
): string | null {
	const sections = dimension === 'ui_type' ? UI_ELEMENT_SECTIONS : SCREEN_SECTIONS;
	for (const [section, labels] of Object.entries(sections)) {
		if (labels.includes(label)) return section;
	}
	return null;
}

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
	],
	screen: SCREEN_LABELS
};
