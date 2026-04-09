import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const postgresClient = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("Applying database fixes...");
  
  try {
    await postgresClient.begin(async (sql) => {
      // Create employees table
      await sql`
        CREATE TABLE IF NOT EXISTS "employees" (
          "id" serial PRIMARY KEY NOT NULL,
          "companyId" integer NOT NULL REFERENCES "companies"("id"),
          "name" varchar(255) NOT NULL,
          "createdAt" timestamp DEFAULT now() NOT NULL,
          "updatedAt" timestamp DEFAULT now() NOT NULL
        )
      `;
      console.log("Table 'employees' checked/created.");

      // Add employeeId to epi_ficha
      await sql`
        ALTER TABLE "epi_ficha" ADD COLUMN IF NOT EXISTS "employeeId" integer
      `;
      console.log("Column 'employeeId' added to 'epi_ficha' if not exists.");

      // Add foreign key
      await sql`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'epi_ficha_employeeId_employees_id_fk'
            ) THEN
                ALTER TABLE "epi_ficha" ADD CONSTRAINT "epi_ficha_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "employees"("id");
            END IF;
        END $$
      `;
      console.log("Foreign key constraint checked/added.");

      // DATA MIGRATION: Populate employees from existing epi_ficha records
      const existingFichas = await sql`
        SELECT DISTINCT "companyId", "employeeName" 
        FROM "epi_ficha" 
        WHERE "employeeId" IS NULL AND "employeeName" IS NOT NULL
      `;
      
      if (existingFichas.length > 0) {
        console.log(`Migrating ${existingFichas.length} existing employee records...`);
        for (const ficha of existingFichas) {
          // Find or create employee
          const [employee] = await sql`
            INSERT INTO "employees" ("companyId", "name")
            VALUES (${ficha.companyId}, ${ficha.employeeName})
            ON CONFLICT DO NOTHING
            RETURNING "id"
          `;
          
          let employeeId = employee?.id;
          
          if (!employeeId) {
            const [existing] = await sql`
              SELECT "id" FROM "employees" 
              WHERE "companyId" = ${ficha.companyId} AND "name" = ${ficha.employeeName}
            `;
            employeeId = existing?.id;
          }
          
          if (employeeId) {
            await sql`
              UPDATE "epi_ficha" 
              SET "employeeId" = ${employeeId}
              WHERE "companyId" = ${ficha.companyId} AND "employeeName" = ${ficha.employeeName} AND "employeeId" IS NULL
            `;
          }
        }
        console.log("Data migration completed.");
      } else {
        console.log("No existing employee data to migrate.");
      }
    });
    
    console.log("Database fixes applied successfully!");
  } catch (error) {
    console.error("Error applying database fixes:", error);
  } finally {
    await postgresClient.end();
  }
}

main();
