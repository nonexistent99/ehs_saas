ALTER TABLE "advertencias" ADD COLUMN "obraId" integer;--> statement-breakpoint
ALTER TABLE "advertencias" ADD COLUMN "employeeId" integer;--> statement-breakpoint
ALTER TABLE "advertencias" ADD CONSTRAINT "advertencias_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertencias" ADD CONSTRAINT "advertencias_obraId_obras_id_fk" FOREIGN KEY ("obraId") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertencias" ADD CONSTRAINT "advertencias_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertencias" ADD CONSTRAINT "advertencias_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;