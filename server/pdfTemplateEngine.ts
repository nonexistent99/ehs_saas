import fs from "fs";
import path from "path";
import sharp from "sharp";

import { generatePdfFromHtml } from "./pdf";
import { getTactFooterLogoDataUrl } from "./pdfAssets";
import { repairPdfHtml, repairPdfText } from "./pdfText";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Converts an image URL/path into a data: base64 URI so Puppeteer can embed it
 * without a running HTTP server. Supports /uploads paths, absolute paths,
 * data URIs, and external URLs.
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

  const mime = ext === "png"
    ? "image/png"
    : ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "webp"
        ? "image/webp"
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
type TechnicalReportImage = NonNullable<TechnicalReportItem["imagens"]>[number];
type ResolvedTechnicalImage = TechnicalReportImage & {
  unavailable?: boolean;
  originalUrl?: string;
};
type ResolvedTechnicalReportItem = Omit<TechnicalReportItem, "imagens"> & {
  imagens?: ResolvedTechnicalImage[];
};

type TechnicalReportPage = {
  title?: string;
  className?: string;
  body: string;
  isCover?: boolean;
};

const reportStatusLabels: Record<string, string> = {
  resolvido: "RESOLVIDO",
  resolvida: "RESOLVIDO",
  concluido: "RESOLVIDO",
  concluida: "RESOLVIDO",
  previsto: "PREVISTO",
  pendente: "PENDENTE",
  atencao: "ATENÇÃO",
  atenção: "ATENÇÃO",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value: unknown, fallback = ""): string {
  const text = repairPdfText(String(value ?? "")).trim();
  return text || fallback;
}

function text(value: unknown, fallback = ""): string {
  return escapeHtml(cleanText(value, fallback));
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
  return reportStatusLabels[normalized] || cleanText(status, "PENDENTE").toUpperCase();
}

function logoMarkup(logoUrl: string, fallback: string, className = ""): string {
  const safeFallback = text(fallback || "LOGO");
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${safeFallback}" />`
    : `<span>${safeFallback}</span>`;

  return `<div class="rt-logo ${className}">${logo}</div>`;
}

function reportFooter(): string {
  return `<footer class="rt-footer">
    <div class="rt-footer-line"></div>
    <img class="rt-footer-logo" src="${getTactFooterLogoDataUrl()}" alt="TACT" />
  </footer>`;
}

function reportHeader(title: string, logoUrl: string, fallback: string): string {
  return `<header class="rt-header">
    ${logoMarkup(logoUrl, fallback, "rt-header-logo")}
    <div class="rt-header-title">${text(title)}</div>
  </header>`;
}

function reportPage(page: TechnicalReportPage, logoUrl: string, fallback: string): string {
  return `<section class="rt-page ${page.className || ""}">
    <div class="rt-top-lines" aria-hidden="true"><span></span><span></span><span></span></div>
    ${page.isCover ? "" : reportHeader(page.title || "", logoUrl, fallback)}
    <main class="rt-body">${page.body}</main>
    ${reportFooter()}
  </section>`;
}

function coverPage(data: TechnicalReportData, logoUrl: string, fallback: string): TechnicalReportPage {
  return {
    isCover: true,
    className: "rt-cover-page",
    body: `<div class="rt-cover-small-logo">${logoMarkup(logoUrl, fallback)}</div>
      <div class="rt-cover-title">RELATÓRIO<br />TÉCNICO</div>
      <div class="rt-cover-main-logo">${logoMarkup(logoUrl, fallback)}</div>
      <dl class="rt-cover-meta">
        <dt>Empresa:</dt>
        <dd>${text(data.empresa, "Nome da Empresa")}</dd>
        <dt>Empreendimento:</dt>
        <dd>${text(data.empreendimento, "Nome do Empreendimento")}</dd>
        <dt>Local da Obra:</dt>
        <dd>${text(data.local, "Rua, nº, CEP, Bairro, Cidade, UF")}</dd>
      </dl>`,
  };
}

function introTag(label: string, description: string): string {
  const statusClass = normalizeReportStatus(label);
  return `<div class="rt-tag-row">
    <div class="rt-tag-box rt-tag-box-${escapeHtml(statusClass)}">${text(label)}</div>
    <div class="rt-tag-text">
      <strong>${text(label)}:</strong>
      <p>${text(description)}</p>
    </div>
  </div>`;
}

function introPage(): TechnicalReportPage {
  return {
    title: "INTRODUÇÃO",
    className: "rt-intro-page",
    body: `<section class="rt-intro-copy">
      <p>Relatório técnico que tem como principal função evidenciar e orientar sobre desvios dentro do canteiro de obras. Os apontamentos aqui informados são uma forma de orientar tecnicamente a empresa e auxiliar na tomada de decisões.</p>
    </section>
    <section class="rt-tag-list">
      ${introTag("RESOLVIDO", "Este status é aplicado a situações que foram solucionadas, informando a data em que o atendimento foi realizado. Itens resolvidos são removidos dos próximos relatórios.")}
      ${introTag("PENDENTE", "Este status é aplicado a situações que não foram resolvidas, indicando a data em que foram evidenciadas no relatório. Este item é obrigatoriamente monitorado até a sua resolução.")}
      ${introTag("PREVISTO", "Este status é aplicado quando um item não pode ser atendido de imediato, porém já possui um prazo de execução definido.")}
      ${introTag("ATENÇÃO", "Este status é aplicado a situações que exigem prioridade de análise, acompanhamento técnico ou correção preventiva para evitar agravamento do desvio.")}
    </section>
    <section class="rt-glossary">
      <h2>GLOSSÁRIO:</h2>
      <p><strong>Desvio evidenciado:</strong> condição observada em campo que exige correção, controle ou acompanhamento.</p>
      <p><strong>Evidência:</strong> registro fotográfico utilizado para comprovar a situação encontrada.</p>
      <p><strong>Plano de ação:</strong> orientação técnica para corrigir, controlar ou eliminar o desvio.</p>
    </section>`,
  };
}

function evidenceGrid(item: ResolvedTechnicalReportItem): string {
  const images = (item.imagens || []).filter((image) => image?.url || image?.unavailable);
  if (!images.length) {
    return `<section class="rt-photo-none">Sem evidências fotográficas anexadas.</section>`;
  }

  const visibleImages = images.slice(0, 4);
  const extraCount = Math.max(0, images.length - visibleImages.length);

  return `<div class="rt-photo-area rt-photo-count-${visibleImages.length}">
    ${visibleImages.map((image, index) => {
      const unavailable = image.unavailable || !image.url;
      const extraBadge = extraCount > 0 && index === visibleImages.length - 1
        ? `<span class="rt-extra-photo-badge">+${extraCount} foto${extraCount > 1 ? "s" : ""}</span>`
        : "";
      return `<figure class="rt-photo-frame ${unavailable ? "rt-photo-frame-unavailable" : ""}">
        ${unavailable
          ? `<div class="rt-image-unavailable">Imagem não disponível</div>`
          : `<img src="${escapeHtml(image.url)}" alt="${text(image.descricao || `Foto ${index + 1}`)}" />`}
        ${extraBadge}
      </figure>`;
    }).join("")}
  </div>`;
}

function itemTextBlock(item: ResolvedTechnicalReportItem): string {
  return `<section class="rt-item-text">
    <div class="rt-item-text-title">Descrição / Desvio evidenciado:</div>
    <p>${text(item.descricao, "Não informado.")}</p>
    <div class="rt-item-action-grid">
      <div>
        <strong>Plano de ação:</strong>
        <span>${text(item.plano_acao, "A definir.")}</span>
      </div>
      <div>
        <strong>Prazo de correção:</strong>
        <span>${text(item.prazo, "A definir")}</span>
      </div>
    </div>
  </section>`;
}

function itemPage(item: ResolvedTechnicalReportItem, index: number, reportDate: string): TechnicalReportPage {
  return {
    title: cleanText(item.titulo, `Item ${index + 1}`),
    className: "rt-item-page",
    body: `<section class="rt-item-meta">
      <div><strong>Status:</strong><span>${text(reportStatusLabel(item.status))}</span></div>
      <div><strong>Data:</strong><span>${text(item.data || reportDate)}</span></div>
    </section>
    ${evidenceGrid(item)}
    ${itemTextBlock(item)}`,
  };
}

export async function buildTechnicalReportHtml(data: TechnicalReportData): Promise<string> {
  const resolvedLogoUrl = data.logoUrl ? await resolveImageToDataUrl(data.logoUrl) : "";
  const brandName = cleanText(data.empresa || data.empreendimento, "LOGO");

  const resolveTechnicalEvidence = async (img: TechnicalReportImage): Promise<ResolvedTechnicalImage | null> => {
    const originalUrl = cleanText(img?.url);
    if (!originalUrl) return null;

    const resolvedUrl = await resolveImageToDataUrl(originalUrl);
    return {
      ...img,
      descricao: cleanText(img.descricao),
      originalUrl,
      url: resolvedUrl,
      unavailable: !resolvedUrl,
    };
  };

  const itensResolved = await Promise.all(
    data.itens.map(async (item) => ({
      ...item,
      imagens: (await Promise.all((item.imagens ?? []).map(resolveTechnicalEvidence)))
        .filter((img): img is ResolvedTechnicalImage => Boolean(img)),
    })),
  );

  const pages = [
    coverPage(data, resolvedLogoUrl, brandName),
    introPage(),
    ...itensResolved.map((item, index) => itemPage(item, index, data.data)),
  ];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${text(`Relatório Técnico - ${data.empresa || data.empreendimento || "TACT"}`)}</title>
  <style>${technicalReportCss}</style>
</head>
<body>
  <div class="rt-document">
    ${pages.map((page) => reportPage(page, resolvedLogoUrl, brandName)).join("")}
  </div>
</body>
</html>`;

  return repairPdfHtml(html);
}

export async function generateTechnicalReportPdf(data: TechnicalReportData): Promise<Buffer> {
  return generatePdfFromHtml(await buildTechnicalReportHtml(data));
}

const technicalReportCss = `
  * { box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #f1f5f9;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .rt-document {
    width: 210mm;
    margin: 0 auto;
    background: #fff;
  }
  .rt-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    page-break-after: always;
    background: #fff;
    padding: 0 12mm;
  }
  .rt-page:last-child { page-break-after: auto; }
  .rt-top-lines {
    position: absolute;
    top: 3.8mm;
    left: 0;
    right: 0;
    display: grid;
    gap: 1.2mm;
  }
  .rt-top-lines span {
    display: block;
    height: 0.55mm;
    background: #d64a00;
  }
  .rt-top-lines span:nth-child(2) { background: #1f2933; }
  .rt-top-lines span:nth-child(3) { background: #6b7280; height: 0.35mm; }
  .rt-body {
    position: absolute;
    left: 12mm;
    right: 12mm;
    top: 50mm;
    bottom: 21mm;
  }
  .rt-logo {
    border: 1px solid #111;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .rt-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .rt-logo span {
    color: #111;
    display: block;
    font-size: 24px;
    font-weight: 500;
    text-align: center;
  }
  .rt-header {
    position: absolute;
    top: 14mm;
    left: 12mm;
    right: 12mm;
    height: 24mm;
    display: grid;
    grid-template-columns: 42mm 1fr;
    gap: 2mm;
  }
  .rt-header-logo { width: 42mm; height: 24mm; }
  .rt-header-logo span { font-size: 20px; }
  .rt-header-title {
    border: 1px solid #111;
    background: #fff;
    color: #293f4d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22px;
    font-weight: 900;
    line-height: 1.05;
    text-align: center;
    text-transform: uppercase;
    padding: 2mm 5mm;
  }
  .rt-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 4mm;
    height: 15mm;
  }
  .rt-footer-line {
    position: absolute;
    left: 0;
    right: 0;
    top: 1.2mm;
    height: 0.8mm;
    background: #d64a00;
  }
  .rt-footer-logo {
    position: absolute;
    right: 12mm;
    bottom: 0;
    width: 34mm;
    height: 10mm;
    object-fit: contain;
  }
  .rt-cover-page .rt-body {
    inset: 0 12mm 21mm 12mm;
  }
  .rt-cover-small-logo {
    position: absolute;
    top: 15mm;
    left: 0;
    width: 46mm;
    height: 25mm;
  }
  .rt-cover-small-logo .rt-logo,
  .rt-cover-main-logo .rt-logo {
    width: 100%;
    height: 100%;
  }
  .rt-cover-title {
    position: absolute;
    top: 65mm;
    left: 0;
    right: 0;
    color: #374957;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 36px;
    font-weight: 900;
    line-height: 1.12;
    text-align: center;
    text-transform: uppercase;
  }
  .rt-cover-main-logo {
    position: absolute;
    top: 128mm;
    left: 50%;
    width: 76mm;
    height: 47mm;
    transform: translateX(-50%);
  }
  .rt-cover-meta {
    position: absolute;
    right: 0;
    bottom: 24mm;
    width: 94mm;
    margin: 0;
    text-align: right;
  }
  .rt-cover-meta dt {
    color: #f97316;
    font-size: 16px;
    font-weight: 900;
    line-height: 1.15;
    margin: 0 0 1.5mm;
  }
  .rt-cover-meta dd {
    color: #293f4d;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.2;
    margin: 0 0 3.2mm;
  }
  .rt-intro-copy {
    margin-top: 2mm;
    padding: 0 6mm 0 6mm;
  }
  .rt-intro-copy p {
    font-size: 13px;
    line-height: 1.25;
    margin: 0 0 10mm;
    text-align: justify;
  }
  .rt-tag-list {
    display: grid;
    gap: 7mm;
    margin: 0 4mm;
  }
  .rt-tag-row {
    display: grid;
    grid-template-columns: 34mm 1fr;
    gap: 4mm;
    align-items: center;
    min-height: 22mm;
  }
  .rt-tag-box {
    border: 1px solid #111;
    height: 22mm;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .04em;
    padding: 0 2mm;
    text-align: center;
  }
  .rt-tag-box-resolvido { border-color: #15803d; color: #15803d; }
  .rt-tag-box-pendente { border-color: #b91c1c; color: #b91c1c; }
  .rt-tag-box-previsto { border-color: #b45309; color: #b45309; }
  .rt-tag-box-atencao { border-color: #c2410c; color: #c2410c; }
  .rt-tag-text strong {
    display: block;
    color: #111;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 2mm;
  }
  .rt-tag-text p {
    color: #111;
    font-size: 11.5px;
    line-height: 1.18;
    margin: 0;
    text-align: justify;
  }
  .rt-glossary {
    position: absolute;
    left: 6mm;
    right: 6mm;
    bottom: 0;
    border-top: 1px solid #111;
    padding-top: 3mm;
  }
  .rt-glossary h2 {
    color: #111;
    font-size: 11px;
    font-weight: 900;
    margin: 0 0 2mm;
  }
  .rt-glossary p {
    color: #111;
    font-size: 9.2px;
    line-height: 1.22;
    margin: 0 0 1mm;
  }
  .rt-item-page .rt-body {
    top: 41mm;
    bottom: 22mm;
  }
  .rt-item-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 112mm;
    height: 9mm;
    margin-bottom: 2mm;
  }
  .rt-item-meta div {
    border: 1px solid #111;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 35mm;
    padding: 0 2mm;
  }
  .rt-item-meta strong,
  .rt-item-meta span {
    color: #111;
    font-size: 8.5px;
    font-weight: 700;
  }
  .rt-photo-area {
    height: 151mm;
    display: grid;
    gap: 2mm;
    margin-bottom: 2mm;
  }
  .rt-photo-count-1 { grid-template-columns: 1fr; }
  .rt-photo-count-2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .rt-photo-count-3 { grid-template-columns: 1.18fr 1fr; grid-template-rows: 1fr 1fr; }
  .rt-photo-count-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .rt-photo-count-3 .rt-photo-frame:first-child { grid-row: 1 / span 2; }
  .rt-photo-frame {
    border: 1px solid #111;
    margin: 0;
    overflow: hidden;
    background: #f8fafc;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rt-photo-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .rt-photo-none {
    height: 151mm;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2mm;
    color: #666;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .03em;
    text-transform: uppercase;
  }
  .rt-photo-frame-unavailable {
    background: #fff;
  }
  .rt-image-unavailable {
    color: #666;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
    padding: 4mm;
  }
  .rt-extra-photo-badge {
    position: absolute;
    right: 2mm;
    bottom: 2mm;
    min-width: 18mm;
    border-radius: 999px;
    background: rgba(0, 0, 0, .72);
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    line-height: 1;
    padding: 2mm 2.4mm;
    text-align: center;
  }
  .rt-item-text {
    border: 1px solid #111;
    height: 54mm;
    padding: 3mm 3mm 2mm;
    overflow: hidden;
  }
  .rt-item-text-title {
    color: #f97316;
    font-size: 9px;
    font-weight: 900;
    margin-bottom: 2mm;
  }
  .rt-item-text p {
    color: #111;
    font-size: 10.5px;
    line-height: 1.25;
    margin: 0 0 3mm;
    text-align: justify;
  }
  .rt-item-action-grid {
    display: grid;
    grid-template-columns: 1.6fr 0.8fr;
    gap: 4mm;
    border-top: 1px solid #d7d7d7;
    padding-top: 2mm;
  }
  .rt-item-action-grid strong {
    color: #111;
    display: block;
    font-size: 9px;
    font-weight: 900;
    margin-bottom: 1mm;
  }
  .rt-item-action-grid span {
    color: #111;
    display: block;
    font-size: 9.5px;
    line-height: 1.2;
  }
`;
