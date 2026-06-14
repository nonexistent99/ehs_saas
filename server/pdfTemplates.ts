import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { resolveImageToDataUrl } from "./pdfTemplateEngine";
import {
  BaseDocumentLayout,
  DocumentPage,
  EvidenceImageGrid,
  InfoGrid,
  SignatureBlock,
  StatusTag,
  escapeHtml as escapeLayoutHtml,
  resolvePdfImage as resolveLayoutPdfImage,
  resolvePdfImages as resolveLayoutPdfImages,
} from "./pdfLayout";

// ─── Handlebars Helpers ───────────────────────────────────────────────────────
Handlebars.registerHelper("formatDate", function (dateString: any) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
});
Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
Handlebars.registerHelper("inc", (value: any) => parseInt(value) + 1);

// ─── Common Styles ────────────────────────────────────────────────────────────
/** CSS base para documentos do tipo "formulário P&B" (APR, EPI, PT, Treinamento, Advertência, GRO) */
const formDocStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #fff; color: #111; font-size: 10px; line-height: 1.3; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 5px 7px; vertical-align: top; }
  th { font-weight: 700; text-align: center; background: #d9d9d9; font-size: 10px; text-transform: uppercase; }
  td { font-size: 10px; }
  .page { padding: 20px 28px; }
  .doc-header { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  .doc-header td { border: 1px solid #000; padding: 6px 10px; vertical-align: middle; }
  .doc-header .logo-cell { width: 25%; text-align: center; }
  .doc-header .title-cell { text-align: center; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-header .rev-cell { width: 18%; text-align: center; font-size: 9px; font-weight: 700; }
  .pdf-logo { max-height: 50px; max-width: 130px; object-fit: contain; }
  .pdf-logo-fallback { display: inline-flex; min-width: 86px; min-height: 42px; padding: 6px 10px; border: 1px solid #e8420d; align-items: center; justify-content: center; color: #1e3a5f; font-size: 10px; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; text-align: center; line-height: 1.15; }
  .section-header { background: #d9d9d9; font-weight: 700; text-align: center; padding: 5px 7px; border: 1px solid #000; text-transform: uppercase; font-size: 10px; margin-top: 0; }
  .footer-bar { margin-top: 16px; text-align: center; font-size: 9px; color: #555; }
  .sig-area { display: inline-block; border-top: 1px solid #000; width: 100%; min-height: 36px; }
  .checkbox-list { display: flex; flex-wrap: wrap; gap: 4px 20px; }
  .checkbox-item { font-size: 10px; }
`;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pdfLogo(data: any, maxWidth = 130, maxHeight = 50): string {
  const logoUrl = data?.clientLogoUrl || data?.technicianLogoUrl || data?.logoUrl;
  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" class="pdf-logo" style="max-height:${maxHeight}px; max-width:${maxWidth}px;" />`;
  }

  const fallbackName = data?.companyName || data?.empresa || data?.issuerName || data?.responsibleName || data?.instructorName || "TACT";
  return `<span class="pdf-logo-fallback">${escapeHtml(fallbackName)}</span>`;
}

function documentHeader(data: any, title: string, revision: string): string {
  return `<table class="doc-header">
    <tr>
      <td class="logo-cell">${pdfLogo(data)}</td>
      <td class="title-cell">${title}</td>
      <td class="rev-cell">${revision}</td>
    </tr>
  </table>`;
}

async function resolvePdfImage(value: unknown): Promise<string> {
  if (typeof value !== "string" || value.trim() === "") return "";
  return resolveImageToDataUrl(value);
}

async function resolvePdfDataImages<T extends Record<string, any>>(data: T): Promise<T> {
  const next: Record<string, any> = { ...data };

  for (const key of ["clientLogoUrl", "technicianLogoUrl", "logoUrl", "signatureUrl"]) {
    if (next[key]) next[key] = await resolvePdfImage(next[key]);
  }

  if (Array.isArray(next.deliveries)) {
    next.deliveries = await Promise.all(next.deliveries.map(async (delivery: any) => ({
      ...delivery,
      signature: await resolvePdfImage(delivery?.signature),
    })));
  }

  if (Array.isArray(next.participants)) {
    next.participants = await Promise.all(next.participants.map(async (participant: any) => ({
      ...participant,
      signature: await resolvePdfImage(participant?.signature),
    })));
  }

  if (Array.isArray(next.items)) {
    next.items = await Promise.all(next.items.map(async (item: any) => ({
      ...item,
      mediaUrls: (await Promise.all((item?.mediaUrls || []).map((url: string) => resolvePdfImage(url)))).filter(Boolean),
    })));
  }

  return next as T;
}

/** Rodapé padrão de página */
const pageFooter = (page: string) =>
  `<div class="footer-bar">Página ${page} &nbsp;|&nbsp; Documento gerado pelo TACT</div>`;

async function renderPdf(
  html: string,
  options: { margin?: { top?: string; right?: string; bottom?: string; left?: string } } = {},
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: options.margin ?? { top: "15px", right: "0", bottom: "15px", left: "0" },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

// ─── APR ─────────────────────────────────────────────────────────────────────
export async function generateAprPdfLegacy(data: any): Promise<Buffer> {
  data = await resolvePdfDataImages(data);
  const genDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  <!-- Cabeçalho do documento -->
  <table class="doc-header">
    <tr>
      <td class="logo-cell">${pdfLogo(data)}</td>
      <td class="title-cell">APR – ANÁLISE PRELIMINAR DE RISCO</td>
      <td class="rev-cell">APR_REV_00</td>
    </tr>
  </table>

  <!-- Dados da Obra -->
  <table style="margin-top:-1px;">
    <tr><td colspan="4" class="section-header">DADOS DA OBRA</td></tr>
    <tr>
      <td style="width:80px;font-weight:700;">EMPRESA:</td>
      <td colspan="3">${data.companyName || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;">ATIVIDADE:</td>
      <td colspan="3">${data.activity || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;">LOCAL DE TRABALHO:</td>
      <td colspan="3">${data.obraName || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;">DATA DE ELABORAÇÃO:</td>
      <td>${data.date ? format(new Date(data.date), "dd/MM/yyyy", { locale: ptBR }) : genDate.split(" ")[0]}</td>
      <td style="font-weight:700;">RESPONSÁVEL:</td>
      <td>${data.responsibleName || ""}</td>
    </tr>
  </table>

  <!-- Recursos Materiais e EPIs -->
  <table style="margin-top:-1px;">
    <tr>
      <td class="section-header" style="width:50%;">RECURSOS MATERIAIS QUE PODEM SER NECESSÁRIOS</td>
      <td class="section-header" style="width:50%;">EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL</td>
    </tr>
    <tr>
      <td style="vertical-align:top; padding:8px;">
        <div class="checkbox-list">
          ${["Ferramentas Manuais", "Furadeiras / Parafusadeira", "Máquina de Solda", "Esmeril", "Compressor", "Máquina de Corte", "Betoneira", "Andaime"].map((m: string) => `<div class="checkbox-item">(${data.materials?.includes(m) ? "x" : " "}) ${m}</div>`).join("")}
        </div>
      </td>
      <td style="vertical-align:top; padding:8px;">
        <div class="checkbox-list">
          ${["Capacete de Segurança", "Bota de Segurança", "Óculos de Proteção", "Luva de PVC", "Luva de Látex", "Cinto de Segurança", "Protetor Auricular", "Máscara de Pó", "Colete Refletivo"].map((e: string) => `<div class="checkbox-item">(${data.epis?.includes(e) ? "x" : " "}) ${e}</div>`).join("")}
        </div>
      </td>
    </tr>
  </table>

  <!-- EPCs e Condições Impeditivas -->
  <table style="margin-top:-1px;">
    <tr>
      <td class="section-header" style="width:50%;">EQUIPAMENTO DE PROTEÇÃO COLETIVA SUGERIDOS</td>
      <td class="section-header" style="width:50%;">CONDIÇÕES IMPEDITIVAS PARA REALIZAÇÃO DA ATIVIDADE</td>
    </tr>
    <tr>
      <td style="vertical-align:top; padding:8px;">
        <div class="checkbox-list">
          ${["Avisos, Sinalizações", "Biombo", "Extintores", "Guarda-Corpo", "Iluminação", "Tapetes Antiderrapantes", "Rede de Proteção"].map((e: string) => `<div class="checkbox-item">(${data.epcs?.includes(e) ? "x" : " "}) ${e}</div>`).join("")}
        </div>
      </td>
      <td style="vertical-align:top; padding:8px;">
        <div class="checkbox-list">
          ${["Falta de Avisos, Sinalizações", "Falta de Treinamentos", "Risco iminente", "Condições Climáticas (Chuvas, Raios)", "Equipamentos danificados", "Área não isolada"].map((c: string) => `<div class="checkbox-item">(${data.conditions?.includes(c) ? "x" : " "}) ${c}</div>`).join("")}
        </div>
      </td>
    </tr>
  </table>

  <!-- Tabela de Riscos -->
  <table style="margin-top:-1px;">
    <tr>
      <th style="width:5%;">#</th>
      <th style="width:22%;">ETAPA DA ATIVIDADE</th>
      <th style="width:12%;">TIPO DE RISCO</th>
      <th style="width:22%;">PERIGO / RISCOS VERIFICADOS</th>
      <th style="width:22%;">POSSÍVEIS DANOS</th>
      <th style="width:17%;">RECOMENDAÇÕES DE SEGURANÇA</th>
    </tr>
    ${(data.risks || []).map((r: any, i: number) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td>${r.step || ""}</td>
      <td style="text-align:center;">${r.type || ""}</td>
      <td>${r.risk || ""}</td>
      <td>${r.damage || ""}</td>
      <td>${r.mitigation || ""}</td>
    </tr>`).join("")}
    ${Array.from({ length: Math.max(0, 6 - (data.risks?.length || 0)) }).map(() => `
    <tr><td style="height:24px;">&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}
  </table>

  <!-- Assinaturas -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="text-align:center; width:50%; padding:30px 20px 8px;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.responsibleName || "Técnico/Engenheiro de Segurança"}</div>
        <div style="font-size:9px; color:#555;">Técnico/Engenheiro de Segurança</div>
      </td>
      <td style="text-align:center; width:50%; padding:30px 20px 8px;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">Representante da Empresa</div>
        <div style="font-size:9px; color:#555;">${data.companyName || ""}</div>
      </td>
    </tr>
  </table>

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}
// ─── FICHA DE EPI ─────────────────────────────────────────────────────────────
type AprRiskItem = {
  step?: unknown;
  riskType?: unknown;
  type?: unknown;
  danger?: unknown;
  risk?: unknown;
  damage?: unknown;
  recommendation?: unknown;
  mitigation?: unknown;
};

const APR_RISK_ROWS_PER_PAGE = 4;
const APR_RISK_ROWS_WITH_SIGNATURE = 3;

function asTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function withOtherItems(values: string[], otherValue: unknown): string[] {
  const otherItems = asTextArray(otherValue).map((item) => `Outros: ${item}`);
  return [...values, ...otherItems];
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function renderAprListCard(title: string, values: string[]): string {
  const items = values.length
    ? values.map((value) => `<span class="apr-chip">${escapeLayoutHtml(value)}</span>`).join("")
    : `<span class="apr-empty">Não informado</span>`;

  return `<section class="apr-card">
    <h2>${escapeLayoutHtml(title)}</h2>
    <div class="apr-chip-list">${items}</div>
  </section>`;
}

function normalizeAprRisk(risk: AprRiskItem) {
  return {
    step: risk.step || "",
    type: risk.riskType || risk.type || "",
    danger: risk.danger || risk.risk || "",
    damage: risk.damage || "",
    recommendation: risk.recommendation || risk.mitigation || "",
  };
}

function renderAprRiskTable(risks: AprRiskItem[], pageOffset: number): string {
  if (risks.length === 0) {
    return `<div class="apr-empty-risk">Nenhuma etapa de risco cadastrada.</div>`;
  }

  return `<table class="apr-risk-table">
    <thead>
      <tr>
        <th class="col-number">#</th>
        <th>Etapa da atividade</th>
        <th>Tipo de risco</th>
        <th>Perigos/riscos verificados</th>
        <th>Possíveis danos</th>
        <th>Recomendações de segurança</th>
      </tr>
    </thead>
    <tbody>
      ${risks.map((risk, index) => {
        const normalized = normalizeAprRisk(risk);
        return `<tr>
          <td class="col-number">${pageOffset + index + 1}</td>
          <td>${escapeLayoutHtml(normalized.step)}</td>
          <td>${escapeLayoutHtml(normalized.type)}</td>
          <td>${escapeLayoutHtml(normalized.danger)}</td>
          <td>${escapeLayoutHtml(normalized.damage)}</td>
          <td>${escapeLayoutHtml(normalized.recommendation)}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
}

function renderAprSignatureBlock(data: any, documentDate: string, signatures: { technician?: string; company?: string }) {
  return SignatureBlock({
    title: "Assinaturas",
    entries: [
      {
        imageUrl: signatures.technician,
        name: data.responsibleName || "Técnico/Engenheiro de Segurança",
        role: "Técnico/Engenheiro de Segurança",
        date: documentDate,
      },
      {
        imageUrl: signatures.company,
        name: data.companyRepresentativeName || "Representante da Empresa",
        role: data.companyName || "Empresa",
        date: documentDate,
      },
    ],
  });
}

export async function buildAprPdfHtml(data: any): Promise<string> {
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  const documentDate = formatPdfDate(data.date, genDate);
  const clientLogoUrl = await resolveLayoutPdfImage(data.clientLogoUrl || data.technicianLogoUrl || data.logoUrl);
  const technicianSignatureUrl = await resolveLayoutPdfImage(data.technicianSignatureUrl || data.responsibleSignatureUrl || data.signatureUrl);
  const companySignatureUrl = await resolveLayoutPdfImage(data.companySignatureUrl || data.companyRepresentativeSignatureUrl);

  const materials = withOtherItems(asTextArray(data.materials), data.otherMaterials);
  const epis = withOtherItems(asTextArray(data.epis), data.otherEpis);
  const epcs = withOtherItems(asTextArray(data.epcs), data.otherEpcs);
  const conditions = withOtherItems(asTextArray(data.conditions), data.otherConditions);
  const risks: AprRiskItem[] = Array.isArray(data.risks) ? data.risks : [];
  const riskChunks = chunkItems(risks, APR_RISK_ROWS_PER_PAGE);
  const lastRiskChunk = riskChunks[riskChunks.length - 1];
  const signatureFitsLastRiskPage = lastRiskChunk.length <= APR_RISK_ROWS_WITH_SIGNATURE;
  const pageCount = 1 + riskChunks.length + (signatureFitsLastRiskPage ? 0 : 1);
  let pageNumber = 1;

  const pages: string[] = [];
  pages.push(DocumentPage({
    title: "APR – ANÁLISE PRELIMINAR DE RISCO",
    logoUrl: clientLogoUrl,
    logoFallback: data.companyName || "TACT",
    footerText: `Página ${pageNumber++} de ${pageCount} | Documento gerado pelo TACT`,
    className: "apr-page apr-summary-page",
    children: `
      <section class="apr-summary">
        ${InfoGrid([
          { label: "Empresa", value: data.companyName, wide: true },
          { label: "CNPJ", value: data.cnpj || "N/A" },
          { label: "Data de elaboração", value: documentDate },
          { label: "Atividade", value: data.activity || "N/A", wide: true },
          { label: "Local de trabalho", value: data.obraName || "N/A" },
          { label: "Responsável", value: data.responsibleName || "Técnico de Segurança" },
        ])}
      </section>
      <section class="apr-section-grid">
        ${renderAprListCard("Recursos materiais", materials)}
        ${renderAprListCard("Equipamentos de Proteção Individual", epis)}
        ${renderAprListCard("Equipamentos de Proteção Coletiva", epcs)}
        ${renderAprListCard("Condições impeditivas", conditions)}
      </section>
    `,
  }));

  riskChunks.forEach((chunk, chunkIndex) => {
    const includeSignature = chunkIndex === riskChunks.length - 1 && signatureFitsLastRiskPage;
    const pageOffset = riskChunks
      .slice(0, chunkIndex)
      .reduce((sum, page) => sum + page.length, 0);

    pages.push(DocumentPage({
      title: "APR – ANÁLISE PRELIMINAR DE RISCO",
      logoUrl: clientLogoUrl,
      logoFallback: data.companyName || "TACT",
      footerText: `Página ${pageNumber++} de ${pageCount} | Documento gerado pelo TACT`,
      className: includeSignature ? "apr-page apr-risk-page apr-final-page" : "apr-page apr-risk-page",
      children: `
        <section class="apr-risk-section">
          <div class="apr-section-heading">
            <span>Análise de riscos por etapa</span>
            <small>${escapeLayoutHtml(data.activity || "APR")}</small>
          </div>
          ${renderAprRiskTable(chunk, pageOffset)}
        </section>
        ${includeSignature ? renderAprSignatureBlock(data, documentDate, {
          technician: technicianSignatureUrl,
          company: companySignatureUrl,
        }) : ""}
      `,
    }));
  });

  if (!signatureFitsLastRiskPage) {
    pages.push(DocumentPage({
      title: "APR – ANÁLISE PRELIMINAR DE RISCO",
      logoUrl: clientLogoUrl,
      logoFallback: data.companyName || "TACT",
      footerText: `Página ${pageNumber++} de ${pageCount} | Documento gerado pelo TACT`,
      className: "apr-page apr-final-page",
      children: `
        <section class="apr-final-note">
          <div class="apr-section-heading">
            <span>Encerramento da APR</span>
            <small>Assinaturas preservadas em área segura</small>
          </div>
          <p>As etapas da atividade, perigos, danos e recomendações foram apresentados nas páginas anteriores.</p>
        </section>
        ${renderAprSignatureBlock(data, documentDate, {
          technician: technicianSignatureUrl,
          company: companySignatureUrl,
        })}
      `,
    }));
  }

  return BaseDocumentLayout({
    title: `APR - ${data.activity || data.companyName || "TACT"}`,
    pages,
    extraCss: aprPilotCss,
  });
}

export async function generateAprPdf(data: any): Promise<Buffer> {
  const html = await buildAprPdfHtml(data);
  return renderPdf(html, { margin: { top: "0", right: "0", bottom: "0", left: "0" } });
}

const aprPilotCss = `
  .apr-page .document-content { gap: 5mm; }
  .apr-summary .info-grid { min-height: 43mm; }
  .apr-section-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4mm;
    flex: 1;
    min-height: 0;
  }
  .apr-card {
    border: 1px solid #cfd8df;
    background: #fff;
    padding: 4mm;
    min-height: 72mm;
    display: flex;
    flex-direction: column;
    gap: 3mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .apr-card h2 {
    color: #293f4d;
    font-size: 11px;
    line-height: 1.2;
    margin: 0;
    text-transform: uppercase;
  }
  .apr-chip-list {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 2mm;
  }
  .apr-chip {
    border: 1px solid #cfd8df;
    border-left: 2px solid #d64a00;
    background: #f8fafc;
    color: #1f2933;
    display: inline-flex;
    align-items: center;
    min-height: 8mm;
    padding: 1.5mm 2.2mm;
    font-size: 9.2px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .apr-empty {
    color: #7b8794;
    font-size: 10px;
    font-style: italic;
  }
  .apr-risk-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 3mm;
  }
  .apr-section-heading {
    border-left: 3px solid #d64a00;
    padding-left: 3mm;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 4mm;
  }
  .apr-section-heading span {
    color: #293f4d;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .apr-section-heading small {
    color: #53616f;
    font-size: 8.5px;
    font-weight: 800;
    text-align: right;
    text-transform: uppercase;
  }
  .apr-risk-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 1px solid #cfd8df;
    background: #fff;
  }
  .apr-risk-table th,
  .apr-risk-table td {
    border: 1px solid #d9e0e6;
    padding: 2.5mm;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  .apr-risk-table th {
    background: #293f4d;
    color: #fff;
    font-size: 8px;
    font-weight: 900;
    line-height: 1.15;
    text-transform: uppercase;
  }
  .apr-risk-table td {
    color: #1f2933;
    font-size: 8.8px;
    line-height: 1.28;
  }
  .apr-risk-table tr { page-break-inside: avoid; break-inside: avoid; }
  .apr-risk-table .col-number {
    width: 8mm;
    text-align: center;
    font-weight: 900;
  }
  .apr-empty-risk,
  .apr-final-note {
    border: 1px dashed #cfd8df;
    background: #f8fafc;
    color: #53616f;
    font-weight: 800;
    padding: 8mm;
  }
  .apr-empty-risk {
    min-height: 45mm;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
  }
  .apr-final-note {
    min-height: 55mm;
    display: flex;
    flex-direction: column;
    gap: 5mm;
  }
  .apr-final-note p {
    margin: 0;
    font-size: 10.5px;
    line-height: 1.5;
  }
`;

export async function generateEpiPdf(data: any): Promise<Buffer> {
  data = await resolvePdfDataImages(data);
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  ${documentHeader(data, "FICHA DE CONTROLE DE ENTREGA DE E.P.I.", "EPI_REV_00")}

  <!-- Dados da empresa -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="font-weight:700;">EMPRESA: <span style="font-weight:400;">${data.companyName || ""}</span> &nbsp;–&nbsp; <strong>CNPJ:</strong> ${data.cnpj || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;">ENDEREÇO: <span style="font-weight:400;">${data.address || ""}</span></td>
    </tr>
    <tr>
      <td style="font-weight:700; display:flex; gap:40px;">
        FUNCIONÁRIO: <span style="font-weight:400; flex:1;">${data.employeeName || ""}</span>
        &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; FUNÇÃO: <span style="font-weight:400;">${data.role || ""}</span>
      </td>
    </tr>
  </table>

  <!-- Texto de responsabilidade -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="padding: 8px 10px; font-size:10px; line-height:1.6; text-align:justify;">
        Recebi da empresa <strong>${data.companyName || ""}</strong>, para meu uso obrigatório os EPI'S (equipamento de proteção individual) constantes nessa ficha, o qual obrigo-me a utilizá-los corretamente durante o tempo que permanecerem ao meu dispor, observando as medidas gerais de disciplina e uso que integram a NR-06 – Equipamentos de Proteção Individual – da portaria nº 3.214 de 08/junho 1970. Declaro saber também que terei que devolvê-los no ato do meu desligamento.<br><br>
        Responsabilizar-me pela danificação do E.P.I devido ao uso inadequado ou fora das atividades a que se destina, bem como pelo seu extravio; declaro ainda estar ciente de que o uso é obrigatório.<br>
        Sob pena de ser punido conforme Lei nº 6.514, de 22/12/77, artigo 158<br>
        <strong>Declaro ainda que recebi treinamento referente ao uso do E.P.I e às normas de segurança do trabalho</strong>
      </td>
    </tr>
  </table>

  <!-- Data e Assinatura do colaborador -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="width:35%; padding:12px 10px;">Data: ${genDate}</td>
      <td style="padding:12px 10px;">Assinatura: _______________________________________________</td>
    </tr>
  </table>

  <!-- Tabela de EPIs -->
  <table style="margin-top:-1px;">
    <tr>
      <th style="width:38%;">EPI</th>
      <th style="width:14%;">DATA</th>
      <th style="width:10%;">QUANT.</th>
      <th style="width:10%;">C.A.</th>
      <th style="width:28%;">ASSINATURA</th>
    </tr>
    ${(data.deliveries || []).map((d: any) => `
    <tr>
      <td>${d.equipment || ""}</td>
      <td style="text-align:center;">${d.date ? format(new Date(d.date), "dd/MM/yyyy", { locale: ptBR }) : ""}</td>
      <td style="text-align:center;">${d.quantity || ""}</td>
      <td style="text-align:center;">${d.ca || ""}</td>
      <td style="text-align:center; height:28px;">
        ${d.signature ? `<img src="${d.signature}" style="max-height:24px;">` : ""}
      </td>
    </tr>`).join("")}
    ${Array.from({ length: Math.max(0, 15 - (data.deliveries?.length || 0)) }).map(() =>
      `<tr><td style="height:24px;">&nbsp;</td><td></td><td></td><td></td><td></td></tr>`
    ).join("")}
  </table>

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}

// ─── PERMISSÃO DE TRABALHO (PT) ───────────────────────────────────────────────
export async function generatePtPdf(data: any): Promise<Buffer> {
  data = await resolvePdfDataImages(data);
  const existingRevs = data.revalidations?.length || 0;
  const emptyRevRows = Math.max(0, 6 - existingRevs);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  <table class="doc-header">
    <tr>
      <td class="logo-cell">${pdfLogo(data)}</td>
      <td class="title-cell">PERMISSÃO DE TRABALHO (PT) — Nº ${data.ptNumber || "____"}</td>
      <td class="rev-cell">PT_REV_00</td>
    </tr>
  </table>

  <table style="margin-top:-1px;">
    <tr>
      <td style="font-weight:700; width:120px;">EMPRESA EMITENTE:</td>
      <td>${data.companyName || ""}</td>
      <td style="font-weight:700; width:100px;">OBRA / LOCAL:</td>
      <td>${data.obraName || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;" colspan="1">DESCRIÇÃO DO SERVIÇO:</td>
      <td colspan="3">${data.serviceDescription || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;">DATA INÍCIO:</td>
      <td>${data.startDate ? format(new Date(data.startDate), "dd/MM/yyyy", { locale: ptBR }) : ""}</td>
      <td style="font-weight:700;">DATA VALIDADE:</td>
      <td>${data.endDate ? format(new Date(data.endDate), "dd/MM/yyyy", { locale: ptBR }) : ""}</td>
    </tr>
  </table>

  <!-- Riscos Potenciais -->
  <table style="margin-top:-1px;">
    <tr><td class="section-header">1. RISCOS POTENCIAIS</td></tr>
    <tr>
      <td style="padding:8px;">
        <div class="checkbox-list">
          <div class="checkbox-item">(${data.potentialRisks?.includes("Trabalho em Altura") ? "x" : " "}) Trabalho em Altura</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Eletricidade") ? "x" : " "}) Eletricidade</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Espaço Confinado") ? "x" : " "}) Espaço Confinado</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Trabalho a Quente") ? "x" : " "}) Trabalho a Quente</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Içamento de Cargas") ? "x" : " "}) Içamento de Cargas</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Agentes Químicos") ? "x" : " "}) Agentes Químicos</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Produtos Inflamáveis") ? "x" : " "}) Produtos Inflamáveis</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Ruído Elevado") ? "x" : " "}) Ruído Elevado</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Calor Excessivo") ? "x" : " "}) Calor Excessivo</div>
          <div class="checkbox-item">(${data.potentialRisks?.includes("Máquinas / Equipamentos") ? "x" : " "}) Máquinas / Equipamentos</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Medidas Preventivas -->
  <table style="margin-top:-1px;">
    <tr><td class="section-header">2. MEDIDAS PREVENTIVAS E EPI/EPC EXIGIDOS</td></tr>
    <tr>
      <td style="padding:8px;">
        <div class="checkbox-list">
          ${(data.protectiveMeasures || []).map((m: string) => `<div class="checkbox-item">(x) ${m}</div>`).join("")}
        </div>
      </td>
    </tr>
  </table>

  <!-- Equipe Autorizada -->
  <table style="margin-top:-1px;">
    <tr>
      <th class="section-header" colspan="3">3. EQUIPE AUTORIZADA</th>
    </tr>
    <tr>
      <th style="width:45%;">NOME</th>
      <th style="width:30%;">FUNÇÃO</th>
      <th style="width:25%;">ASSINATURA</th>
    </tr>
    ${(data.team || []).map((t: any) => `
    <tr>
      <td>${t.name || ""}</td>
      <td>${t.role || ""}</td>
      <td style="height:28px;"></td>
    </tr>`).join("")}
    ${Array.from({ length: Math.max(0, 5 - (data.team?.length || 0)) }).map(() =>
      `<tr><td style="height:24px;">&nbsp;</td><td></td><td></td></tr>`
    ).join("")}
  </table>

  <!-- Revalidações -->
  <table style="margin-top:-1px;">
    <tr><th class="section-header" colspan="3">4. REVALIDAÇÕES (MÁX. 6)</th></tr>
    <tr>
      <th style="width:18%;">DATA / HORA</th>
      <th style="width:50%;">OBSERVAÇÕES</th>
      <th style="width:32%;">RESP. LIBERAÇÃO</th>
    </tr>
    ${(data.revalidations || []).map((r: any) => `
    <tr>
      <td>${r.date ? format(new Date(r.date), "dd/MM/yyyy", { locale: ptBR }) : ""}</td>
      <td>${r.notes || ""}</td>
      <td>${r.responsible || ""}</td>
    </tr>`).join("")}
    ${Array.from({ length: emptyRevRows }).map(() =>
      `<tr><td style="height:22px; color:transparent;">.</td><td></td><td></td></tr>`
    ).join("")}
  </table>

  <!-- Assinaturas -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="text-align:center; padding:28px 20px 8px;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.issuerName || "Emitente"}</div>
        <div style="font-size:9px; color:#555;">Emitente (Segurança)</div>
      </td>
      <td style="text-align:center; padding:28px 20px 8px;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.supervisorName || "Responsável"}</div>
        <div style="font-size:9px; color:#555;">Responsável pela Tarefa</div>
      </td>
    </tr>
  </table>

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}

// ─── LISTA DE TREINAMENTO ─────────────────────────────────────────────────────
export async function generateTrainingPdf(data: any): Promise<Buffer> {
  data = await resolvePdfDataImages(data);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}
  </style></head><body>
<div class="page">

  <!-- Cabecalho padrao do documento -->
  <table class="doc-header">
    <tr>
      <td class="logo-cell">${pdfLogo(data)}</td>
      <td class="title-cell" style="font-size:13px;">LISTA DE PRESENÇA DE TREINAMENTO</td>
      <td style="width:120px; border:1px solid #000; padding:6px 10px; font-size:10px;">
        <div><strong>DATA:</strong> ${data.date ? format(new Date(data.date), "dd/MM/yyyy", { locale: ptBR }) : "__/__/____"}</div>
        <div style="margin-top:4px;"><strong>FL.:</strong> 1/1</div>
      </td>
    </tr>
  </table>

  <!-- Metadata -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="font-weight:700; font-style:italic;">Objetivo do Treinamento:</td>
      <td colspan="3">${data.topic || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700; font-style:italic; width:80px;">Empresa:</td>
      <td>${data.companyName || ""}</td>
      <td style="font-weight:700; font-style:italic; width:80px;">Local:</td>
      <td>${data.local || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700; font-style:italic;">Instrutor(es):</td>
      <td colspan="3">${data.instructorName || ""} ${data.instructorRegister ? `– MTE: ${data.instructorRegister}` : ""}</td>
    </tr>
  </table>

  <!-- Conteúdo Programático -->
  <table style="margin-top:-1px;">
    <tr><td class="section-header">Conteúdo Programático</td></tr>
    <tr><td style="height:90px; vertical-align:top; padding:8px;">${data.programmaticContent || ""}</td></tr>
  </table>

  <!-- Lista de Presença -->
  <table style="margin-top:-1px;">
    <tr>
      <th style="width:6%;">Item</th>
      <th style="width:42%;">Nome do Colaborador</th>
      <th style="width:18%;">CPF</th>
      <th style="width:34%;">Rubrica / Assinatura</th>
    </tr>
    ${(data.participants || []).map((p: any, i: number) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td>${p.name || ""}</td>
      <td style="text-align:center;">${p.document || ""}</td>
      <td style="height:28px; text-align:center;">
        ${p.signature ? `<img src="${p.signature}" style="max-height:24px;">` : ""}
      </td>
    </tr>`).join("")}
    ${Array.from({ length: Math.max(0, 20 - (data.participants?.length || 0)) }).map((_, i) => `
    <tr>
      <td style="text-align:center;">${(data.participants?.length || 0) + i + 1}</td>
      <td style="height:24px;">&nbsp;</td><td></td><td></td>
    </tr>`).join("")}
  </table>

  <!-- Assinatura Instrutor -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="text-align:center; padding:24px 20px 8px; width:50%; margin:0 auto;">
        ${data.instructorSignature ? `<img src="${data.instructorSignature}" style="max-height:40px; margin-bottom:4px;"><br>` : `<div style="height:40px;"></div>`}
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px; font-size:10px;">${data.instructorName || "Instrutor Responsável"}</div>
        <div style="font-size:9px; color:#555;">Instrutor Responsável${data.instructorRegister ? ` — MTE: ${data.instructorRegister}` : ""}</div>
      </td>
      <td style="width:50%;"></td>
    </tr>
  </table>

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}

// ─── ADVERTÊNCIA DISCIPLINAR ──────────────────────────────────────────────────
export async function generateWarningPdf(data: any): Promise<Buffer> {
  data = await resolvePdfDataImages(data);
  const typesMap: Record<string, string> = {
    verbal: "Verbal (Registro Formal)",
    escrita: "Escrita",
    suspensao: "com Suspensão",
    demissao: "com Justa Causa (Aviso Final)",
  };
  const typeStr = typesMap[data.type] || "Escrita";
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}
  body { padding: 0; }
  .letter { padding: 50px 60px; font-size: 12px; line-height: 1.8; }
  </style></head><body>
<div class="page">

  <table class="doc-header">
    <tr>
      <td class="logo-cell">${pdfLogo(data)}</td>
      <td class="title-cell">AVISO DE ADVERTÊNCIA ${typeStr.toUpperCase()}</td>
      <td class="rev-cell" style="font-size:9px;">
        Nº ADV-${String(data.warningNumber || "0000").padStart(4, '0')}<br>
        Disciplina Operacional<br>e Segurança
      </td>
    </tr>
  </table>

  <div class="letter">
    <p>À<br><strong>${data.employeeName || ""}</strong><br>Cargo: ${data.role || ""}<br>Empresa: ${data.companyName || ""}</p>
    <br>
    <p>Prezado(a) Senhor(a),</p>
    <br>
    <p>Viemos por meio desta informar-lhe formalmente que V.S.ª está recebendo uma <strong>Advertência ${typeStr}</strong>.</p>
    <br>
    <p><strong>Motivo / Desvio Identificado:</strong></p>
    <div style="background:#f9f9f9; border:1px solid #ccc; padding:12px 16px; margin:10px 0; font-weight:600;">
      ${data.reason || ""}
    </div>
    <p><strong>Observações Detalhadas:</strong><br>${data.description || ""}</p>
    <br>
    <p>Esta atitude é considerada uma violação das normas de segurança e procedimentos da empresa. Solicitamos que tal atitude não se repita, sob pena de medidas disciplinares mais severas, conforme previsto na legislação trabalhista vigente e normas internas.</p>
    <br>
    <p>Por favor, assine abaixo confirmando a ciência deste aviso.</p>
    <br>
    <p>Local e Data: ${data.location || ""}, ${data.date ? format(new Date(data.date), "dd/MM/yyyy", { locale: ptBR }) : genDate}</p>
  </div>

  <table style="margin:0 60px; width:calc(100% - 120px);">
    <tr>
      <td style="text-align:center; padding:40px 20px 8px; border:none;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.issuerName || "Representante da Empresa"}</div>
        <div style="font-size:9px; color:#555;">Representante da Empresa</div>
      </td>
      <td style="text-align:center; padding:40px 20px 8px; border:none;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.employeeName || "Empregado"}</div>
        <div style="font-size:9px; color:#555;">Empregado (Ciente)</div>
      </td>
    </tr>
  </table>

  ${data.witnessName ? `
  <table style="margin:16px 60px 0; width:calc(100% - 120px);">
    <tr>
      <td style="width:50%; border:none;"></td>
      <td style="text-align:center; padding:20px 20px 8px; border:none;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.witnessName}</div>
        <div style="font-size:9px; color:#555;">Testemunha</div>
      </td>
    </tr>
  </table>` : ""}

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}

// ─── GRO / PGR ────────────────────────────────────────────────────────────────
type PgrRiskItem = {
  agent?: unknown;
  name?: unknown;
  description?: unknown;
  type?: unknown;
  category?: unknown;
  source?: unknown;
  healthEffect?: unknown;
  probability?: unknown;
  severity?: unknown;
  consequence?: unknown;
  riskLevel?: unknown;
  level?: unknown;
};

type PgrActionItem = {
  riskRef?: unknown;
  action?: unknown;
  deadline?: unknown;
  status?: unknown;
};

type PgrStageItem = {
  name?: unknown;
  description?: unknown;
  subcontractorInfo?: {
    isSubcontracted?: boolean;
    teams?: Array<{ companyName?: unknown; cnpj?: unknown; activity?: unknown }>;
  };
};

const PGR_RISKS_PER_PAGE = 5;
const PGR_ACTIONS_PER_PAGE = 7;
const PGR_STAGES_PER_PAGE = 5;

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function pgrStatusLabel(status: unknown): string {
  const value = cleanText(status).toLowerCase();
  const labels: Record<string, string> = {
    em_elaboracao: "Em elaboração",
    vigente: "Vigente",
    revisao: "Revisão",
    cancelado: "Cancelado",
  };
  return labels[value] || cleanText(status, "N/A");
}

function pgrActionStatusLabel(status: unknown): string {
  const value = cleanText(status).toLowerCase();
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluído",
  };
  return labels[value] || cleanText(status, "N/A");
}

function pgrLevelFromScore(score: number): string {
  if (score <= 2) return "Muito Baixo";
  if (score <= 5) return "Baixo";
  if (score <= 10) return "Médio";
  if (score <= 16) return "Alto";
  if (score <= 20) return "Muito Alto";
  return "Extremo";
}

function normalizePgrLevel(level: unknown, probability?: unknown, severity?: unknown): string {
  const raw = cleanText(level);
  if (raw) {
    const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalized === "severo") return "Muito Alto";
    if (normalized === "grave") return "Alto";
    if (normalized === "medio") return "Médio";
    if (normalized === "muito baixo") return "Muito Baixo";
    if (normalized === "baixo") return "Baixo";
    if (normalized === "alto") return "Alto";
    if (normalized === "muito alto") return "Muito Alto";
    if (normalized === "extremo") return "Extremo";
    return raw;
  }

  const p = Number(probability);
  const c = Number(severity);
  if (Number.isFinite(p) && Number.isFinite(c) && p > 0 && c > 0) {
    return pgrLevelFromScore(p * c);
  }

  return "N/A";
}

function pgrLevelClass(level: unknown): string {
  const normalized = cleanText(level)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  return `risk-level-${normalized || "na"}`;
}

function normalizePgrRisk(risk: PgrRiskItem) {
  const probability = cleanText(risk.probability);
  const consequence = cleanText(risk.severity ?? risk.consequence);
  return {
    agent: cleanText(risk.agent ?? risk.name ?? risk.description, "N/A"),
    type: cleanText(risk.type ?? risk.category, "N/A"),
    source: cleanText(risk.source, "N/A"),
    healthEffect: cleanText(risk.healthEffect, "N/A"),
    probability: probability || "N/A",
    consequence: consequence || "N/A",
    riskLevel: normalizePgrLevel(risk.riskLevel ?? risk.level, probability, consequence),
  };
}

function normalizePgrAction(action: PgrActionItem) {
  return {
    riskRef: cleanText(action.riskRef, "N/A"),
    action: cleanText(action.action, "N/A"),
    deadline: formatPdfDate(action.deadline, "N/A"),
    status: pgrActionStatusLabel(action.status),
  };
}

function normalizePgrStage(stage: PgrStageItem) {
  const info = stage.subcontractorInfo || {};
  const teams = Array.isArray(info.teams) ? info.teams : [];
  return {
    name: cleanText(stage.name, "Etapa não informada"),
    activity: cleanText(stage.description, "N/A"),
    isSubcontracted: Boolean(info.isSubcontracted),
    teams: teams.map((team) => ({
      companyName: cleanText(team.companyName, "Empresa não informada"),
      cnpj: cleanText(team.cnpj, "S/CNPJ"),
      activity: cleanText(team.activity, "Atividade não informada"),
    })),
  };
}

function calcPgrSanitaryInstallations(workers: unknown) {
  const total = Number(workers);
  if (!Number.isFinite(total) || total <= 0) return null;
  const toiletsAndSinks = Math.ceil(total / 20);
  return {
    workers: total,
    toilets: toiletsAndSinks,
    sinks: toiletsAndSinks,
    urinals: toiletsAndSinks,
    showers: Math.ceil(total / 10),
  };
}

function renderRiskMatrixLegend(): string {
  const rows = Array.from({ length: 5 }, (_, probabilityIndex) => {
    const probability = 5 - probabilityIndex;
    const cells = Array.from({ length: 5 }, (_, consequenceIndex) => {
      const consequence = consequenceIndex + 1;
      const level = pgrLevelFromScore(probability * consequence);
      return `<td class="${pgrLevelClass(level)}">
        <strong>${probability * consequence}</strong>
        <span>${escapeLayoutHtml(level)}</span>
      </td>`;
    }).join("");
    return `<tr><th>${probability}</th>${cells}</tr>`;
  }).join("");

  return `<table class="pgr-risk-matrix">
    <thead>
      <tr><th class="corner">P/C</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderRiskClassificationTable(): string {
  const rows = [
    ["Muito Baixo", "1 a 2", "Acompanhamento de rotina e manutenção dos controles existentes."],
    ["Baixo", "3 a 5", "Controle preventivo com verificação periódica."],
    ["Médio", "6 a 10", "Plano de ação definido e monitoramento do responsável técnico."],
    ["Alto", "11 a 16", "Ação prioritária, controle operacional e bloqueios quando aplicável."],
    ["Muito Alto", "17 a 20", "Intervenção imediata e reavaliação antes da continuidade da atividade."],
    ["Extremo", "21 a 25", "Interrupção da atividade até implantação de controle eficaz."],
  ];

  return `<table class="pgr-classification-table">
    <thead><tr><th>Classificação</th><th>Faixa</th><th>Critério de controle</th></tr></thead>
    <tbody>
      ${rows.map(([level, range, criteria]) => `<tr>
        <td><span class="pgr-level-badge ${pgrLevelClass(level)}">${escapeLayoutHtml(level)}</span></td>
        <td>${escapeLayoutHtml(range)}</td>
        <td>${escapeLayoutHtml(criteria)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderPgrRiskTable(risks: PgrRiskItem[]): string {
  const normalized = risks.map(normalizePgrRisk);
  if (normalized.length === 0) {
    return `<div class="pgr-empty">Nenhum risco cadastrado para este PGR.</div>`;
  }

  return `<table class="pgr-data-table pgr-risk-table">
    <thead>
      <tr>
        <th>Risco</th>
        <th>Tipo</th>
        <th>Fonte geradora</th>
        <th>Possíveis danos à saúde</th>
        <th>P</th>
        <th>C</th>
        <th>Nível do risco</th>
      </tr>
    </thead>
    <tbody>
      ${normalized.map((risk) => `<tr>
        <td>${escapeLayoutHtml(risk.agent)}</td>
        <td>${escapeLayoutHtml(risk.type)}</td>
        <td>${escapeLayoutHtml(risk.source)}</td>
        <td>${escapeLayoutHtml(risk.healthEffect)}</td>
        <td class="pgr-center">${escapeLayoutHtml(risk.probability)}</td>
        <td class="pgr-center">${escapeLayoutHtml(risk.consequence)}</td>
        <td class="pgr-center"><span class="pgr-level-badge ${pgrLevelClass(risk.riskLevel)}">${escapeLayoutHtml(risk.riskLevel)}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderPgrActionTable(actions: PgrActionItem[]): string {
  const normalized = actions.map(normalizePgrAction);
  if (normalized.length === 0) {
    return `<div class="pgr-empty">Nenhuma ação cadastrada para este PGR.</div>`;
  }

  return `<table class="pgr-data-table pgr-action-table">
    <thead>
      <tr>
        <th>Risco referência</th>
        <th>Ação proposta</th>
        <th>Prazo</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${normalized.map((action) => `<tr>
        <td>${escapeLayoutHtml(action.riskRef)}</td>
        <td>${escapeLayoutHtml(action.action)}</td>
        <td class="pgr-center">${escapeLayoutHtml(action.deadline)}</td>
        <td class="pgr-center">${escapeLayoutHtml(action.status)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderPgrStagesTable(stages: PgrStageItem[]): string {
  const normalized = stages.map(normalizePgrStage);
  if (normalized.length === 0) {
    return `<div class="pgr-empty">Nenhuma etapa, atividade ou equipe cadastrada para este PGR.</div>`;
  }

  return `<table class="pgr-data-table pgr-stages-table">
    <thead>
      <tr>
        <th>Etapa/equipe</th>
        <th>Atividade</th>
        <th>Terceirizado</th>
        <th>Dados do terceirizado</th>
      </tr>
    </thead>
    <tbody>
      ${normalized.map((stage) => `<tr>
        <td>${escapeLayoutHtml(stage.name)}</td>
        <td>${escapeLayoutHtml(stage.activity)}</td>
        <td class="pgr-center">${stage.isSubcontracted ? "Sim" : "Não"}</td>
        <td>
          ${stage.isSubcontracted && stage.teams.length
            ? stage.teams.map((team) => `<div class="pgr-team-line">
              <strong>${escapeLayoutHtml(team.companyName)}</strong><br />
              CNPJ: ${escapeLayoutHtml(team.cnpj)}<br />
              Atividade: ${escapeLayoutHtml(team.activity)}
            </div>`).join("")
            : "Execução própria"}
        </td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderPgrSanitaryBlock(workers: unknown): string {
  const specs = calcPgrSanitaryInstallations(workers);
  if (!specs) {
    return `<section class="pgr-section pgr-sanitary">
      <h2>Instalações sanitárias</h2>
      <p>Não informado no cadastro do PGR.</p>
    </section>`;
  }

  return `<section class="pgr-section pgr-sanitary">
    <h2>Instalações sanitárias</h2>
    <div class="pgr-sanitary-grid">
      <div><span>Trabalhadores</span><strong>${specs.workers}</strong></div>
      <div><span>Vasos sanitários</span><strong>${specs.toilets}</strong></div>
      <div><span>Lavatórios</span><strong>${specs.sinks}</strong></div>
      <div><span>Mictórios</span><strong>${specs.urinals}</strong></div>
      <div><span>Chuveiros</span><strong>${specs.showers}</strong></div>
    </div>
  </section>`;
}

export async function buildGroPdfHtml(data: any): Promise<string> {
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  const clientLogoUrl = await resolveLayoutPdfImage(data.clientLogoUrl || data.logoUrl);
  const signatureUrl = await resolveLayoutPdfImage(data.signatureUrl);
  const risks: PgrRiskItem[] = Array.isArray(data.riskMatrix) ? data.riskMatrix : [];
  const actions: PgrActionItem[] = Array.isArray(data.actionPlan) ? data.actionPlan : [];
  const stages: PgrStageItem[] = Array.isArray(data.stages) ? data.stages : [];
  const riskChunks = chunkItems(risks, PGR_RISKS_PER_PAGE);
  const actionChunks = chunkItems(actions, PGR_ACTIONS_PER_PAGE);
  const stageChunks = chunkItems(stages, PGR_STAGES_PER_PAGE);
  const validUntil = formatPdfDate(data.validUntil, "N/A");
  const validFrom = formatPdfDate(data.validFrom || data.createdAt, genDate);
  const location = cleanText(data.obraAddress || data.location || data.companyAddress, "N/A");
  const observations = cleanText(data.observations || data.rawContent, "Não informado.");

  const definitions: Array<{ title: string; className?: string; children: string }> = [
    {
      title: "RELATÓRIO DO PGR",
      className: "pgr-page pgr-cover-page",
      children: `<section class="pgr-cover">
        <div class="pgr-cover-logo">
          ${clientLogoUrl ? `<img src="${escapeLayoutHtml(clientLogoUrl)}" alt="${escapeLayoutHtml(data.companyName || "Cliente")}" />` : `<span>${escapeLayoutHtml(data.companyName || "Cliente")}</span>`}
        </div>
        <div class="pgr-cover-title">
          <span>Programa de Gerenciamento de Riscos</span>
          <h1>RELATÓRIO DO PGR</h1>
          <p>${escapeLayoutHtml(data.title || "PGR/GRO")}</p>
        </div>
        <dl class="pgr-cover-meta">
          <div><dt>Empresa</dt><dd>${escapeLayoutHtml(data.companyName || "N/A")}</dd></div>
          <div><dt>Empreendimento/obra</dt><dd>${escapeLayoutHtml(data.obraName || "N/A")}</dd></div>
          <div><dt>Local da obra</dt><dd>${escapeLayoutHtml(location)}</dd></div>
        </dl>
      </section>`,
    },
    {
      title: "PGR/GRO - INTRODUÇÃO",
      className: "pgr-page pgr-intro-page",
      children: `<section class="pgr-section pgr-intro-text">
        <h2>Introdução</h2>
        <p>Este relatório consolida o Programa de Gerenciamento de Riscos ocupacionais da empresa, reunindo a identificação de perigos, a avaliação dos riscos e o plano de ação necessário para manter as atividades sob controle.</p>
        <p>O PGR/GRO atende aos princípios da NR-01, que estabelece as diretrizes gerais de gerenciamento de riscos ocupacionais, e considera as exigências aplicáveis da NR-18 para a indústria da construção, especialmente quanto ao planejamento das etapas da obra, medidas preventivas, equipes envolvidas e controles operacionais.</p>
        <p>A matriz abaixo cruza Probabilidade (P) e Consequência (C) em escala de 1 a 5 para classificar prioridades de controle e orientar o acompanhamento do plano de ação.</p>
      </section>
      <section class="pgr-section pgr-matrix-section">
        <div>
          <h2>Matriz de risco 5x5</h2>
          ${renderRiskMatrixLegend()}
        </div>
        <div>
          <h2>Classificação</h2>
          ${renderRiskClassificationTable()}
        </div>
      </section>`,
    },
    {
      title: "PGR/GRO - DADOS DO PGR",
      className: "pgr-page pgr-data-page",
      children: `<section class="pgr-section">
        ${InfoGrid([
          { label: "Empresa", value: data.companyName, wide: true },
          { label: "Obra", value: data.obraName || "N/A" },
          { label: "Revisão", value: data.version || "1.0" },
          { label: "Responsável técnico", value: data.responsibleName || "N/A", wide: true },
          { label: "Status", value: pgrStatusLabel(data.status) },
          { label: "Validade", value: validUntil },
          { label: "Data de emissão", value: validFrom },
          { label: "Local da obra", value: location, wide: true },
          { label: "CNPJ", value: data.cnpj || "N/A" },
        ])}
      </section>
      <section class="pgr-section pgr-observations">
        <h2>Observações gerais</h2>
        <p>${escapeLayoutHtml(observations)}</p>
      </section>
      ${renderPgrSanitaryBlock(data.nr24Workers)}`,
    },
  ];

  stageChunks.forEach((chunk, index) => {
    definitions.push({
      title: "PGR/GRO - ETAPAS E EQUIPES",
      className: "pgr-page pgr-stages-page",
      children: `<section class="pgr-section">
        <div class="pgr-section-heading">
          <span>Etapas/equipes</span>
          <small>${index + 1} de ${stageChunks.length}</small>
        </div>
        ${renderPgrStagesTable(chunk)}
      </section>`,
    });
  });

  riskChunks.forEach((chunk, index) => {
    definitions.push({
      title: "PGR/GRO - RISCOS",
      className: "pgr-page pgr-risks-page",
      children: `<section class="pgr-section">
        <div class="pgr-section-heading">
          <span>Tabela de riscos</span>
          <small>${index + 1} de ${riskChunks.length}</small>
        </div>
        ${renderPgrRiskTable(chunk)}
      </section>`,
    });
  });

  actionChunks.forEach((chunk, index) => {
    definitions.push({
      title: "PGR/GRO - PLANO DE AÇÃO",
      className: "pgr-page pgr-actions-page",
      children: `<section class="pgr-section">
        <div class="pgr-section-heading">
          <span>Plano de ação</span>
          <small>${index + 1} de ${actionChunks.length}</small>
        </div>
        ${renderPgrActionTable(chunk)}
      </section>`,
    });
  });

  definitions.push({
    title: "PGR/GRO - ENCERRAMENTO",
    className: "pgr-page pgr-final-page",
    children: `<section class="pgr-section pgr-closing">
      <h2>Encerramento do PGR</h2>
      <p>O presente Programa de Gerenciamento de Riscos deve ser mantido disponível aos responsáveis pela execução das atividades, atualizado sempre que houver alterações de processo, ambiente, equipe ou medidas de controle, e acompanhado conforme o plano de ação definido.</p>
      <p>Data de emissão: <strong>${escapeLayoutHtml(genDate)}</strong></p>
    </section>
    ${SignatureBlock({
      title: "Assinatura",
      entries: [{
        imageUrl: signatureUrl,
        name: data.responsibleName || "Responsável Técnico",
        role: "Responsável Técnico",
        date: genDate,
      }],
    })}`,
  });

  const pageCount = definitions.length;
  const pages = definitions.map((definition, index) => DocumentPage({
    title: definition.title,
    logoUrl: clientLogoUrl,
    logoFallback: data.companyName || "TACT",
    footerText: `Página ${index + 1} de ${pageCount} | Documento gerado pelo TACT`,
    className: definition.className || "pgr-page",
    children: definition.children,
  }));

  return BaseDocumentLayout({
    title: `PGR - ${data.companyName || data.title || "TACT"}`,
    pages,
    extraCss: pgrLayoutCss,
  });
}

export async function generateGroPdf(data: any): Promise<Buffer> {
  const html = await buildGroPdfHtml(data);
  return renderPdf(html, { margin: { top: "0", right: "0", bottom: "0", left: "0" } });
}

const pgrLayoutCss = `
  .pgr-page .document-content { gap: 5mm; }
  .pgr-cover {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 10mm;
  }
  .pgr-cover-logo {
    width: 78mm;
    min-height: 34mm;
    border: 1px solid #cfd8df;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5mm;
    background: #fff;
  }
  .pgr-cover-logo img {
    max-width: 100%;
    max-height: 28mm;
    object-fit: contain;
    display: block;
  }
  .pgr-cover-logo span {
    color: #293f4d;
    font-size: 16px;
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
  }
  .pgr-cover-title {
    align-self: center;
    border-left: 1.6mm solid #d64a00;
    padding-left: 7mm;
  }
  .pgr-cover-title span {
    color: #53616f;
    display: block;
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 4mm;
    text-transform: uppercase;
  }
  .pgr-cover-title h1 {
    color: #293f4d;
    font-size: 36px;
    line-height: 1.05;
    margin: 0 0 5mm;
    text-transform: uppercase;
  }
  .pgr-cover-title p {
    color: #1f2933;
    font-size: 14px;
    font-weight: 700;
    margin: 0;
  }
  .pgr-cover-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid #cfd8df;
    margin: 0;
  }
  .pgr-cover-meta div {
    border-right: 1px solid #d9e0e6;
    min-height: 24mm;
    padding: 4mm;
  }
  .pgr-cover-meta div:last-child { border-right: 0; }
  .pgr-cover-meta dt {
    color: #53616f;
    font-size: 8px;
    font-weight: 900;
    margin: 0 0 2mm;
    text-transform: uppercase;
  }
  .pgr-cover-meta dd {
    color: #1f2933;
    font-size: 11px;
    font-weight: 800;
    margin: 0;
  }
  .pgr-section {
    border: 1px solid #cfd8df;
    background: #fff;
    padding: 4mm;
  }
  .pgr-section h2 {
    color: #293f4d;
    font-size: 11px;
    line-height: 1.2;
    margin: 0 0 3mm;
    text-transform: uppercase;
  }
  .pgr-section p {
    color: #1f2933;
    font-size: 10.5px;
    margin: 0 0 2.7mm;
  }
  .pgr-section p:last-child { margin-bottom: 0; }
  .pgr-intro-text { min-height: 47mm; }
  .pgr-matrix-section {
    display: grid;
    grid-template-columns: 0.82fr 1.18fr;
    gap: 4mm;
    border: 0;
    padding: 0;
    background: transparent;
  }
  .pgr-matrix-section > div {
    border: 1px solid #cfd8df;
    padding: 4mm;
    background: #fff;
  }
  .pgr-risk-matrix,
  .pgr-classification-table,
  .pgr-data-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .pgr-risk-matrix th,
  .pgr-risk-matrix td,
  .pgr-classification-table th,
  .pgr-classification-table td,
  .pgr-data-table th,
  .pgr-data-table td {
    border: 1px solid #cfd8df;
    padding: 2.2mm;
    vertical-align: top;
  }
  .pgr-risk-matrix th,
  .pgr-classification-table th,
  .pgr-data-table th {
    background: #293f4d;
    color: #fff;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .pgr-risk-matrix td {
    height: 15mm;
    text-align: center;
  }
  .pgr-risk-matrix td strong {
    display: block;
    font-size: 11px;
    line-height: 1;
  }
  .pgr-risk-matrix td span {
    display: block;
    font-size: 6.7px;
    font-weight: 800;
    line-height: 1.1;
    margin-top: 1.5mm;
    text-transform: uppercase;
  }
  .pgr-classification-table th:nth-child(1) { width: 28mm; }
  .pgr-classification-table th:nth-child(2) { width: 17mm; }
  .pgr-classification-table td {
    font-size: 8.3px;
    line-height: 1.25;
  }
  .pgr-level-badge {
    border: 1px solid transparent;
    display: inline-block;
    font-size: 7.5px;
    font-weight: 900;
    line-height: 1.1;
    padding: 1.4mm 1.8mm;
    text-transform: uppercase;
  }
  .risk-level-muito-baixo { background: #dbeafe; border-color: #60a5fa; color: #1d4ed8; }
  .risk-level-baixo { background: #dcfce7; border-color: #86efac; color: #166534; }
  .risk-level-medio { background: #fef9c3; border-color: #fde047; color: #854d0e; }
  .risk-level-alto { background: #fed7aa; border-color: #fb923c; color: #9a3412; }
  .risk-level-muito-alto { background: #f3e8ff; border-color: #c084fc; color: #6b21a8; }
  .risk-level-extremo { background: #111827; border-color: #111827; color: #fff; }
  .risk-level-na { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
  .pgr-observations {
    min-height: 33mm;
  }
  .pgr-sanitary {
    min-height: 35mm;
  }
  .pgr-sanitary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2mm;
  }
  .pgr-sanitary-grid div {
    border: 1px solid #d9e0e6;
    min-height: 18mm;
    padding: 3mm;
    text-align: center;
  }
  .pgr-sanitary-grid span {
    color: #53616f;
    display: block;
    font-size: 7.5px;
    font-weight: 900;
    margin-bottom: 2mm;
    text-transform: uppercase;
  }
  .pgr-sanitary-grid strong {
    color: #293f4d;
    display: block;
    font-size: 16px;
  }
  .pgr-section-heading {
    align-items: center;
    border-left: 1.4mm solid #d64a00;
    display: flex;
    justify-content: space-between;
    margin-bottom: 3mm;
    padding-left: 3mm;
  }
  .pgr-section-heading span {
    color: #293f4d;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .pgr-section-heading small {
    color: #53616f;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .pgr-data-table td {
    color: #1f2933;
    font-size: 8.8px;
    line-height: 1.22;
  }
  .pgr-stages-table th:nth-child(1) { width: 29mm; }
  .pgr-stages-table th:nth-child(2) { width: 45mm; }
  .pgr-stages-table th:nth-child(3) { width: 19mm; }
  .pgr-risk-table th:nth-child(1) { width: 24mm; }
  .pgr-risk-table th:nth-child(2) { width: 20mm; }
  .pgr-risk-table th:nth-child(5),
  .pgr-risk-table th:nth-child(6) { width: 11mm; }
  .pgr-risk-table th:nth-child(7) { width: 25mm; }
  .pgr-action-table th:nth-child(1) { width: 33mm; }
  .pgr-action-table th:nth-child(3) { width: 22mm; }
  .pgr-action-table th:nth-child(4) { width: 28mm; }
  .pgr-center { text-align: center; }
  .pgr-team-line + .pgr-team-line {
    border-top: 1px solid #d9e0e6;
    margin-top: 2mm;
    padding-top: 2mm;
  }
  .pgr-empty {
    align-items: center;
    border: 1px dashed #cfd8df;
    color: #7b8794;
    display: flex;
    font-size: 10px;
    font-weight: 800;
    justify-content: center;
    min-height: 42mm;
    text-transform: uppercase;
  }
  .pgr-closing {
    min-height: 72mm;
  }
  .pgr-final-page .signature-block {
    margin-top: auto;
  }
  .pgr-final-page .signature-row {
    grid-template-columns: minmax(0, 1fr) !important;
    max-width: 92mm;
    margin: 0 auto;
  }
`;

// ─── CHECKLIST (V2) ─────────────────────────────────────────────────────────────
export async function generateChecklistPdfLegacy(data: any): Promise<Buffer> {
  data = await resolvePdfDataImages(data);
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  
  // Format score
  let scoreHtml = "";
  if (data.score !== undefined && data.score !== null) {
    const scoreVal = parseFloat(data.score);
    let scoreColor = scoreVal >= 80 ? "#166534" : (scoreVal >= 50 ? "#854d0e" : "#991b1b");
    let scoreBg = scoreVal >= 80 ? "#dcfce7" : (scoreVal >= 50 ? "#fef08a" : "#fee2e2");
    let scoreBorder = scoreVal >= 80 ? "#bbf7d0" : (scoreVal >= 50 ? "#fde047" : "#fecaca");
    scoreHtml = `<div style="background-color: ${scoreBg}; color: ${scoreColor}; border: 1px solid ${scoreBorder}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px; text-align: center; margin-top: 5px;">SCORE: ${scoreVal.toFixed(1)}% Conformidade</div>`;
  }

const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}
  th { padding: 8px; }
  td { padding: 8px; vertical-align: middle; }
  .status-tag { font-weight: bold; border-radius: 4px; padding: 4px 8px; text-transform: uppercase; font-size: 10px; display: inline-block; width: 60px; text-align: center;}
  .status-ok { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .status-nok { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .status-na { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
  .item-img { max-width: 150px; max-height: 150px; border-radius: 4px; border: 1px solid #ccc; margin-right: 8px; margin-top: 8px; display: inline-block; object-fit: cover;}
  </style></head><body>
<div class="page">
  <table class="doc-header">
    <tr>
      <td class="logo-cell" style="width: 25%;">${pdfLogo(data)}</td>
      <td class="title-cell" style="width: 50%;">
        <div style="font-size: 16px;">CHECKLIST DE INSPEÇÃO</div>
        ${scoreHtml}
      </td>
      <td class="rev-cell" style="width: 25%;">CHK_REV_00</td>
    </tr>
  </table>

  <table style="margin-top:-1px;">
    <tr><td colspan="4" class="section-header">DADOS DA INSPEÇÃO</td></tr>
    <tr>
      <td style="font-weight:700; width:100px; padding-left: 10px;">EMPRESA:</td>
      <td colspan="3" style="font-weight:600;">${data.companyName || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700; padding-left: 10px;">PROJETO/OBRA:</td>
      <td style="font-weight:600; width: 40%;">${data.projectName || ""}</td>
      <td style="font-weight:700; width:60px;">DATA:</td>
      <td style="font-weight:600;">${data.date ? format(new Date(data.date), "dd/MM/yyyy", { locale: ptBR }) : genDate}</td>
    </tr>
    <tr>
      <td style="font-weight:700; padding-left: 10px;">MODELO:</td>
      <td colspan="3" style="font-weight:600;">${data.templateName || ""}</td>
    </tr>
  </table>

  <!-- Tabela de verificação -->
  <table style="margin-top:-1px;">
    <tr>
      <th style="width:50%; text-align: left; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px;">ITEM DE VERIFICAÇÃO</th>
      <th style="width:15%; text-align: center; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px;">STATUS</th>
      <th style="width:35%; text-align: left; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px;">OBSERVAÇÕES E EVIDÊNCIAS</th>
    </tr>
    
    ${(data.items || []).map((item: any) => {
      let statusClass = "status-na";
      let statusText = item.status || "N/A";
      
      if (item.status === "OK") statusClass = "status-ok";
      if (item.status === "NÃO OK") statusClass = "status-nok";
      
      const imagesHtml = (item.mediaUrls || []).map((url: string) => 
        `<img src="${url}" class="item-img" />`
      ).join("");

      return `
      <tr>
        <td style="vertical-align: top; padding-top: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight:700; font-size: 12px; color: #1e293b;">${item.name || ""}</div>
          ${item.description ? `<div style="font-size:10px; color:#475569; margin-top:4px; line-height: 1.4;">${item.description}</div>` : ""}
          ${item.norma ? `<div style="font-size:9px; color:#c2410c; margin-top:6px; font-weight: 600;">[Ref: ${item.norma}]</div>` : ""}
        </td>
        <td style="text-align:center; vertical-align: top; padding-top: 12px; border-bottom: 1px solid #e2e8f0;">
          <span class="status-tag ${statusClass}">${statusText}</span>
        </td>
        <td style="vertical-align: top; padding-top: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: #334155; line-height: 1.5;">${item.observation || "<span style='color:#94a3b8;font-style:italic;'>Sem observações</span>"}</div>
          ${imagesHtml ? `<div style="margin-top: 8px;">${imagesHtml}</div>` : ""}
        </td>
      </tr>
      `;
    }).join("")}
    
    ${data.items?.length === 0 ? `<tr><td colspan="3" style="text-align:center; padding: 30px; color: #64748b;">Nenhum item preenchido neste checklist.</td></tr>` : ''}
  </table>

  <!-- Assinatura -->
  <table style="margin-top:30px; border:none; width: 100%;">
    <tr>
      <td style="text-align:center; padding:10px 20px; width:100%; border:none;">
        ${data.signatureUrl ? 
          `<img src="${data.signatureUrl}" style="height: 100px; object-fit: contain; margin-bottom: -10px;" />` 
        : 
          `<div style="height: 80px;"></div>`
        }
        <div style="width: 300px; height: 1px; background-color: #000; margin: 0 auto;"></div>
        <div style="font-weight:700; margin-top:6px; font-size: 13px;">${data.inspectorName || "Inspetor/Técnico"}</div>
        <div style="font-size:10px; color:#555;">Técnico Responsável pela Inspeção</div>
      </td>
    </tr>
  </table>

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}

// Checklist pilot layout. Other document generators stay on the legacy renderer
// until this base is approved in the next migration phases.
type ChecklistPdfItem = {
  name?: string;
  description?: string;
  norma?: string;
  status?: string;
  observation?: string;
  mediaUrls: string[];
};

const CHECKLIST_PAGE_UNITS = 4;
const CHECKLIST_SIGNATURE_PAGE_UNITS = 2;

function formatPdfDate(value: unknown, fallback: string): string {
  if (!value) return fallback;
  try {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: ptBR });
    }

    const date = new Date(value as any);
    if (Number.isNaN(date.getTime())) return fallback;
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return String(value);
  }
}

function checklistItemWeight(item: ChecklistPdfItem): number {
  const textSize = `${item.name || ""}${item.description || ""}${item.observation || ""}${item.norma || ""}`.length;
  const evidenceWeight = item.mediaUrls.length > 0 ? 2 : 1;
  const textWeight = textSize > 380 ? 1 : 0;
  return Math.min(evidenceWeight + textWeight, CHECKLIST_PAGE_UNITS);
}

function paginateChecklistItems(items: ChecklistPdfItem[]): ChecklistPdfItem[][] {
  const pages: ChecklistPdfItem[][] = [];
  let currentPage: ChecklistPdfItem[] = [];
  let currentUnits = 0;

  for (const item of items) {
    const itemUnits = checklistItemWeight(item);
    if (currentPage.length > 0 && currentUnits + itemUnits > CHECKLIST_PAGE_UNITS) {
      pages.push(currentPage);
      currentPage = [];
      currentUnits = 0;
    }

    currentPage.push(item);
    currentUnits += itemUnits;
  }

  if (currentPage.length > 0) pages.push(currentPage);
  if (pages.length === 0) pages.push([]);

  const lastPageUnits = pages[pages.length - 1].reduce((sum, item) => sum + checklistItemWeight(item), 0);
  if (lastPageUnits > CHECKLIST_SIGNATURE_PAGE_UNITS) pages.push([]);

  return pages;
}

function renderChecklistScore(score: unknown): string {
  if (score === undefined || score === null || score === "") return "";
  const scoreValue = Number(score);
  if (!Number.isFinite(scoreValue)) return "";

  const tone = scoreValue >= 80 ? "good" : scoreValue >= 50 ? "warn" : "bad";
  const label = scoreValue >= 80 ? "Conformidade alta" : scoreValue >= 50 ? "Atencao" : "Critico";

  return `<aside class="score-card score-${tone}">
    <div class="score-label">Score</div>
    <div class="score-value">${scoreValue.toFixed(1)}%</div>
    <div class="score-caption">${escapeLayoutHtml(label)}</div>
  </aside>`;
}

function renderChecklistItem(item: ChecklistPdfItem, absoluteIndex: number): string {
  const hasEvidence = item.mediaUrls.length > 0;
  const descriptionHtml = item.description
    ? `<p class="item-description">${escapeLayoutHtml(item.description)}</p>`
    : `<p class="item-description item-muted">Sem descricao adicional.</p>`;
  const normaHtml = item.norma
    ? `<div class="item-standard">Norma: ${escapeLayoutHtml(item.norma)}</div>`
    : "";
  const observationHtml = item.observation
    ? escapeLayoutHtml(item.observation)
    : `<span class="item-muted">Sem observacoes registradas.</span>`;

  const itemCopy = `<div class="item-copy">
    <div class="item-header">
      <div>
        <div class="item-kicker">Item ${absoluteIndex + 1}</div>
        <h3>${escapeLayoutHtml(item.name || "Item de verificacao")}</h3>
      </div>
      ${StatusTag(item.status)}
    </div>
    ${descriptionHtml}
    ${normaHtml}
    <div class="item-observation">
      <div class="item-observation-label">Consideracoes</div>
      <div>${observationHtml}</div>
    </div>
  </div>`;

  if (!hasEvidence) {
    return `<article class="checklist-item checklist-item-compact">${itemCopy}</article>`;
  }

  return `<article class="checklist-item checklist-item-evidence">
    ${itemCopy}
    <div class="evidence-panel">
      <div class="evidence-title">Evidencia visual</div>
      ${EvidenceImageGrid(item.mediaUrls, { maxImages: 4 })}
    </div>
  </article>`;
}

export async function buildChecklistPdfHtml(data: any): Promise<string> {
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  const documentDate = formatPdfDate(data.date, genDate);
  const clientLogoUrl = await resolveLayoutPdfImage(data.clientLogoUrl || data.technicianLogoUrl || data.logoUrl);
  const signatureUrl = await resolveLayoutPdfImage(data.signatureUrl);
  const items: ChecklistPdfItem[] = await Promise.all((data.items || []).map(async (item: any) => ({
    name: item?.name,
    description: item?.description,
    norma: item?.norma,
    status: item?.status,
    observation: item?.observation,
    mediaUrls: await resolveLayoutPdfImages(item?.mediaUrls || []),
  })));

  const pageItems = paginateChecklistItems(items);
  const scoreHtml = renderChecklistScore(data.score);
  const pageCount = pageItems.length;

  const pages = pageItems.map((itemsOnPage, pageIndex) => {
    const includeSignature = pageIndex === pageCount - 1;
    const pageStartIndex = pageItems
      .slice(0, pageIndex)
      .reduce((sum, page) => sum + page.length, 0);

    const itemsHtml = itemsOnPage.length > 0
      ? itemsOnPage.map((item, index) => renderChecklistItem(item, pageStartIndex + index)).join("")
      : `<div class="checklist-empty">Nenhum item adicional nesta pagina. Assinatura preservada em area segura.</div>`;

    return DocumentPage({
      title: "CheckList",
      logoUrl: clientLogoUrl,
      logoFallback: data.companyName || "TACT",
      footerText: `Pagina ${pageIndex + 1} de ${pageCount} | Documento gerado pelo TACT`,
      className: includeSignature ? "checklist-page checklist-page-final" : "checklist-page",
      children: `
        <section class="checklist-summary ${scoreHtml ? "has-score" : "no-score"}">
          ${InfoGrid([
            { label: "Empresa", value: data.companyName, wide: true },
            { label: "Projeto / Obra", value: data.projectName || "N/A" },
            { label: "Data", value: documentDate },
            { label: "Tema CheckList", value: data.templateName, wide: true },
            { label: "Tecnico", value: data.inspectorName || "Inspetor/Tecnico", wide: true },
          ])}
          ${scoreHtml}
        </section>
        <section class="checklist-items">${itemsHtml}</section>
        ${includeSignature ? SignatureBlock({
          title: "Responsavel pela inspecao",
          entries: [{
            imageUrl: signatureUrl,
            name: data.inspectorName || "Inspetor/Tecnico",
            role: "Tecnico Responsavel pela Inspecao",
            date: documentDate,
          }],
        }) : ""}
      `,
    });
  });

  return BaseDocumentLayout({
    title: `Checklist - ${data.templateName || data.companyName || "TACT"}`,
    pages,
    extraCss: checklistPilotCss,
  });
}

export async function generateChecklistPdf(data: any): Promise<Buffer> {
  const html = await buildChecklistPdfHtml(data);
  return renderPdf(html, { margin: { top: "0", right: "0", bottom: "0", left: "0" } });
}

const checklistPilotCss = `
  .checklist-summary {
    display: grid;
    grid-template-columns: 1fr 38mm;
    gap: 4mm;
    align-items: stretch;
  }
  .checklist-summary.no-score { grid-template-columns: 1fr; }
  .checklist-summary .info-grid { min-height: 35mm; }
  .score-card {
    border: 1px solid #cfd8df;
    padding: 4mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    background: #fff;
  }
  .score-card.score-good { border-color: #86efac; background: #f0fdf4; color: #166534; }
  .score-card.score-warn { border-color: #fde047; background: #fefce8; color: #854d0e; }
  .score-card.score-bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
  .score-label,
  .score-caption {
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .score-value {
    font-size: 22px;
    font-weight: 900;
    line-height: 1.1;
    margin: 1.5mm 0;
  }
  .checklist-items {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4mm;
  }
  .checklist-empty {
    min-height: 45mm;
    border: 1px dashed #cfd8df;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    font-weight: 800;
    text-align: center;
    text-transform: uppercase;
  }
  .checklist-item {
    border: 1px solid #cfd8df;
    background: #fff;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .checklist-item-compact {
    min-height: 40mm;
    padding: 4mm;
  }
  .checklist-item-evidence {
    min-height: 72mm;
    display: grid;
    grid-template-columns: 75mm 1fr;
    gap: 4mm;
    padding: 4mm;
  }
  .item-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .item-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 3mm;
  }
  .item-kicker {
    color: #d64a00;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .item-header h3 {
    color: #1f2933;
    font-size: 12.5px;
    line-height: 1.2;
    margin: 1mm 0 0;
    overflow-wrap: anywhere;
  }
  .item-description {
    color: #53616f;
    font-size: 9.5px;
    margin: 2.5mm 0 0;
    overflow-wrap: anywhere;
  }
  .item-standard {
    color: #d64a00;
    font-size: 8.5px;
    font-weight: 800;
    margin-top: 2mm;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .item-observation {
    margin-top: auto;
    border-left: 2px solid #d64a00;
    background: #f8fafc;
    padding: 2.5mm 3mm;
    color: #1f2933;
    font-size: 9.5px;
    overflow-wrap: anywhere;
  }
  .item-observation-label {
    color: #53616f;
    font-size: 8px;
    font-weight: 900;
    margin-bottom: 1mm;
    text-transform: uppercase;
  }
  .item-muted {
    color: #7b8794;
    font-style: italic;
  }
  .evidence-panel {
    min-height: 62mm;
    display: flex;
    flex-direction: column;
    gap: 2mm;
  }
  .evidence-title {
    color: #53616f;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .evidence-panel .evidence-grid { flex: 1; min-height: 55mm; }
`;
// =============================================================================
// ITS - Instrucao Tecnica de Seguranca
// Layout: one compact card per page matching the official ITS.pdf model
// Content JSON fields: {theme, date, duration, participant, technician, notes}
// =============================================================================

export interface ItsData {
  code?: string;
  title: string;
  description?: string;
  content?: string; // JSON string: {theme, date, duration, participant, technician, notes}
  status?: string;
  companyName?: string;
  obraName?: string;
  obraAddress?: string;
  createdAt?: Date | string;
  authorName?: string;
  clientLogoUrl?: string;
}

export async function generateItsPdf(data: ItsData): Promise<Buffer> {
  data = await resolvePdfDataImages(data as any) as ItsData;
  // Parse structured content JSON
  let parsed: Record<string, string> = {};
  if (data.content) {
    try { parsed = JSON.parse(data.content); } catch { parsed = {}; }
  }

  const theme       = parsed.theme       || data.title || "";
  const dateVal     = parsed.date        || (data.createdAt ? format(new Date(data.createdAt as string), "dd/MM/yyyy", { locale: ptBR }) : "");
  const duration    = parsed.duration    || "";
  const participant = parsed.participant || "";
  const technician  = parsed.technician  || data.authorName || "";
  const notes       = parsed.notes       || data.description || "";

  const empresa = [data.companyName, data.obraName].filter(Boolean).join(" - ");

  // Ruled lines helper - produces N thin horizontal lines for handwriting
  const ruledLines = (n: number, height: number) => {
    const lineSpacing = height / n;
    return Array.from({ length: n }).map((_, i) =>
      `<div style="border-bottom:0.5px solid #bbb; height:${lineSpacing}px;"></div>`
    ).join("");
  };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background: #fff; }
  @page { margin: 14px 20px; size: A4; }
  .page { padding: 14px 20px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
  .lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; display: block; }
  .val { font-size: 9px; white-space: pre-wrap; }
  .header-logo { width: 25%; text-align: center; border-right: 1px solid #000; vertical-align: middle; padding: 4px; }
  .header-title { text-align: center; vertical-align: middle; }
  .sig-box { height: 52px; }
  .obs-box { height: 50px; }
</style></head>
<body>
<div class="page">
  <table>
    <!-- HEADER -->
    <tr>
      <td class="header-logo">${pdfLogo(data, 120, 44)}</td>
      <td class="header-title">
        <div style="font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">INSTRUÇÃO TÉCNICA</div>
      </td>
    </tr>
    <!-- TEMA -->
    <tr>
      <td colspan="2" style="height:52px;">
        <span class="lbl">TEMA:</span>
        <span class="val" style="font-size:10px;">${theme}</span>
      </td>
    </tr>
    <!-- EMPRESA -->
    <tr>
      <td colspan="2">
        <span class="lbl">EMPRESA:</span>
        <span class="val">${empresa}</span>
      </td>
    </tr>
    <!-- DATA / DURACAO -->
    <tr>
      <td style="width:65%;">
        <span class="lbl">DATA:</span>
        <span class="val">${dateVal}</span>
      </td>
      <td style="width:35%;">
        <span class="lbl">DURAÇÃO:</span>
        <span class="val">${duration}</span>
      </td>
    </tr>
    <!-- PARTICIPANTE -->
    <tr>
      <td colspan="2" style="height:36px;">
        <span class="lbl">PARTICIPANTE:</span>
        <span class="val">${participant}</span>
      </td>
    </tr>
    <!-- ASSINATURA -->
    <tr>
      <td colspan="2" class="sig-box">
        <span class="lbl">ASSINATURA</span>
      </td>
    </tr>
    <!-- TECNICO EM SEGURANCA -->
    <tr>
      <td colspan="2">
        <span class="lbl">TÉCNICO EM SEGURANÇA:</span>
        <span class="val">${technician}</span>
      </td>
    </tr>
    <!-- NOTAS / OBS -->
    ${notes ? `
    <tr>
      <td colspan="2">
        <span class="lbl">OBS:</span>
        <div class="val obs-box">${notes.replace(/\n/g, "<br>")}</div>
      </td>
    </tr>` : `
    <tr>
      <td colspan="2" class="obs-box">
        <span class="lbl">OBS:</span>
        ${ruledLines(5, 42)}
      </td>
    </tr>`}
  </table>
</div>
</body></html>`;

  return renderPdf(html);
}
