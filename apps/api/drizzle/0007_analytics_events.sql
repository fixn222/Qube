CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" text,
	"duration_ms" integer,
	"status_code" integer,
	"success" boolean,
	"operation" text,
	"resource" text,
	"query_fingerprint" text,
	"error_code" text
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_project_time_idx" ON "analytics_events" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_project_type_time_idx" ON "analytics_events" USING btree ("project_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_project_fingerprint_time_idx" ON "analytics_events" USING btree ("project_id","query_fingerprint","occurred_at");