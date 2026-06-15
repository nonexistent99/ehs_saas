import { resolveImageToDataUrl } from "./pdfTemplateEngine";
import { getTactFooterLogoDataUrl } from "./pdfAssets";
import { repairPdfHtml } from "./pdfText";

export interface DocumentPageOptions {
  title: string;
  children: string;
  logoUrl?: string;
  logoFallback?: string;
  className?: string;
  footerText?: string;
}

export interface BaseDocumentLayoutOptions {
  title: string;
  pages: string[];
  extraCss?: string;
}

export interface InfoItem {
  label: string;
  value?: unknown;
  wide?: boolean;
}

export interface EvidenceImageGridOptions {
  emptyLabel?: string;
  maxImages?: number;
}

export interface SignatureEntry {
  imageUrl?: string;
  label?: string;
  name?: unknown;
  role?: unknown;
  date?: unknown;
}

export interface SignatureBlockOptions {
  title?: string;
  entries: SignatureEntry[];
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function resolvePdfImage(value: unknown): Promise<string> {
  if (typeof value !== "string" || value.trim() === "") return "";
  return resolveImageToDataUrl(value);
}

export async function resolvePdfImages(values: unknown): Promise<string[]> {
  if (!Array.isArray(values)) return [];
  const resolved = await Promise.all(values.map((value) => resolvePdfImage(value)));
  return resolved.filter(Boolean);
}

export function BaseDocumentLayout({ title, pages, extraCss = "" }: BaseDocumentLayoutOptions): string {
  return repairPdfHtml(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${documentLayoutCss}${extraCss}</style>
</head>
<body>
  <div class="pdf-document">${pages.join("")}</div>
</body>
</html>`);
}

export function DocumentPage({
  title,
  children,
  logoUrl,
  logoFallback = "TACT",
  className = "",
  footerText = "Documento gerado pelo TACT",
}: DocumentPageOptions): string {
  return `<section class="pdf-page ${escapeHtml(className)}">
    ${DocumentHeader({ title, logoUrl, logoFallback })}
    <main class="document-content">${children}</main>
    ${DocumentFooter({ text: footerText })}
  </section>`;
}

export function DocumentHeader({
  title,
  logoUrl,
  logoFallback,
}: {
  title: string;
  logoUrl?: string;
  logoFallback?: string;
}): string {
  return `<header class="document-header" aria-label="Cabecalho do documento">
    <div class="header-lines" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="header-body">
      ${LogoBlock({ logoUrl, fallback: logoFallback || "TACT" })}
      <div class="document-title-box">${escapeHtml(title)}</div>
    </div>
  </header>`;
}

export function DocumentFooter({ text }: { text?: string } = {}): string {
  return `<footer class="document-footer" aria-label="Rodape do documento">
    <div class="footer-line" aria-hidden="true"></div>
    <div class="footer-text">${escapeHtml(text || "Documento gerado pelo TACT")}</div>
    <img src="${getTactFooterLogoDataUrl()}" class="footer-tact-logo" alt="TACT" />
  </footer>`;
}

export function LogoBlock({ logoUrl, fallback = "TACT" }: { logoUrl?: string; fallback?: string }): string {
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" class="logo-block-image" alt="${escapeHtml(fallback)}" />`
    : `<div class="logo-block-fallback">${escapeHtml(fallback)}</div>`;

  return `<div class="logo-block">${logo}</div>`;
}

export function InfoGrid(items: InfoItem[]): string {
  return `<dl class="info-grid">
    ${items.map((item) => `<div class="info-cell ${item.wide ? "is-wide" : ""}">
      <dt>${escapeHtml(item.label)}</dt>
      <dd>${escapeHtml(item.value ?? "N/A")}</dd>
    </div>`).join("")}
  </dl>`;
}

export function StatusTag(status: unknown): string {
  const normalized = normalizeStatus(status);
  const label = normalized === "C" ? "C" : normalized === "NC" ? "NC" : "NA";
  return `<span class="status-tag status-${label.toLowerCase()}">${label}</span>`;
}

export function EvidenceImageGrid(urls: string[], options: EvidenceImageGridOptions = {}): string {
  const maxImages = options.maxImages ?? 4;
  const images = urls.filter(Boolean).slice(0, maxImages);
  const emptyLabel = options.emptyLabel || "Sem evidência visual";

  if (images.length === 0) {
    return `<div class="evidence-grid evidence-grid-empty">
      <div class="evidence-empty">${escapeHtml(emptyLabel)}</div>
    </div>`;
  }

  return `<div class="evidence-grid evidence-count-${images.length}">
    ${images.map((url, index) => `<figure class="evidence-frame">
      <img src="${escapeHtml(url)}" class="evidence-image" alt="Evidência ${index + 1}" />
    </figure>`).join("")}
  </div>`;
}

export function SignatureBlock({ title = "Assinaturas", entries }: SignatureBlockOptions): string {
  const safeEntries = entries.length > 0 ? entries : [{}];
  return `<section class="signature-block" aria-label="${escapeHtml(title)}">
    <div class="signature-title">${escapeHtml(title)}</div>
    <div class="signature-row" style="grid-template-columns: repeat(${safeEntries.length}, minmax(0, 1fr));">
      ${safeEntries.map((entry) => {
        const hasSignatureImage = Boolean(entry.imageUrl);
        return `<div class="signature-entry ${hasSignatureImage ? "has-signature-image" : "has-empty-signature"}">
        <div class="signature-image-area">
          ${hasSignatureImage ? `<img src="${escapeHtml(entry.imageUrl)}" class="signature-image" alt="Assinatura" />` : ""}
        </div>
        ${hasSignatureImage ? "" : `<div class="signature-line"></div>`}
        ${entry.label ? `<div class="signature-label">${escapeHtml(entry.label)}</div>` : ""}
        <div class="signature-name">${escapeHtml(entry.name || "Responsável")}</div>
        ${entry.role ? `<div class="signature-role">${escapeHtml(entry.role)}</div>` : ""}
        ${entry.date ? `<div class="signature-date">${escapeHtml(entry.date)}</div>` : ""}
      </div>`;
      }).join("")}
    </div>
  </section>`;
}

function normalizeStatus(status: unknown): "C" | "NC" | "NA" {
  const value = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (["OK", "C", "CONFORME", "SIM", "APROVADO"].includes(value)) return "C";
  if (["NAO OK", "NOK", "NC", "NAO CONFORME", "REPROVADO"].includes(value)) return "NC";
  return "NA";
}

const documentLayoutCss = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f1f5f9; }
  body {
    color: #1f2933;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { size: A4 portrait; margin: 0; }
  .pdf-document { width: 210mm; margin: 0 auto; background: #fff; }
  .pdf-page {
    width: 210mm;
    height: 297mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: #fff;
    padding: 35mm 12mm 24mm 12mm;
  }
  .pdf-page:last-child { page-break-after: auto; }
  .document-header {
    position: absolute;
    inset: 0 0 auto 0;
    height: 33mm;
  }
  .header-lines {
    position: absolute;
    top: 1.8mm;
    left: 0;
    right: 0;
    display: grid;
    gap: 1.7mm;
  }
  .header-lines span {
    display: block;
    height: 0.45mm;
    background: #d64a00;
  }
  .header-lines span:nth-child(2) { background: #293f4d; opacity: 0.9; }
  .header-lines span:nth-child(3) { background: #d64a00; opacity: 0.65; }
  .header-body {
    position: absolute;
    top: 8.3mm;
    left: 12mm;
    right: 12mm;
    display: grid;
    grid-template-columns: 46mm 1fr;
    gap: 4mm;
    align-items: stretch;
  }
  .logo-block {
    height: 25mm;
    border: 1px solid #cfd8df;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3mm;
  }
  .logo-block-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
  .logo-block-fallback {
    color: #293f4d;
    font-weight: 800;
    font-size: 12px;
    line-height: 1.1;
    text-align: center;
    text-transform: uppercase;
  }
  .document-title-box {
    min-height: 25mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #293f4d;
    color: #fff;
    font-size: 23px;
    font-weight: 800;
    letter-spacing: 0;
    text-align: center;
    text-transform: uppercase;
    padding: 5mm 8mm;
  }
  .document-content {
    height: 238mm;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 5mm;
  }
  .document-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 20mm;
  }
  .footer-line {
    position: absolute;
    left: 0;
    right: 0;
    top: 3.5mm;
    height: 0.45mm;
    background: #d64a00;
  }
  .footer-text {
    position: absolute;
    left: 12mm;
    bottom: 5mm;
    color: #6b7280;
    font-size: 8.5px;
  }
  .footer-tact-logo {
    position: absolute;
    right: 11mm;
    bottom: 4mm;
    width: 35mm;
    height: 10mm;
    object-fit: contain;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    border: 1px solid #cfd8df;
    margin: 0;
    background: #fff;
  }
  .info-cell {
    border-right: 1px solid #d9e0e6;
    border-bottom: 1px solid #d9e0e6;
    padding: 3mm;
    min-height: 17mm;
  }
  .info-cell:nth-child(4n) { border-right: 0; }
  .info-cell.is-wide { grid-column: span 2; }
  .info-cell dt {
    color: #53616f;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0;
    margin: 0 0 1.5mm;
    text-transform: uppercase;
  }
  .info-cell dd {
    color: #1f2933;
    font-size: 10.5px;
    font-weight: 700;
    margin: 0;
  }
  .status-tag {
    min-width: 13mm;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 8.5px;
    font-weight: 900;
    line-height: 1;
    padding: 2mm 2.5mm;
    text-transform: uppercase;
  }
  .status-c { color: #166534; background: #dcfce7; border-color: #86efac; }
  .status-nc { color: #991b1b; background: #fee2e2; border-color: #fca5a5; }
  .status-na { color: #374151; background: #f3f4f6; border-color: #d1d5db; }
  .evidence-grid {
    height: 100%;
    min-height: 35mm;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2mm;
  }
  .evidence-count-1 { grid-template-columns: 1fr; }
  .evidence-count-3 .evidence-frame:first-child { grid-row: span 2; }
  .evidence-frame {
    margin: 0;
    border: 1px solid #cfd8df;
    background: #f8fafc;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .evidence-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    background: #fff;
  }
  .evidence-grid-empty {
    border: 1px dashed #cfd8df;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .evidence-empty {
    color: #7b8794;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .signature-block {
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #cfd8df;
    background: #fff;
    padding: 4mm 5mm 5mm;
    margin-top: auto;
    min-height: 48mm;
  }
  .signature-title {
    color: #293f4d;
    font-size: 10px;
    font-weight: 900;
    margin-bottom: 5mm;
    text-transform: uppercase;
  }
  .signature-row {
    display: grid;
    gap: 8mm;
    align-items: end;
  }
  .signature-entry {
    text-align: center;
    min-height: 31mm;
    background: #fff;
  }
  .signature-image-area {
    height: 18mm;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: #fff;
    border: 0;
  }
  .has-signature-image .signature-image-area {
    height: 21mm;
    align-items: center;
    margin-bottom: 2mm;
  }
  .has-empty-signature .signature-image-area {
    height: 18mm;
  }
  .signature-image {
    max-width: 65mm;
    max-height: 21mm;
    object-fit: contain;
    display: block;
    background: #fff;
  }
  .signature-line {
    border-top: 1px solid #1f2933;
    margin: 1.5mm auto 2mm;
    width: 70mm;
    max-width: 100%;
  }
  .signature-label {
    color: #53616f;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .signature-name {
    color: #1f2933;
    font-size: 10.5px;
    font-weight: 800;
    margin-top: 1mm;
  }
  .signature-role,
  .signature-date {
    color: #53616f;
    font-size: 8.5px;
    margin-top: 0.5mm;
  }
`;
