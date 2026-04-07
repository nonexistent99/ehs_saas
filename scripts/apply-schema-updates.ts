import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function applyUpdates() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    return;
  }

  console.log("1. Creating 'risks' table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "risks" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "category" varchar(100),
        "nr" varchar(50),
        "isActive" boolean DEFAULT true NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Table 'risks' created or already exists.");
  } catch (error) {
    console.error("Error creating 'risks' table:", error);
  }

  console.log("2. Updating 'checklist_execution_items' labels...");
  try {
    const updateOk = await db.execute(sql`
      UPDATE "checklist_execution_items" SET "status" = 'Conforme' WHERE "status" = 'OK';
    `);
    const updateNotOk = await db.execute(sql`
      UPDATE "checklist_execution_items" SET "status" = 'Não Conforme' WHERE "status" = 'NÃO OK';
    `);
    console.log("Labels updated in checklist_execution_items.");
  } catch (error) {
    console.error("Error updating labels:", error);
  }

  console.log("3. Seeding NR24 risks...");
  try {
    const nr24Riscos = [
      { name: "Instalações Sanitárias Inadequadas", category: "Sanitário", nr: "NR-24" },
      { name: "Falta de Água Potável", category: "Sanitário", nr: "NR-24" },
      { name: "Condições de Alojamento Precárias", category: "Conforto", nr: "NR-24" },
      { name: "Local para Refeições Inadequado", category: "Conforto", nr: "NR-24" },
      { name: "Falta de Armários/Vestiários", category: "Conforto", nr: "NR-24" },
    ];

    for (const r of nr24Riscos) {
      await db.execute(sql`
        INSERT INTO "risks" ("name", "category", "nr")
        VALUES (${r.name}, ${r.category}, ${r.nr})
        ON CONFLICT DO NOTHING;
      `);
    }
    console.log("NR24 risks seeded.");
  } catch (error) {
    console.error("Error seeding risks:", error);
  }

  process.exit(0);
}

applyUpdates();
