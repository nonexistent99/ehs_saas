import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { generateTechnicalReportPdf } from "../pdfTemplateEngine";
import { generateGroPdf, generateAprPdf, generatePtPdf, generateEpiPdf, generateTrainingPdf, generateWarningPdf, generateChecklistPdf, generateItsPdf } from "../pdfTemplates";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { uploadRouter } from "../upload";


function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // PDF Engine 3-Block Test Route
  app.get("/api/test/pdf-engine", async (req, res) => {
    try {
      const pdfBuffer = await generateTechnicalReportPdf({
        empresa: "WU2 FREI CANECA EMPREENDIMENTOS IMOBILIARIOS LTDA",
        empreendimento: "TONS FREI CANECA",
        local: "Rua Frei Caneca 803 – São Paulo",
        data: "10/12/2025",
        observacoes: "Inspeção focada em trabalho em altura e movimentação de materiais.",
        // We do not pass a logo URL to use text-fallback or missing image gracefully
        itens: [
          {
            titulo: "RISCO DE QUEDA DE MATERIAIS",
            status: "pendente",
            descricao: "Tela de proteção da laje 10 rompida em 3 pontos diferentes, com material solto próximo à beirada.",
            plano_acao: "Substituir a tela de proteção imediatamente e recolher os materiais soltos da borda da laje.",
            prazo: "Imediato",
            imagens: [
              { url: "https://placehold.co/600x400/png?text=FOTO+DA+OBRA", descricao: "Tela rompida na laje 10" }
            ]
          },
          {
            titulo: "REFEITÓRIO NÃO CONFORME",
            status: "atencao",
            descricao: "Mesas e cadeiras insuficientes para o efetivo atual no horário de pico. Lixeiras sem tampa.",
            plano_acao: "Providenciar 5 novos conjuntos de mesa e cadeiras. Trocar lixeiras por modelos com tampa e pedal.",
            prazo: "15/12/2025"
          },
          {
            titulo: "EPIs EM DIA",
            status: "resolvido",
            descricao: "Verificado uso de cinto de segurança por todos os colaboradores na periferia.",
            plano_acao: "Manter a fiscalização ativa e orientar DDS sobre a importância.",
            imagens: [
              { url: "https://placehold.co/600x400/png?text=COLABORADOR+EPI", descricao: "Funcionário utilizando cinto de segurança ancorado" }
            ]
          }
        ]
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="relatorio-teste.pdf"');
      res.send(pdfBuffer);
    } catch (e) {
      console.error(e);
      res.status(500).send("Error generating PDF: " + String(e));
    }
  });
  
  // Database Diagnostic Route
  app.get("/api/debug/db", async (req, res) => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return res.status(500).send("DATABASE_URL not set");
    
    const results: string[] = ["--- Database Connectivity Diagnostic ---"];
    try {
      const { URL } = await import("url");
      const { hostname } = new URL(dbUrl);
      results.push(`Target Host: ${hostname}`);
      
      const dns = await import("dns/promises");
      results.push("Attempting DNS lookup...");
      try {
        const lookup = await dns.lookup(hostname);
        results.push(`SUCCESS: Host resolved to ${lookup.address}`);
      } catch (e: any) {
        results.push(`FAILED: DNS lookup failed: ${e.message} (${e.code})`);
      }
      
      const postgres = await import("postgres").then(m => m.default);
      results.push("Attempting DB connection...");
      const sql = postgres(dbUrl, { connect_timeout: 5 });
      try {
        await sql`SELECT 1`;
        results.push("SUCCESS: Database connection established!");
      } catch (e: any) {
        results.push(`FAILED: Database connection failed: ${e.message}`);
      } finally {
        await sql.end();
      }
    } catch (e: any) {
      results.push(`ERROR during diagnostic: ${e.message}`);
    }
    
    res.setHeader("Content-Type", "text/plain");
    res.send(results.join("\n"));
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // File Upload Route
  app.use("/api/upload", uploadRouter);

  // PDF export route — Relatório Técnico de Inspeção (novo modelo)
  app.get("/api/export/inspection/:id", async (req: express.Request, res: express.Response) => {
    try {
      // Verify auth via cookie
      const cookieHeader = req.headers.cookie || "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map(c => {
          const [k, ...v] = c.trim().split("=");
          return [k, v.join("=")];
        })
      );
      const token = cookies[COOKIE_NAME];
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      try {
        await sdk.verifySession(token);
      } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }

      // Load inspection + company + obra via drizzle
      const db = await import("../db").then(m => m.getDb());
      if (!db) { res.status(500).end(); return; }

      const { inspections, inspectionItems, companies, obras } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const inspRows = await db
        .select({ inspection: inspections, company: companies, obra: obras })
        .from(inspections)
        .leftJoin(companies, eq(inspections.companyId, companies.id))
        .leftJoin(obras, eq(inspections.obraId, obras.id))
        .where(eq(inspections.id, id))
        .limit(1);

      if (!inspRows.length) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const { inspection, company, obra } = inspRows[0];

      // Load items ordered by `order`
      const items = await db
        .select()
        .from(inspectionItems)
        .where(eq(inspectionItems.inspectionId, id))
        .orderBy(inspectionItems.order);

      // Format date
      const { format } = await import("date-fns");
      const { ptBR } = await import("date-fns/locale");
      const dataFormatada = inspection.inspectedAt
        ? format(new Date(inspection.inspectedAt), "dd/MM/yyyy", { locale: ptBR })
        : format(new Date(inspection.createdAt), "dd/MM/yyyy", { locale: ptBR });

      // Build address string
      const local = obra?.address
        ? `${obra.address}${obra.city ? ` — ${obra.city}` : ""}${obra.state ? `/${obra.state}` : ""}`
        : (inspection as any).location || company?.address || "";

      // Map inspection items → TechnicalReportData itens
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

      const pdfBuffer = await generateTechnicalReportPdf({
        empresa: company?.name || "—",
        empreendimento: inspection.title,
        local,
        data: dataFormatada,
        observacoes: inspection.description || undefined,
        logoUrl: company?.logoUrl || undefined,
        itens,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="relatorio-inspecao-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF generation error:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });


  // Export GRO
  app.get("/api/export/pgr/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { pgr, companies, obras } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const pgrId = parseInt(req.params.id);
      const rows = await db.select({
        pgr: pgr,
        company: companies,
        obra: obras
      }).from(pgr)
        .leftJoin(companies, eq(pgr.companyId, companies.id))
        .leftJoin(obras, eq(pgr.obraId, obras.id))
        .where(eq(pgr.id, pgrId)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const record = rows[0];

      let parsedContent: any = {};
      try {
        parsedContent = JSON.parse(record.pgr.content || "{}");
      } catch (e) {}

      const pdfBuffer = await generateGroPdf({
        title: record.pgr.title,
        companyName: record.company?.name || "N/A",
        obraName: record.obra?.name || "Matriz",
        version: record.pgr.version,
        validFrom: record.pgr.validFrom,
        riskMatrix: parsedContent.risks || [],
        actionPlan: parsedContent.actionPlan || [],
        responsibleName: parsedContent.responsibleName || "Engenheiro Responsável"
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="gro-${pgrId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // Export APR
  app.get("/api/export/apr/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { apr, companies, obras } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const aprId = parseInt(req.params.id);
      const rows = await db.select({
        apr: apr,
        company: companies,
        obra: obras
      }).from(apr)
        .leftJoin(companies, eq(apr.companyId, companies.id))
        .leftJoin(obras, eq(apr.obraId, obras.id))
        .where(eq(apr.id, aprId)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const record = rows[0];

      const pdfBuffer = await generateAprPdf({
        companyName: record.company?.name || "N/A",
        cnpj: record.company?.cnpj || "",
        obraName: record.obra?.name || record.apr.location || "N/A",
        activity: record.apr.activity,
        date: record.apr.date || record.apr.createdAt,
        responsibleName: (record.apr.content as any)?.responsibleName || "Técnico de Segurança",
        materials: (record.apr.content as any)?.materials || [],
        epis: (record.apr.content as any)?.epis || [],
        epcs: (record.apr.content as any)?.epcs || [],
        conditions: (record.apr.content as any)?.conditions || [],
        risks: (record.apr.content as any)?.risks || []
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="apr-${aprId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // Export PT
  app.get("/api/export/pt/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { pt, companies, obras } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const ptId = parseInt(req.params.id);
      const rows = await db.select({
        pt: pt,
        company: companies,
        obra: obras
      }).from(pt)
        .leftJoin(companies, eq(pt.companyId, companies.id))
        .leftJoin(obras, eq(pt.obraId, obras.id))
        .where(eq(pt.id, ptId)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const record = rows[0];

      let parsedContent: any = {};
      try {
        parsedContent = JSON.parse(record.pt.content || "{}");
        console.log("[Export PT] Parsed Content:", JSON.stringify(parsedContent, null, 2));
      } catch (e) {
        console.error("[Export PT] Parse error:", e);
      }

      const pdfBuffer = await generatePtPdf({
        ptNumber: record.pt.code || String(record.pt.id).padStart(4, "0"),
        companyName: record.company?.name || "N/A",
        obraName: record.obra?.name || "N/A",
        serviceDescription: record.pt.description || record.pt.title,
        startDate: parsedContent.startDate || record.pt.createdAt,
        endDate: parsedContent.endDate || record.pt.createdAt,
        potentialRisks: parsedContent.potentialRisks || [],
        protectiveMeasures: parsedContent.protectiveMeasures || [],
        team: parsedContent.team || [],
        revalidations: parsedContent.revalidations || [],
        issuerName: parsedContent.issuerName || "Emitente Oficial",
        supervisorName: parsedContent.supervisorName || "Supervisor Oficial"
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="pt-${ptId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // Export ITS (Instrução Técnica de Segurança)
  app.get("/api/export/its/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { its, companies, obras, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const itsId = parseInt(req.params.id);
      if (isNaN(itsId)) return res.status(400).json({ error: "Invalid ID" });

      const rows = await db.select({
        its: its,
        company: companies,
        obra: obras,
        author: users,
      }).from(its)
        .leftJoin(companies, eq(its.companyId, companies.id))
        .leftJoin(obras, eq(its.obraId, obras.id))
        .leftJoin(users, eq(its.createdById, users.id))
        .where(eq(its.id, itsId)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "ITS não encontrado" });
      const record = rows[0];

      const pdfBuffer = await generateItsPdf({
        code: record.its.code || undefined,
        title: record.its.title,
        description: record.its.description || undefined,
        content: record.its.content || undefined,
        status: record.its.status || "ativo",
        companyName: record.company?.name || "N/A",
        obraName: record.obra?.name || undefined,
        obraAddress: record.obra?.address || undefined,
        createdAt: record.its.createdAt,
        authorName: (record.author as any)?.name || undefined,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="its-${itsId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[ITS PDF] Error:", err);
      res.status(500).send("Error generating ITS PDF: " + String(err));
    }
  });

  // Export EPI Ficha
  app.get("/api/export/epi/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { epiFicha, companies, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      const rows = await db.select({
        epi: epiFicha,
        company: companies,
        user: users
      }).from(epiFicha)
        .leftJoin(companies, eq(epiFicha.companyId, companies.id))
        .leftJoin(users, eq(epiFicha.userId, users.id))
        .where(eq(epiFicha.id, id)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const record = rows[0];

      const deliveries = [{
        date: record.epi.deliveredAt || record.epi.createdAt,
        equipment: record.epi.epiName,
        ca: record.epi.ca || "-",
        quantity: record.epi.quantity || 1,
        signature: record.epi.signatureUrl || ""
      }];

      const pdfBuffer = await generateEpiPdf({
        companyName: record.company?.name || "N/A",
        cnpj: record.company?.cnpj || "",
        employeeName: record.user?.name || "N/A",
        role: record.user?.ehsRole || "N/A",
        admissionDate: record.user?.createdAt || new Date(),
        deliveries
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="epi-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // Export Treinamento
  app.get("/api/export/treinamento/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { trainings, companies, nrs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      const rows = await db.select({
        training: trainings,
        company: companies,
        nr: nrs
      }).from(trainings)
        .leftJoin(companies, eq(trainings.companyId, companies.id))
        .leftJoin(nrs, eq(trainings.nrId, nrs.id))
        .where(eq(trainings.id, id)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const record = rows[0];

      // Assuming participants would be joined or fetched separately, mocking empty list to be signed
      const fakeParticipants = Array.from({length: 10}).map((_, i) => ({
        name: "", role: "", document: "", signature: ""
      }));

      const pdfBuffer = await generateTrainingPdf({
        nrTitle: record.nr ? `${record.nr.code} - ${record.nr.name}` : "Sem NR Base",
        topic: record.training.title,
        companyName: record.company?.name || "N/A",
        date: record.training.trainingDate || record.training.createdAt,
        instructorName: record.training.instructor || "Instrutor Indefinido",
        duration: "8",
        programmaticContent: record.training.description || "Treinamento admissional e periódico de segurança do trabalho e suas medidas.",
        participants: fakeParticipants,
        instructorRegister: "000.000-0"
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="treinamento-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // Export Advertência
  app.get("/api/export/advertencia/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      const { advertencias, companies, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      const rows = await db.select({
        advertencia: advertencias,
        company: companies,
        user: users
      }).from(advertencias)
        .leftJoin(companies, eq(advertencias.companyId, companies.id))
        .leftJoin(users, eq(advertencias.userId, users.id))
        .where(eq(advertencias.id, id)).limit(1);

      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const record = rows[0];

      let witnessName = "";
      if (record.advertencia.witnessId) {
        const witness = await db.select().from(users).where(eq(users.id, record.advertencia.witnessId)).limit(1);
        if (witness.length > 0) witnessName = witness[0].name || "";
      }

      const pdfBuffer = await generateWarningPdf({
        warningNumber: id,
        type: record.advertencia.type,
        employeeName: record.user?.name || "Empregado N/A",
        role: record.user?.ehsRole || "N/A",
        companyName: record.company?.name || "N/A",
        reason: record.advertencia.reason,
        description: record.advertencia.description || "N/A",
        date: record.advertencia.date,
        location: record.company?.city || "Sede",
        issuerName: "Departamento de Segurança ou RH",
        witnessName
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="advertencia-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // Export Checklist
  app.get("/api/export/checklist/:id", async (req: express.Request, res: express.Response) => {
    try {
      const db = await import("../db").then(m => m.getDb());
      if (!db) return res.status(500).end();
      
      const { checklistExecutions, checklistTemplates, checklistExecutionItems, checklistTemplateItems, companies, obras, users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      
      const rows = await db.select({
        execution: checklistExecutions,
        template: checklistTemplates,
        company: companies,
        obra: obras,
        inspector: users
      }).from(checklistExecutions)
        .innerJoin(checklistTemplates, eq(checklistExecutions.templateId, checklistTemplates.id))
        .innerJoin(companies, eq(checklistExecutions.companyId, companies.id))
        .leftJoin(obras, eq(checklistExecutions.projectId, obras.id))
        .leftJoin(users, eq(checklistExecutions.createdById, users.id))
        .where(eq(checklistExecutions.id, id))
        .limit(1);

      if (!rows.length) return res.status(404).json({ error: "Checklist execution not found" });
      const record = rows[0];

      // Pegar os itens preenchidos
      const items = await db.select({
        execItem: checklistExecutionItems,
        tempItem: checklistTemplateItems
      }).from(checklistExecutionItems)
        .innerJoin(checklistTemplateItems, eq(checklistExecutionItems.itemId, checklistTemplateItems.id))
        .where(eq(checklistExecutionItems.executionId, id))
        .orderBy(checklistTemplateItems.order);

      const itemsMapped = items.map((i: any) => ({
        name: i.tempItem.name,
        description: i.tempItem.description,
        norma: i.tempItem.norma,
        status: i.execItem.status,
        observation: i.execItem.observation,
        mediaUrls: i.execItem.mediaUrls || []
      }));

      const pdfBuffer = await generateChecklistPdf({
        companyName: record.company.name,
        projectName: record.obra?.name || "N/A",
        date: record.execution.date,
        templateName: record.template.name,
        inspectorName: record.inspector?.name || "Inspetor EHS",
        score: record.execution.score,
        signatureUrl: record.execution.signatureUrl,
        items: itemsMapped
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="checklist-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("PDF error:", err);
      res.status(500).send("Error");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    setupChecklistCron();
  });
}

async function runChecklistCron() {
  try {
    const db = await import("../db").then(m => m.getDb());
    if (!db) return;
    
    const { checklistExecutions, notifications } = await import("../../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    // get all pending executions
    const pending = await db.select().from(checklistExecutions).where(eq(checklistExecutions.status, "pendente" as any));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const p of pending) {
      if (!p.date) continue;
      
      const execDate = new Date(p.date.toString() + "T00:00:00");
      
      // Difference in days
      const diffTime = execDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let title = "";
      let message = "";
      let alertType = "";

      if (diffDays === 3) {
        title = "Checklist se aproximando";
        message = `O checklist #${p.id} está marcado para daqui a 3 dias.`;
        alertType = "3_dias";
      } else if (diffDays === 0) {
        title = "Checklist Hoje";
        message = `O checklist #${p.id} deve ser realizado hoje.`;
        alertType = "hoje";
      } else if (diffDays < 0) {
        title = "Checklist Atrasado";
        message = `Atenção: O checklist #${p.id} está atrasado!`;
        alertType = "atrasado";
      }

      if (title) {
        const existing = await db.select().from(notifications)
          .where(and(
             eq(notifications.title, title),
             eq(notifications.message, message),
             eq(notifications.recipientCompanyId, p.companyId as any)
          )).limit(1);

        if (existing.length === 0) {
          await db.insert(notifications).values({
            type: "system",
            title,
            message,
            recipientCompanyId: p.companyId,
            status: "sent",
            sentAt: new Date(),
            metadata: { checklistId: p.id, alertType }
          });
        }
      }
    }
  } catch (error) {
    console.error("[Checklist CRON] Erro:", error);
  }
}

function setupChecklistCron() {
  runChecklistCron();
  setInterval(runChecklistCron, 1000 * 60 * 60 * 12); // every 12 hours
}

startServer().catch(console.error);
