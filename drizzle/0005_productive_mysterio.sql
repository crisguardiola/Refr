CREATE TYPE "public"."tag_dimension" AS ENUM('ui_type', 'color', 'pattern');--> statement-breakpoint
CREATE TABLE "screenshot_tag" (
	"screenshot_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "screenshot_tag_screenshot_id_tag_id_pk" PRIMARY KEY("screenshot_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"dimension" "tag_dimension" NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screenshot_tag" ADD CONSTRAINT "screenshot_tag_screenshot_id_screenshot_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenshot_tag" ADD CONSTRAINT "screenshot_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;