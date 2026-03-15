import { relations } from 'drizzle-orm';
import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

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
	createdAt: timestamp('created_at').defaultNow().notNull(),
	deletedAt: timestamp('deleted_at')
});

export const folderRelations = relations(folder, ({ one, many }) => ({
	user: one(user),
	screenshots: many(screenshot)
}));

export const screenshotRelations = relations(screenshot, ({ one }) => ({
	user: one(user),
	folder: one(folder)
}));

export * from './auth.schema';
