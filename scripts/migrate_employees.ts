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
    console.log("Fetching epi_ficha records without employeeId...");
    const records = await sql`
      SELECT id, "employeeName", "companyId", "obraId" 
      FROM epi_ficha 
      WHERE "employeeId" IS NULL AND "employeeName" IS NOT NULL
    `;

    console.log(`Found ${records.length} records to migrate.`);

    for (const record of records) {
      const { id, employeeName, companyId, obraId } = record;
      
      console.log(`Processing: ${employeeName} (Ficha #${id})`);

      // 1. Find or create employee
      let employeeId;
      const existing = await sql`
        SELECT id FROM employees 
        WHERE "companyId" = ${companyId} AND "name" = ${employeeName}
        LIMIT 1
      `;

      if (existing.length > 0) {
        employeeId = existing[0].id;
      } else {
        const [newEmp] = await sql`
          INSERT INTO employees ("companyId", "name", "obraId", "createdAt", "updatedAt")
          VALUES (${companyId}, ${employeeName}, ${obraId}, NOW(), NOW())
          RETURNING id
        `;
        employeeId = newEmp.id;
      }

      // 2. Update epi_ficha
      await sql`
        UPDATE epi_ficha 
        SET "employeeId" = ${employeeId} 
        WHERE id = ${id}
      `;
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

run();
