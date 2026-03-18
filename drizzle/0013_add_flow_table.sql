CREATE TABLE "flow" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" integer,
	"name" text,
	"flow_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE set null ON UPDATE no action;
