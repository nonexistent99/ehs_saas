import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { reports, reportData, reportImages, signatures } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const reportRouter = router({
  saveReport: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      companyId: z.number(),
      type: z.string(),
      status: z.enum(["draft", "concluido", "arquivado"]).default("draft"),
      payload: z.record(z.string(), z.unknown()),
      images: z.array(z.object({
        section: z.string(),
        imageUrl: z.string(),
        description: z.string().optional()
      })).optional(),
      signatures: z.array(z.object({
        role: z.string(),
        name: z.string(),
        signatureUrl: z.string()
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      let reportId = input.id;
      const user = ctx.user as { id: number } | undefined;
      
      if (!user) throw new Error("Unauthorized");

      if (!reportId) {
        const [newReport] = await db.insert(reports).values({
          companyId: input.companyId,
          type: input.type,
          status: input.status,
          createdById: user.id
        }).returning();
        reportId = newReport.id;
        
        await db.insert(reportData).values({
          reportId: newReport.id,
          payload: input.payload
        });
      } else {
        await db.update(reports)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(reports.id, reportId));
          
        const existingData = await db.select().from(reportData).where(eq(reportData.reportId, reportId));
        if (existingData.length > 0) {
          await db.update(reportData)
            .set({ payload: input.payload, updatedAt: new Date() })
            .where(eq(reportData.reportId, reportId));
        } else {
          await db.insert(reportData).values({
            reportId,
            payload: input.payload
          });
        }
      }

      if (input.images !== undefined) {
        await db.delete(reportImages).where(eq(reportImages.reportId, reportId!));
        if (input.images.length > 0) {
          await db.insert(reportImages).values(
            input.images.map((img: any, index: number) => ({
              reportId: reportId!,
              section: img.section,
              imageUrl: img.imageUrl,
              description: img.description || "",
              order: index
            }))
          );
        }
      }

      if (input.signatures !== undefined) {
        await db.delete(signatures).where(eq(signatures.reportId, reportId!));
        if (input.signatures.length > 0) {
          await db.insert(signatures).values(
            input.signatures.map((sig: any) => ({
              reportId: reportId!,
              role: sig.role,
              name: sig.name,
              signatureUrl: sig.signatureUrl
            }))
          );
        }
      }

      return { success: true, reportId };
    }),

  getReport: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const [report] = await db.select().from(reports).where(eq(reports.id, input.id));
      if (!report) throw new Error("Report not found");

      const [data] = await db.select().from(reportData).where(eq(reportData.reportId, input.id));
      const images = await db.select().from(reportImages).where(eq(reportImages.reportId, input.id));
      const sigs = await db.select().from(signatures).where(eq(signatures.reportId, input.id));

      return {
        ...report,
        payload: data?.payload || {},
        images,
        signatures: sigs
      };
    }),

  listReports: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      return await db.select()
        .from(reports)
        .where(eq(reports.companyId, input.companyId))
        .orderBy(desc(reports.createdAt));
    }),

  cloneReport: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const user = ctx.user as { id: number } | undefined;
      if (!user) throw new Error("Unauthorized");
      
      const [oldReport] = await db.select().from(reports).where(eq(reports.id, input.id));
      if (!oldReport) throw new Error("Report not found");
      
      const [oldData] = await db.select().from(reportData).where(eq(reportData.reportId, input.id));

      const [newReport] = await db.insert(reports).values({
        companyId: oldReport.companyId,
        type: oldReport.type,
        status: "draft",
        createdById: user.id
      }).returning();

      if (oldData) {
        await db.insert(reportData).values({
          reportId: newReport.id,
          payload: oldData.payload
        });
      }
      
      return { success: true, reportId: newReport.id };
    })
});
