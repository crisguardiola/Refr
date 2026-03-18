import { relations } from 'drizzle-orm';
import { pgTable, serial, integer, text, timestamp, primaryKey, boolean, jsonb } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const tagDimensionEnum = pgEnum('tag_dimension', ['ui_type', 'color', 'pattern', 'screen']);

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const folder = pgTable('folder', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const screenshot = pgTable('screenshot', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	folderId: integer('folder_id').references(() => folder.id, { onDelete: 'set null' }),
	url: text('url').notNull(),
	fileName: text('file_name').notNull(),
	note: text('note'),
	favourite: boolean('favourite').default(false),
	annotationData: jsonb('annotation_data'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	deletedAt: timestamp('deleted_at')
});

export const tag = pgTable('tag', {
	id: serial('id').primaryKey(),
	dimension: tagDimensionEnum('dimension').notNull(),
	label: text('label').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

export const flow = pgTable('flow', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	folderId: integer('folder_id').references(() => folder.id, { onDelete: 'set null' }),
	name: text('name'),
	flowData: jsonb('flow_data').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const screenshotTag = pgTable(
	'screenshot_tag',
	{
		screenshotId: integer('screenshot_id')
			.notNull()
			.references(() => screenshot.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.screenshotId, t.tagId] })]
);

export const folderRelations = relations(folder, ({ one, many }) => ({
	user: one(user),
	screenshots: many(screenshot),
	flows: many(flow)
}));

export const flowRelations = relations(flow, ({ one }) => ({
	user: one(user),
	folder: one(folder)
}));

export const screenshotRelations = relations(screenshot, ({ one, many }) => ({
	user: one(user),
	folder: one(folder),
	tags: many(screenshotTag)
}));

export const tagRelations = relations(tag, ({ many }) => ({
	screenshots: many(screenshotTag)
}));

export const screenshotTagRelations = relations(screenshotTag, ({ one }) => ({
	screenshot: one(screenshot),
	tag: one(tag)
}));

export * from './auth.schema';
