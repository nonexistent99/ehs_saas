import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
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
  if (role !== "adm_ehs" && role !== "tecnico") {
    throw new Error("Acesso restrito a administradores e técnicos EHS");
  }
};

export const checklistRouter = router({
  templates: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional(), search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getAllChecklistTemplates(input?.companyId, input?.search);
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
        type: z.enum(["estatico", "dinamico"]).default("estatico"),
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
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        type: z.enum(["estatico", "dinamico"]).optional(),
        isFavorite: z.boolean().optional(),
        frequencyType: z.enum(["dias", "semanas", "meses"]).optional(),
        frequencyValue: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...data } = input;
        await updateChecklistTemplate(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        await deleteChecklistTemplate(input.id);
        return { success: true };
      }),
  }),
  
  executions: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional(), status: z.enum(["pendente", "concluida"]).optional() }).optional())
      .query(async ({ input }) => {
        return getAllChecklistExecutions(input?.companyId, input?.status);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const executionData = await getChecklistExecutionById(input.id);
        const items = await getChecklistExecutionItems(input.id);
        return { ...executionData, items };
      }),
    createFromTemplate: protectedProcedure
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
    concluir: protectedProcedure
      .input(z.object({
        id: z.number(),
        signatureUrl: z.string().optional(),
        items: z.array(z.object({
          id: z.number(), // execution item id
          status: z.enum(["Conforme", "Não Conforme", "N/A"]),
          observation: z.string().optional(),
          mediaUrls: z.array(z.string()).optional(),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        console.log("[v2] Concluir input:", JSON.stringify({ id: input.id, items: input.items.map(i => i.status) }));
        requireAdmOrTecnico(ctx.user?.ehsRole);
        
        let okCount = 0;
        let notOkCount = 0;

        // 1. Atualizar todos os itens preenchidos
        for (const item of input.items) {
          if (item.status === "Conforme") okCount++;
          if (item.status === "Não Conforme") notOkCount++;

          await updateChecklistExecutionItem(item.id, {
            status: item.status,
            observation: item.observation,
            mediaUrls: item.mediaUrls || [],
          });
        }
        
        const totalScorable = okCount + notOkCount;
        const score = totalScorable > 0 ? (okCount / totalScorable) * 100 : 0;

        // 2. Marcar a execução como concluída
        await updateChecklistExecution(input.id, {
          status: "concluida",
          createdById: ctx.user!.id, // completed by this technical user
          signatureUrl: input.signatureUrl,
          score: String(score.toFixed(2)),
        });

        // 3. Recorrência (Agendamento Automático)
        const execution = await getChecklistExecutionById(input.id);
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
