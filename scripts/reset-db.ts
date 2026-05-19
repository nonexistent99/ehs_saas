/**
 * reset-db.ts
 * -----------
 * Limpa o banco de dados de dados operacionais (usuários, empresas, obras,
 * inspeções, etc.) preservando APENAS:
 *   - O usuário administrador principal (email: admin@ehs.com)
 *   - As NRs de referência do sistema
 *
 * Uso:
 *   npx tsx scripts/reset-db.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const ADMIN_EMAIL = "admin@ehs.com";

async function resetDb() {
  console.log("🔌 Conectando ao banco de dados...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Falha ao conectar ao banco de dados.");
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // 1. Ensure obra_users table exists (may be missing in some deploys)
  // ------------------------------------------------------------------
  console.log("\n📋 Garantindo existência da tabela obra_users...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "obra_users" (
        "id"        serial PRIMARY KEY NOT NULL,
        "obraId"    integer NOT NULL,
        "userId"    integer NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("   ✅ obra_users OK");
  } catch (err) {
    console.warn("   ⚠️  obra_users:", (err as any)?.message);
  }

  // ------------------------------------------------------------------
  // 2. Preserve admin user id
  // ------------------------------------------------------------------
  console.log("\n🔍 Buscando usuário administrador principal...");
  const adminRows = await db.execute(
    sql`SELECT "id" FROM "users" WHERE "email" = ${ADMIN_EMAIL} LIMIT 1`
  );
  const adminRow = (adminRows as any).rows?.[0] ?? (adminRows as any)[0];
  if (!adminRow) {
    console.error(`❌ Usuário ${ADMIN_EMAIL} não encontrado. Abortando para não apagar tudo.`);
    process.exit(1);
  }
  const adminId: number = adminRow.id;
  console.log(`   ✅ Admin encontrado — id: ${adminId}`);

  // ------------------------------------------------------------------
  // 3. Delete operational data in dependency order
  // ------------------------------------------------------------------
  console.log("\n🗑️  Apagando dados operacionais...");

  const steps: [string, string][] = [
    ["chat_messages",              `DELETE FROM "chat_messages"`],
    ["notifications",              `DELETE FROM "notifications"`],
    ["checklist_execution_items",  `DELETE FROM "checklist_execution_items"`],
    ["checklist_executions",       `DELETE FROM "checklist_executions"`],
    ["checklist_template_items",   `DELETE FROM "checklist_template_items"`],
    ["checklist_templates",        `DELETE FROM "checklist_templates"`],
    ["inspection_nrs",             `DELETE FROM "inspection_nrs"`],
    ["inspection_items",           `DELETE FROM "inspection_items"`],
    ["inspections",                `DELETE FROM "inspections"`],
    ["pgr_stages",                 `DELETE FROM "pgr_stages"`],
    ["pgr",                        `DELETE FROM "pgr"`],
    ["risk_matrix",                `DELETE FROM "risk_matrix"`],
    ["apr",                        `DELETE FROM "apr"`],
    ["pt",                         `DELETE FROM "pt"`],
    ["its",                        `DELETE FROM "its"`],
    ["epi_ficha",                  `DELETE FROM "epi_ficha"`],
    ["advertencias",               `DELETE FROM "advertencias"`],
    ["training_participants",      `DELETE FROM "training_participants"`],
    ["trainings",                  `DELETE FROM "trainings"`],
    ["tactdriver",                 `DELETE FROM "tactdriver"`],
    ["tact_drive_documents",      `DELETE FROM "tact_drive_documents"`],
    ["tact_drive_folders",         `DELETE FROM "tact_drive_folders"`],
    ["check_list_items",           `DELETE FROM "check_list_items"`],
    ["check_lists",                `DELETE FROM "check_lists"`],
    ["subcontractors",             `DELETE FROM "subcontractors"`],
    ["employees",                  `DELETE FROM "employees"`],
    ["contracts",                  `DELETE FROM "contracts"`],
    ["obra_users",                 `DELETE FROM "obra_users"`],
    ["company_users",              `DELETE FROM "company_users"`],
    ["obras",                      `DELETE FROM "obras"`],
    ["companies",                  `DELETE FROM "companies"`],
    // Delete all users except admin
    ["users (non-admin)",          `DELETE FROM "users" WHERE "id" != ${adminId}`],
  ];

  for (const [label, query] of steps) {
    try {
      await db.execute(sql.raw(query));
      console.log(`   ✅ ${label}`);
    } catch (err) {
      // Non-fatal: table may not exist in this deployment
      console.warn(`   ⚠️  ${label}: ${(err as any)?.message?.split("\n")[0]}`);
    }
  }

  // ------------------------------------------------------------------
  // 4. Reset sequences so IDs start from 1 again (optional)
  // ------------------------------------------------------------------
  console.log("\n🔄 Reiniciando sequências de IDs...");
  const sequences = [
    "companies_id_seq", "obras_id_seq", "inspections_id_seq",
    "inspection_items_id_seq", "checklist_executions_id_seq",
    "checklist_execution_items_id_seq", "trainings_id_seq",
    "employees_id_seq", "pgr_id_seq",
  ];
  for (const seq of sequences) {
    try {
      await db.execute(sql.raw(`ALTER SEQUENCE "${seq}" RESTART WITH 1`));
      console.log(`   ✅ ${seq}`);
    } catch {
      // Sequence may not exist — skip silently
    }
  }

  // ------------------------------------------------------------------
  // 5. Final summary
  // ------------------------------------------------------------------
  console.log("\n✅ Reset concluído com sucesso!");
  console.log(`   Usuário admin preservado: ${ADMIN_EMAIL} (id: ${adminId})`);
  console.log("   Todos os dados operacionais foram removidos.");
  console.log("   NRs de referência do sistema foram mantidas.\n");
  process.exit(0);
}

resetDb().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
