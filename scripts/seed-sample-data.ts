import "dotenv/config";
import { getDb } from "../server/db";
import {
  companies,
  obras,
  users,
  inspections,
  inspectionItems,
  notifications,
  nrs,
} from "../drizzle/schema";
import * as bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq, isNull } from "drizzle-orm";

async function seedSampleData() {
  console.log("🚀 Starting sample data seeding...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Failed to connect to DB");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Ensure NRs are present (needed for inspections)
  console.log("📋 Ensuring NRs are present...");
  const existingNrs = await db.select().from(nrs).limit(5);
  if (existingNrs.length === 0) {
    console.warn("⚠️ No NRs found. Please run seed-nrs.ts first for better results.");
  }

  // 2. Sample Companies
  console.log("🏢 Seeding companies...");
  const sampleCompanies = [
    { name: "ConstruTech Engenharia S.A.", cnpj: "12.345.678/0001-90", city: "São Paulo", state: "SP" },
    { name: "Energia Vital Soluções", cnpj: "98.765.432/0001-21", city: "Rio de Janeiro", state: "RJ" },
    { name: "Logística Global Log", cnpj: "45.678.901/0001-34", city: "Curitiba", state: "PR" },
  ];

  const insertedCompanies = [];
  for (const c of sampleCompanies) {
    const [existing] = await db.select().from(companies).where(eq(companies.name, c.name)).limit(1);
    if (!existing) {
      const [inserted] = await db.insert(companies).values({ ...c, isActive: true }).returning();
      insertedCompanies.push(inserted);
      console.log(`  ✓ Created company: ${c.name}`);
    } else {
      insertedCompanies.push(existing);
    }
  }

  // 3. Sample Obras
  console.log("🏗️ Seeding obras...");
  const insertedObras = [];
  for (const comp of insertedCompanies) {
    const obraData = {
      companyId: comp.id,
      name: `Canteiro ${comp.name.split(" ")[0]} - Unidade A`,
      address: `Rua das Flores, ${Math.floor(Math.random() * 1000)}`,
      city: comp.city,
      state: comp.state,
      isActive: true,
    };
    const [existing] = await db.select().from(obras).where(eq(obras.name, obraData.name)).limit(1);
    if (!existing) {
      const [inserted] = await db.insert(obras).values(obraData).returning();
      insertedObras.push(inserted);
      console.log(`  ✓ Created obra: ${obraData.name}`);
    } else {
      insertedObras.push(existing);
    }
  }

  // 4. Sample Users (linked to companies)
  console.log("👥 Seeding users...");
  const sampleUsers = [
    { name: "Carlos Técnico", email: "tecnico@construtech.com", role: "user", ehsRole: "tecnico" as const },
    { name: "Ana Apoio", email: "apoio@energia.com", role: "user", ehsRole: "apoio" as const },
    { name: "Roberto Cliente", email: "gestor@logistica.com", role: "user", ehsRole: "cliente" as const },
  ];

  for (let i = 0; i < sampleUsers.length; i++) {
    const u = sampleUsers[i];
    const [existing] = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
    if (!existing) {
      await db.insert(users).values({
        openId: `ehs_${nanoid(16)}`,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role as any,
        ehsRole: u.ehsRole,
        loginMethod: "email",
        isActive: true,
      });
      console.log(`  ✓ Created user: ${u.name}`);
    }
  }

  // 5. Sample Inspections
  console.log("📝 Seeding inspections...");
  const admin = await db.select().from(users).where(eq(users.email, "admin@ehs.com")).limit(1);
  const adminId = admin[0]?.id || 1;

  const statuses = ["nao_iniciada", "pendente", "atencao", "resolvida"] as const;
  
  for (let i = 0; i < 8; i++) {
    const comp = insertedCompanies[i % insertedCompanies.length];
    const obra = insertedObras[i % insertedObras.length];
    const status = statuses[i % statuses.length];
    
    const inspTitle = `Inspeção Mensal de Segurança - ${i + 1}`;
    const [existing] = await db.select().from(inspections).where(eq(inspections.title, inspTitle)).limit(1);
    
    if (!existing) {
      const [insp] = await db.insert(inspections).values({
        companyId: comp.id,
        obraId: obra.id,
        title: inspTitle,
        description: "Inspeção de rotina para verificação de conformidade com as NRs.",
        status: status,
        inspectedById: adminId,
        inspectedAt: new Date(),
      }).returning();

      // Add 2 items for each inspection
      await db.insert(inspectionItems).values([
        {
          inspectionId: insp.id,
          title: "Uso de EPIs na periferia",
          situacao: status === "resolvida" ? "Todos os colaboradores utilizando cinto e capacete." : "Encontrado colaborador sem protetor auricular.",
          status: status === "resolvida" ? "resolvido" : "pendente",
          order: 1,
        },
        {
          inspectionId: insp.id,
          title: "Proteção Coletiva (Telas)",
          situacao: "Telas de proteção com pequenos furos na face norte.",
          status: "atencao",
          order: 2,
        }
      ]);
      console.log(`  ✓ Created inspection: ${inspTitle}`);
    }
  }

  // 6. Notifications
  console.log("🔔 Seeding notifications...");
  for (const comp of insertedCompanies) {
    await db.insert(notifications).values({
      type: "system",
      title: "Boas-vindas à EHS SaaS",
      message: `A configuração do seu ambiente ${comp.name} foi concluída com sucesso.`,
      recipientCompanyId: comp.id,
      status: "sent",
      sentAt: new Date(),
    });
  }

  console.log("✅ Sample data seeding complete!");
  process.exit(0);
}

seedSampleData().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
