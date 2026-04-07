import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { nrs } from "../../drizzle/schema";
import { eq, or, isNull } from "drizzle-orm";

export const nrRouter = router({
  // List all NRs: global (companyId is null) + company-specific
  list: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      // Bloquear totalmente o acesso para usuários comuns
      if (ctx.user?.ehsRole !== "adm_ehs") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores EHS" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const companyId = input?.companyId;
      
      // Return global NRs (companyId null) + company-specific
      const result = await db
        .select()
        .from(nrs)
        .where(
          companyId
            ? or(isNull(nrs.companyId), eq(nrs.companyId, companyId))
            : isNull(nrs.companyId)
        )
        .orderBy(nrs.code);

      return result;
    }),

  // List only global NRs (system-level)
  listGlobal: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.ehsRole !== "adm_ehs") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores EHS" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
    return await db.select().from(nrs).where(isNull(nrs.companyId)).orderBy(nrs.code);
  }),

  // Create a custom NR for a company (only adm_ehs can create global ones)
  create: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      // Only adm_ehs can create global NRs (companyId = null)
      if (!input.companyId && ctx.user?.ehsRole !== "adm_ehs") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas ADM EHS pode criar NRs globais" });
      }

      const result = await db.insert(nrs).values({
        companyId: input.companyId ?? null,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        isActive: true,
      }).returning();

      return result[0];
    }),

  // Update an NR
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).max(20).optional(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const existing = await db.select().from(nrs).where(eq(nrs.id, input.id)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "NR não encontrada" });
      
      // Only adm_ehs can update global NRs
      if (!existing[0].companyId && ctx.user?.ehsRole !== "adm_ehs") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas ADM EHS pode editar NRs globais" });
      }

      const { id, ...updateData } = input;
      await db.update(nrs).set(updateData).where(eq(nrs.id, id));
      return { success: true };
    }),

  // Delete a custom NR (only if it belongs to allowed company)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const existing = await db.select().from(nrs).where(eq(nrs.id, input.id)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "NR não encontrada" });
      
      // Cannot delete global NRs unless adm_ehs
      if (!existing[0].companyId && ctx.user?.ehsRole !== "adm_ehs") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Não é possível excluir NRs globais do sistema" });
      }

      await db.delete(nrs).where(eq(nrs.id, input.id));
      return { success: true };
    }),
});
