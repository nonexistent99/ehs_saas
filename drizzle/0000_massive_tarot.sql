CREATE TABLE "advertencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"userId" integer NOT NULL,
	"type" varchar(50) DEFAULT 'escrita' NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"witnessId" integer,
	"signatureUrl" text,
	"fileUrl" text,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apr" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"obraId" integer,
	"title" varchar(255) NOT NULL,
	"activity" varchar(255),
	"location" varchar(255),
	"date" date,
	"status" varchar(50) DEFAULT 'aberta' NOT NULL,
	"responsibleId" integer,
	"content" json DEFAULT '{}'::json,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspectionId" integer,
	"senderId" integer NOT NULL,
	"recipientId" integer,
	"companyId" integer,
	"message" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkListId" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"examplePhotoUrl" text,
	"isRequired" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"nrId" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdById" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_execution_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"executionId" integer NOT NULL,
	"itemId" integer NOT NULL,
	"status" varchar(20),
	"observation" text
);
--> statement-breakpoint
CREATE TABLE "checklist_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"projectId" integer,
	"templateId" integer NOT NULL,
	"date" date NOT NULL,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"norma" varchar(100),
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"frequencyType" varchar(50) DEFAULT 'dias' NOT NULL,
	"frequencyValue" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"cnpj" varchar(50),
	"cep" varchar(20),
	"address" text,
	"neighborhood" varchar(255),
	"city" varchar(255),
	"state" varchar(50),
	"phone" varchar(50),
	"email" varchar(320),
	"logoUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"userId" integer NOT NULL,
	"cargo" varchar(50) DEFAULT 'equipe_tecnica',
	"isNotificationRecipient" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"contractNumber" varchar(100),
	"signedAt" date,
	"description" text,
	"fileUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epi_ficha" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"userId" integer NOT NULL,
	"epiName" varchar(255) NOT NULL,
	"ca" varchar(50),
	"quantity" integer DEFAULT 1,
	"deliveredAt" date,
	"validUntil" date,
	"reason" text,
	"signatureUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspectionId" integer NOT NULL,
	"checkListItemId" integer,
	"nrId" integer,
	"title" varchar(255),
	"situacao" text,
	"planoAcao" text,
	"observacoes" text,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"resolvedAt" timestamp,
	"mediaUrls" json DEFAULT '[]'::json,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_nrs" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspectionId" integer NOT NULL,
	"nrId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"obraId" integer,
	"checkListId" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'nao_iniciada' NOT NULL,
	"inspectedById" integer NOT NULL,
	"inspectedAt" timestamp,
	"watermark" varchar(255),
	"usesPreviousReport" boolean DEFAULT false,
	"previousInspectionId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "its" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"obraId" integer,
	"code" varchar(50),
	"title" varchar(255) NOT NULL,
	"description" text,
	"content" text,
	"status" varchar(50) DEFAULT 'ativo' NOT NULL,
	"createdById" integer NOT NULL,
	"fileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) DEFAULT 'system' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"recipientUserId" integer,
	"recipientCompanyId" integer,
	"sentAt" timestamp,
	"readAt" timestamp,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nrs" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"cep" varchar(9),
	"city" varchar(100),
	"state" varchar(2),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pgr" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"obraId" integer,
	"title" varchar(255) NOT NULL,
	"version" varchar(20) DEFAULT '1.0',
	"status" varchar(50) DEFAULT 'em_elaboracao' NOT NULL,
	"validFrom" date,
	"validUntil" date,
	"responsibleId" integer,
	"content" text,
	"fileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pt" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"obraId" integer,
	"code" varchar(50),
	"title" varchar(255) NOT NULL,
	"description" text,
	"content" text,
	"status" varchar(50) DEFAULT 'ativo' NOT NULL,
	"createdById" integer NOT NULL,
	"fileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportId" integer NOT NULL,
	"schemaVersion" varchar(50) DEFAULT '1.0' NOT NULL,
	"payload" json DEFAULT '{}'::json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportId" integer NOT NULL,
	"section" varchar(255) NOT NULL,
	"imageUrl" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"obraId" integer,
	"type" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportId" integer NOT NULL,
	"role" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"signatureUrl" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tactdriver" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"driverName" varchar(255) NOT NULL,
	"vehiclePlate" varchar(20),
	"vehicleModel" varchar(100),
	"date" date NOT NULL,
	"score" numeric(5, 2),
	"incidents" json DEFAULT '[]'::json,
	"notes" text,
	"status" varchar(50) DEFAULT 'aprovado' NOT NULL,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainingId" integer NOT NULL,
	"userId" integer NOT NULL,
	"attended" boolean DEFAULT false,
	"signatureUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"nrId" integer,
	"description" text,
	"instructor" varchar(255),
	"trainingDate" date,
	"validityMonths" integer DEFAULT 12,
	"location" varchar(255),
	"status" varchar(50) DEFAULT 'agendado' NOT NULL,
	"fileUrl" text,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"ehsRole" varchar(50) DEFAULT 'tecnico',
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"avatarUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"passwordHash" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
