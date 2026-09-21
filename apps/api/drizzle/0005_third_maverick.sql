DO $$ BEGIN
 CREATE TYPE "public"."bucket_access" AS ENUM('public', 'private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"bucket_id" uuid,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"ut_key" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_buckets" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"access" "bucket_access" DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "storage_buckets" ADD CONSTRAINT "storage_buckets_id_pk" PRIMARY KEY("id");
--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_bucket_id_storage_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."storage_buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_buckets" ADD CONSTRAINT "storage_buckets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
