import puppeteer from "puppeteer";

export async function generateInspectionPdf(inspectionData: {
  title: string;
  company?: string;
  address?: string;
  status?: string;
  watermark?: string;
  description?: string;
  createdAt?: Date | string;
  items?: Array<{
    title?: string;
    situacao?: string;
    planoAcao?: string;
    observacoes?: string;
    status?: string;
  }>;
}): Promise<Buffer> {
  const statusColors: Record<string, string> = {
    pendente: "#f59e0b",
    atencao: "#ef4444",
    resolvido: "#22c55e",
    resolvida: "#22c55e",
    previsto: "#6366f1",
    nao_iniciada: "#6b7280",
    concluida: "#22c55e",
  };

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    atencao: "Atenção",
    resolvido: "Resolvido",
    resolvida: "Resolvida",
    previsto: "Previsto",
    nao_iniciada: "Não Iniciada",
    concluida: "Concluída",
  };

  const itemsHtml = (inspectionData.items || []).map((item, i) => `
    <div style="margin-bottom: 20px; border: 1px solid #333; border-radius: 8px; overflow: hidden;">
      <div style="background: #1a1a1a; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #fff; font-weight: 600; font-size: 14px;">#${i + 1} ${item.title || `Item ${i + 1}`}</span>
        <span style="background: ${statusColors[item.status || "pendente"] || "#f59e0b"}; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
          ${statusLabels[item.status || "pendente"] || item.status}
        </span>
      </div>
      <div style="padding: 14px 16px; background: #111;">
        ${item.situacao ? `
          <div style="margin-bottom: 10px;">
            <p style="color: #f97316; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Situação Evidenciada</p>
            <p style="color: #e5e7eb; font-size: 13px; margin: 0;">${item.situacao}</p>
          </div>
        ` : ""}
        ${item.planoAcao ? `
          <div style="margin-bottom: 10px;">
            <p style="color: #f97316; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Plano de Ação</p>
            <p style="color: #e5e7eb; font-size: 13px; margin: 0;">${item.planoAcao}</p>
          </div>
        ` : ""}
        ${item.observacoes ? `
          <div>
            <p style="color: #f97316; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Observações</p>
            <p style="color: #e5e7eb; font-size: 13px; margin: 0;">${item.observacoes}</p>
          </div>
        ` : ""}
      </div>
    </div>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #0a0a0a; color: #e5e7eb; }
        .watermark {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px; font-weight: 900;
          color: rgba(249, 115, 22, 0.06);
          white-space: nowrap; pointer-events: none; z-index: 0;
          letter-spacing: 8px;
        }
        .content { position: relative; z-index: 1; padding: 40px; }
        .header {
          background: linear-gradient(135deg, #f97316, #ea580c);
          padding: 30px 40px; margin: -40px -40px 30px -40px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .header-title { color: #fff; }
        .header-title h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .header-title p { font-size: 12px; opacity: 0.85; }
        .header-logo { color: #fff; text-align: right; }
        .header-logo .logo-text { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
        .header-logo .logo-sub { font-size: 10px; opacity: 0.8; letter-spacing: 1px; }
        .meta-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px; margin-bottom: 30px;
        }
        .meta-card {
          background: #111; border: 1px solid #222;
          border-radius: 8px; padding: 14px 16px;
        }
        .meta-card .label { color: #f97316; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .meta-card .value { color: #e5e7eb; font-size: 14px; font-weight: 500; }
        .section-title {
          color: #f97316; font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 2px;
          border-bottom: 1px solid #222; padding-bottom: 8px; margin-bottom: 16px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px; border-radius: 12px;
          font-size: 12px; font-weight: 600; color: #fff;
        }
        .footer {
          margin-top: 40px; padding-top: 16px; border-top: 1px solid #222;
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer p { color: #6b7280; font-size: 11px; }
      </style>
    </head>
    <body>
      ${inspectionData.watermark ? `<div class="watermark">${inspectionData.watermark}</div>` : ""}
      <div class="content">
        <div class="header">
          <div class="header-title">
            <h1>${inspectionData.title}</h1>
            <p>Relatório Técnico de Inspeção de Segurança</p>
          </div>
          <div class="header-logo">
            <div class="logo-text">EHS</div>
            <div class="logo-sub">SOLUÇÕES INTELIGENTES</div>
          </div>
        </div>

        <div class="meta-grid">
          ${inspectionData.company ? `
            <div class="meta-card">
              <div class="label">Empresa</div>
              <div class="value">${inspectionData.company}</div>
            </div>
          ` : ""}
          ${inspectionData.address ? `
            <div class="meta-card">
              <div class="label">Local / Endereço</div>
              <div class="value">${inspectionData.address}</div>
            </div>
          ` : ""}
          <div class="meta-card">
            <div class="label">Status</div>
            <div class="value">
              <span class="status-badge" style="background: ${statusColors[inspectionData.status || "nao_iniciada"] || "#6b7280"}">
                ${statusLabels[inspectionData.status || "nao_iniciada"] || inspectionData.status}
              </span>
            </div>
          </div>
          <div class="meta-card">
            <div class="label">Data de Criação</div>
            <div class="value">${inspectionData.createdAt ? new Date(inspectionData.createdAt).toLocaleDateString("pt-BR") : "—"}</div>
          </div>
        </div>

        ${inspectionData.description ? `
          <div style="margin-bottom: 30px;">
            <div class="section-title">Descrição Geral</div>
            <p style="color: #d1d5db; font-size: 13px; line-height: 1.6;">${inspectionData.description}</p>
          </div>
        ` : ""}

        ${(inspectionData.items || []).length > 0 ? `
          <div>
            <div class="section-title">Itens de Inspeção (${(inspectionData.items || []).length})</div>
            ${itemsHtml}
          </div>
        ` : ""}

        <div class="footer">
          <p>EHS — Sistema de Gestão de Segurança e Saúde Ocupacional</p>
          <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function generatePdfFromHtml(html: string, options?: { headerTemplate?: string; footerTemplate?: string }): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    // Set content waiting for rendering, but avoid networkidle0 which timeouts with large base64
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    
    // Calculate display header/footers 
    const displayHeaderFooter = !!(options?.headerTemplate || options?.footerTemplate);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter,
      headerTemplate: options?.headerTemplate || "<span></span>",
      footerTemplate: options?.footerTemplate || "<span></span>",
      margin: displayHeaderFooter 
        ? { top: "80px", right: "0", bottom: "80px", left: "0" } 
        : { top: "0", right: "0", bottom: "0", left: "0" },
    });
    
    // Fix Type Issue with Puppeteer versions returning Uint8Array vs Buffer
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
