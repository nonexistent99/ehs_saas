import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('Update advertencias table schema...');
  
  try {
    // Add obraId column
    await sql`ALTER TABLE advertencias ADD COLUMN IF NOT EXISTS "obraId" integer;`;
    console.log('Added obraId column to advertencias table');
    
    // Add employeeId column
    await sql`ALTER TABLE advertencias ADD COLUMN IF NOT EXISTS "employeeId" integer;`;
    console.log('Added employeeId column to advertencias table');
    
    // Add foreign key constraints
    try {
      await sql`ALTER TABLE advertencias ADD CONSTRAINT "advertencias_obraId_obras_id_fk" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`;
      console.log('Added foreign key for obraId');
    } catch (e) {
      console.log('Foreign key for obraId might already exist or failed:', (e as any).message);
    }

    try {
      await sql`ALTER TABLE advertencias ADD CONSTRAINT "advertencias_employeeId_employees_id_fk" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`;
      console.log('Added foreign key for employeeId');
    } catch (e) {
      console.log('Foreign key for employeeId might already exist or failed:', (e as any).message);
    }

    console.log('Schema update completed successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await sql.end();
  }
}

main();
