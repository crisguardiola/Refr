-- Add sort_order to folder for user-defined ordering
ALTER TABLE "folder" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;

-- Backfill: set sort_order from created_at order per user
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM "folder"
)
UPDATE "folder" SET sort_order = r.rn FROM ranked r WHERE "folder".id = r.id;
