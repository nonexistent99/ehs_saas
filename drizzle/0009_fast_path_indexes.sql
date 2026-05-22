CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_active_idx" ON "users" ("isActive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_users_user_idx" ON "company_users" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_users_company_idx" ON "company_users" ("companyId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "obra_users_user_idx" ON "obra_users" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "obra_users_obra_idx" ON "obra_users" ("obraId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_active_name_idx" ON "companies" ("isActive", "name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "obras_company_active_idx" ON "obras" ("companyId", "isActive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspections_company_status_created_idx" ON "inspections" ("companyId", "status", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspections_status_created_idx" ON "inspections" ("status", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_items_inspection_idx" ON "inspection_items" ("inspectionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspection_nrs_inspection_idx" ON "inspection_nrs" ("inspectionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_status_created_idx" ON "notifications" ("recipientUserId", "status", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checklist_templates_company_active_idx" ON "checklist_templates" ("companyId", "isActive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checklist_template_items_template_idx" ON "checklist_template_items" ("templateId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checklist_executions_company_status_date_idx" ON "checklist_executions" ("companyId", "status", "date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checklist_execution_items_execution_idx" ON "checklist_execution_items" ("executionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tact_drive_documents_company_expiry_idx" ON "tact_drive_documents" ("companyId", "hasExpiry", "expiryDate");
