import { and, count, desc, eq, gte, inArray, like, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  advertencias,
  apr,
  chatMessages,
  checklistExecutionItems,
  checklistExecutions,
  checkListItems,
  checkLists,
  checklistTemplateItems,
  checklistTemplates,
  companies,
  companyUsers,
  contracts,
  employees,
  epiFicha,
  inspectionItems,
  inspectionNrs,
  inspections,
  InsertUser,
  its,
  notifications,
  nrs,
  obras,
  obraUsers,
  pgr,
  pgrStages,
  pt,
  risks,
  riskMatrix,
  subcontractors,
  tactdriver,
  trainingParticipants,
  trainings,
  users,
} from "../drizzle/schema";
import { normalizeEhsRole } from "@shared/ehsRoles";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!queryClient) {
        queryClient = postgres(process.env.DATABASE_URL, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
          prepare: false,
        });
      }
      _db = drizzle(queryClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// =============================================
// Helper for Tenant Isolation
// =============================================
export function getCompanyCondition(column: any, value?: number | number[]) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return sql`1=0`;
    return inArray(column, value);
  }
  return eq(column, value);
}

// =============================================
// USERS
// =============================================
type UserRow = typeof users.$inferSelect;
const PRIMARY_ADMIN_EMAIL = "admin@ehs.com";

function normalizeUserRow<T extends UserRow>(user: T): T {
  if (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) {
    return { ...user, role: "admin", ehsRole: "adm_ehs" } as T;
  }
  return { ...user, ehsRole: normalizeEhsRole(user.ehsRole) } as T;
}

function normalizeUserRows<T extends UserRow>(rows: T[]): T[] {
  return rows.map(normalizeUserRow);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;

    textFields.forEach((field) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? normalizeUserRow(result[0]) : undefined;
}

export async function getAllUsers(search?: string, ehsRole?: string) {
  const db = await getDb();
  if (!db) return [];

  const query = db.select().from(users);
  let conditions = [];

  if (search) {
    conditions.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)));
  }

  // If not admin, restrict to something? 
  // For now, routers should handle this with requireAdm if it's a global list.

  if (conditions.length > 0) {
    const rows = await query.where(and(...conditions)).orderBy(desc(users.createdAt));
    return normalizeUserRows(rows);
  }
  const rows = await query.orderBy(desc(users.createdAt));
  return normalizeUserRows(rows);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ? normalizeUserRow(result[0]) : undefined;
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  // Soft-delete user: keep history. Active links remain so reactivation restores access.
  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function hardDeleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  // Hard-delete: clean child rows first to avoid FK orphans
  try {
    await db.delete(companyUsers).where(eq(companyUsers.userId, id));
  } catch (err) {
    console.warn("[DB] hardDeleteUser companyUsers cleanup failed:", (err as any)?.message);
  }
  try {
    await db.delete(obraUsers).where(eq(obraUsers.userId, id));
  } catch (err) {
    console.warn("[DB] hardDeleteUser obraUsers cleanup failed:", (err as any)?.message);
  }
  await db.delete(users).where(eq(users.id, id));
}

// =============================================
// COMPANIES
// =============================================
export async function getAllCompanies(search?: string, ids?: number | number[]) {
  const db = await getDb();
  if (!db) return [];

  const compCond = getCompanyCondition(companies.id, ids);
  const activeCond = eq(companies.isActive, true);

  let conditions = [activeCond];
  if (compCond) conditions.push(compCond);
  if (search) {
    conditions.push(or(like(companies.name, `%${search}%`), like(companies.cnpj, `%${search}%`)) as any);
  }

  return db.select().from(companies)
    .where(and(...conditions))
    .orderBy(companies.name);
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0];
}

export async function createCompany(data: typeof companies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(companies).values(data).returning({ id: companies.id });
  return result[0]?.id;
}

export async function updateCompany(id: number, data: Partial<typeof companies.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id));
}

export async function deleteCompany(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(companies).set({ isActive: false }).where(eq(companies.id, id));
}

export async function getCompanyObras(companyId: number, userId?: number, role?: string) {
  const db = await getDb();
  if (!db) return [];
  // Admin (or unauthenticated context) sees all obras for the company
  if (role === 'adm_ehs' || !userId) {
    return db.select().from(obras).where(and(eq(obras.companyId, companyId), eq(obras.isActive, true))).orderBy(obras.name);
  }
  // Non-admin: only obras they're explicitly linked to. If user has no link, fall back to none.
  try {
    const rows = await db
      .select()
      .from(obras)
      .innerJoin(obraUsers, eq(obras.id, obraUsers.obraId))
      .where(and(eq(obras.companyId, companyId), eq(obras.isActive, true), eq(obraUsers.userId, userId)))
      .orderBy(obras.name);
    return rows.map(r => r.obras);
  } catch (err) {
    console.warn("[DB] getCompanyObras (with obraUsers) failed:", (err as any)?.message);
    return [];
  }
}

export async function createObra(data: typeof obras.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(obras).values(data);
}

export async function getObraById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(obras).where(eq(obras.id, id)).limit(1);
  return result[0];
}

export async function updateObra(id: number, data: Partial<typeof obras.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(obras.companyId, companyId);
  await db.update(obras).set({ ...data, updatedAt: new Date() }).where(and(eq(obras.id, id), condition));
}

export async function getAllObras(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(obras.companyId, companyId);
  return db.select().from(obras).where(and(eq(obras.isActive, true), condition)).orderBy(obras.name);
}

export async function getUserLinkedCompanies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(companyUsers).where(eq(companyUsers.userId, userId));
  return rows.map(r => r.companyId);
}

export async function setUserLinkedCompanies(userId: number, companyIds: number[]) {
  const db = await getDb();
  if (!db) return;

  // Preserve existing cargos: only remove links no longer requested, only add missing ones.
  const existing = await db.select().from(companyUsers).where(eq(companyUsers.userId, userId));
  const existingIds = new Set(existing.map(r => r.companyId));
  const newIds = new Set(companyIds);

  const toRemove = existing.filter(r => !newIds.has(r.companyId)).map(r => r.companyId);
  const toAdd = companyIds.filter(cId => !existingIds.has(cId));

  if (toRemove.length > 0) {
    await db.delete(companyUsers).where(and(
      eq(companyUsers.userId, userId),
      inArray(companyUsers.companyId, toRemove),
    ));
  }
  if (toAdd.length > 0) {
    await db.insert(companyUsers).values(toAdd.map(cId => ({ companyId: cId, userId })));
  }
}

export async function getUserLinkedObras(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(obraUsers).where(eq(obraUsers.userId, userId));
    return rows.map(r => r.obraId);
  } catch (err) {
    console.warn("[DB] obra_users table may not exist, skipping getUserLinkedObras:", (err as any)?.message);
    return [];
  }
}

export async function setUserLinkedObras(userId: number, obraIds: number[]) {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await db.select().from(obraUsers).where(eq(obraUsers.userId, userId));
    const existingIds = new Set(existing.map(r => r.obraId));
    const newIds = new Set(obraIds);

    const toRemove = existing.filter(r => !newIds.has(r.obraId)).map(r => r.obraId);
    const toAdd = obraIds.filter(oId => !existingIds.has(oId));

    if (toRemove.length > 0) {
      await db.delete(obraUsers).where(and(
        eq(obraUsers.userId, userId),
        inArray(obraUsers.obraId, toRemove),
      ));
    }
    if (toAdd.length > 0) {
      await db.insert(obraUsers).values(toAdd.map(oId => ({ obraId: oId, userId })));
    }
  } catch (err) {
    console.warn("[DB] setUserLinkedObras failed:", (err as any)?.message);
  }
}

export async function getCompanyUsers(companyId: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(companyUsers.companyId, companyId);
  // Only show active users in a company's user list
  const where = condition ? and(condition, eq(users.isActive, true)) : eq(users.isActive, true);
  return db
    .select({ companyUser: companyUsers, user: users })
    .from(companyUsers)
    .innerJoin(users, eq(companyUsers.userId, users.id))
    .where(where);
}

export async function addCompanyUser(data: typeof companyUsers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // If link already exists, update cargo / notification flag instead of inserting a duplicate
  const existing = await db.select().from(companyUsers).where(and(
    eq(companyUsers.companyId, data.companyId),
    eq(companyUsers.userId, data.userId),
  )).limit(1);
  if (existing.length > 0) {
    await db.update(companyUsers).set({
      cargo: data.cargo,
      isNotificationRecipient: data.isNotificationRecipient ?? existing[0].isNotificationRecipient,
    }).where(eq(companyUsers.id, existing[0].id));
    return;
  }
  await db.insert(companyUsers).values(data);
}

export async function removeCompanyUser(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(companyUsers).where(and(eq(companyUsers.companyId, companyId), eq(companyUsers.userId, userId)));
}

export async function getCompanyContracts(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).where(eq(contracts.companyId, companyId));
}

export async function createContract(data: typeof contracts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(contracts).values(data);
}

// =============================================
// NRs
// =============================================
export async function getAllNRs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(nrs).where(eq(nrs.isActive, true)).orderBy(nrs.code);
}

// =============================================
// CHECK LISTS
// =============================================
export async function getAllCheckLists(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(checkLists).where(
      and(eq(checkLists.isActive, true), like(checkLists.name, `%${search}%`))
    ).orderBy(desc(checkLists.createdAt));
  }
  return db.select().from(checkLists).where(eq(checkLists.isActive, true)).orderBy(desc(checkLists.createdAt));
}

export async function getCheckListById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checkLists).where(eq(checkLists.id, id)).limit(1);
  return result[0];
}

export async function getCheckListItems(checkListId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checkListItems).where(eq(checkListItems.checkListId, checkListId)).orderBy(checkListItems.order);
}

export async function createCheckList(data: typeof checkLists.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checkLists).values(data).returning({ id: checkLists.id });
  return result[0]?.id;
}

export async function createCheckListItem(data: typeof checkListItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(checkListItems).values(data);
}

export async function updateCheckListItem(id: number, data: Partial<typeof checkListItems.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(checkListItems).set(data).where(eq(checkListItems.id, id));
}

export async function deleteCheckListItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(checkListItems).where(eq(checkListItems.id, id));
}

// =============================================
// INSPECTIONS (Relatórios)
// =============================================
export async function getAllInspections(filters?: { companyId?: number | number[]; status?: string; search?: string; from?: Date; to?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  const compCond = getCompanyCondition(inspections.companyId, filters?.companyId);
  if (compCond) conditions.push(compCond);
  if (filters?.status && filters.status !== 'all') conditions.push(eq(inspections.status, filters.status as any));
  if (filters?.search) conditions.push(like(inspections.title, `%${filters.search}%`));
  if (filters?.from) conditions.push(gte(inspections.createdAt, filters.from));
  if (filters?.to) conditions.push(lte(inspections.createdAt, filters.to));

  const rows = await db
    .select({
      inspection: inspections,
      company: companies,
    })
    .from(inspections)
    .leftJoin(companies, eq(inspections.companyId, companies.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(inspections.createdAt));

  if (rows.length === 0) return [];

  // Batch NR lookup — single query instead of N queries
  const inspectionIds = rows.map(r => r.inspection.id);
  const nrRows = await db
    .select({ inspectionId: inspectionNrs.inspectionId, nr: nrs })
    .from(inspectionNrs)
    .leftJoin(nrs, eq(inspectionNrs.nrId, nrs.id))
    .where(inArray(inspectionNrs.inspectionId, inspectionIds));

  // Map: first NR per inspection
  const nrByInspection = new Map<number, typeof nrs.$inferSelect | null>();
  for (const row of nrRows) {
    if (!nrByInspection.has(row.inspectionId)) {
      nrByInspection.set(row.inspectionId, row.nr ?? null);
    }
  }

  return rows.map(row => ({
    inspection: row.inspection,
    company: row.company,
    nr: nrByInspection.get(row.inspection.id) ?? null,
  }));
}

export async function getInspectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
  return result[0];
}

export async function createInspection(data: typeof inspections.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(inspections).values(data).returning({ id: inspections.id });
  return result[0]?.id;
}

export async function updateInspection(id: number, data: Partial<typeof inspections.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(inspections.companyId, companyId);
  await db.update(inspections).set({ ...data, updatedAt: new Date() }).where(and(eq(inspections.id, id), condition));
}

export async function deleteInspection(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(inspections.companyId, companyId);
  // Delete related items first
  await db.delete(inspectionItems).where(eq(inspectionItems.inspectionId, id));
  await db.delete(inspections).where(and(eq(inspections.id, id), condition));
}

export async function getInspectionItems(inspectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId)).orderBy(inspectionItems.order);
}

export async function createInspectionItem(data: typeof inspectionItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(inspectionItems).values(data).returning({ id: inspectionItems.id });
  return result[0]?.id;
}

export async function updateInspectionItem(id: number, data: Partial<typeof inspectionItems.$inferInsert>) {
  const db = await getDb();
  if (!db) return;

  // If status is set to "resolvido" and no resolvedAt yet, stamp it.
  const patch: Partial<typeof inspectionItems.$inferInsert> = { ...data, updatedAt: new Date() };
  if (data.status === "resolvido" && data.resolvedAt === undefined) {
    patch.resolvedAt = new Date();
  }

  await db.update(inspectionItems).set(patch).where(eq(inspectionItems.id, id));

  const itemRows = await db.select().from(inspectionItems).where(eq(inspectionItems.id, id)).limit(1);
  if (itemRows.length > 0) {
    await recomputeInspectionStatus(itemRows[0].inspectionId);
  }
}

export async function deleteInspectionItem(id: number) {
  const db = await getDb();
  if (!db) return;
  const itemRows = await db.select().from(inspectionItems).where(eq(inspectionItems.id, id)).limit(1);
  await db.delete(inspectionItems).where(eq(inspectionItems.id, id));
  if (itemRows.length > 0) {
    await recomputeInspectionStatus(itemRows[0].inspectionId);
  }
}

/**
 * Recomputes inspection status from item statuses.
 * Rule: any "pendente" or "atencao" item keeps the report in "atencao".
 * When all items are "resolvido"/"previsto", report becomes "resolvida".
 * Empty inspections keep their current status.
 */
export async function recomputeInspectionStatus(inspectionId: number) {
  const db = await getDb();
  if (!db) return;

  const allItems = await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId));
  if (allItems.length === 0) return;

  const hasOpen = allItems.some(item => item.status === "atencao" || item.status === "pendente");
  const newStatus = hasOpen ? "atencao" : "resolvida";

  await db.update(inspections).set({ status: newStatus as any, updatedAt: new Date() }).where(eq(inspections.id, inspectionId));
}

/**
 * Replaces inspection items with the provided list.
 * - Items with `id` are updated in place (preserves history/createdAt).
 * - Items without `id` are inserted.
 * - Items missing from the payload (but present in DB) are deleted.
 * After upsert, the inspection status is recomputed from item statuses.
 */
export async function upsertInspectionItems(
  inspectionId: number,
  items: Array<Partial<typeof inspectionItems.$inferInsert> & { id?: number }>,
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId));
  const incomingIds = new Set(items.filter(i => i.id).map(i => i.id as number));
  const toDelete = existing.filter(e => !incomingIds.has(e.id)).map(e => e.id);

  if (toDelete.length > 0) {
    await db.delete(inspectionItems).where(inArray(inspectionItems.id, toDelete));
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const { id, ...rest } = it;
    const data: Partial<typeof inspectionItems.$inferInsert> = {
      ...rest,
      inspectionId,
      order: rest.order ?? i,
    };
    if (data.status === "resolvido" && data.resolvedAt === undefined) {
      data.resolvedAt = new Date();
    }
    if (id) {
      await db.update(inspectionItems).set({ ...data, updatedAt: new Date() }).where(eq(inspectionItems.id, id));
    } else {
      await db.insert(inspectionItems).values(data as typeof inspectionItems.$inferInsert);
    }
  }

  await recomputeInspectionStatus(inspectionId);
}

// =============================================
// DASHBOARD STATS
// =============================================
export async function getDashboardStats(companyId?: number | number[]) {
  await getDb();
  if (!queryClient) return null;

  // Compute weekly window first (used in parallel query below)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekIso = startOfWeek.toISOString();

  const companyIds =
    companyId === undefined
      ? undefined
      : Array.isArray(companyId)
        ? companyId
        : [companyId];
  const hasNoAuthorizedCompanies = Array.isArray(companyIds) && companyIds.length === 0;
  const singleCompanyId = companyIds?.length === 1 ? companyIds[0] : undefined;

  const notificationCounts = await queryClient`
    select status, count(*)::int as count
    from notifications
    group by status
  `;
  const [totalUsers] = await queryClient`
    select count(*)::int as count
    from users
    where "isActive" = true
  `;
  const [totalCompanies] = await queryClient`
    select count(*)::int as count
    from companies
    where "isActive" = true
  `;

  let inspectionCounts: { status: string; count: number }[] = [];
  let weeklyInspections: { createdAt: Date }[] = [];
  let recentInspections: any[] = [];
  let pendingExecs: { date: Date | string }[] = [];
  let scoreAgg: { count: number; totalScore: string } = { count: 0, totalScore: "0" };

  if (!hasNoAuthorizedCompanies) {
    if (singleCompanyId !== undefined) {
      inspectionCounts = await queryClient`
        select status, count(*)::int as count
        from inspections
        where "companyId" = ${singleCompanyId}
        group by status
      `;
      weeklyInspections = await queryClient`
        select "createdAt"
        from inspections
        where "companyId" = ${singleCompanyId} and "createdAt" >= ${startOfWeekIso}::timestamp
      `;
      recentInspections = await queryClient`
        select i.*, c.name as "companyName"
        from inspections i
        left join companies c on i."companyId" = c.id
        where i."companyId" = ${singleCompanyId}
        order by i."createdAt" desc
        limit 5
      `;
      pendingExecs = await queryClient`
        select date
        from checklist_executions
        where "companyId" = ${singleCompanyId} and status = 'pendente'
      `;
      const [companyScoreAgg] = await queryClient`
        select count(*)::int as count, coalesce(sum(score), 0)::text as "totalScore"
        from checklist_executions
        where "companyId" = ${singleCompanyId} and status = 'concluida'
      `;
      scoreAgg = companyScoreAgg as { count: number; totalScore: string };
    } else if (companyIds && companyIds.length > 1) {
      inspectionCounts = await queryClient`
        select status, count(*)::int as count
        from inspections
        where "companyId" = any(${companyIds})
        group by status
      `;
      weeklyInspections = await queryClient`
        select "createdAt"
        from inspections
        where "companyId" = any(${companyIds}) and "createdAt" >= ${startOfWeekIso}::timestamp
      `;
      recentInspections = await queryClient`
        select i.*, c.name as "companyName"
        from inspections i
        left join companies c on i."companyId" = c.id
        where i."companyId" = any(${companyIds})
        order by i."createdAt" desc
        limit 5
      `;
      pendingExecs = await queryClient`
        select date
        from checklist_executions
        where "companyId" = any(${companyIds}) and status = 'pendente'
      `;
      const [companyScoreAgg] = await queryClient`
        select count(*)::int as count, coalesce(sum(score), 0)::text as "totalScore"
        from checklist_executions
        where "companyId" = any(${companyIds}) and status = 'concluida'
      `;
      scoreAgg = companyScoreAgg as { count: number; totalScore: string };
    } else {
      inspectionCounts = await queryClient`
        select status, count(*)::int as count
        from inspections
        group by status
      `;
      weeklyInspections = await queryClient`
        select "createdAt"
        from inspections
        where "createdAt" >= ${startOfWeekIso}::timestamp
      `;
      recentInspections = await queryClient`
        select i.*, c.name as "companyName"
        from inspections i
        left join companies c on i."companyId" = c.id
        order by i."createdAt" desc
        limit 5
      `;
      pendingExecs = await queryClient`
        select date
        from checklist_executions
        where status = 'pendente'
      `;
      const [globalScoreAgg] = await queryClient`
        select count(*)::int as count, coalesce(sum(score), 0)::text as "totalScore"
        from checklist_executions
        where status = 'concluida'
      `;
      scoreAgg = globalScoreAgg as { count: number; totalScore: string };
    }
  }

  // Sum inspection statuses
  const statusCount = (s: string) => inspectionCounts.find(r => r.status === s)?.count ?? 0;
  const totalInspectionsCount = inspectionCounts.reduce((a, b) => a + b.count, 0);
  const sentCount = notificationCounts.find(r => r.status === "sent")?.count ?? 0;
  const readCount = notificationCounts.find(r => r.status === "read")?.count ?? 0;

  // Weekly distribution
  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weeklyData = dayNames.map((name, i) => {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);
    const nextDay = new Date(dayStart);
    nextDay.setDate(dayStart.getDate() + 1);
    const c = weeklyInspections.filter(insp => {
      const d = new Date(insp.createdAt);
      return d >= dayStart && d < nextDay;
    }).length;
    return { name, inspeções: c };
  });

  // Overdue computation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdueChecklists = 0;
  for (const e of pendingExecs) {
    if (e.date) {
      const ed = new Date(e.date.toString() + "T00:00:00");
      if (ed.getTime() < today.getTime()) overdueChecklists++;
    }
  }

  const totalScore = parseFloat(scoreAgg?.totalScore ?? "0");
  const scoredCount = scoreAgg?.count ?? 0;
  const averageChecklistScore = scoredCount > 0 ? (totalScore / scoredCount) : 0;

  return {
    totalInspections: totalInspectionsCount,
    notStarted: statusCount("nao_iniciada"),
    pending: statusCount("pendente"),
    attention: statusCount("atencao"),
    resolved: statusCount("resolvida"),
    totalUsers: totalUsers?.count ?? 0,
    totalCompanies: totalCompanies?.count ?? 0,
    weeklyData,
    sentNotifications: sentCount,
    readNotifications: readCount,
    recentInspections: recentInspections.map((row: any) => ({
      ...row,
      companyName: row.companyName || "Empresa Removida",
    })),
    pendingChecklists: pendingExecs.length,
    overdueChecklists,
    averageChecklistScore,
  };
}

// =============================================
// NOTIFICATIONS
// =============================================
export async function getNotifications(userId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? [eq(notifications.recipientUserId, userId)] : [];
  return db.select().from(notifications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: count() }).from(notifications).where(
    and(eq(notifications.recipientUserId, userId), eq(notifications.status, "sent"))
  );
  return result.count;
}

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ status: "read", readAt: new Date() }).where(eq(notifications.id, id));
}

// =============================================
// CHAT MESSAGES
// =============================================
export async function getChatMessages(params: { inspectionId?: number; companyId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  try {
    const conditions = [];
    if (params.inspectionId) conditions.push(eq(chatMessages.inspectionId, params.inspectionId));
    return db.select({ message: chatMessages, sender: users })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(chatMessages.createdAt))
      .limit(params.limit || 50);
  } catch (err) {
    console.error("getChatMessages error:", err);
    return [];
  }
}

export async function createChatMessage(data: typeof chatMessages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(chatMessages).values(data).returning({ id: chatMessages.id });
  return result[0]?.id;
}

export async function markMessagesRead(recipientId: number, inspectionId?: number) {
  const db = await getDb();
  if (!db) return;
  // Mark all messages NOT sent by this user as read (global chat or inspection chat)
  const conditions: any[] = [
    ne(chatMessages.senderId, recipientId),
    eq(chatMessages.isRead, false),
  ];
  if (inspectionId) conditions.push(eq(chatMessages.inspectionId, inspectionId));
  await db.update(chatMessages).set({ isRead: true, readAt: new Date() }).where(and(...conditions));
}

// =============================================
// PGR
// =============================================
export async function getAllPGR(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(pgr.companyId, companyId);
  return db.select().from(pgr).where(condition).orderBy(desc(pgr.createdAt));
}

export async function createPGR(data: typeof pgr.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pgr).values(data).returning({ id: pgr.id });
  return result[0]?.id;
}

export async function updatePGR(id: number, data: Partial<typeof pgr.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(pgr.companyId, companyId);
  await db.update(pgr).set({ ...data, updatedAt: new Date() }).where(and(eq(pgr.id, id), condition));
}

export async function deletePGR(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(pgr.companyId, companyId);
  await db.delete(pgr).where(and(eq(pgr.id, id), condition));
}

// =============================================
// PGR STAGES
// =============================================
export async function getPgrStages(pgrId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pgrStages).where(eq(pgrStages.pgrId, pgrId)).orderBy(pgrStages.order);
}

export async function createPgrStage(data: typeof pgrStages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pgrStages).values(data).returning({ id: pgrStages.id });
  return result[0]?.id;
}

export async function updatePgrStage(id: number, data: Partial<typeof pgrStages.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pgrStages).set({ ...data, updatedAt: new Date() }).where(eq(pgrStages.id, id));
}

export async function deletePgrStage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pgrStages).where(eq(pgrStages.id, id));
}

// =============================================
// RISK MATRIX
// =============================================
export async function getRiskMatrixByStage(stageId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(riskMatrix).where(eq(riskMatrix.stageId, stageId));
}

export async function createRiskMatrix(data: typeof riskMatrix.$inferInsert | (typeof riskMatrix.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const values = Array.isArray(data) ? data : [data];
  await db.insert(riskMatrix).values(values);
}

export async function updateRiskMatrix(id: number, data: Partial<typeof riskMatrix.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(riskMatrix).set({ ...data, updatedAt: new Date() }).where(eq(riskMatrix.id, id));
}

export async function deleteRiskMatrix(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(riskMatrix).where(eq(riskMatrix.id, id));
}

// =============================================
// SUBCONTRACTORS
// =============================================
export async function getSubcontractors(pgrId?: number, stageId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (pgrId) conditions.push(eq(subcontractors.pgrId, pgrId));
  if (stageId) conditions.push(eq(subcontractors.stageId, stageId));
  if (conditions.length === 0) return [];
  return db.select().from(subcontractors).where(or(...conditions));
}

export async function createSubcontractor(data: typeof subcontractors.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(subcontractors).values(data).returning({ id: subcontractors.id });
  return result[0]?.id;
}

export async function updateSubcontractor(id: number, data: Partial<typeof subcontractors.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subcontractors).set(data).where(eq(subcontractors.id, id));
}

export async function deleteSubcontractor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(subcontractors).where(eq(subcontractors.id, id));
}

// =============================================
// ITS
// =============================================
export async function getAllITS(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(its.companyId, companyId);
  return db.select().from(its).where(condition).orderBy(desc(its.createdAt));
}

export async function createITS(data: typeof its.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(its).values(data).returning({ id: its.id });
  return result[0]?.id;
}

export async function updateITS(id: number, data: Partial<typeof its.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(its.companyId, companyId);
  await db.update(its).set({ ...data, updatedAt: new Date() }).where(and(eq(its.id, id), condition));
}

export async function deleteITS(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(its.companyId, companyId);
  await db.delete(its).where(and(eq(its.id, id), condition));
}

// =============================================
// PT
// =============================================
export async function getAllPT(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(pt.companyId, companyId);
  return db.select().from(pt).where(condition).orderBy(desc(pt.createdAt));
}

export async function createPT(data: typeof pt.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pt).values(data).returning({ id: pt.id });
  return result[0]?.id;
}

export async function updatePT(id: number, data: Partial<typeof pt.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(pt.companyId, companyId);
  await db.update(pt).set({ ...data, updatedAt: new Date() }).where(and(eq(pt.id, id), condition));
}

export async function deletePT(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(pt.companyId, companyId);
  await db.delete(pt).where(and(eq(pt.id, id), condition));
}

// =============================================
// TRAININGS
// =============================================
export async function getAllTrainings(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(trainings.companyId, companyId);
  return db.select().from(trainings).where(condition).orderBy(desc(trainings.createdAt));
}

export async function createTraining(data: typeof trainings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainings).values(data).returning({ id: trainings.id });
  return result[0]?.id;
}

export async function updateTraining(id: number, data: Partial<typeof trainings.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(trainings.companyId, companyId);
  await db.update(trainings).set({ ...data, updatedAt: new Date() }).where(and(eq(trainings.id, id), condition));
}

export async function deleteTraining(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(trainings.companyId, companyId);
  await db.delete(trainings).where(and(eq(trainings.id, id), condition));
}

// =============================================
// APR
// =============================================
export async function getAllAPR(filters?: { companyId?: number | number[]; search?: string; status?: string; date?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  const compCond = getCompanyCondition(apr.companyId, filters?.companyId);
  if (compCond) conditions.push(compCond);
  if (filters?.search) conditions.push(like(apr.title, `%${filters.search}%`));
  if (filters?.status && filters.status !== 'all') conditions.push(eq(apr.status, filters.status as any));
  if (filters?.date) conditions.push(eq(apr.date, filters.date));
  return db.select().from(apr).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(apr.createdAt));
}

export async function createAPR(data: typeof apr.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(apr).values(data).returning({ id: apr.id });
  return result[0]?.id;
}

export async function updateAPR(id: number, data: Partial<typeof apr.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(apr.companyId, companyId);
  await db.update(apr).set({ ...data, updatedAt: new Date() }).where(and(eq(apr.id, id), condition));
}

export async function deleteAPR(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(apr.companyId, companyId);
  await db.delete(apr).where(and(eq(apr.id, id), condition));
}

// =============================================
// EMPLOYEES (Colaboradores)
// =============================================
export async function getEmployeesByCompany(companyId: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(employees.companyId, companyId);
  return db.select().from(employees).where(condition).orderBy(employees.name);
}

export async function findOrCreateEmployee(companyId: number, name: string, obraId?: number) {
  if (!companyId || isNaN(companyId) || Array.isArray(companyId)) {
    throw new Error(`Invalid companyId provided to findOrCreateEmployee: ${companyId}`);
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const existing = await db.select().from(employees)
    .where(and(eq(employees.companyId, companyId), eq(employees.name, name)))
    .limit(1);

  if (existing.length > 0) {
    if (obraId && existing[0].obraId !== obraId) {
      await db.update(employees).set({ obraId }).where(eq(employees.id, existing[0].id));
      return { ...existing[0], obraId };
    }
    return existing[0];
  }

  const [newEmployee] = await db.insert(employees).values({
    companyId,
    name,
    obraId,
  }).returning();

  return newEmployee;
}

// =============================================
// EPI FICHA
// =============================================
export async function getAllEpiFicha(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(epiFicha.companyId, companyId);
  return db.select({ ficha: epiFicha, user: users })
    .from(epiFicha)
    .leftJoin(users, eq(epiFicha.userId, users.id))
    .where(condition)
    .orderBy(desc(epiFicha.createdAt));
}

export async function createEpiFicha(data: typeof epiFicha.$inferInsert | (typeof epiFicha.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const values = Array.isArray(data) ? data : [data];
  const result = await db.insert(epiFicha).values(values).returning({ id: epiFicha.id });
  return result.map(r => r.id);
}

export async function deleteEpiFicha(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(epiFicha.companyId, companyId);
  await db.delete(epiFicha).where(and(eq(epiFicha.id, id), condition));
}

// =============================================
// ADVERTÊNCIAS
// =============================================
export async function getAllAdvertencias(filters?: { companyId?: number | number[]; obraId?: number; employeeId?: number; type?: string; date?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  const compCond = getCompanyCondition(advertencias.companyId, filters?.companyId);
  if (compCond) conditions.push(compCond);
  if (filters?.obraId) conditions.push(eq(advertencias.obraId, filters.obraId));
  if (filters?.employeeId) conditions.push(eq(advertencias.employeeId, filters.employeeId));
  if (filters?.type && filters.type !== 'all') conditions.push(eq(advertencias.type, filters.type as any));
  if (filters?.date) conditions.push(eq(advertencias.date, filters.date));
  if (filters?.search) conditions.push(like(advertencias.reason, `%${filters.search}%`));

  return db.select({
    advertencia: advertencias,
    employee: employees,
    obra: obras,
    responsible: users
  })
    .from(advertencias)
    .leftJoin(employees, eq(advertencias.employeeId, employees.id))
    .leftJoin(obras, eq(advertencias.obraId, obras.id))
    .leftJoin(users, eq(advertencias.createdById, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(advertencias.createdAt));
}

export async function createAdvertencia(data: typeof advertencias.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(advertencias).values(data).returning({ id: advertencias.id });
  return result[0]?.id;
}

export async function deleteAdvertencia(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(advertencias.companyId, companyId);
  await db.delete(advertencias).where(and(eq(advertencias.id, id), condition));
}

// =============================================
// TACTDRIVER
// =============================================
export async function getAllTactdriver(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const condition = getCompanyCondition(tactdriver.companyId, companyId);
  return db.select().from(tactdriver).where(condition).orderBy(desc(tactdriver.createdAt));
}

export async function createTactdriver(data: typeof tactdriver.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tactdriver).values(data).returning({ id: tactdriver.id });
  return result[0]?.id;
}

export async function updateTactdriver(id: number, data: Partial<typeof tactdriver.$inferInsert>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(tactdriver.companyId, companyId);
  await db.update(tactdriver).set({ ...data, updatedAt: new Date() }).where(and(eq(tactdriver.id, id), condition));
}

export async function deleteTactdriver(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return;
  const condition = getCompanyCondition(tactdriver.companyId, companyId);
  await db.delete(tactdriver).where(and(eq(tactdriver.id, id), condition));
}

// =============================================
// AUTH HELPERS
// =============================================
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? normalizeUserRow(result[0]) : undefined;
}

export async function createUserWithPassword(data: typeof users.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Single round-trip: returning() with no selector returns the whole row
  const [created] = await db.insert(users).values(data).returning();
  return created;
}

// =============================================
// RISKS
// =============================================
export async function getAllRisks(category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = category ? [eq(risks.category, category)] : [];
  return db.select().from(risks).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(risks.name);
}

export async function createRisk(data: typeof risks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(risks).values(data).returning({ id: risks.id });
  return result[0]?.id;
}

export async function updateRisk(id: number, data: Partial<typeof risks.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(risks).set(data).where(eq(risks.id, id));
}

export async function deleteRisk(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(risks).where(eq(risks.id, id));
}
