import "dotenv/config";
import fs from "fs";
import path from "path";
import { getDb } from "../server/db";
import { generateTechnicalReportPdf } from "../server/pdfTemplateEngine";
import { inspections, inspectionItems, companies, obras } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

async function run() {
  console.log("Starting PDF generation test...");
  const db = await getDb();
  if (!db) {
    console.error("No database connection.");
    return;
  }

  const inspectionId = 13; // The ID mentioned by the user

  console.log(`Fetching inspection ${inspectionId}...`);
  const inspRows = await db
    .select({ inspection: inspections, company: companies, obra: obras })
    .from(inspections)
    .leftJoin(companies, eq(inspections.companyId, companies.id))
    .leftJoin(obras, eq(inspections.obraId, obras.id))
    .where(eq(inspections.id, inspectionId))
    .limit(1);

  if (!inspRows.length) {
    console.error("Inspection not found");
    return;
  }

  const { inspection, company, obra } = inspRows[0];

  const items = await db
    .select()
    .from(inspectionItems)
    .where(eq(inspectionItems.inspectionId, inspectionId))
    .orderBy(inspectionItems.order);

  const dataFormatada = inspection.inspectedAt
    ? format(new Date(inspection.inspectedAt), "dd/MM/yyyy", { locale: ptBR })
    : format(new Date(inspection.createdAt), "dd/MM/yyyy", { locale: ptBR });

  const local = obra?.address
    ? `${obra.address}${obra.city ? ` — ${obra.city}` : ""}${obra.state ? `/${obra.state}` : ""}`
    : (inspection as any).location || company?.address || "";

  const itens = items.map((item: any) => ({
    titulo: item.title || "Ocorrência",
    status: item.status || "pendente",
    descricao: item.situacao || item.observacoes || "—",
    plano_acao: item.planoAcao || "A definir.",
    prazo: item.resolvedAt
      ? format(new Date(item.resolvedAt), "dd/MM/yyyy", { locale: ptBR })
      : undefined,
    imagens: Array.isArray(item.mediaUrls)
      ? item.mediaUrls.map((url: string) => ({ url }))
      : [],
  }));

  console.log(`Found ${itens.length} items. Generating PDF...`);
  if (itens.length > 0) {
    console.dir(itens.map(i => i.imagens), { depth: null });
  }

  const pdfBuffer = await generateTechnicalReportPdf({
    empresa: company?.name || "—",
    empreendimento: inspection.title,
    local,
    data: dataFormatada,
    observacoes: inspection.description || undefined,
    logoUrl: company?.logoUrl || undefined,
    itens,
  });

  const outputPath = path.join(process.cwd(), `test-report-${inspectionId}.pdf`);
  fs.writeFileSync(outputPath, pdfBuffer);
  
  console.log(`PDF successfully generated at: ${outputPath}`);
  process.exit(0);
}

run().catch(console.error);
