import { z } from "zod";
import { router, companyProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { reports, reportData, reportImages, signatures } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const reportRouter = router({
  saveReport: companyProcedure
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
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

      let reportId = input.id;
      const user = ctx.user;
      
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

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
        // Security check for update
        const [existing] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
        if (!existing || (!ctx.authorizedCompanyIds.includes(existing.companyId) && user.ehsRole !== "adm_ehs")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Não autorizado a editar este relatório" });
        }

        await db.update(reports)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(reports.id, reportId));
          
        const existingDataData = await db.select().from(reportData).where(eq(reportData.reportId, reportId));
        if (existingDataData.length > 0) {
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

  getReport: companyProcedure
    .input(z.object({ id: z.number(), companyId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

      const [report] = await db.select().from(reports).where(eq(reports.id, input.id));
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Relatório não encontrado" });

      // Extra security check for isolation
      if (!ctx.authorizedCompanyIds.includes(report.companyId) && ctx.user?.ehsRole !== "adm_ehs") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

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

  listReports: companyProcedure
    .input(z.object({ companyId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

      const { getCompanyCondition } = await import("../db");
      const condition = getCompanyCondition(reports.companyId, ctx.effectiveCompanyId);

      return await db.select()
        .from(reports)
        .where(condition)
        .orderBy(desc(reports.createdAt));
    }),

  cloneReport: companyProcedure
    .input(z.object({ id: z.number(), companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const [oldReport] = await db.select().from(reports).where(eq(reports.id, input.id));
      if (!oldReport) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });

      // Security check
      if (!ctx.authorizedCompanyIds.includes(oldReport.companyId) && user.ehsRole !== "adm_ehs") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Não autorizado" });
      }
      
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
