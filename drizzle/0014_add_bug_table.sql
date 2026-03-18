CREATE TABLE IF NOT EXISTS "bug" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"note" text NOT NULL,
	"reporter_name" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug" ADD CONSTRAINT "bug_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
