import 'dotenv/config';
import postgres from 'postgres';

async function checkConstraints() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    const results = await sql`
      SELECT
          conname AS constraint_name,
          pg_get_constraintdef(c.oid) AS constraint_definition
      FROM
          pg_constraint c
      JOIN
          pg_class t ON t.oid = c.conrelid
      WHERE
          t.relname = 'checklist_execution_items';
    `;
    console.log('Constraints:', results);
    
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'checklist_execution_items' AND column_name = 'status';
    `;
    console.log('Column info:', columns);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

checkConstraints();
