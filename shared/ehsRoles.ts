export const EHS_ROLES = ["adm_ehs", "cliente", "tecnico", "apoio"] as const;

export type EhsRole = (typeof EHS_ROLES)[number];

const EHS_ROLE_SET = new Set<string>(EHS_ROLES);

function roleKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isEhsRole(value: unknown): value is EhsRole {
  return typeof value === "string" && EHS_ROLE_SET.has(value);
}

export function coerceEhsRole(value: unknown): EhsRole | undefined {
  if (typeof value !== "string") return undefined;

  const key = roleKey(value);
  if (isEhsRole(key)) return key;

  if (
    key === "adm" ||
    key.includes("admin") ||
    key.includes("administrador") ||
    key.includes("adm_ehs")
  ) {
    return "adm_ehs";
  }
  if (key === "client" || key.includes("cliente")) return "cliente";
  if (key === "user" || key === "usuario" || key.includes("tecnico")) return "tecnico";
  if (key === "support" || key === "suporte" || key.includes("apoio")) return "apoio";

  return undefined;
}

export function normalizeEhsRole(value: unknown, fallback: EhsRole = "tecnico"): EhsRole {
  return coerceEhsRole(value) ?? fallback;
}
