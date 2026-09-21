ALTER TABLE "storage_buckets" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;
