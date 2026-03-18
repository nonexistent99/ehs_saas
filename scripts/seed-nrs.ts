import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { nrs } from "../drizzle/schema";
import { isNull } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// Brazilian Regulatory Standards — NR 1 to NR 38
const GLOBAL_NRS = [
  { code: "NR-1", name: "Disposições Gerais e Gerenciamento de Riscos", category: "Geral" },
  { code: "NR-2", name: "Inspeção Prévia (Revogada)", category: "Geral" },
  { code: "NR-3", name: "Embargo ou Interdição", category: "Fiscalização" },
  { code: "NR-4", name: "Serviços Especializados em Eng. de Segurança e em Med. do Trabalho", category: "SESMT" },
  { code: "NR-5", name: "Comissão Interna de Prevenção de Acidentes", category: "CIPA" },
  { code: "NR-6", name: "Equipamento de Proteção Individual", category: "EPI" },
  { code: "NR-7", name: "Programa de Controle Médico de Saúde Ocupacional", category: "PCMSO" },
  { code: "NR-8", name: "Edificações", category: "Construção" },
  { code: "NR-9", name: "Avaliação e Controle das Exposições Ocupacionais", category: "Higiene Ocupacional" },
  { code: "NR-10", name: "Segurança em Instalações e Serviços em Eletricidade", category: "Elétrica" },
  { code: "NR-11", name: "Transporte, Movimentação, Armazenagem e Manuseio de Materiais", category: "Materiais" },
  { code: "NR-12", name: "Segurança no Trabalho em Máquinas e Equipamentos", category: "Máquinas" },
  { code: "NR-13", name: "Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos", category: "Pressão" },
  { code: "NR-14", name: "Fornos", category: "Temperatura" },
  { code: "NR-15", name: "Atividades e Operações Insalubres", category: "Insalubridade" },
  { code: "NR-16", name: "Atividades e Operações Perigosas", category: "Periculosidade" },
  { code: "NR-17", name: "Ergonomia", category: "Ergonomia" },
  { code: "NR-18", name: "Segurança e Saúde no Trabalho na Indústria da Construção", category: "Construção" },
  { code: "NR-19", name: "Explosivos", category: "Explosivos" },
  { code: "NR-20", name: "Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis", category: "Inflamáveis" },
  { code: "NR-21", name: "Trabalho a Céu Aberto", category: "Externo" },
  { code: "NR-22", name: "Segurança e Saúde Ocupacional na Mineração", category: "Mineração" },
  { code: "NR-23", name: "Proteção Contra Incêndios", category: "Incêndio" },
  { code: "NR-24", name: "Condições Sanitárias e de Conforto nos Locais de Trabalho", category: "Higiene" },
  { code: "NR-25", name: "Resíduos Industriais", category: "Resíduos" },
  { code: "NR-26", name: "Sinalização de Segurança", category: "Sinalização" },
  { code: "NR-27", name: "Registro Profissional do Técnico de Segurança do Trabalho (Revogada)", category: "Geral" },
  { code: "NR-28", name: "Fiscalização e Penalidades", category: "Fiscalização" },
  { code: "NR-29", name: "Norma Regulamentadora de Segurança e Saúde no Trabalho Portuário", category: "Portuário" },
  { code: "NR-30", name: "Segurança e Saúde no Trabalho Aquaviário", category: "Aquaviário" },
  { code: "NR-31", name: "Segurança e Saúde no Trabalho na Agricultura", category: "Agrícola" },
  { code: "NR-32", name: "Segurança e Saúde no Trabalho em Serviços de Saúde", category: "Saúde" },
  { code: "NR-33", name: "Segurança e Saúde nos Trabalhos em Espaços Confinados", category: "Confinados" },
  { code: "NR-34", name: "Condições e Meio Ambiente de Trabalho na Indústria da Construção Naval", category: "Naval" },
  { code: "NR-35", name: "Trabalho em Altura", category: "Altura" },
  { code: "NR-36", name: "Segurança e Saúde no Trabalho em Empresas de Abate e Processamento", category: "Alimentar" },
  { code: "NR-37", name: "Segurança e Saúde em Plataformas de Petróleo", category: "Petróleo" },
  { code: "NR-38", name: "Segurança e Saúde no Trabalho nas Atividades de Limpeza Urbana", category: "Limpeza Urbana" },
];

async function seedNRs() {
  console.log("🔍 Checking for existing global NRs...");
  const existing = await db.select().from(nrs).where(isNull(nrs.companyId));
  
  if (existing.length >= GLOBAL_NRS.length) {
    console.log(`✅ ${existing.length} NRs already seeded. Skipping.`);
    await client.end();
    return;
  }

  console.log(`📋 Seeding ${GLOBAL_NRS.length} Brazilian NRs...`);
  for (const nr of GLOBAL_NRS) {
    const exists = existing.find(e => e.code === nr.code);
    if (!exists) {
      await db.insert(nrs).values({ ...nr, companyId: null, isActive: true });
      console.log(`  ✓ ${nr.code} — ${nr.name}`);
    }
  }
  console.log("✅ NR seeding complete!");
  await client.end();
}

seedNRs().catch((e) => { console.error(e); process.exit(1); });
