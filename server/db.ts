import { and, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
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
  epiFicha,
  inspectionItems,
  inspectionNrs,
  inspections,
  InsertUser,
  its,
  notifications,
  nrs,
  obras,
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
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!queryClient) {
        queryClient = postgres(process.env.DATABASE_URL);
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
// USERS
// =============================================
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
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(users);
  if (search) {
    return query.where(
      or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))
    );
  }
  return query.orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
}

// =============================================
// COMPANIES
// =============================================
export async function getAllCompanies(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(companies).where(eq(companies.isActive, true));
  if (search) {
    return db.select().from(companies).where(
      and(eq(companies.isActive, true), or(like(companies.name, `%${search}%`), like(companies.cnpj, `%${search}%`)))
    ).orderBy(companies.name);
  }
  return query.orderBy(companies.name);
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
  const result = await db.insert(companies).values(data);
  return result;
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
  if (role === 'adm_ehs' || !userId) {
     return db.select().from(obras).where(and(eq(obras.companyId, companyId), eq(obras.isActive, true)));
  }
  const { obraUsers } = await import("../drizzle/schema");
  const rows = await db
    .select()
    .from(obras)
    .innerJoin(obraUsers, eq(obras.id, obraUsers.obraId))
    .where(and(eq(obras.companyId, companyId), eq(obras.isActive, true), eq(obraUsers.userId, userId)));
  return rows.map(r => r.obras);
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

export async function updateObra(id: number, data: Partial<typeof obras.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(obras).set({ ...data, updatedAt: new Date() }).where(eq(obras.id, id));
}

export async function getAllObras() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(obras).where(eq(obras.isActive, true));
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
  await db.delete(companyUsers).where(eq(companyUsers.userId, userId));
  if (companyIds.length > 0) {
    await db.insert(companyUsers).values(companyIds.map(cId => ({ companyId: cId, userId })));
  }
}

export async function getUserLinkedObras(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { obraUsers } = await import("../drizzle/schema");
  const rows = await db.select().from(obraUsers).where(eq(obraUsers.userId, userId));
  return rows.map(r => r.obraId);
}

export async function setUserLinkedObras(userId: number, obraIds: number[]) {
  const db = await getDb();
  if (!db) return;
  const { obraUsers } = await import("../drizzle/schema");
  await db.delete(obraUsers).where(eq(obraUsers.userId, userId));
  if (obraIds.length > 0) {
    await db.insert(obraUsers).values(obraIds.map(oId => ({ obraId: oId, userId })));
  }
}

export async function getCompanyUsers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ companyUser: companyUsers, user: users })
    .from(companyUsers)
    .innerJoin(users, eq(companyUsers.userId, users.id))
    .where(eq(companyUsers.companyId, companyId));
}

export async function addCompanyUser(data: typeof companyUsers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
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
export async function getAllInspections(filters?: { companyId?: number; status?: string; search?: string; from?: Date; to?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.companyId) conditions.push(eq(inspections.companyId, filters.companyId));
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

  // For each inspection, get the first NR associated
  const result = await Promise.all(rows.map(async (row) => {
    const nrRow = await db
      .select({ nr: nrs })
      .from(inspectionNrs)
      .leftJoin(nrs, eq(inspectionNrs.nrId, nrs.id))
      .where(eq(inspectionNrs.inspectionId, row.inspection.id))
      .limit(1);
      console.log('--> getDashboardStats finished');
  return {
      inspection: row.inspection,
      company: row.company,
      nr: nrRow[0]?.nr ?? null,
    };
  }));

  return result;
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

export async function updateInspection(id: number, data: Partial<typeof inspections.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(inspections).set({ ...data, updatedAt: new Date() }).where(eq(inspections.id, id));
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
  await db.update(inspectionItems).set({ ...data, updatedAt: new Date() }).where(eq(inspectionItems.id, id));
}

export async function deleteInspectionItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(inspectionItems).where(eq(inspectionItems.id, id));
}

// =============================================
// DASHBOARD STATS
// =============================================
export async function getDashboardStats(companyId?: number) {
  console.log('--> getDashboardStats started');

  const db = await getDb();
  if (!db) return null;

  const whereClause = companyId ? eq(inspections.companyId, companyId) : undefined;

  const [totalInspections] = await db.select({ count: count() }).from(inspections).where(whereClause);
  const [notStarted] = await db.select({ count: count() }).from(inspections).where(
    and(whereClause, eq(inspections.status, "nao_iniciada"))
  );
  const [pending] = await db.select({ count: count() }).from(inspections).where(
    and(whereClause, eq(inspections.status, "pendente"))
  );
  const [attention] = await db.select({ count: count() }).from(inspections).where(
    and(whereClause, eq(inspections.status, "atencao"))
  );
  const [resolved] = await db.select({ count: count() }).from(inspections).where(
    and(whereClause, eq(inspections.status, "resolvida"))
  );
  const [totalUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
  // NRs são dados de referência do sistema, não métricas do usuário
  const [sentNotifications] = await db.select({ count: count() }).from(notifications).where(eq(notifications.status, "sent"));
  const [readNotifications] = await db.select({ count: count() }).from(notifications).where(eq(notifications.status, "read"));
  const [totalCompanies] = await db.select({ count: count() }).from(companies).where(eq(companies.isActive, true));
  // Dados semanais reais
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const weeklyInspections = await db.select().from(inspections).where(
    and(whereClause, gte(inspections.createdAt, startOfWeek))
  );
  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weeklyData = dayNames.map((name, i) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const nextDay = new Date(dayDate);
    nextDay.setDate(dayDate.getDate() + 1);
    const count2 = weeklyInspections.filter(insp => {
      const d = new Date(insp.createdAt);
      return d >= dayDate && d < nextDay;
    }).length;
    return { name, inspeções: count2 };
  });

  const recentInspections = await db
    .select({ inspection: inspections, company: companies })
    .from(inspections)
    .leftJoin(companies, eq(inspections.companyId, companies.id))
    .where(whereClause)
    .orderBy(desc(inspections.createdAt))
    .limit(5);

  const whereExec = companyId ? eq(checklistExecutions.companyId, companyId) : undefined;
  const allPendingExecs = await db.select().from(checklistExecutions)
    .where(and(whereExec, eq(checklistExecutions.status, "pendente" as any)));

  let pendingChecklists = allPendingExecs.length;
  let overdueChecklists = 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  for(const e of allPendingExecs) {
    if (e.date) {
      const ed = new Date(e.date.toString() + "T00:00:00");
      if (ed.getTime() < today.getTime()) overdueChecklists++;
    }
  }

  const completedExecs = await db.select().from(checklistExecutions)
    .where(and(whereExec, eq(checklistExecutions.status, "concluida" as any)));
  
  let totalScore = 0;
  let scoredCount = 0;
  for (const e of completedExecs) {
    if (e.score) {
      totalScore += parseFloat(e.score);
      scoredCount++;
    }
  }
  const averageChecklistScore = scoredCount > 0 ? (totalScore / scoredCount) : 0;

  return {
    totalInspections: totalInspections.count,
    notStarted: notStarted.count,
    pending: pending.count,
    attention: attention.count,
    resolved: resolved.count,
    totalUsers: totalUsers.count,
    totalCompanies: totalCompanies.count,
    weeklyData,
    sentNotifications: sentNotifications.count,
    readNotifications: readNotifications.count,
    recentInspections: recentInspections.map((row: any) => ({
      ...row.inspection,
      companyName: row.company?.name || "Empresa Removida",
    })),
    pendingChecklists,
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
  const conditions = [];
  if (params.inspectionId) conditions.push(eq(chatMessages.inspectionId, params.inspectionId));
  if (params.companyId) conditions.push(eq(chatMessages.companyId, params.companyId));
  return db.select({ message: chatMessages, sender: users })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(chatMessages.createdAt))
    .limit(params.limit || 50);
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
  const conditions = [eq(chatMessages.recipientId, recipientId)];
  if (inspectionId) conditions.push(eq(chatMessages.inspectionId, inspectionId));
  await db.update(chatMessages).set({ isRead: true, readAt: new Date() }).where(and(...conditions));
}

// =============================================
// PGR
// =============================================
export async function getAllPGR(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = companyId ? [eq(pgr.companyId, companyId)] : [];
  return db.select().from(pgr).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(pgr.createdAt));
}

export async function createPGR(data: typeof pgr.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pgr).values(data).returning({ id: pgr.id });
  return result[0]?.id;
}

export async function updatePGR(id: number, data: Partial<typeof pgr.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pgr).set({ ...data, updatedAt: new Date() }).where(eq(pgr.id, id));
}

export async function deletePGR(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pgr).where(eq(pgr.id, id));
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
export async function getAllITS(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = companyId ? [eq(its.companyId, companyId)] : [];
  return db.select().from(its).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(its.createdAt));
}

export async function createITS(data: typeof its.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(its).values(data).returning({ id: its.id });
  return result[0]?.id;
}

export async function updateITS(id: number, data: Partial<typeof its.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(its).set({ ...data, updatedAt: new Date() }).where(eq(its.id, id));
}

export async function deleteITS(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(its).where(eq(its.id, id));
}

// =============================================
// PT
// =============================================
export async function getAllPT(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = companyId ? [eq(pt.companyId, companyId)] : [];
  return db.select().from(pt).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(pt.createdAt));
}

export async function createPT(data: typeof pt.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pt).values(data).returning({ id: pt.id });
  return result[0]?.id;
}

export async function updatePT(id: number, data: Partial<typeof pt.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pt).set({ ...data, updatedAt: new Date() }).where(eq(pt.id, id));
}

export async function deletePT(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pt).where(eq(pt.id, id));
}

// =============================================
// TRAININGS
// =============================================
export async function getAllTrainings(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = companyId ? [eq(trainings.companyId, companyId)] : [];
  return db.select().from(trainings).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(trainings.createdAt));
}

export async function createTraining(data: typeof trainings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainings).values(data).returning({ id: trainings.id });
  return result[0]?.id;
}

export async function updateTraining(id: number, data: Partial<typeof trainings.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(trainings).set({ ...data, updatedAt: new Date() }).where(eq(trainings.id, id));
}

export async function deleteTraining(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(trainings).where(eq(trainings.id, id));
}

// =============================================
// APR
// =============================================
export async function getAllAPR(filters?: { companyId?: number; search?: string; status?: string; date?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.companyId) conditions.push(eq(apr.companyId, filters.companyId));
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

export async function updateAPR(id: number, data: Partial<typeof apr.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(apr).set({ ...data, updatedAt: new Date() }).where(eq(apr.id, id));
}

export async function deleteAPR(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(apr).where(eq(apr.id, id));
}

// =============================================
// EPI FICHA
// =============================================
export async function getAllEpiFicha(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = companyId ? [eq(epiFicha.companyId, companyId)] : [];
  return db.select({ ficha: epiFicha, user: users })
    .from(epiFicha)
    .leftJoin(users, eq(epiFicha.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(epiFicha.createdAt));
}

export async function createEpiFicha(data: typeof epiFicha.$inferInsert | (typeof epiFicha.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const values = Array.isArray(data) ? data : [data];
  const result = await db.insert(epiFicha).values(values).returning({ id: epiFicha.id });
  return result.map(r => r.id);
}

export async function deleteEpiFicha(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(epiFicha).where(eq(epiFicha.id, id));
}

// =============================================
// ADVERTÊNCIAS
// =============================================
export async function getAllAdvertencias(filters?: { companyId?: number; userId?: number; type?: string; date?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.companyId) conditions.push(eq(advertencias.companyId, filters.companyId));
  if (filters?.userId) conditions.push(eq(advertencias.userId, filters.userId));
  if (filters?.type && filters.type !== 'all') conditions.push(eq(advertencias.type, filters.type as any));
  if (filters?.date) conditions.push(eq(advertencias.date, filters.date));
  if (filters?.search) conditions.push(like(advertencias.reason, `%${filters.search}%`));

  return db.select({ advertencia: advertencias, user: users })
    .from(advertencias)
    .leftJoin(users, eq(advertencias.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(advertencias.createdAt));
}

export async function createAdvertencia(data: typeof advertencias.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(advertencias).values(data).returning({ id: advertencias.id });
  return result[0]?.id;
}

export async function deleteAdvertencia(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(advertencias).where(eq(advertencias.id, id));
}

// =============================================
// TACTDRIVER
// =============================================
export async function getAllTactdriver(companyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = companyId ? [eq(tactdriver.companyId, companyId)] : [];
  return db.select().from(tactdriver).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(tactdriver.createdAt));
}

export async function createTactdriver(data: typeof tactdriver.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tactdriver).values(data).returning({ id: tactdriver.id });
  return result[0]?.id;
}

export async function updateTactdriver(id: number, data: Partial<typeof tactdriver.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tactdriver).set({ ...data, updatedAt: new Date() }).where(eq(tactdriver.id, id));
}

export async function deleteTactdriver(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tactdriver).where(eq(tactdriver.id, id));
}

// =============================================
// AUTH HELPERS
// =============================================
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: typeof users.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(users).values(data).returning({ id: users.id });
  const insertId = result[0]?.id;
  const created = await db.select().from(users).where(eq(users.id, insertId)).limit(1);
  return created[0];
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
