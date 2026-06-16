export const CHECKLIST_STATUS_VALUES = ["Conforme", "Não Conforme", "N/A"] as const;

export type ChecklistStatus = (typeof CHECKLIST_STATUS_VALUES)[number];
export type ChecklistStatusCode = "C" | "NC" | "NA";

export const CHECKLIST_STATUS_OPTIONS: Array<{
  value: ChecklistStatus;
  code: ChecklistStatusCode;
  label: string;
}> = [
  { value: "Conforme", code: "C", label: "Conforme" },
  { value: "Não Conforme", code: "NC", label: "Não Conforme" },
  { value: "N/A", code: "NA", label: "Não Aplicável" },
];

function statusParts(value: unknown) {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();
  const collapsed = upper
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_./-]+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    raw,
    upper,
    collapsed,
    compact: collapsed.replace(/\s+/g, ""),
  };
}

function isNcStatus(value: ReturnType<typeof statusParts>): boolean {
  const { upper, collapsed, compact } = value;
  return (
    compact === "NC" ||
    compact === "NOK" ||
    compact === "NAOOK" ||
    compact === "NAOCONFORME" ||
    compact === "REPROVADO" ||
    compact === "IRREGULAR" ||
    ((collapsed.startsWith("NAO ") || upper.startsWith("NÃO ") || upper.startsWith("NÃ")) &&
      (collapsed.includes("CONFORME") || collapsed.includes("OK")))
  );
}

function isNaStatus(value: ReturnType<typeof statusParts>): boolean {
  const { compact } = value;
  return (
    compact === "NA" ||
    compact === "N" ||
    compact === "NAOAPLICAVEL" ||
    compact === "NAOSEAPLICA" ||
    compact === "NAOSEAPLICAVEL"
  );
}

function isCStatus(value: ReturnType<typeof statusParts>): boolean {
  const { compact } = value;
  return (
    compact === "C" ||
    compact === "OK" ||
    compact === "SIM" ||
    compact === "APROVADO" ||
    compact === "CONFORME"
  );
}

export function isRecognizedChecklistStatus(value: unknown): boolean {
  const parts = statusParts(value);
  if (!parts.raw) return true;
  return isNcStatus(parts) || isNaStatus(parts) || isCStatus(parts);
}

export function checklistStatusToCode(value: unknown): ChecklistStatusCode {
  const { raw, upper, collapsed, compact } = statusParts(value);
  if (!raw) return "NA";

  if (isNcStatus({ raw, upper, collapsed, compact })) {
    return "NC";
  }

  if (isNaStatus({ raw, upper, collapsed, compact })) {
    return "NA";
  }

  if (isCStatus({ raw, upper, collapsed, compact })) {
    return "C";
  }

  return "NA";
}

export function normalizeChecklistStatus(value: unknown): ChecklistStatus {
  const code = checklistStatusToCode(value);
  if (code === "C") return "Conforme";
  if (code === "NC") return "Não Conforme";
  return "N/A";
}
