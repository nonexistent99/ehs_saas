const mojibakePattern = /(?:Ã.|Â.|â€.|�)/;

const portugueseGlossary: Array<[RegExp, string]> = [
  [/\binstala[?�]{1,2}o\b/gi, "instalação"],
  [/\binstala[?�]{1,2}es\b/gi, "instalações"],
  [/\bseguran[?�]a\b/gi, "segurança"],
  [/\bprote[?�]{1,2}o\b/gi, "proteção"],
  [/\bprote[?�]{1,2}es\b/gi, "proteções"],
  [/\bt[?�]cnico\b/gi, "técnico"],
  [/\bt[?�]cnicos\b/gi, "técnicos"],
  [/\bt[?�]cnica\b/gi, "técnica"],
  [/\bt[?�]cnicas\b/gi, "técnicas"],
  [/\bposs[?�]vel\b/gi, "possível"],
  [/\bposs[?�]veis\b/gi, "possíveis"],
  [/\bsa[?�]de\b/gi, "saúde"],
  [/\b[?�]rea\b/gi, "área"],
  [/\b[?�]reas\b/gi, "áreas"],
  [/\binstalacao\b/gi, "instalação"],
  [/\binstalacoes\b/gi, "instalações"],
  [/\bseguranca\b/gi, "segurança"],
  [/\barea\b/gi, "área"],
  [/\bareas\b/gi, "áreas"],
  [/\bnao\b/gi, "não"],
  [/\bprotecao\b/gi, "proteção"],
  [/\bprotecoes\b/gi, "proteções"],
  [/\btropeco\b/gi, "tropeço"],
  [/\btrope[?�]o\b/gi, "tropeço"],
  [/\bverificacao\b/gi, "verificação"],
  [/\bverificacoes\b/gi, "verificações"],
  [/\bevidencia\b/gi, "evidência"],
  [/\bevidencias\b/gi, "evidências"],
  [/\bresponsavel\b/gi, "responsável"],
  [/\bresponsaveis\b/gi, "responsáveis"],
  [/\btecnico\b/gi, "técnico"],
  [/\btecnicos\b/gi, "técnicos"],
  [/\btecnica\b/gi, "técnica"],
  [/\btecnicas\b/gi, "técnicas"],
  [/\binstrucao\b/gi, "instrução"],
  [/\binstrucoes\b/gi, "instruções"],
  [/\bemissao\b/gi, "emissão"],
  [/\bemissoes\b/gi, "emissões"],
  [/\brevisao\b/gi, "revisão"],
  [/\brevisoes\b/gi, "revisões"],
  [/\bobservacao\b/gi, "observação"],
  [/\bobservacoes\b/gi, "observações"],
  [/\bacao\b/gi, "ação"],
  [/\bacoes\b/gi, "ações"],
  [/\bcondicao\b/gi, "condição"],
  [/\bcondicoes\b/gi, "condições"],
  [/\bpossivel\b/gi, "possível"],
  [/\bpossiveis\b/gi, "possíveis"],
  [/\bsaude\b/gi, "saúde"],
  [/\bfisico\b/gi, "físico"],
  [/\bfisicos\b/gi, "físicos"],
  [/\bfisica\b/gi, "física"],
  [/\bfisicas\b/gi, "físicas"],
  [/\bquimico\b/gi, "químico"],
  [/\bquimicos\b/gi, "químicos"],
  [/\bquimica\b/gi, "química"],
  [/\bquimicas\b/gi, "químicas"],
  [/\bbiologico\b/gi, "biológico"],
  [/\bbiologicos\b/gi, "biológicos"],
  [/\bergonomico\b/gi, "ergonômico"],
  [/\bergonomicos\b/gi, "ergonômicos"],
  [/\bmecanico\b/gi, "mecânico"],
  [/\bmecanicos\b/gi, "mecânicos"],
  [/\beletrico\b/gi, "elétrico"],
  [/\beletricos\b/gi, "elétricos"],
  [/\beletrica\b/gi, "elétrica"],
  [/\beletricas\b/gi, "elétricas"],
  [/\bruido\b/gi, "ruído"],
  [/\brespiravel\b/gi, "respirável"],
  [/\brespiratoria\b/gi, "respiratória"],
  [/\brespiratorias\b/gi, "respiratórias"],
  [/\bprovisorio\b/gi, "provisório"],
  [/\bprovisorios\b/gi, "provisórios"],
  [/\bprovisoria\b/gi, "provisória"],
  [/\bprovisorias\b/gi, "provisórias"],
  [/\bextensao\b/gi, "extensão"],
  [/\bextensoes\b/gi, "extensões"],
  [/\bicamento\b/gi, "içamento"],
  [/\bfundacao\b/gi, "fundação"],
  [/\bescavacao\b/gi, "escavação"],
  [/\barmacao\b/gi, "armação"],
  [/\bamarracao\b/gi, "amarração"],
  [/\bvalidacao\b/gi, "validação"],
  [/\brelatorio\b/gi, "relatório"],
  [/\bdialogo\b/gi, "diálogo"],
  [/\bdiaria\b/gi, "diária"],
  [/\boperacao\b/gi, "operação"],
  [/\bsinalizacao\b/gi, "sinalização"],
  [/\bsinalizacoes\b/gi, "sinalizações"],
  [/\bprevencao\b/gi, "prevenção"],
  [/\bgestao\b/gi, "gestão"],
  [/\binspecao\b/gi, "inspeção"],
  [/\bocorrencia\b/gi, "ocorrência"],
  [/\bocorrencias\b/gi, "ocorrências"],
  [/\bconcluido\b/gi, "concluído"],
  [/\bconcluida\b/gi, "concluída"],
  [/\bmictorio\b/gi, "mictório"],
  [/\bmictorios\b/gi, "mictórios"],
  [/\blavatorio\b/gi, "lavatório"],
  [/\blavatorios\b/gi, "lavatórios"],
  [/\bsanitario\b/gi, "sanitário"],
  [/\bsanitarios\b/gi, "sanitários"],
  [/\bexposicao\b/gi, "exposição"],
  [/\blesao\b/gi, "lesão"],
  [/\blesoes\b/gi, "lesões"],
  [/\bmovimentacao\b/gi, "movimentação"],
  [/\bidentificacao\b/gi, "identificação"],
  [/\bcomunicacao\b/gi, "comunicação"],
];

function applyCase(match: string, replacement: string): string {
  if (match === match.toUpperCase()) return replacement.toUpperCase();
  if (match[0] === match[0]?.toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function mojibakeScore(value: string): number {
  return (value.match(/[ÃÂ�]/g) || []).length + (value.match(/â€./g) || []).length;
}

function repairMojibake(value: string): string {
  if (!mojibakePattern.test(value)) return value;

  const decoded = Buffer.from(value, "latin1").toString("utf8");
  return mojibakeScore(decoded) < mojibakeScore(value) ? decoded : value;
}

export function repairPdfText(value: unknown): string {
  let text = repairMojibake(String(value ?? ""));

  for (const [pattern, replacement] of portugueseGlossary) {
    text = text.replace(pattern, (match) => applyCase(match, replacement));
  }

  text = text
    .replace(/(^|[\s([{])\?rea\b/gi, (match, prefix: string) => {
      const word = match.slice(prefix.length);
      return `${prefix}${word === word.toUpperCase() ? "ÁREA" : "área"}`;
    })
    .replace(/(^|[\s([{])\?reas\b/gi, (match, prefix: string) => {
      const word = match.slice(prefix.length);
      return `${prefix}${word === word.toUpperCase() ? "ÁREAS" : "áreas"}`;
    })
    .replace(/\bdanos a saúde\b/gi, (match) => applyCase(match, "danos à saúde"));

  return text;
}

function repairVisibleHtmlText(html: string): string {
  return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) => {
    if (tag) return tag;
    return repairPdfText(text || match);
  });
}

export function repairPdfHtml(html: string): string {
  const rawBlockPattern = /(<(?:script|style|svg)\b[\s\S]*?<\/(?:script|style|svg)>)/gi;
  return html
    .split(rawBlockPattern)
    .map((part) => (/^<(?:script|style|svg)\b/i.test(part) ? part : repairVisibleHtmlText(part)))
    .join("");
}
