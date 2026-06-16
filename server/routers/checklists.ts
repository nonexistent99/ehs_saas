import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { companyProcedure, protectedProcedure, router } from "../_core/trpc";
import { checklistTemplateItems } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { isRecognizedChecklistStatus, normalizeChecklistStatus } from "@shared/checklistStatus";
import {
  getAllChecklistTemplates,
  getChecklistTemplateById,
  getChecklistTemplateItems,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  createChecklistTemplateItem,
  updateChecklistTemplateItem,
  deleteChecklistTemplateItem,
  getAllChecklistExecutions,
  getChecklistExecutionById,
  getChecklistExecutionItems,
  createChecklistExecution,
  updateChecklistExecution,
  createChecklistExecutionItem,
  updateChecklistExecutionItem,
} from "../dbChecklists";

const requireAdmOrTecnico = (role?: "adm_ehs" | "cliente" | "tecnico" | "apoio" | null) => {
  if (role !== "adm_ehs" && role !== "tecnico" && role !== "apoio") {
    throw new Error("Acesso restrito a administradores, técnicos e apoio EHS");
  }
};

const checklistTypeSchema = z.preprocess((value) => {
  if (value === "dinamico" || value === "dinâmico") return "dinamico";
  if (value === "estatico" || value === "estático") return "estatico";
  return "estatico";
}, z.enum(["estatico", "dinamico"]));

const checklistItemStatusSchema = z.preprocess(
  (value) => {
    if (!isRecognizedChecklistStatus(value)) {
      console.warn("[Checklist] Status desconhecido recebido na API; normalizando como N/A", { status: value });
    }
    return normalizeChecklistStatus(value);
  },
  z.enum(["Conforme", "Não Conforme", "N/A"])
);

const checklistExecutionItemInputSchema = z.object({
  id: z.number(), // execution item id
  status: checklistItemStatusSchema,
  observation: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
});

type ChecklistExecutionItemInput = z.infer<typeof checklistExecutionItemInputSchema>;

function warnUnknownChecklistStatus(status: unknown, itemId: number, executionId: number) {
  if (isRecognizedChecklistStatus(status)) return;
  console.warn("[Checklist] Status desconhecido normalizado como N/A", {
    executionId,
    itemId,
    status,
  });
}

async function persistChecklistItems(executionId: number, items: ChecklistExecutionItemInput[]) {
  let okCount = 0;
  let notOkCount = 0;

  for (const item of items) {
    warnUnknownChecklistStatus(item.status, item.id, executionId);
    const status = normalizeChecklistStatus(item.status);
    if (status === "Conforme") okCount++;
    if (status === "Não Conforme") notOkCount++;

    const updatedItemId = await updateChecklistExecutionItem(item.id, {
      status,
      observation: item.observation,
      mediaUrls: item.mediaUrls || [],
    }, executionId);

    if (!updatedItemId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Item de checklist inválido para esta execução",
      });
    }
  }

  return { okCount, notOkCount };
}

export const checklistRouter = router({
  templates: router({
    list: companyProcedure
      .input(z.object({ companyId: z.number().optional(), search: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        return getAllChecklistTemplates(ctx.effectiveCompanyId, input?.search);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await getChecklistTemplateById(input.id);
        const items = await getChecklistTemplateItems(input.id);
        return { template, items };
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        type: checklistTypeSchema.default("estatico"),
        isFavorite: z.boolean().default(false),
        frequencyType: z.enum(["dias", "semanas", "meses"]).default("dias"),
        frequencyValue: z.number().default(0),
        items: z.array(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          norma: z.string().optional(),
          referenceImgUrl: z.string().optional(),
          order: z.number().default(0),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { items, ...templateData } = input;
        
        const templateId = await createChecklistTemplate({
          ...templateData,
          createdById: ctx.user!.id,
          isActive: true
        });

        if (templateId && items.length > 0) {
          for (const item of items) {
            await createChecklistTemplateItem({
              ...item,
              templateId,
            });
          }
        }
        return { id: templateId, success: true };
      }),
    update: companyProcedure
      .input(z.object({
        id: z.number(),
        companyId: z.number().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        type: checklistTypeSchema.optional(),
        isFavorite: z.boolean().optional(),
        frequencyType: z.enum(["dias", "semanas", "meses"]).optional(),
        frequencyValue: z.number().optional(),
        items: z.array(z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          norma: z.string().optional(),
          referenceImgUrl: z.string().optional(),
          order: z.number().default(0),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, companyId, items, ...data } = input;
        await updateChecklistTemplate(id, data, ctx.effectiveCompanyId);
        
        // If items are provided, replace the existing ones
        if (items) {
          const db = await import("../db").then(m => m.getDb());
          
          if (db) {
            // Delete old items
            await db.delete(checklistTemplateItems).where(eq(checklistTemplateItems.templateId, id));
            // Insert new items
            if (items.length > 0) {
              for (const item of items) {
                await createChecklistTemplateItem({
                  name: item.name,
                  description: item.description,
                  norma: item.norma,
                  referenceImgUrl: item.referenceImgUrl,
                  order: item.order,
                  templateId: id,
                });
              }
            }
          }
        }
        
        return { success: true };
      }),
    delete: companyProcedure
      .input(z.object({ id: z.number(), companyId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        await deleteChecklistTemplate(input.id, ctx.effectiveCompanyId);
        return { success: true };
      }),
  }),
  
  executions: router({
    list: companyProcedure
      .input(z.object({ companyId: z.number().optional(), status: z.enum(["pendente", "concluida"]).optional() }).optional())
      .query(async ({ input, ctx }) => {
        return getAllChecklistExecutions(ctx.effectiveCompanyId, input?.status);
      }),
    get: companyProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const executionData = await getChecklistExecutionById(input.id, ctx.effectiveCompanyId);
        if (!executionData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Checklist execution not found" });
        }
        const items = await getChecklistExecutionItems(input.id);
        return { ...executionData, items };
      }),
    createFromTemplate: companyProcedure
      .input(z.object({
        companyId: z.number(),
        projectId: z.number().optional(),
        templateId: z.number(),
        date: z.string(), // "YYYY-MM-DD"
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        
        // Fetch Template
        const template = await getChecklistTemplateById(input.templateId);
        if (!template) throw new Error("Template não encontrado");
        
        const executionId = await createChecklistExecution({
          companyId: input.companyId,
          projectId: input.projectId,
          templateId: input.templateId,
          date: input.date,
          status: "pendente",
          createdById: ctx.user!.id, // Will be replaced by actual filler if changed later
        });

        if (executionId) {
          // Copy template items to execution items
          const templateItems = await getChecklistTemplateItems(template.id);
          for (const tItem of templateItems) {
            await createChecklistExecutionItem({
              executionId,
              itemId: tItem.id, // Linking back to template item
            });
          }
        }
        
        return { id: executionId, success: true };
      }),
    saveDraft: companyProcedure
      .input(z.object({
        id: z.number(),
        items: z.array(checklistExecutionItemInputSchema)
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const executionData = await getChecklistExecutionById(input.id, ctx.effectiveCompanyId);
        if (!executionData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Checklist execution not found" });
        }
        if (executionData.execution.status === "concluida") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Checklist concluído não pode ser salvo como rascunho" });
        }

        await persistChecklistItems(input.id, input.items);
        await updateChecklistExecution(input.id, {}, ctx.effectiveCompanyId);
        return { success: true };
      }),
    concluir: companyProcedure
      .input(z.object({
        id: z.number(),
        signatureUrl: z.string().optional(),
        items: z.array(checklistExecutionItemInputSchema)
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const executionData = await getChecklistExecutionById(input.id, ctx.effectiveCompanyId);
        if (!executionData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Checklist execution not found" });
        }

        // 1. Atualizar todos os itens preenchidos
        const { okCount, notOkCount } = await persistChecklistItems(input.id, input.items);
        
        const totalScorable = okCount + notOkCount;
        const score = totalScorable > 0 ? (okCount / totalScorable) * 100 : 0;

        const { id, signatureUrl, items, companyId } = input as any;
        await updateChecklistExecution(id, {
          status: "concluida",
          createdById: ctx.user!.id, // completed by this technical user
          signatureUrl: signatureUrl,
          score: String(score.toFixed(2)),
        }, ctx.effectiveCompanyId);

        // 3. Recorrência (Agendamento Automático)
        const execution = await getChecklistExecutionById(input.id, ctx.effectiveCompanyId);
        if (execution && execution.template) {
           const { frequencyType, frequencyValue } = execution.template;
           if (frequencyValue > 0) {
             const currentDate = new Date();
             let nextDate = new Date(currentDate);
             if (frequencyType === "dias") nextDate.setDate(nextDate.getDate() + frequencyValue);
             else if (frequencyType === "semanas") nextDate.setDate(nextDate.getDate() + frequencyValue * 7);
             else if (frequencyType === "meses") nextDate.setMonth(nextDate.getMonth() + frequencyValue);
             
             // Cria automaticamente o próximo ciclo
             const nextExecutionId = await createChecklistExecution({
                companyId: execution.company.id,
                projectId: execution.execution.projectId,
                templateId: execution.template.id,
                date: nextDate.toISOString().split("T")[0],
                status: "pendente",
             });

             if (nextExecutionId) {
                const templateItems = await getChecklistTemplateItems(execution.template.id);
                for (const tItem of templateItems) {
                  await createChecklistExecutionItem({
                    executionId: nextExecutionId,
                    itemId: tItem.id,
                  });
                }
             }
           }
        }

        return { success: true };
      }),
  })
});
