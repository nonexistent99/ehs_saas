import fs from "fs";
import path from "path";
import sharp from "sharp";

import { generatePdfFromHtml } from "./pdf";
import {
  BaseDocumentLayout,
  DocumentPage,
  InfoGrid,
  escapeHtml as escapeLayoutHtml,
} from "./pdfLayout";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Converts an image URL/path into a data: base64 URI so Puppeteer can
 * embed it regardless of whether it's a relative /uploads/... path or
 * an absolute file system path.
 *
 * Supports:
 *  - Relative paths starting with "/" -> resolved against PUBLIC_DIR
 *  - Absolute file paths (C:\... or /home/...)
 *  - Already-resolved data: URIs -> returned as-is
 *  - External http/https URLs -> returned as-is (Puppeteer can fetch those)
 */
export async function resolveImageToDataUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return "";

  if (rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;

  let filePath: string;
  if (rawUrl.startsWith("/")) {
    filePath = path.join(PUBLIC_DIR, rawUrl.slice(1));
  } else if (path.isAbsolute(rawUrl)) {
    filePath = rawUrl;
  } else {
    filePath = path.join(PUBLIC_DIR, rawUrl);
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[pdfTemplateEngine] Image not found: ${filePath}`);
    return "";
  }

  let buffer: Buffer = fs.readFileSync(filePath);
  let ext = path.extname(filePath).toLowerCase().replace(".", "");

  if (ext === "webp") {
    try {
      buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      ext = "jpeg";
    } catch (e) {
      console.error("[pdfTemplateEngine] Failed to convert WebP to JPEG:", e);
    }
  }

  const mime = ext === "webp"
    ? "image/webp"
    : ext === "png"
      ? "image/png"
      : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : "image/jpeg";

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export interface TechnicalReportData {
  logoUrl?: string;
  empresa: string;
  empreendimento: string;
  local: string;
  data: string;
  observacoes?: string;
  itens: Array<{
    titulo: string;
    status: "resolvido" | "pendente" | "atencao" | "previsto" | string;
    data?: string;
    descricao: string;
    plano_acao: string;
    prazo?: string;
    imagens?: Array<{ url: string; descricao?: string }>;
  }>;
}

type TechnicalReportItem = TechnicalReportData["itens"][number];

const reportStatusLabels: Record<string, string> = {
  resolvido: "Resolvido",
  resolvida: "Resolvido",
  concluido: "Resolvido",
  concluida: "Resolvido",
  previsto: "Previsto",
  pendente: "Pendente",
  atencao: "Atenção",
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeReportStatus(status: unknown): string {
  return cleanText(status, "pendente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-");
}

function reportStatusLabel(status: unknown): string {
  const normalized = normalizeReportStatus(status).replace(/-/g, "_");
  return reportStatusLabels[normalized] || cleanText(status, "Pendente");
}

function ReportStatusTag(status: unknown): string {
  const normalized = normalizeReportStatus(status);
  const className = ["resolvido", "resolvida", "concluido", "concluida"].includes(normalized)
    ? "resolvido"
    : normalized === "previsto"
      ? "previsto"
      : normalized === "atencao"
        ? "atencao"
        : "pendente";

  return `<span class="technical-status technical-status-${className}">${escapeLayoutHtml(reportStatusLabel(status))}</span>`;
}

function renderTechnicalEvidenceGrid(item: TechnicalReportItem): string {
  const images = (item.imagens || []).filter((image) => image?.url).slice(0, 4);
  if (!images.length) {
    return `<div class="technical-evidence-grid technical-evidence-empty">
      <div>Sem evidência visual</div>
    </div>`;
  }

  return `<div class="technical-evidence-grid technical-evidence-count-${images.length}">
    ${images.map((image, index) => `<figure class="technical-evidence-frame">
      <img src="${escapeLayoutHtml(image.url)}" alt="${escapeLayoutHtml(image.descricao || `Evidência ${index + 1}`)}" />
      ${image.descricao ? `<figcaption>${escapeLayoutHtml(image.descricao)}</figcaption>` : ""}
    </figure>`).join("")}
  </div>`;
}

function renderTechnicalIntroContent(): string {
  const tags = [
    ["resolvido", "Resolvido", "Item corrigido ou situação regularizada no momento da emissão."],
    ["previsto", "Previsto", "Correção programada, com prazo ou planejamento definido."],
    ["pendente", "Pendente", "Desvio ainda em aberto e aguardando tratativa."],
    ["atencao", "Atenção", "Condição crítica ou sensível que exige prioridade de acompanhamento."],
  ];

  return `<section class="technical-section technical-intro">
    <h2>Introdução</h2>
    <p>Este relatório técnico consolida as condições verificadas durante a inspeção, registrando evidências, desvios observados, recomendações e prazos de correção para acompanhamento da empresa e dos responsáveis pela obra.</p>
    <p>O documento foi estruturado para apoiar a tomada de decisão, orientar o plano de ação e manter rastreabilidade visual das ocorrências avaliadas, seguindo o padrão visual TACT para entregáveis técnicos.</p>
  </section>
  <section class="technical-section">
    <h2>Tags de acompanhamento</h2>
    <div class="technical-tag-grid">
      ${tags.map(([status, _label, description]) => `<div class="technical-tag-card">
        <div>${ReportStatusTag(status)}</div>
        <p>${escapeLayoutHtml(description)}</p>
      </div>`).join("")}
    </div>
  </section>
  <section class="technical-section technical-glossary">
    <h2>Glossário</h2>
    <dl>
      <div><dt>Desvio evidenciado</dt><dd>Condição observada em campo que demanda correção, controle ou acompanhamento.</dd></div>
      <div><dt>Evidência</dt><dd>Registro fotográfico ou informação visual associada ao item verificado.</dd></div>
      <div><dt>Plano de ação</dt><dd>Medida recomendada para eliminar, reduzir ou controlar o desvio identificado.</dd></div>
      <div><dt>Prazo de correção</dt><dd>Data ou período indicado para conclusão da ação proposta.</dd></div>
    </dl>
  </section>`;
}

function renderTechnicalItemContent(item: TechnicalReportItem, index: number, reportDate: string): string {
  const imageCount = (item.imagens || []).filter((image) => image?.url).length;

  return `<article class="technical-item">
    <section class="technical-item-head">
      <div>
        <span>Item ${index + 1}</span>
        <h2>${escapeLayoutHtml(cleanText(item.titulo, `Item ${index + 1}`))}</h2>
      </div>
      ${ReportStatusTag(item.status)}
    </section>
    <section class="technical-section technical-item-meta">
      ${InfoGrid([
        { label: "Data", value: item.data || reportDate },
        { label: "Status", value: reportStatusLabel(item.status) },
        { label: "Prazo de correção", value: item.prazo || "A definir" },
        { label: "Evidências", value: `${imageCount} foto(s)` },
      ])}
    </section>
    <section class="technical-section technical-evidence-section">
      <h2>Evidências / fotos</h2>
      ${renderTechnicalEvidenceGrid(item)}
    </section>
    <section class="technical-copy-grid">
      <div class="technical-section">
        <h2>Descrição / desvio evidenciado</h2>
        <p>${escapeLayoutHtml(cleanText(item.descricao, "Não informado."))}</p>
      </div>
      <div class="technical-section">
        <h2>Plano de ação</h2>
        <p>${escapeLayoutHtml(cleanText(item.plano_acao, "A definir."))}</p>
      </div>
    </section>
  </article>`;
}

/**
 * Generates the PDF Buffer for the technical inspection report.
 * Images stored as relative /uploads/... paths are converted to base64
 * data URIs so Puppeteer can embed them even without a running HTTP server.
 */
export async function generateTechnicalReportPdf(data: TechnicalReportData): Promise<Buffer> {
  const resolvedLogoUrl = data.logoUrl ? await resolveImageToDataUrl(data.logoUrl) : "";
  const brandName = cleanText(data.empresa || data.empreendimento, "TACT");

  const itensResolved = await Promise.all(
    data.itens.map(async (item) => ({
      ...item,
      imagens: (await Promise.all(
        (item.imagens ?? []).map(async (img) => ({
          ...img,
          url: await resolveImageToDataUrl(img.url),
        })),
      )).filter((img) => img.url),
    })),
  );

  const definitions: Array<{ title: string; className?: string; children: string }> = [
    {
      title: "RELATÓRIO TÉCNICO",
      className: "technical-page technical-cover-page",
      children: `<section class="technical-cover">
        <div class="technical-cover-logo">
          ${resolvedLogoUrl
            ? `<img src="${escapeLayoutHtml(resolvedLogoUrl)}" alt="${escapeLayoutHtml(brandName)}" />`
            : `<span>${escapeLayoutHtml(brandName)}</span>`}
        </div>
        <div class="technical-cover-title">
          <span>Inspeção de Segurança</span>
          <h1>RELATÓRIO TÉCNICO</h1>
          <p>${escapeLayoutHtml(cleanText(data.observacoes, "Documento técnico de inspeção e acompanhamento."))}</p>
        </div>
        <dl class="technical-cover-meta">
          <div><dt>Empresa</dt><dd>${escapeLayoutHtml(cleanText(data.empresa, "N/A"))}</dd></div>
          <div><dt>Empreendimento</dt><dd>${escapeLayoutHtml(cleanText(data.empreendimento, "N/A"))}</dd></div>
          <div><dt>Local da obra</dt><dd>${escapeLayoutHtml(cleanText(data.local, "N/A"))}</dd></div>
          <div><dt>Data</dt><dd>${escapeLayoutHtml(cleanText(data.data, "N/A"))}</dd></div>
        </dl>
      </section>`,
    },
    {
      title: "RELATÓRIO TÉCNICO - INTRODUÇÃO",
      className: "technical-page technical-intro-page",
      children: renderTechnicalIntroContent(),
    },
    ...itensResolved.map((item, index) => ({
      title: `RELATÓRIO TÉCNICO - ITEM ${index + 1}`,
      className: "technical-page technical-item-page",
      children: renderTechnicalItemContent(item, index, data.data),
    })),
  ];

  const pageCount = definitions.length;
  const pages = definitions.map((definition, index) => DocumentPage({
    title: definition.title,
    logoUrl: resolvedLogoUrl,
    logoFallback: brandName,
    footerText: `Página ${index + 1} de ${pageCount} | Documento gerado pelo TACT`,
    className: definition.className || "technical-page",
    children: definition.children,
  }));

  const fullHtml = BaseDocumentLayout({
    title: `Relatório Técnico - ${data.empresa || data.empreendimento || "TACT"}`,
    pages,
    extraCss: technicalReportLayoutCss,
  });

  return generatePdfFromHtml(fullHtml);
}

const technicalReportLayoutCss = `
  .technical-page .document-content { gap: 5mm; }
  .technical-cover {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 10mm;
  }
  .technical-cover-logo {
    width: 78mm;
    min-height: 34mm;
    border: 1px solid #cfd8df;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5mm;
  }
  .technical-cover-logo img {
    max-width: 100%;
    max-height: 28mm;
    object-fit: contain;
    display: block;
  }
  .technical-cover-logo span {
    color: #293f4d;
    font-size: 16px;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
  }
  .technical-cover-title {
    align-self: center;
    border-left: 1.6mm solid #d64a00;
    padding-left: 7mm;
  }
  .technical-cover-title span {
    color: #53616f;
    display: block;
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 4mm;
    text-transform: uppercase;
  }
  .technical-cover-title h1 {
    color: #293f4d;
    font-size: 36px;
    line-height: 1.05;
    margin: 0 0 5mm;
    text-transform: uppercase;
  }
  .technical-cover-title p {
    color: #1f2933;
    font-size: 12px;
    font-weight: 700;
    margin: 0;
    max-width: 140mm;
  }
  .technical-cover-meta {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid #cfd8df;
    margin: 0;
  }
  .technical-cover-meta div {
    border-right: 1px solid #d9e0e6;
    min-height: 24mm;
    padding: 4mm;
  }
  .technical-cover-meta div:last-child { border-right: 0; }
  .technical-cover-meta dt {
    color: #53616f;
    font-size: 8px;
    font-weight: 900;
    margin: 0 0 2mm;
    text-transform: uppercase;
  }
  .technical-cover-meta dd {
    color: #1f2933;
    font-size: 10.5px;
    font-weight: 800;
    margin: 0;
  }
  .technical-section {
    border: 1px solid #cfd8df;
    background: #fff;
    padding: 4mm;
  }
  .technical-section h2 {
    color: #293f4d;
    font-size: 11px;
    line-height: 1.2;
    margin: 0 0 3mm;
    text-transform: uppercase;
  }
  .technical-section p {
    color: #1f2933;
    font-size: 10.5px;
    margin: 0 0 2.7mm;
  }
  .technical-section p:last-child { margin-bottom: 0; }
  .technical-intro { min-height: 42mm; }
  .technical-tag-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 2mm;
  }
  .technical-tag-card {
    border: 1px solid #d9e0e6;
    min-height: 31mm;
    padding: 3mm;
  }
  .technical-tag-card p {
    color: #53616f;
    font-size: 8.5px;
    line-height: 1.25;
    margin: 2mm 0 0;
  }
  .technical-glossary dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2mm;
    margin: 0;
  }
  .technical-glossary div {
    border: 1px solid #d9e0e6;
    min-height: 22mm;
    padding: 3mm;
  }
  .technical-glossary dt {
    color: #293f4d;
    font-size: 9px;
    font-weight: 900;
    margin-bottom: 1.5mm;
    text-transform: uppercase;
  }
  .technical-glossary dd {
    color: #53616f;
    font-size: 9px;
    line-height: 1.35;
    margin: 0;
  }
  .technical-item {
    display: flex;
    flex-direction: column;
    gap: 4mm;
    min-height: 100%;
  }
  .technical-item-head {
    align-items: center;
    border: 1px solid #cfd8df;
    border-left: 1.6mm solid #d64a00;
    display: flex;
    gap: 5mm;
    justify-content: space-between;
    min-height: 25mm;
    padding: 4mm;
  }
  .technical-item-head span {
    color: #53616f;
    display: block;
    font-size: 8px;
    font-weight: 900;
    margin-bottom: 1.5mm;
    text-transform: uppercase;
  }
  .technical-item-head h2 {
    color: #293f4d;
    font-size: 18px;
    line-height: 1.15;
    margin: 0;
  }
  .technical-status {
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22mm;
    padding: 2mm 3mm;
    font-size: 8px;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .technical-status-resolvido { background: #dcfce7; border-color: #86efac; color: #166534; }
  .technical-status-previsto { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
  .technical-status-pendente { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  .technical-status-atencao { background: #fef3c7; border-color: #fbbf24; color: #92400e; }
  .technical-item-meta { padding: 0; border: 0; }
  .technical-evidence-section {
    min-height: 92mm;
    display: flex;
    flex-direction: column;
  }
  .technical-evidence-grid {
    flex: 1;
    min-height: 74mm;
    display: grid;
    gap: 2mm;
  }
  .technical-evidence-count-1 { grid-template-columns: 1fr; }
  .technical-evidence-count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .technical-evidence-count-3,
  .technical-evidence-count-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .technical-evidence-frame {
    position: relative;
    margin: 0;
    border: 1px solid #cfd8df;
    background: #f8fafc;
    min-height: 36mm;
    overflow: hidden;
  }
  .technical-evidence-count-1 .technical-evidence-frame { min-height: 74mm; }
  .technical-evidence-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .technical-evidence-frame figcaption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(31, 41, 51, 0.82);
    color: #fff;
    font-size: 8px;
    font-weight: 700;
    padding: 1.5mm 2mm;
  }
  .technical-evidence-empty {
    border: 1px dashed #cfd8df;
    background: #f8fafc;
    align-items: center;
    justify-content: center;
  }
  .technical-evidence-empty div {
    color: #7b8794;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .technical-copy-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4mm;
    margin-top: auto;
  }
  .technical-copy-grid .technical-section {
    min-height: 36mm;
  }
`;
