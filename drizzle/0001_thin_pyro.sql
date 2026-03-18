ALTER TABLE "checklist_execution_items" ADD COLUMN "mediaUrls" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "checklist_executions" ADD COLUMN "signatureUrl" text;--> statement-breakpoint
ALTER TABLE "checklist_executions" ADD COLUMN "score" numeric(5, 2);