CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "epi_ficha" ADD COLUMN "employeeId" integer;--> statement-breakpoint
ALTER TABLE "epi_ficha" ADD COLUMN "responsibleId" integer;--> statement-breakpoint
ALTER TABLE "pgr_stages" ADD COLUMN "subcontractorInfo" json DEFAULT '{"isSubcontracted":false,"teams":[]}'::json;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epi_ficha" ADD CONSTRAINT "epi_ficha_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epi_ficha" ADD CONSTRAINT "epi_ficha_responsibleId_users_id_fk" FOREIGN KEY ("responsibleId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;