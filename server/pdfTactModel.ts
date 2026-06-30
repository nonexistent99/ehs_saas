/**
 * TACT Visual Identity PDF System
 * Implements the exact visual model from modelo_correto.pdf
 *
 * Color palette:
 *   - Title bars / headers: #3d4a5c (dark blue-gray)
 *   - Labels / accents: #e67e22 (orange)
 *   - Body text: #1f2933 (near-black)
 *   - Light borders: #cfd8df
 *
 * Page types (matching modelo_correto.pdf):
 *   1. Cover      – Logo center, title, company info block
 *   2. Intro      – Text + TAG blocks + glossary
 *   3. Item1Photo – Header, 1 photo, text
 *   4. Item2Photo – Header, 2 photos, text
 *   5. Item4Photo – Header, 2x2 photos, text
 *   6. CheckList  – Header, info, items table with photo column
 *   7. CheckListNoPhoto – Header, info, 4 items
 *   8. PgrCover   – Like cover but "RELATÓRIO DO PGR"
 *   9. PgrMatrix  – Intro text + 5x5 risk matrix
 *   10. PgrVestiario – NR-18 infographic + sanitary calculator
 *   11. PgrRisks   – Risk table + action plan
 *   12. PgrSignature – Signature page
 *   13. Advertencia – Warning form
 *   14. Apr        – Blank APR header
 */

import { repairPdfHtml } from "./pdfText";
import { resolveImageToDataUrl } from "./pdfTemplateEngine";
import { getTactFooterLogoDataUrl } from "./pdfAssets";

// ─── TACT Visual Identity ─────────────────────────────────────────────────────

const TACT_ORANGE = "#e67e22";
const TACT_DARK = "#3d4a5c";
const TACT_BODY = "#1f2933";
const TACT_BORDER = "#cfd8df";
const TACT_BG = "#f8fafc";
const TACT_WHITE = "#ffffff";
const TACT_MUTED = "#6b7280";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  resolvido: { bg: "#dcfce7", text: "#166534" },
  resolvida: { bg: "#dcfce7", text: "#166534" },
  pendente: { bg: "#fee2e2", text: "#991b1b" },
  previsto: { bg: "#dbeafe", text: "#1e40af" },
  atencao: { bg: "#fef3c7", text: "#92400e" },
};

function statusColor(s: string) {
  const k = (s || "").toLowerCase();
  return STATUS_COLORS[k] || { bg: "#f3f4f6", text: "#374151" };
}

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────

const TACT_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  font-family: Arial, Helvetica, sans-serif;
  color: ${TACT_BODY};
  font-size: 10.5px;
  line-height: 1.35;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@page { size: A4 portrait; margin: 0; }
.pdf-document { width: 210mm; margin: 0 auto; background: #fff; }

/* Page wrapper */
.tact-page {
  width: 210mm; height: 297mm;
  position: relative; overflow: hidden;
  page-break-after: always; background: #fff;
  padding: 36mm 13mm 25mm 13mm;
}
.tact-page:last-child { page-break-after: auto; }

/* Header lines (orange + dark + orange) */
.tact-header-lines {
  position: absolute; top: 1.8mm; left: 0; right: 0;
  display: grid; gap: 1.8mm;
}
.tact-header-lines span { display: block; height: 0.45mm; }
.tact-header-lines span:nth-child(1) { background: ${TACT_ORANGE}; }
.tact-header-lines span:nth-child(2) { background: ${TACT_DARK}; opacity: 0.9; }
.tact-header-lines span:nth-child(3) { background: ${TACT_ORANGE}; opacity: 0.65; }

/* Header body: logo left + title right */
.tact-header {
  position: absolute; inset: 0 0 auto 0; height: 35mm;
}
.tact-header-body {
  position: absolute; top: 9mm; left: 13mm; right: 13mm;
  display: grid; grid-template-columns: 48mm 1fr; gap: 4mm; align-items: stretch;
}
.tact-logo-box {
  height: 26mm; border: 1.5px dashed ${TACT_BORDER};
  display: flex; align-items: center; justify-content: center; padding: 3mm;
  background: #fff;
}
.tact-logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
.tact-logo-box-fallback {
  font-weight: 800; font-size: 14px; color: ${TACT_DARK};
  text-transform: uppercase; text-align: center;
}
.tact-header-title {
  min-height: 26mm; display: flex; align-items: center; justify-content: center;
  background: ${TACT_DARK}; color: #fff;
  font-size: 22px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.5px; text-align: center; padding: 5mm 8mm;
}

/* Footer */
.tact-footer {
  position: absolute; left: 0; right: 0; bottom: 0; height: 22mm;
}
.tact-footer-line { position: absolute; left: 0; right: 0; top: 3.5mm; height: 0.45mm; background: ${TACT_ORANGE}; }
.tact-footer-text { position: absolute; left: 13mm; bottom: 5mm; color: ${TACT_MUTED}; font-size: 8px; }
.tact-footer-logo { position: absolute; right: 12mm; bottom: 4mm; width: 35mm; height: 10mm; object-fit: contain; }

/* Content area */
.tact-content { height: 237mm; position: relative; display: flex; flex-direction: column; gap: 5mm; }

/* Labels */
.tact-label { color: ${TACT_ORANGE}; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5mm; }
.tact-value { color: ${TACT_BODY}; font-size: 10.5px; font-weight: 700; }

/* Info grid */
.tact-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid ${TACT_BORDER}; background: #fff; }
.tact-info-cell { border-right: 1px solid ${TACT_BORDER}; border-bottom: 1px solid ${TACT_BORDER}; padding: 3mm; min-height: 18mm; }
.tact-info-cell:nth-child(4n) { border-right: 0; }
.tact-info-cell.wide { grid-column: span 2; }

/* Cover-specific */
.tact-cover { height: 237mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tact-cover-logo { width: 80mm; height: 26mm; display: flex; align-items: center; justify-content: center; border: 1.5px dashed ${TACT_BORDER}; margin-bottom: 10mm; padding: 4mm; }
.tact-cover-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.tact-cover-title { font-size: 54px; font-weight: 800; color: ${TACT_DARK}; text-align: right; line-height: 1.1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20mm; align-self: flex-end; }
.tact-cover-info { align-self: flex-end; width: 70%; }
.tact-cover-info-row { margin-bottom: 6mm; }
.tact-cover-info-row .tact-label { font-size: 18px; text-align: right; }
.tact-cover-info-row .tact-value { font-size: 18px; text-align: right; }

/* TAG blocks */
.tact-tag-row { display: grid; grid-template-columns: 30mm 1fr; gap: 4mm; margin-bottom: 4mm; padding: 3mm 0; border-bottom: 1px solid ${TACT_BORDER}; }
.tact-tag-label { font-size: 28px; font-weight: 900; color: ${TACT_DARK}; display: flex; align-items: center; justify-content: center; border: 2px solid ${TACT_BORDER}; }
.tact-tag-title { color: ${TACT_ORANGE}; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 1mm; }
.tact-tag-text { font-size: 11px; color: ${TACT_BODY}; line-height: 1.5; }

/* Glossary */
.tact-glossary-title { color: ${TACT_ORANGE}; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 4mm; }
.tact-glossary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; }
.tact-glossary-item { font-size: 11px; }
.tact-glossary-abbr { font-weight: 800; color: ${TACT_DARK}; }

/* Photo frames */
.tact-photo-frame { border: 2px dashed ${TACT_BORDER}; background: ${TACT_BG}; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 28px; font-weight: 800; color: ${TACT_BORDER}; text-transform: uppercase; }
.tact-photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Item header */
.tact-item-header { display: grid; grid-template-columns: 1fr auto; gap: 4mm; align-items: center; border: 1px solid ${TACT_BORDER}; padding: 4mm 5mm; }
.tact-item-header-label { font-size: 14px; font-weight: 800; color: ${TACT_DARK}; }
.tact-item-header-data { text-align: right; }
.tact-item-header-data .tact-label { font-size: 8px; }
.tact-item-header-data .tact-value { font-size: 10px; }

/* Status badge */
.tact-status-badge { display: inline-flex; align-items: center; border-radius: 999px; font-size: 8.5px; font-weight: 900; padding: 2mm 3mm; text-transform: uppercase; }

/* Checklist table */
.tact-checklist-table { width: 100%; border-collapse: collapse; border: 1px solid ${TACT_BORDER}; }
.tact-checklist-table th { background: ${TACT_DARK}; color: #fff; font-size: 8px; font-weight: 800; text-transform: uppercase; padding: 2mm 3mm; text-align: left; }
.tact-checklist-table td { border: 1px solid ${TACT_BORDER}; padding: 2mm 3mm; font-size: 10px; vertical-align: top; }
.tact-checklist-photo { width: 55mm; height: 38mm; border: 1px dashed ${TACT_BORDER}; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: ${TACT_BORDER}; text-transform: uppercase; overflow: hidden; }
.tact-checklist-photo img { width: 100%; height: 100%; object-fit: cover; }

/* Risk matrix */
.tact-matrix-table { width: 100%; border-collapse: collapse; border: 1px solid ${TACT_BORDER}; font-size: 7px; }
.tact-matrix-table th { background: ${TACT_DARK}; color: #fff; font-weight: 800; padding: 1.5mm 2mm; text-align: center; font-size: 7px; }
.tact-matrix-table td { border: 0.5px solid ${TACT_BORDER}; padding: 1.5mm 2mm; text-align: center; }
.tact-matrix-cell-extremo { background: #991b1b; color: #fff; }
.tact-matrix-cell-muitoalto { background: #dc2626; color: #fff; }
.tact-matrix-cell-alto { background: #f97316; color: #fff; }
.tact-matrix-cell-medio { background: #eab308; color: #000; }
.tact-matrix-cell-baixo { background: #84cc16; color: #000; }
.tact-matrix-cell-muitobaixo { background: #22c55e; color: #000; }
.tact-matrix-desc-table { width: 100%; border-collapse: collapse; margin-top: 3mm; border: 1px solid ${TACT_BORDER}; font-size: 8px; }
.tact-matrix-desc-table td { border: 0.5px solid ${TACT_BORDER}; padding: 1.5mm 2mm; }
.tact-matrix-desc-table .cell-label { font-weight: 800; font-size: 8px; text-align: center; }

/* PGR risk tables */
.tact-risk-table { width: 100%; border-collapse: collapse; border: 1px solid ${TACT_BORDER}; font-size: 9px; }
.tact-risk-table th { background: ${TACT_DARK}; color: #fff; font-weight: 800; font-size: 7px; padding: 1.5mm 2mm; text-align: left; text-transform: uppercase; }
.tact-risk-table td { border: 0.5px solid ${TACT_BORDER}; padding: 1.5mm 2mm; vertical-align: top; }

/* Signature */
.tact-signature-line { border-top: 1px solid ${TACT_BODY}; width: 90mm; margin: 3mm auto 1mm; max-width: 100%; }
.tact-signature-label { text-align: center; font-size: 12px; color: ${TACT_DARK}; font-weight: 800; }
.tact-signature-date { text-align: center; font-size: 14px; font-weight: 800; color: ${TACT_DARK}; margin-top: 10mm; }
.tact-signature-date .tact-label { font-size: 10px; }

/* Sanitary calculator */
.tact-sanitary-table { width: 100%; border-collapse: collapse; border: 1px solid ${TACT_BORDER}; }
.tact-sanitary-table th { background: ${TACT_DARK}; color: #fff; font-weight: 800; font-size: 8px; padding: 2mm 3mm; text-transform: uppercase; }
.tact-sanitary-table td { border: 0.5px solid ${TACT_BORDER}; padding: 2mm 3mm; font-size: 14px; text-align: center; }

/* Intro body text */
.tact-body-text { font-size: 12px; color: ${TACT_BODY}; line-height: 1.7; text-align: justify; }

/* Section title */
.tact-section-title { font-size: 14px; font-weight: 800; color: ${TACT_DARK}; text-transform: uppercase; border-bottom: 2px solid ${TACT_ORANGE}; padding-bottom: 2mm; margin-bottom: 4mm; }
`;

// ─── Page Helpers ─────────────────────────────────────────────────────────────

function headerBlock(logoUrl: string | undefined, title: string) {
  const logo = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="Logo" />`
    : `<div class="tact-logo-box-fallback">TACT</div>`;
  return `<header class="tact-header" aria-label="Cabeçalho">
    <div class="tact-header-lines"><span></span><span></span><span></span></div>
    <div class="tact-header-body">
      <div class="tact-logo-box">${logo}</div>
      <div class="tact-header-title">${esc(title)}</div>
    </div>
  </header>`;
}

function footerBlock() {
  return `<footer class="tact-footer">
    <div class="tact-footer-line"></div>
    <div class="tact-footer-text">Documento gerado pelo TACT</div>
    <img src="${getTactFooterLogoDataUrl()}" class="tact-footer-logo" alt="TACT" />
  </footer>`;
}

function wrapPage(children: string, logoUrl: string | undefined, title: string) {
  return `<section class="tact-page">
    ${headerBlock(logoUrl, title)}
    <div class="tact-content">${children}</div>
    ${footerBlock()}
  </section>`;
}

function infoGrid(data: Array<{ label: string; value: unknown; wide?: boolean }>) {
  return `<dl class="tact-info-grid">
    ${data.map(d => `<div class="tact-info-cell${d.wide ? ' wide' : ''}">
      <dt class="tact-label">${esc(d.label)}</dt>
      <dd class="tact-value">${esc(d.value || 'N/A')}</dd>
    </div>`).join('')}
  </dl>`;
}

// ─── Page Type Builders ───────────────────────────────────────────────────────

/** Page 1: Cover page */
function buildCoverPage(opts: {
  logoUrl?: string;
  title: string;
  subtitle?: string;
  empresa?: string;
  empreendimento?: string;
  localObra?: string;
}) {
  const logo = opts.logoUrl
    ? `<img src="${esc(opts.logoUrl)}" alt="Logo" />`
    : `<div class="tact-logo-box-fallback">TACT</div>`;

  return `<section class="tact-page">
    ${headerBlock(opts.logoUrl, '')}
    <div class="tact-cover">
      <div class="tact-cover-logo">${logo}</div>
      <div class="tact-cover-title">${esc(opts.title)}${opts.subtitle ? `<br><span style="font-size:40px">${esc(opts.subtitle)}</span>` : ''}</div>
      <div class="tact-cover-info">
        ${opts.empresa ? `<div class="tact-cover-info-row"><div class="tact-label">Empresa:</div><div class="tact-value">${esc(opts.empresa)}</div></div>` : ''}
        ${opts.empreendimento ? `<div class="tact-cover-info-row"><div class="tact-label">Empreendimento:</div><div class="tact-value">${esc(opts.empreendimento)}</div></div>` : ''}
        ${opts.localObra ? `<div class="tact-cover-info-row"><div class="tact-label">Local da Obra:</div><div class="tact-value">${esc(opts.localObra)}</div></div>` : ''}
      </div>
    </div>
    ${footerBlock()}
  </section>`;
}

/** Page 2: Introduction with tags */
function buildIntroPage(opts: {
  logoUrl?: string;
  title: string;
  text: string;
  tags: Array<{ label: string; title: string; text: string }>;
  glossary: Array<{ abbr: string; desc: string }>;
}) {
  const tagsHtml = opts.tags.map(t => `
    <div class="tact-tag-row">
      <div class="tact-tag-label">TAG</div>
      <div>
        <div class="tact-tag-title">${esc(t.label)}:</div>
        <div class="tact-tag-text">${esc(t.text)}</div>
      </div>
    </div>`).join('');

  const glossaryHtml = opts.glossary.length ? `
    <div class="tact-glossary-title">GLOSSÁRIO:</div>
    <div class="tact-glossary-grid">
      ${opts.glossary.map(g => `<div class="tact-glossary-item"><span class="tact-glossary-abbr">${esc(g.abbr)}</span> - ${esc(g.desc)}</div>`).join('')}
    </div>` : '';

  return wrapPage(`
    <div class="tact-body-text">${esc(opts.text)}</div>
    ${tagsHtml}
    ${glossaryHtml}
  `, opts.logoUrl, opts.title);
}

/** Page 3: Item with 1 photo */
function buildItem1PhotoPage(opts: {
  logoUrl?: string;
  title: string;
  itemLabel: string;
  status: string;
  date: string;
  photoUrl?: string;
  text: string;
}) {
  const photo = opts.photoUrl
    ? `<img src="${esc(opts.photoUrl)}" alt="Evidência" />`
    : 'FOTO';
  const sc = statusColor(opts.status);

  return wrapPage(`
    <div class="tact-item-header">
      <div class="tact-item-header-label">${esc(opts.itemLabel)}</div>
      <div class="tact-item-header-data">
        <div class="tact-label">Status</div>
        <span class="tact-status-badge" style="background:${sc.bg};color:${sc.text}">${esc(opts.status)}</span>
        <div class="tact-label" style="margin-top:2mm">Data</div>
        <div class="tact-value">${esc(opts.date)}</div>
      </div>
    </div>
    <div class="tact-photo-frame" style="height:130mm">${photo}</div>
    <div>
      <div class="tact-label">Texto</div>
      <div class="tact-value" style="white-space:pre-wrap">${esc(opts.text)}</div>
    </div>
  `, opts.logoUrl, opts.title);
}

/** Page 4: Item with 2 photos */
function buildItem2PhotoPage(opts: {
  logoUrl?: string;
  title: string;
  itemLabel: string;
  status: string;
  date: string;
  photo1Url?: string;
  photo2Url?: string;
  text: string;
}) {
  const ph = (url?: string) => url ? `<img src="${esc(url)}" alt="Evidência" />` : 'FOTO';
  const sc = statusColor(opts.status);

  return wrapPage(`
    <div class="tact-item-header">
      <div class="tact-item-header-label">${esc(opts.itemLabel)}</div>
      <div class="tact-item-header-data">
        <div class="tact-label">Status</div>
        <span class="tact-status-badge" style="background:${sc.bg};color:${sc.text}">${esc(opts.status)}</span>
        <div class="tact-label" style="margin-top:2mm">Data</div>
        <div class="tact-value">${esc(opts.date)}</div>
      </div>
    </div>
    <div class="tact-photo-frame" style="height:60mm">${ph(opts.photo1Url)}</div>
    <div class="tact-photo-frame" style="height:60mm">${ph(opts.photo2Url)}</div>
    <div>
      <div class="tact-label">Texto</div>
      <div class="tact-value" style="white-space:pre-wrap">${esc(opts.text)}</div>
    </div>
  `, opts.logoUrl, opts.title);
}

/** Page 5: Item with 4 photos (2x2 grid) */
function buildItem4PhotoPage(opts: {
  logoUrl?: string;
  title: string;
  itemLabel: string;
  status: string;
  date: string;
  photoUrls: string[];
  text: string;
}) {
  const ph = (url?: string) => url ? `<img src="${esc(url)}" alt="Evidência" />` : 'FOTO';
  const sc = statusColor(opts.status);
  const urls = opts.photoUrls || [];

  return wrapPage(`
    <div class="tact-item-header">
      <div class="tact-item-header-label">${esc(opts.itemLabel)}</div>
      <div class="tact-item-header-data">
        <div class="tact-label">Status</div>
        <span class="tact-status-badge" style="background:${sc.bg};color:${sc.text}">${esc(opts.status)}</span>
        <div class="tact-label" style="margin-top:2mm">Data</div>
        <div class="tact-value">${esc(opts.date)}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:60mm 60mm;gap:2mm">
      <div class="tact-photo-frame">${ph(urls[0])}</div>
      <div class="tact-photo-frame">${ph(urls[1])}</div>
      <div class="tact-photo-frame">${ph(urls[2])}</div>
      <div class="tact-photo-frame">${ph(urls[3])}</div>
    </div>
    <div>
      <div class="tact-label">Texto</div>
      <div class="tact-value" style="white-space:pre-wrap">${esc(opts.text)}</div>
    </div>
  `, opts.logoUrl, opts.title);
}

/** Page 6-7: Checklist (with or without photo column) */
function buildChecklistPage(opts: {
  logoUrl?: string;
  title: string;
  empresa: string;
  obra: string;
  tema: string;
  data: string;
  items: Array<{
    verificacao: string;
    norma: string;
    descricao: string;
    status: string;  // C, NC, NA
    consideracoes: string;
    photoUrl?: string;
  }>;
  showPhotos: boolean;
}) {
  const cols = opts.showPhotos ? 5 : 4;
  const itemsHtml = opts.items.map(item => {
    const sc = item.status === 'C' ? { bg: '#dcfce7', text: '#166534' }
      : item.status === 'NC' ? { bg: '#fee2e2', text: '#991b1b' }
      : { bg: '#f3f4f6', text: '#374151' };
    return `<tr>
      <td style="font-size:9px">${esc(item.verificacao)}</td>
      <td style="font-size:9px">${esc(item.norma)}</td>
      <td style="font-size:9px">${esc(item.descricao)}</td>
      <td style="text-align:center"><span class="tact-status-badge" style="background:${sc.bg};color:${sc.text};font-size:12px">${esc(item.status)}</span></td>
      ${opts.showPhotos ? `<td><div class="tact-checklist-photo">${item.photoUrl ? `<img src="${esc(item.photoUrl)}" alt="Evidência" />` : 'Evidência Visual'}</div></td>` : ''}
      <td style="font-size:9px">${esc(item.consideracoes)}</td>
    </tr>`;
  }).join('');

  return wrapPage(`
    ${infoGrid([
      { label: 'Empresa:', value: opts.empresa },
      { label: 'Obra:', value: opts.obra },
      { label: 'Tema CheckList:', value: opts.tema, wide: true },
      { label: 'Data:', value: opts.data },
    ])}
    <table class="tact-checklist-table">
      <tr>
        <th style="width:25%">Itens de Verificação</th>
        <th style="width:15%">Norma de Referência</th>
        <th style="width:30%">Descrição Adicional do Item</th>
        <th style="width:10%">STATUS</th>
        ${opts.showPhotos ? '<th style="width:20%">Evidência Visual</th>' : ''}
      </tr>
      ${itemsHtml}
    </table>
  `, opts.logoUrl, opts.title);
}

/** Page 9: PGR 5x5 Risk Matrix */
function buildPgrMatrixPage(opts: {
  logoUrl?: string;
  title: string;
  introText: string;
}) {
  // Matrix cell definitions: [label, cssClass, description]
  const probLabels = ['ALTAMENTE IMPROVÁVEL', 'IMPROVÁVEL', 'POSSÍVEL', 'PROVÁVEL', 'MUITO PROVÁVEL'];
  const consLabels = ['INSIGNIFICANTE', 'TOLERÁVEL', 'MODERADA', 'GRAVE', 'SEVERA'];
  const consNums = [1, 2, 3, 4, 5];

  // Risk matrix: rows=probabilidade (5 top), cols=consequencia (5)
  // NR = P x C
  const matrixData = [
    [ {n:1, cls:'muitobaixo'}, {n:1, cls:'muitobaixo'},  {n:2, cls:'muitobaixo'}, {n:3, cls:'baixo'},     {n:5, cls:'medio'} ],
    [ {n:2, cls:'muitobaixo'}, {n:2, cls:'baixo'},       {n:4, cls:'baixo'},       {n:6, cls:'medio'},      {n:10, cls:'medio'} ],
    [ {n:3, cls:'baixo'},      {n:3, cls:'medio'},        {n:6, cls:'medio'},       {n:9, cls:'medio'},      {n:12, cls:'alto'} ],
    [ {n:4, cls:'baixo'},      {n:4, cls:'medio'},        {n:8, cls:'medio'},       {n:12, cls:'alto'},      {n:16, cls:'muitoalto'} ],
    [ {n:5, cls:'medio'},      {n:5, cls:'medio'},        {n:10, cls:'medio'},      {n:15, cls:'alto'},      {n:20, cls:'extremo'} ],
  ];

  // Build table
  let matrixHtml = `<table class="tact-matrix-table">
    <tr><th></th><th colspan="5">CONSEQUÊNCIA</th></tr>
    <tr><th style="writing-mode:vertical-rl;min-width:14mm">PROBABILIDADE</th>
    ${consNums.map(n => `<th>${n}</th>`).join('')}
    <th>RESUL.</th></tr>`;

  for (let row = 0; row < 5; row++) {
    matrixHtml += `<tr><td style="font-weight:800;font-size:7px;text-align:left">${probLabels[row]}</td>`;
    for (let col = 0; col < 5; col++) {
      const cell = matrixData[row][col];
      matrixHtml += `<td class="tact-matrix-cell-${cell.cls}">${cell.n}</td>`;
    }
    matrixHtml += `<td style="font-weight:800;font-size:7px">${consLabels[row]}</td></tr>`;
  }
  matrixHtml += `<tr><td></td>
    ${consLabels.map(l => `<td style="font-weight:800;font-size:5.5px;text-align:center;padding:1mm">${l}</td>`).join('')}
    <td></td></tr>`;
  matrixHtml += '</table>';

  // Description table
  const descRows = [
    { label: 'EXTREMO', cls: 'extremo', desc: 'Interromper atividade até eliminação ou redução do risco' },
    { label: 'MUITO ALTO', cls: 'muitoalto', desc: 'Ação imediata para reduzir ou eliminar o risco' },
    { label: 'ALTO', cls: 'alto', desc: 'Garantir a implementação de proteções ou dispositivos de segurança.' },
    { label: 'MÉDIO', cls: 'medio', desc: 'Devem ser realizadas ações para reduzir ou eliminar o risco.' },
    { label: 'BAIXO', cls: 'baixo', desc: 'Garantir que as medidas atuais de proteção são eficazes. Aprimorar com ações complementares' },
    { label: 'MUITO BAIXO', cls: 'muitobaixo', desc: 'Considerar possíveis ações. Manter as medidas de proteção' },
  ];
  const descHtml = `<table class="tact-matrix-desc-table">
    <tr><th style="width:25%">RESUL.</th><th>DESCRIÇÃO</th></tr>
    ${descRows.map(d => `<tr>
      <td class="cell-label tact-matrix-cell-${d.cls}">${d.label}</td>
      <td style="font-size:8px">${d.desc}</td>
    </tr>`).join('')}
  </table>`;

  return wrapPage(`
    <div class="tact-body-text">${esc(opts.introText)}</div>
    <div class="tact-section-title">Matriz de Avaliação de Riscos 5x5</div>
    ${matrixHtml}
    ${descHtml}
  `, opts.logoUrl, opts.title);
}

/** Page 10: PGR Vestiário / NR-18 */
function buildPgrVestiarioPage(opts: {
  logoUrl?: string;
  title: string;
  empresa: string;
  obra: string;
  revisao: string;
  responsavel: string;
  status: string;
  validade: string;
  observacoes: string;
  vasos: number;
  lavatorio: number;
  mictorios: number;
  chuveiros: number;
}) {
  return wrapPage(`
    ${infoGrid([
      { label: 'Empresa:', value: opts.empresa },
      { label: 'Obra:', value: opts.obra },
      { label: 'Revisão:', value: opts.revisao },
      { label: 'Responsável Técnico:', value: opts.responsavel },
      { label: 'Status:', value: opts.status },
      { label: 'Validade:', value: opts.validade },
    ])}
    <div class="tact-section-title">Calculadora de Instalações Sanitárias</div>
    <table class="tact-sanitary-table">
      <tr><th>Vasos</th><th>Lavatório</th><th>Mictórios</th><th>Chuveiros</th></tr>
      <tr>
        <td>${opts.vasos || '—'}</td>
        <td>${opts.lavatorio || '—'}</td>
        <td>${opts.mictorios || '—'}</td>
        <td>${opts.chuveiros || '—'}</td>
      </tr>
    </table>
    <div style="margin-top:4mm">
      <div class="tact-label">Observações Gerais</div>
      <div class="tact-value" style="white-space:pre-wrap">${esc(opts.observacoes)}</div>
    </div>
  `, opts.logoUrl, opts.title);
}

/** Page 11: PGR Risk Table + Action Plan */
function buildPgrRisksPage(opts: {
  logoUrl?: string;
  title: string;
  etapa: string;
  atividade: string;
  terceirizado: string;
  terceirizadoDados: string;
  risks: Array<{
    risco: string;
    tipo: string;
    fonte: string;
    danos: string;
    probabilidade: string;
    consequencia: string;
    nivel: string;
  }>;
  actionPlan: string[];
}) {
  const riskRows = opts.risks.map((r, i) => `<tr>
    <td>${esc(r.risco)}</td>
    <td>${esc(r.tipo)}</td>
    <td>${esc(r.fonte)}</td>
    <td>${esc(r.danos)}</td>
    <td style="text-align:center">${esc(r.probabilidade)}</td>
    <td style="text-align:center">${esc(r.consequencia)}</td>
    <td style="text-align:center;font-weight:800">${esc(r.nivel)}</td>
  </tr>`).join('');

  const planItems = opts.actionPlan.map((a, i) => `<tr>
    <td style="text-align:center;width:8mm;font-weight:800">${i + 1}</td>
    <td>${esc(a)}</td>
  </tr>`).join('');

  return wrapPage(`
    ${infoGrid([
      { label: 'Etapas e Equipes:', value: opts.etapa },
      { label: 'Atividade:', value: opts.atividade },
      { label: 'Terceirizado:', value: opts.terceirizado || 'N/A' },
      { label: 'Dados do Terceirizado:', value: opts.terceirizadoDados || 'N/A' },
    ])}
    <div class="tact-section-title">Tabela de Riscos</div>
    <table class="tact-risk-table">
      <tr>
        <th>Risco</th><th>Tipo</th><th>Fonte Geradora</th>
        <th>Possíveis danos à Saúde</th><th>Prob.</th><th>Cons.</th><th>Nível do Risco</th>
      </tr>
      ${riskRows}
    </table>
    ${opts.actionPlan.length ? `
    <div class="tact-section-title" style="margin-top:3mm">Plano de Ação</div>
    <table class="tact-risk-table">
      ${planItems}
    </table>` : ''}
  `, opts.logoUrl, opts.title);
}

/** Page 12: Signature page */
function buildSignaturePage(opts: {
  logoUrl?: string;
  title: string;
  text: string;
  date?: string;
}) {
  return wrapPage(`
    <div class="tact-body-text" style="margin-bottom:20mm">${esc(opts.text)}</div>
    <div class="tact-signature-date">
      <div class="tact-label">Data</div>
      <div class="tact-value">${esc(opts.date || '__/__/____')}</div>
    </div>
    <div style="margin-top:5mm">
      <div class="tact-signature-line"></div>
      <div class="tact-signature-label">Campo de assinatura</div>
    </div>
  `, opts.logoUrl, opts.title);
}

/** Page 13: Advertência */
function buildAdvertenciaPage(opts: {
  logoUrl?: string;
  title: string;
  empresa: string;
  obra: string;
  colaborador: string;
  tipoAdvertencia: string;
  motivo: string;
  data: string;
  descricao: string;
}) {
  return wrapPage(`
    ${infoGrid([
      { label: 'Empresa:', value: opts.empresa },
      { label: 'Obra:', value: opts.obra },
      { label: 'Colaborador:', value: opts.colaborador },
      { label: 'Tipo de Advertência:', value: opts.tipoAdvertencia },
      { label: 'Motivo da Advertência:', value: opts.motivo },
      { label: 'Data:', value: opts.data },
    ])}
    <div>
      <div class="tact-label">Descrição</div>
      <div class="tact-value" style="white-space:pre-wrap;min-height:80mm;border:1px solid ${TACT_BORDER};padding:3mm">${esc(opts.descricao)}</div>
    </div>
    <div class="tact-signature-date">
      <div class="tact-label">Data</div>
      <div class="tact-value">${esc(opts.data || '__/__/____')}</div>
    </div>
    <div style="margin-top:5mm">
      <div class="tact-signature-line"></div>
      <div class="tact-signature-label">Campo de assinatura</div>
    </div>
  `, opts.logoUrl, opts.title || 'ADVERTÊNCIAS');
}

/** Page 14: APR (blank) */
function buildAprPage(opts: {
  logoUrl?: string;
  title: string;
}) {
  return wrapPage('', opts.logoUrl, opts.title || 'APR');
}

// ─── Full Document Builders ───────────────────────────────────────────────────

export interface TactDocumentOptions {
  logoUrl?: string;
}

/** Build a complete Relatório Técnico PDF */
export function buildRelatorioTecnicoHtml(data: {
  logoUrl?: string;
  companyName: string;
  obraName: string;
  obraAddress: string;
  items: Array<{
    title: string;
    status: string;
    date: string;
    text: string;
    photoUrls: string[];
  }>;
}): string {
  const pages: string[] = [];

  // Cover
  pages.push(buildCoverPage({
    logoUrl: data.logoUrl,
    title: 'RELATÓRIO',
    subtitle: 'TÉCNICO',
    empresa: data.companyName,
    empreendimento: data.obraName,
    localObra: data.obraAddress,
  }));

  // Intro with standard tags
  pages.push(buildIntroPage({
    logoUrl: data.logoUrl,
    title: 'INTRODUÇÃO',
    text: `Relatório técnico que tem como principal função evidenciar e orientar sobre desvios dentro do canteiro de obras. Os apontamentos aqui informados são uma forma de orientar tecnicamente a empresa e auxiliar na tomada de decisões.`,
    tags: [
      {
        label: 'RESOLVIDO',
        title: 'RESOLVIDO:',
        text: 'Esta TAG é aplicada a situações que foram solucionadas, informando a data em que o atendimento foi realizado. Itens resolvidos são removidos dos próximos relatórios.',
      },
      {
        label: 'PENDENTE',
        title: 'PENDENTE:',
        text: 'Esta TAG é aplicada a situações que não foram resolvidas, indicando a data em que foram evidenciadas no relatório. Este item é obrigatoriamente monitorado até a sua resolução.',
      },
      {
        label: 'PREVISTO',
        title: 'PREVISTO:',
        text: 'Esta TAG é aplicada quando um item não pode ser atendido de imediato, porém já possui um prazo de execução definido.',
      },
      {
        label: 'ATENÇÃO',
        title: 'ATENÇÃO:',
        text: 'Esta TAG é aplicada a situações que requerem atenção e análise, possuindo caráter informativo.',
      },
    ],
    glossary: [
      { abbr: 'ASO', desc: 'atestado de saúde ocupacional' },
      { abbr: 'CAT', desc: 'Comunicação de Acidente do Trabalho.' },
      { abbr: 'DDS', desc: 'Diálogo Diário de Segurança' },
      { abbr: 'OS', desc: 'Ordem de Serviço' },
      { abbr: 'TST', desc: 'Técnico em Segurança do Trabalho' },
      { abbr: 'IT', desc: 'Instrução Técnica' },
      { abbr: 'PGR', desc: 'Programa de Gerenciamento de Riscos' },
      { abbr: 'PCMSO', desc: 'Programa de Controle Médico de Saúde Ocupacional' },
      { abbr: 'APR', desc: 'Análise Preliminar de Risco' },
    ],
  }));

  // Item pages based on photo count
  for (const item of data.items) {
    const photoCount = item.photoUrls?.length || 0;
    if (photoCount <= 1) {
      pages.push(buildItem1PhotoPage({
        logoUrl: data.logoUrl,
        title: 'Item',
        itemLabel: item.title,
        status: item.status,
        date: item.date,
        photoUrl: item.photoUrls?.[0],
        text: item.text,
      }));
    } else if (photoCount === 2) {
      pages.push(buildItem2PhotoPage({
        logoUrl: data.logoUrl,
        title: 'Item',
        itemLabel: item.title,
        status: item.status,
        date: item.date,
        photo1Url: item.photoUrls?.[0],
        photo2Url: item.photoUrls?.[1],
        text: item.text,
      }));
    } else {
      pages.push(buildItem4PhotoPage({
        logoUrl: data.logoUrl,
        title: 'Item',
        itemLabel: item.title,
        status: item.status,
        date: item.date,
        photoUrls: item.photoUrls,
        text: item.text,
      }));
    }
  }

  return renderDocument('Relatório Técnico', pages);
}

/** Build a complete PGR (Programa de Gerenciamento de Riscos) PDF */
export function buildPgrHtml(data: {
  logoUrl?: string;
  companyName: string;
  companyAddress: string;
  cnpj: string;
  obraName: string;
  obraAddress: string;
  title: string;
  version: string;
  validFrom: string;
  validUntil: string;
  status: string;
  riskMatrix?: any[];
  actionPlan?: string[];
  observations?: string;
  stages?: Array<{ name: string; description: string; subcontractorInfo?: any }>;
  nr24Workers?: number;
  signatureUrl?: string;
  responsibleName?: string;
}): string {
  const pages: string[] = [];

  // Cover
  pages.push(buildCoverPage({
    logoUrl: data.logoUrl,
    title: 'RELATÓRIO DO',
    subtitle: 'PGR',
    empresa: data.companyName,
    empreendimento: data.obraName,
    localObra: data.obraAddress,
  }));

  // Introduction with risk matrix
  pages.push(buildPgrMatrixPage({
    logoUrl: data.logoUrl,
    title: 'INTRODUÇÃO',
    introText: `Este documento constitui um anexo integrante e complementar ao Programa de Gerenciamento de Riscos (PGR) principal da empresa, desenvolvido em estrita conformidade com as diretrizes estabelecidas pela NR-18 (Condições de Segurança e Saúde no Trabalho na Indústria da Construção) e pela NR-01 (Disposições Gerais e Gerenciamento de Riscos Ocupacionais).

O objetivo deste relatório é atualizar e detalhar as etapas de execução e os respectivos riscos ocupacionais mapeados a partir de rigorosas avaliações e vistorias técnicas realizadas in loco.

Este relatório deve ser anexado ao PGR Principal para complementar o acompanhamento das etapas de obra.

Para a categorização e priorização dos riscos identificados durante as avaliações in loco, este relatório utiliza a Matriz de Avaliação de Riscos 5x5. Este método cruza a Probabilidade de ocorrência de um evento perigoso com a sua respectiva Consequência (ou Severidade), estabelecendo o Nível de Risco (NR) das atividades do canteiro.

O Nível de Risco é obtido através da fórmula: Nível de Risco (NR) = Probabilidade (P) x Consequência (C)`,
  }));

  // Vestiário page
  const workers = data.nr24Workers || 50;
  pages.push(buildPgrVestiarioPage({
    logoUrl: data.logoUrl,
    title: 'PGR',
    empresa: data.companyName,
    obra: data.obraName,
    revisao: data.version || '01',
    responsavel: data.responsibleName || 'Técnico de Segurança',
    status: data.status || 'Ativo',
    validade: data.validUntil || '__/__/____',
    observacoes: data.observations || '',
    vasos: Math.ceil(workers / 20),
    lavatorio: Math.ceil(workers / 20),
    mictorios: Math.ceil(workers / 20),
    chuveiros: Math.ceil(workers / 10),
  }));

  // Risk tables per stage
  const stages = data.stages || [];
  for (const stage of stages) {
    const stageRisks = data.riskMatrix || [];
    pages.push(buildPgrRisksPage({
      logoUrl: data.logoUrl,
      title: 'PGR',
      etapa: stage.name || 'N/A',
      atividade: stage.description || '',
      terceirizado: stage.subcontractorInfo ? 'Sim' : 'Não',
      terceirizadoDados: stage.subcontractorInfo ? JSON.stringify(stage.subcontractorInfo) : '',
      risks: stageRisks.map((r: any) => ({
        risco: r.description || r.risco || '',
        tipo: r.type || r.tipo || '',
        fonte: r.source || r.fonte || '',
        danos: r.damage || r.danos || '',
        probabilidade: r.probability || r.probabilidade || '',
        consequencia: r.consequence || r.consequencia || '',
        nivel: r.level || r.nivel || '',
      })),
      actionPlan: data.actionPlan || [],
    }));
  }

  // Signature
  pages.push(buildSignaturePage({
    logoUrl: data.logoUrl,
    title: 'PGR',
    text: `O presente documento formaliza o Programa de Gerenciamento de Riscos (PGR), refletindo as diretrizes de segurança e saúde ocupacional estabelecidas pela empresa principal. Este relatório consolida as informações cadastrais da organização e atesta o adequado dimensionamento da infraestrutura de vivência do canteiro. Destaca-se a estruturação dos vestiários, que se encontra dimensionada e operante em estrita conformidade com o contingente atual de colaboradores mobilizados.

Adicionalmente, o documento mapeia de forma sistêmica as etapas operacionais atualmente em andamento, bem como a relação de todas as empresas contratadas responsáveis pela execução de cada fase do projeto. Para cada frente de serviço, o inventário detalha minuciosamente os riscos ocupacionais inerentes às atividades desempenhadas, vinculando-os diretamente aos seus respectivos planos de ação. Tais medidas preventivas e corretivas visam a mitigação, controle e eliminação dos perigos identificados, garantindo a integridade física da força de trabalho. Este PGR possui caráter dinâmico e será continuamente revisado e atualizado conforme a evolução física e cronológica das atividades no canteiro.`,
    date: new Date().toLocaleDateString('pt-BR'),
  }));

  return renderDocument('PGR', pages);
}

/** Build a Checklist PDF */
export function buildChecklistHtml(data: {
  logoUrl?: string;
  empresa: string;
  obra: string;
  tema: string;
  data: string;
  items: Array<{
    verificacao: string;
    norma: string;
    descricao: string;
    status: string;
    consideracoes: string;
    photoUrl?: string;
  }>;
}): string {
  const pages: string[] = [];
  const hasAnyPhoto = data.items.some(i => i.photoUrl);

  if (hasAnyPhoto) {
    // 2 items per page with photo column
    for (let i = 0; i < data.items.length; i += 2) {
      pages.push(buildChecklistPage({
        logoUrl: data.logoUrl,
        title: 'CheckList',
        empresa: data.empresa,
        obra: data.obra,
        tema: data.tema,
        data: data.data,
        items: data.items.slice(i, i + 2),
        showPhotos: true,
      }));
    }
  } else {
    // 4 items per page without photos
    for (let i = 0; i < data.items.length; i += 4) {
      pages.push(buildChecklistPage({
        logoUrl: data.logoUrl,
        title: 'CheckList',
        empresa: data.empresa,
        obra: data.obra,
        tema: data.tema,
        data: data.data,
        items: data.items.slice(i, i + 4),
        showPhotos: false,
      }));
    }
  }

  return renderDocument('CheckList', pages);
}

/** Build Advertência PDF */
export function buildAdvertenciaHtml(data: {
  logoUrl?: string;
  empresa: string;
  obra: string;
  colaborador: string;
  tipoAdvertencia: string;
  motivo: string;
  data: string;
  descricao: string;
}): string {
  const pages: string[] = [];
  pages.push(buildAdvertenciaPage({
    logoUrl: data.logoUrl,
    title: 'ADVERTÊNCIAS',
    ...data,
  }));
  return renderDocument('Advertência', pages);
}

/** Build APR PDF */
export function buildAprHtml(data: {
  logoUrl?: string;
}): string {
  const pages: string[] = [];
  pages.push(buildAprPage({
    logoUrl: data.logoUrl,
    title: 'APR',
  }));
  return renderDocument('APR', pages);
}

// ─── Document Wrapper ─────────────────────────────────────────────────────────

function renderDocument(title: string, pages: string[]): string {
  return repairPdfHtml(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <style>${TACT_CSS}</style>
</head>
<body>
  <div class="pdf-document">${pages.join('')}</div>
</body>
</html>`);
}
