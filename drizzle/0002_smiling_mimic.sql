CREATE TABLE "tact_drive_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"folderId" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"fileUrl" text,
	"fileName" varchar(255),
	"fileType" varchar(100),
	"hasExpiry" boolean DEFAULT false NOT NULL,
	"expiryDate" date,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tact_drive_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(30) DEFAULT 'blue',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginMethod" varchar(64);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ehsRole" varchar(50) DEFAULT 'tecnico';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255);
