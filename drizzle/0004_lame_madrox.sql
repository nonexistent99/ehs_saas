CREATE TABLE "obra_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"obraId" integer NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pgr_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"pgrId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"stageId" integer NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(50) DEFAULT 'media',
	"probability" varchar(50) DEFAULT 'media',
	"mitigation" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"stageId" integer,
	"pgrId" integer,
	"name" varchar(255) NOT NULL,
	"cnpj" varchar(50),
	"activity" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advertencias" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "advertencias" ADD COLUMN "employeeName" varchar(255);--> statement-breakpoint
ALTER TABLE "apr" ADD COLUMN "signatureUrl" text;--> statement-breakpoint
ALTER TABLE "checklist_template_items" ADD COLUMN "referenceImgUrl" text;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD COLUMN "type" varchar(50) DEFAULT 'estatico' NOT NULL;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD COLUMN "isFavorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phones" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "emails" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "contractSignedAt" date;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "contractValue" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "obras" ADD COLUMN "phones" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "obras" ADD COLUMN "emails" json DEFAULT '[]'::json;