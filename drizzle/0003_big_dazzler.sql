ALTER TABLE "epi_ficha" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "epi_ficha" ADD COLUMN "employeeName" varchar(255);--> statement-breakpoint
ALTER TABLE "epi_ficha" ADD COLUMN "obraId" integer;