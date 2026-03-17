-- Replace rating with favourite: add favourite column, migrate existing ratings, drop rating
ALTER TABLE "screenshot" ADD COLUMN "favourite" boolean DEFAULT false;
UPDATE "screenshot" SET "favourite" = true WHERE "rating" IS NOT NULL;
ALTER TABLE "screenshot" DROP COLUMN "rating";
