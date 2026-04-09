import 'dotenv/config';
import postgres from 'postgres';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log("Checking if obraId exists in employees...");
    const check = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'obraId'
    `;

    if (check.length === 0) {
      console.log("Adding obraId to employees...");
      await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "obraId" integer;`;
      console.log("Adding foreign key constraint...");
      await sql`
        ALTER TABLE "employees" 
        ADD CONSTRAINT "employees_obraId_obras_id_fk" 
        FOREIGN KEY ("obraId") REFERENCES "obras"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `;
      console.log("Success!");
    } else {
      console.log("Column already exists.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
