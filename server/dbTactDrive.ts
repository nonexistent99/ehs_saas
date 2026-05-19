import { and, desc, eq, gte, lte, or, isNotNull, sql } from "drizzle-orm";
import { tactDriveDocuments, tactDriveFolders } from "../drizzle/schema";
import { getDb, getCompanyCondition } from "./db";

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function getAllFolders(companyId?: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const compCond = getCompanyCondition(tactDriveFolders.companyId, companyId);
  return db.select().from(tactDriveFolders)
    .where(compCond)
    .orderBy(tactDriveFolders.name);
}

export async function createFolder(data: {
  companyId: number; name: string; color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(tactDriveFolders).values(data).returning({ id: tactDriveFolders.id });
  return result[0]?.id;
}

export async function deleteFolder(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const compCond = getCompanyCondition(tactDriveFolders.companyId, companyId);
  // Move docs from deleted folder to root (null folderId)
  await db.update(tactDriveDocuments).set({ folderId: null }).where(eq(tactDriveDocuments.folderId, id));
  return db.delete(tactDriveFolders).where(and(eq(tactDriveFolders.id, id), compCond));
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getAllDocuments(companyId?: number | number[], folderId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const filters: any[] = [];
  const compCond = getCompanyCondition(tactDriveDocuments.companyId, companyId);
  if (compCond) filters.push(compCond);
  if (folderId !== undefined) {
    if (folderId === null) {
      filters.push(sql`${tactDriveDocuments.folderId} IS NULL`);
    } else {
      filters.push(eq(tactDriveDocuments.folderId, folderId));
    }
  }
  return db.select().from(tactDriveDocuments)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(tactDriveDocuments.createdAt));
}

export async function getExpiringDocuments(companyId?: number | number[], daysAhead = 30) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  const limit = new Date();
  limit.setDate(limit.getDate() + daysAhead);
  const todayStr = today.toISOString().split("T")[0];
  const limitStr = limit.toISOString().split("T")[0];
  const compCond = getCompanyCondition(tactDriveDocuments.companyId, companyId);
  const filters: any[] = [
    eq(tactDriveDocuments.hasExpiry, true),
    isNotNull(tactDriveDocuments.expiryDate),
    lte(tactDriveDocuments.expiryDate, limitStr),
  ];
  if (compCond) filters.push(compCond);
  return db.select().from(tactDriveDocuments)
    .where(and(...filters))
    .orderBy(tactDriveDocuments.expiryDate);
}

export async function createDocument(data: {
  companyId: number;
  folderId?: number | null;
  name: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  hasExpiry: boolean;
  expiryDate?: string | null;
  createdById: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(tactDriveDocuments).values({
    ...data,
    folderId: data.folderId ?? null,
    expiryDate: data.expiryDate ?? null,
  }).returning({ id: tactDriveDocuments.id });
  return result[0]?.id;
}

export async function updateDocument(id: number, data: Partial<{
  name: string; description: string; folderId: number | null;
  fileUrl: string; fileName: string; hasExpiry: boolean; expiryDate: string | null;
}>, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const compCond = getCompanyCondition(tactDriveDocuments.companyId, companyId);
  return db.update(tactDriveDocuments).set(data).where(and(eq(tactDriveDocuments.id, id), compCond));
}

export async function deleteDocument(id: number, companyId?: number | number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const compCond = getCompanyCondition(tactDriveDocuments.companyId, companyId);
  return db.delete(tactDriveDocuments).where(and(eq(tactDriveDocuments.id, id), compCond));
}
