import { and, desc, eq, like, lte, or } from "drizzle-orm";
import {
  checklistExecutions,
  checklistExecutionItems,
  checklistTemplates,
  checklistTemplateItems,
  users,
  companies,
  obras,
} from "../drizzle/schema";
import { getDb } from "./db";

// =============================================
// CHECKLIST TEMPLATES (V2)
// =============================================

export async function getAllChecklistTemplates(companyId?: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(checklistTemplates.isActive, true)];
  if (companyId) filters.push(eq(checklistTemplates.companyId, companyId));
  if (search) filters.push(like(checklistTemplates.name, `%${search}%`));

  return db
    .select()
    .from(checklistTemplates)
    .where(and(...filters))
    .orderBy(desc(checklistTemplates.createdAt));
}

export async function getChecklistTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id)).limit(1);
  return result[0];
}

export async function getChecklistTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, templateId))
    .orderBy(checklistTemplateItems.order);
}

export async function createChecklistTemplate(data: typeof checklistTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checklistTemplates).values(data).returning({ id: checklistTemplates.id });
  return result[0]?.id;
}

export async function updateChecklistTemplate(id: number, data: Partial<typeof checklistTemplates.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistTemplates).set({ ...data, updatedAt: new Date() }).where(eq(checklistTemplates.id, id));
}

export async function deleteChecklistTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistTemplates).set({ isActive: false }).where(eq(checklistTemplates.id, id));
}

export async function createChecklistTemplateItem(data: typeof checklistTemplateItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(checklistTemplateItems).values(data);
}

export async function updateChecklistTemplateItem(id: number, data: Partial<typeof checklistTemplateItems.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistTemplateItems).set(data).where(eq(checklistTemplateItems.id, id));
}

export async function deleteChecklistTemplateItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(checklistTemplateItems).where(eq(checklistTemplateItems.id, id));
}

// =============================================
// CHECKLIST EXECUTIONS (V2)
// =============================================

export async function getAllChecklistExecutions(companyId?: number, status?: "pendente" | "concluida") {
  const db = await getDb();
  if (!db) return [];
  
  const filters: any[] = [];
  if (companyId) filters.push(eq(checklistExecutions.companyId, companyId));
  if (status) filters.push(eq(checklistExecutions.status, status));

  return db
    .select({
      id: checklistExecutions.id,
      date: checklistExecutions.date,
      status: checklistExecutions.status,
      score: checklistExecutions.score,
      templateName: checklistTemplates.name,
      companyName: companies.name,
      companyId: checklistExecutions.companyId,
    })
    .from(checklistExecutions)
    .innerJoin(checklistTemplates, eq(checklistExecutions.templateId, checklistTemplates.id))
    .innerJoin(companies, eq(checklistExecutions.companyId, companies.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(checklistExecutions.date));
}

export async function getChecklistExecutionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      execution: checklistExecutions,
      template: checklistTemplates,
      company: companies,
      obra: obras,
      creator: users
    })
    .from(checklistExecutions)
    .innerJoin(checklistTemplates, eq(checklistExecutions.templateId, checklistTemplates.id))
    .innerJoin(companies, eq(checklistExecutions.companyId, companies.id))
    .leftJoin(obras, eq(checklistExecutions.projectId, obras.id))
    .leftJoin(users, eq(checklistExecutions.createdById, users.id))
    .where(eq(checklistExecutions.id, id))
    .limit(1);

  return result[0];
}

export async function getChecklistExecutionItems(executionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      executionItem: checklistExecutionItems,
      templateItem: checklistTemplateItems,
    })
    .from(checklistExecutionItems)
    .innerJoin(checklistTemplateItems, eq(checklistExecutionItems.itemId, checklistTemplateItems.id))
    .where(eq(checklistExecutionItems.executionId, executionId))
    .orderBy(checklistTemplateItems.order);
}

export async function createChecklistExecution(data: typeof checklistExecutions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checklistExecutions).values(data).returning({ id: checklistExecutions.id });
  return result[0]?.id;
}

export async function updateChecklistExecution(id: number, data: Partial<typeof checklistExecutions.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistExecutions).set({ ...data, updatedAt: new Date() }).where(eq(checklistExecutions.id, id));
}

export async function createChecklistExecutionItem(data: typeof checklistExecutionItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const res = await db.insert(checklistExecutionItems).values(data).returning({ id: checklistExecutionItems.id });
  return res[0]?.id;
}

export async function updateChecklistExecutionItem(id: number, data: Partial<typeof checklistExecutionItems.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistExecutionItems).set(data).where(eq(checklistExecutionItems.id, id));
}

export async function getPendingDelayedExecutions() {
  const db = await getDb();
  if (!db) return [];

  // Consider "Delayed" executions as pendente and date in the past
  const now = new Date();
  
  return db
    .select()
    .from(checklistExecutions)
    .where(
      and(
        eq(checklistExecutions.status, "pendente"),
        lte(checklistExecutions.date, now.toISOString().split("T")[0])
      )
    );
}
