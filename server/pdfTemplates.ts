import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  .doc-header .logo-cell { width: 60px; text-align: center; }
  .doc-header .title-cell { text-align: center; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-header .rev-cell { width: 110px; text-align: center; font-size: 9px; font-weight: 700; }
  .section-header { background: #d9d9d9; font-weight: 700; text-align: center; padding: 5px 7px; border: 1px solid #000; text-transform: uppercase; font-size: 10px; margin-top: 0; }
  .footer-bar { margin-top: 16px; text-align: center; font-size: 9px; color: #555; }
  .sig-area { display: inline-block; border-top: 1px solid #000; width: 100%; min-height: 36px; }
  .checkbox-list { display: flex; flex-wrap: wrap; gap: 4px 20px; }
  .checkbox-item { font-size: 10px; }
`;

/** SVG do logo EHS (círculo laranja) simplificado */
const ehsLogo = `<svg width="40" height="40" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
  <circle cx="26" cy="26" r="24" fill="none" stroke="#e8420d" stroke-width="3"/>
  <circle cx="26" cy="26" r="17" fill="none" stroke="#e8420d" stroke-width="1.5" opacity="0.6"/>
  <text x="26" y="31" text-anchor="middle" font-family="Arial" font-weight="900" font-size="14" fill="#e8420d">EHS</text>
</svg>`;

/** Rodapé padrão de página */
const pageFooter = (page: string) =>
  `<div class="footer-bar">Página ${page} &nbsp;|&nbsp; EHS — Sistema de Gestão de Segurança e Saúde Ocupacional</div>`;

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15px", right: "0", bottom: "15px", left: "0" },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

// ─── APR ─────────────────────────────────────────────────────────────────────
export async function generateAprPdf(data: any): Promise<Buffer> {
  const genDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  <!-- Cabeçalho do documento -->
  <table class="doc-header">
    <tr>
      <td class="logo-cell">${ehsLogo}</td>
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
export async function generateEpiPdf(data: any): Promise<Buffer> {
  const genDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  <!-- Cabeçalho com logos -->
  <table>
    <tr>
      <td style="width:25%; text-align:center; border:1px solid #000; padding:8px;">
        ${data.clientLogoUrl ? `<img src="${data.clientLogoUrl}" style="max-height:50px; max-width:120px;" />` : `<span style="font-weight:900; font-size:14px;">${data.companyName || "EMPRESA"}</span>`}
      </td>
      <td style="text-align:center; border:1px solid #000; padding:8px; font-weight:900; font-size:13px; text-transform:uppercase;">
        FICHA DE CONTROLE DE ENTREGA DE E.P.I.
      </td>
      <td style="width:15%; text-align:center; border:1px solid #000; padding:8px;">${ehsLogo}</td>
    </tr>
  </table>

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
  const existingRevs = data.revalidations?.length || 0;
  const emptyRevRows = Math.max(0, 6 - existingRevs);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  <table class="doc-header">
    <tr>
      <td class="logo-cell">${ehsLogo}</td>
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
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}
  .univ-logo { display:flex; align-items:center; gap:6px; }
  .univ-logo svg { width:40px; height:40px; }
  .univ-text { font-weight:900; font-size:11px; color:#1e3a5f; line-height:1.2; }
  .univ-text span { display:block; font-size:8px; color:#e8420d; letter-spacing:1px; text-transform:uppercase; }
  </style></head><body>
<div class="page">

  <!-- Cabeçalho estilo EHS UNIVERSIDADE -->
  <table class="doc-header">
    <tr>
      <td style="width:160px; border:1px solid #000; padding:6px 10px;">
        <div class="univ-logo">
          <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
            <polygon points="26,4 48,40 4,40" fill="none" stroke="#e8420d" stroke-width="2.5"/>
            <circle cx="26" cy="26" r="8" fill="none" stroke="#1e3a5f" stroke-width="2"/>
            <line x1="26" y1="4" x2="26" y2="18" stroke="#1e3a5f" stroke-width="1.5"/>
            <line x1="18" y1="38" x2="34" y2="38" stroke="#1e3a5f" stroke-width="1.5"/>
          </svg>
          <div class="univ-text">EHS<span>Universidade</span></div>
        </div>
      </td>
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
      <td class="logo-cell">${ehsLogo}</td>
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

// ─── GRO ─────────────────────────────────────────────────────────────────────
export async function generateGroPdf(data: any): Promise<Buffer> {
  const levelColors: Record<string, string> = {
    "Muito Baixo": "#00ABF0",
    "Baixo": "#00B050",
    "Médio": "#FFFF00",
    "Alto": "#FF0000",
    "Grave": "#FF0000",
    "Severo": "#7030A0",
    "Extremo": "#000000",
  };

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${formDocStyle}</style></head><body>
<div class="page">

  <table class="doc-header">
    <tr>
      <td class="logo-cell">${ehsLogo}</td>
      <td class="title-cell">GRO — GERENCIAMENTO DE RISCO OCUPACIONAL</td>
      <td class="rev-cell">GRO_REV_00</td>
    </tr>
  </table>

  <table style="margin-top:-1px;">
    <tr>
      <td colspan="4" class="section-header">${data.title || "Gerenciamento de Risco Ocupacional"}</td>
    </tr>
    <tr>
      <td style="font-weight:700; width:80px;">EMPRESA:</td>
      <td>${data.companyName || ""}</td>
      <td style="font-weight:700; width:80px;">OBRA/LOCAL:</td>
      <td>${data.obraName || ""}</td>
    </tr>
    <tr>
      <td style="font-weight:700;">VERSÃO:</td>
      <td>${data.version || "00"}</td>
      <td style="font-weight:700;">DATA DE EMISSÃO:</td>
      <td>${data.validFrom ? format(new Date(data.validFrom), "dd/MM/yyyy", { locale: ptBR }) : ""}</td>
    </tr>
  </table>

  <!-- Matriz de Riscos -->
  <table style="margin-top:-1px;">
    <tr><th colspan="7" class="section-header">1. MATRIZ DE RISCOS AVALIADOS</th></tr>
    <tr>
      <th style="width:12%;">AGENTE DE RISCO</th>
      <th style="width:10%;">TIPO</th>
      <th style="width:22%;">FONTE GERADORA</th>
      <th style="width:24%;">POSSÍVEIS DANOS À SAÚDE</th>
      <th style="width:8%;">P (1-5)</th>
      <th style="width:8%;">C (1-5)</th>
      <th style="width:16%;">NÍVEL / R</th>
    </tr>
    ${(data.riskMatrix || []).map((r: any) => {
      const bgColor = levelColors[r.riskLevel] || "#fff";
      const textColor = ["Extremo", "Alto", "Grave"].includes(r.riskLevel) && r.riskLevel === "Extremo" ? "#fff" : "#000";
      return `
    <tr>
      <td><strong>${r.agent || ""}</strong></td>
      <td style="text-align:center;">${r.type || ""}</td>
      <td>${r.source || ""}</td>
      <td>${r.healthEffect || ""}</td>
      <td style="text-align:center;">${r.probability || ""}</td>
      <td style="text-align:center;">${r.severity || ""}</td>
      <td style="text-align:center; background:${bgColor}; color:${textColor}; font-weight:700;">${r.riskLevel || ""}</td>
    </tr>`;
    }).join("")}
    ${Array.from({ length: Math.max(0, 5 - (data.riskMatrix?.length || 0)) }).map(() =>
      `<tr><td style="height:24px;">&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
    ).join("")}
  </table>

  <div style="font-size:8px; color:#555; margin: 4px 0 8px 0;">
    * P = Probabilidade &nbsp;|&nbsp; C = Consequência &nbsp;|&nbsp; R = Risco &nbsp;|&nbsp;
    <span style="background:#00ABF0; padding:1px 6px;">Muito Baixo</span>&nbsp;
    <span style="background:#00B050; padding:1px 6px;">Baixo</span>&nbsp;
    <span style="background:#FFFF00; padding:1px 6px;">Médio</span>&nbsp;
    <span style="background:#FF0000; color:#fff; padding:1px 6px;">Alto/Grave</span>&nbsp;
    <span style="background:#7030A0; color:#fff; padding:1px 6px;">Severo</span>&nbsp;
    <span style="background:#000; color:#fff; padding:1px 6px;">Extremo</span>
  </div>

  <!-- Plano de Ação -->
  <table style="margin-top:4px;">
    <tr><th colspan="4" class="section-header">2. PLANO DE AÇÃO (ESPM)</th></tr>
    <tr>
      <th style="width:28%;">RISCO REFERÊNCIA</th>
      <th style="width:44%;">AÇÃO PROPOSTA (CONTROLE)</th>
      <th style="width:14%;">PRAZO</th>
      <th style="width:14%;">STATUS</th>
    </tr>
    ${(data.actionPlan || []).map((a: any) => `
    <tr>
      <td>${a.riskRef || ""}</td>
      <td>${a.action || ""}</td>
      <td style="text-align:center;">${a.deadline ? format(new Date(a.deadline), "dd/MM/yyyy", { locale: ptBR }) : ""}</td>
      <td style="text-align:center; text-transform:capitalize;">${a.status || ""}</td>
    </tr>`).join("")}
    ${Array.from({ length: Math.max(0, 4 - (data.actionPlan?.length || 0)) }).map(() =>
      `<tr><td style="height:24px;">&nbsp;</td><td></td><td></td><td></td></tr>`
    ).join("")}
  </table>

  <!-- Assinatura -->
  <table style="margin-top:-1px;">
    <tr>
      <td style="text-align:center; padding:28px 20px 8px; width:50%;">
        <div class="sig-area"></div>
        <div style="font-weight:700; margin-top:4px;">${data.responsibleName || "Engenheiro(a) de Segurança"}</div>
        <div style="font-size:9px; color:#555;">Engenheiro(a) de Segurança do Trabalho</div>
      </td>
      <td style="width:50%; border:none;"></td>
    </tr>
  </table>

  ${pageFooter("1 de 1")}
</div>
</body></html>`;

  return renderPdf(html);
}

// ─── CHECKLIST (V2) ─────────────────────────────────────────────────────────────
export async function generateChecklistPdf(data: any): Promise<Buffer> {
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
      <td class="logo-cell" style="width: 25%;">${ehsLogo}</td>
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
}

export async function generateItsPdf(data: ItsData): Promise<Buffer> {
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

  // EHS orange logo SVG (matches the model circular logo)
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="44" height="44">
    <circle cx="30" cy="30" r="28" fill="#e85c0d" stroke="#c44a00" stroke-width="1"/>
    <text x="30" y="24" text-anchor="middle" font-family="Arial" font-weight="900" font-size="14" fill="#fff">EHS</text>
    <text x="30" y="36" text-anchor="middle" font-family="Arial" font-size="6" fill="#fff">SOLUCOES</text>
    <text x="30" y="43" text-anchor="middle" font-family="Arial" font-size="6" fill="#fff">INTELIGENTES</text>
  </svg>`;

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
      <td class="header-logo">${logoSvg}</td>
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
