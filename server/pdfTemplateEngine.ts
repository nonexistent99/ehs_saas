import fs from "fs";
import path from "path";
import sharp from "sharp";
import Handlebars from "handlebars";

import { generatePdfFromHtml } from "./pdf";

// ─── Handlebars Helpers ───────────────────────────────────────────────────────

Handlebars.registerHelper("eq", function (a: any, b: any) {
  return a === b;
});

// Returns the hex color for an inspection item status
Handlebars.registerHelper("statusColor", function (status: string) {
  const colors: Record<string, string> = {
    resolvido: "#16a34a",
    pendente:  "#dc2626",
    atencao:   "#ca8a04",
    previsto:  "#2563eb",
  };
  return colors[status] ?? "#6b7280";
});

// Returns the display label for an inspection item status
Handlebars.registerHelper("statusLabel", function (status: string) {
  const labels: Record<string, string> = {
    resolvido: "RESOLVIDO",
    pendente:  "PENDENTE",
    atencao:   "ATENÇÃO",
    previsto:  "PREVISTO",
  };
  return labels[status] ?? (status ?? "").toUpperCase();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(process.cwd(), "server", "templates");
const PUBLIC_DIR    = path.join(process.cwd(), "public");

/**
 * Converts an image URL/path into a data: base64 URI so Puppeteer can
 * embed it regardless of whether it's a relative /uploads/... path or
 * an absolute file system path.
 *
 * Supports:
 *  - Relative paths starting with "/" → resolved against PUBLIC_DIR
 *  - Absolute file paths (C:\... or /home/...)
 *  - Already-resolved data: URIs → returned as-is
 *  - External http/https URLs → returned as-is (Puppeteer can fetch those)
 */
export async function resolveImageToDataUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return "";

  // Already a data URI — pass through
  if (rawUrl.startsWith("data:")) return rawUrl;

  // External URL — pass through (Puppeteer can fetch)
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;

  // Resolve to absolute path
  let filePath: string;
  if (rawUrl.startsWith("/")) {
    // Web relative path, e.g. "/uploads/abc.webp"
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

  let buffer: any = fs.readFileSync(filePath);
  let ext    = path.extname(filePath).toLowerCase().replace(".", "");
  
  if (ext === "webp") {
    try {
      buffer = await sharp(buffer as any).jpeg({ quality: 90 }).toBuffer();
      ext = "jpeg";
    } catch (e) {
      console.error("[pdfTemplateEngine] Failed to convert WebP to JPEG:", e);
    }
  }

  const mime   = ext === "webp" ? "image/webp"
               : ext === "png"  ? "image/png"
               : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
               : "image/jpeg";

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Loads and compiles a Handlebars template from the filesystem.
 */
function getTemplate(relativePath: string) {
  const filePath = path.join(TEMPLATES_DIR, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${filePath}`);
  }
  return Handlebars.compile(fs.readFileSync(filePath, "utf-8"));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TechnicalReportData {
  // Capa
  logoUrl?:       string;
  empresa:        string;
  empreendimento: string;
  local:          string;
  data:           string;
  observacoes?:   string;

  // Itens de ocorrência
  itens: Array<{
    titulo:    string;
    status:    "resolvido" | "pendente" | "atencao" | "previsto" | string;
    descricao: string;
    plano_acao: string;
    prazo?:    string;
    imagens?:  Array<{ url: string; descricao?: string }>;
  }>;
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates the PDF Buffer for a 3-block Technical Report.
 * Images stored as relative /uploads/... paths are converted to base64
 * data URIs so Puppeteer can embed them even without a running HTTP server.
 */
export async function generateTechnicalReportPdf(data: TechnicalReportData): Promise<Buffer> {
  // --- 1. Resolve logo URL ---
  const resolvedLogoUrl = data.logoUrl ? await resolveImageToDataUrl(data.logoUrl) : "";

  // --- 2. Resolve images in every item ---
  const itensResolved = await Promise.all(
    data.itens.map(async (item) => ({
      ...item,
      imagens: await Promise.all(
        (item.imagens ?? []).map(async (img) => ({
          ...img,
          url: await resolveImageToDataUrl(img.url),
        }))
      ),
    }))
  );

  // --- 3. Load template compilers ---
  const coverTemplate = getTemplate("technical/cover.html");
  const introTemplate = getTemplate("technical/intro.html");
  const itemTemplate  = getTemplate("technical/inspection-item.html");

  // --- 4. Render HTML blocks ---
  const coverHtml = coverTemplate({ ...data, logoUrl: resolvedLogoUrl });
  const introHtml = introTemplate({});
  const itemsHtml = itensResolved.map((item) => itemTemplate(item)).join("\n");

  // --- 5. Wrap into full HTML document ---
  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    * { box-sizing: border-box; }
    @media print {
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  ${coverHtml}
  ${introHtml}
  ${itemsHtml}
</body>
</html>`;

  // --- 6. Generate PDF ---
  return await generatePdfFromHtml(fullHtml);
}
