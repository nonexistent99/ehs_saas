import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "@shared/const";
import * as bcrypt from "bcryptjs";
import {
  addCompanyUser,
  createAPR,
  createAdvertencia,
  createChatMessage,
  createCheckList,
  createCheckListItem,
  createCompany,
  createContract,
  createEpiFicha,
  createITS,
  createInspection,
  createInspectionItem,
  createNotification,
  createObra,
  createPGR,
  createPT,
  createTactdriver,
  createTraining,
  deleteAPR,
  deleteAdvertencia,
  deleteCheckListItem,
  deleteCompany,
  deleteEpiFicha,
  deleteITS,
  deleteInspectionItem,
  deletePGR,
  deletePT,
  deleteTactdriver,
  deleteTraining,
  deleteUser,
  getAllAPR,
  getAllAdvertencias,
  getAllCheckLists,
  getAllCompanies,
  getAllEpiFicha,
  getAllITS,
  getAllInspections,
  getAllNRs,
  getAllPGR,
  getAllPT,
  getAllTactdriver,
  getAllTrainings,
  getAllUsers,
  getChatMessages,
  getCheckListById,
  getCheckListItems,
  getCompanyById,
  getCompanyContracts,
  getCompanyObras,
  getCompanyUsers,
  getDashboardStats,
  getInspectionById,
  getInspectionItems,
  getNotifications,
  getUnreadNotificationCount,
  getUserById,
  getUserByEmail,
  markMessagesRead,
  markNotificationRead,
  removeCompanyUser,
  updateAPR,
  updateCheckListItem,
  updateCompany,
  updateITS,
  updateInspection,
  updateInspectionItem,
  updatePGR,
  updatePT,
  updateTactdriver,
  updateTraining,
  updateUser,
  upsertUser,
  createUserWithPassword,
  getPgrStages,
  createPgrStage,
  updatePgrStage,
  deletePgrStage,
  getRiskMatrixByStage,
  createRiskMatrix,
  updateRiskMatrix,
  deleteRiskMatrix,
  getSubcontractors,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractor,
  getUserLinkedCompanies,
  setUserLinkedObras,
  getAllRisks,
  createRisk,
  updateRisk,
  deleteRisk,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// =============================================
// HELPERS
// =============================================
function requireAdmOrTecnico(role?: string | null) {
  if (role !== "adm_ehs" && role !== "tecnico" && role !== "apoio") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
  }
}
function requireAdm(role?: string | null) {
  if (role !== "adm_ehs") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas ADM EHS pode realizar esta ação" });
  }
}

import { reportRouter } from "./routers/reportRouter";
import { nrRouter } from "./routers/nrRouter";
import { checklistRouter } from "./routers/checklists";
import {
  getAllFolders, createFolder, deleteFolder,
  getAllDocuments, createDocument, updateDocument, deleteDocument, getExpiringDocuments,
} from "./dbTactDrive";

// =============================================
// APP ROUTER
// =============================================
export const appRouter = router({
  system: systemRouter,
  reports: reportRouter,
  nrs: nrRouter,
  checklistsV2: checklistRouter,
  risks: router({
    list: protectedProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => getAllRisks(input?.category)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional(), category: z.string().optional(), nr: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        return createRisk(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), category: z.string().optional(), nr: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateRisk(id, rest);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        return deleteRisk(input.id);
      }),
  }),

  // =============================================
  // TACT DRIVE ROUTER
  // =============================================
  tactDrive: router({
    // Folders
    folders: router({
      list: protectedProcedure
        .input(z.object({ companyId: z.number().optional() }).optional())
        .query(async ({ input }) => getAllFolders(input?.companyId)),
      create: protectedProcedure
        .input(z.object({ companyId: z.number(), name: z.string().min(1), color: z.string().optional() }))
        .mutation(async ({ input }) => createFolder(input)),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => deleteFolder(input.id)),
    }),
    // Documents
    documents: router({
      list: protectedProcedure
        .input(z.object({
          companyId: z.number().optional(),
          folderId: z.number().nullable().optional(),
        }).optional())
        .query(async ({ input }) => getAllDocuments(input?.companyId, input?.folderId)),
      expiring: protectedProcedure
        .input(z.object({ companyId: z.number().optional(), daysAhead: z.number().optional() }).optional())
        .query(async ({ input }) => getExpiringDocuments(input?.companyId, input?.daysAhead ?? 30)),
      create: protectedProcedure
        .input(z.object({
          companyId: z.number(),
          folderId: z.number().nullable().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          fileUrl: z.string().optional(),
          fileName: z.string().optional(),
          fileType: z.string().optional(),
          hasExpiry: z.boolean().default(false),
          expiryDate: z.string().nullable().optional(),
        }))
        .mutation(async ({ input, ctx }) => createDocument({ ...input, createdById: ctx.user!.id })),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          folderId: z.number().nullable().optional(),
          hasExpiry: z.boolean().optional(),
          expiryDate: z.string().nullable().optional(),
        }))
        .mutation(async ({ input }) => { const { id, ...rest } = input; return updateDocument(id, rest); }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => deleteDocument(input.id)),
    }),
  }),

  // =============================================
  // AUTH ROUTER - EMAIL/SENHA PRÓPRIO
  // =============================================
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    login: publicProcedure
      .input(z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Senha obrigatória"),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }
        if (!user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Usuário inativo. Contate o administrador." });
        }
        if (!user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }
        // Update last signed in
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });

        // Create session token
        const sessionToken = await sdk.signSession(
          { openId: user.openId, appId: "ehs_saas", name: user.name || user.email || "" },
          { expiresInMs: ONE_YEAR_MS }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = ctx.user!;
        if (user.passwordHash) {
          const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
          if (!valid) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
          }
        }
        const hash = await bcrypt.hash(input.newPassword, 10);
        await updateUser(user.id, { passwordHash: hash });
        return { success: true };
      }),
  }),

  // =============================================
  // USERS ROUTER
  // =============================================
  users: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getAllUsers(input?.search);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const user = await getUserById(input.id);
        if (!user) return undefined;
        const companyIds = await getUserLinkedCompanies(input.id);
        const obraIds = await getUserLinkedObras(input.id);
        return { ...user, companyIds, obraIds };
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Nome obrigatório"),
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        ehsRole: z.enum(["adm_ehs", "cliente", "tecnico", "apoio"]).default("tecnico"),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        companyIds: z.array(z.number()).optional(),
        obraIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        // Check if email already exists
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const openId = `ehs_${nanoid(16)}`;
        const userOrId = await createUserWithPassword({
          openId,
          name: input.name,
          email: input.email,
          passwordHash,
          ehsRole: input.ehsRole,
          phone: input.phone || null,
          whatsapp: input.whatsapp || null,
          isActive: true,
          loginMethod: "email",
          role: input.ehsRole === "adm_ehs" ? "admin" : "user",
        });
        
        let newUserId: number | undefined;
        if (typeof userOrId === 'number') newUserId = userOrId;
        else if ((userOrId as any)?.id) newUserId = (userOrId as any).id;
        else {
           const newlyCreated = await getUserByEmail(input.email);
           newUserId = newlyCreated?.id;
        }

        if (newUserId && input.companyIds) await setUserLinkedCompanies(newUserId, input.companyIds);
        if (newUserId && input.obraIds) await setUserLinkedObras(newUserId, input.obraIds);
        
        return userOrId;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        ehsRole: z.enum(["adm_ehs", "cliente", "tecnico", "apoio"]).optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
        companyIds: z.array(z.number()).optional(),
        obraIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        const { id, password, companyIds, obraIds, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (password) {
          updateData.passwordHash = await bcrypt.hash(password, 10);
        }
        await updateUser(id, updateData);
        if (companyIds !== undefined) await setUserLinkedCompanies(id, companyIds);
        if (obraIds !== undefined) await setUserLinkedObras(id, obraIds);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        return deleteUser(input.id);
      }),
    sendPasswordReset: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        // Generate temp password
        const tempPassword = nanoid(10);
        const hash = await bcrypt.hash(tempPassword, 10);
        await updateUser(input.id, { passwordHash: hash });
        return { success: true, tempPassword };
      }),
  }),

  // =============================================
  // COMPANIES ROUTER
  // =============================================
  companies: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getAllCompanies(input?.search);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCompanyById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        cnpj: z.string().optional(),
        cep: z.string().optional(),
        address: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        emails: z.array(z.string()).optional(),
        phones: z.array(z.string()).optional(),
        contractValue: z.number().optional(),
        contractSignedAt: z.string().optional(),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { contractValue, ...rest } = input;
        return createCompany({
          ...rest,
          contractValue: contractValue !== undefined ? contractValue.toString() : undefined,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        cnpj: z.string().optional(),
        cep: z.string().optional(),
        address: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        emails: z.array(z.string()).optional(),
        phones: z.array(z.string()).optional(),
        contractValue: z.number().optional(),
        contractSignedAt: z.string().optional(),
        logoUrl: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, contractValue, ...rest } = input;
        return updateCompany(id, {
          ...rest,
          contractValue: contractValue !== undefined ? contractValue.toString() : undefined,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        return deleteCompany(input.id);
      }),
    getUsers: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return getCompanyUsers(input.companyId);
      }),
    addUser: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        userId: z.number(),
        cargo: z.enum(["diretor", "engenheiro", "administrativo", "coordenador", "equipe_tecnica"]).optional(),
        isNotificationRecipient: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return addCompanyUser(input);
      }),
    removeUser: protectedProcedure
      .input(z.object({ companyId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return removeCompanyUser(input.companyId, input.userId);
      }),
    getObras: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input, ctx }) => {
        return getCompanyObras(input.companyId, ctx.user?.id, ctx.user?.ehsRole || undefined);
      }),
    createObra: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        address: z.string().optional(),
        cep: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        emails: z.array(z.string()).optional(),
        phones: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createObra(input);
      }),
    getContracts: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return getCompanyContracts(input.companyId);
      }),
    createContract: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        value: z.number().optional(),
        status: z.enum(["ativo", "encerrado", "suspenso"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createContract(input);
      }),
  }),

  // =============================================
  // OBRAS ROUTER
  // =============================================
  obras: router({
    list: protectedProcedure
      .query(async () => {
         const { getAllObras } = await import("./db");
         return getAllObras();
      }),
  }),

  // =============================================
  // CHECK LISTS ROUTER
  // =============================================
  checkLists: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), nrId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllCheckLists(input?.search);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCheckListById(input.id);
      }),
    getItems: protectedProcedure
      .input(z.object({ checkListId: z.number() }))
      .query(async ({ input }) => {
        return getCheckListItems(input.checkListId);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        nrId: z.number().optional(),
        description: z.string().optional(),
        items: z.array(z.object({
          description: z.string().min(1),
          photoUrl: z.string().optional(),
          isRequired: z.boolean().optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { items, ...checkListData } = input;
        const checkListId = await createCheckList({ ...checkListData, name: checkListData.title, createdById: ctx.user!.id });
        if (items && items.length > 0 && checkListId) {
          for (const item of items) {
            await createCheckListItem({ ...item, checkListId: checkListId as number });
          }
        }
        return checkListId;
      }),
    addItem: protectedProcedure
      .input(z.object({
        checkListId: z.number(),
        description: z.string().min(1),
        photoUrl: z.string().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createCheckListItem(input);
      }),
    updateItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        isRequired: z.boolean().optional(),
        isCompleted: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateCheckListItem(id, rest);
      }),
    deleteItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteCheckListItem(input.id);
      }),
  }),

  // =============================================
  // INSPECTIONS (RELATÓRIOS) ROUTER
  // =============================================
  inspections: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        companyId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllInspections(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getInspectionById(input.id);
      }),
    getItems: protectedProcedure
      .input(z.object({ inspectionId: z.number() }))
      .query(async ({ input }) => {
        return getInspectionItems(input.inspectionId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        obraId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(["nao_iniciada", "pendente", "atencao", "resolvida", "concluida"]).default("nao_iniciada"),
        nrIds: z.array(z.number()).optional(),
        watermark: z.string().optional(),
        address: z.string().optional(),
        inspectionDate: z.string().optional(),
        items: z.array(z.object({
          title: z.string().optional(),
          situacao: z.string().optional(),
          status: z.enum(["pendente", "atencao", "resolvido", "previsto"]).default("pendente"),
          planoAcao: z.string().optional(),
          observacoes: z.string().optional(),
          mediaUrls: z.array(z.string()).optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { nrIds, items, ...inspectionData } = input;
        const inspectionId = await createInspection({
          ...inspectionData,
          inspectedById: ctx.user!.id,
        });
        // Save items if provided
        if (items && items.length > 0) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.title || item.situacao) {
              await createInspectionItem({
                inspectionId,
                title: item.title || "",
                situacao: item.situacao || "",
                status: item.status || "pendente",
                planoAcao: item.planoAcao || "",
                observacoes: item.observacoes || "",
                mediaUrls: item.mediaUrls || [],
                order: i,
              });
            }
          }
        }
        return inspectionId;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["nao_iniciada", "pendente", "atencao", "resolvida", "concluida"]).optional(),
        watermark: z.string().optional(),
        address: z.string().optional(),
        inspectionDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateInspection(id, rest);
      }),
    addItem: protectedProcedure
      .input(z.object({
        inspectionId: z.number(),
        title: z.string().min(1),
        situacaoEvidenciada: z.string().optional(),
        planoDeAcao: z.string().optional(),
        observacoes: z.string().optional(),
        status: z.enum(["resolvido", "pendente", "atencao", "previsto"]).default("pendente"),
        mediaUrls: z.array(z.string()).optional(),
        nrReference: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { situacaoEvidenciada, planoDeAcao, observacoes, mediaUrls, nrReference, ...rest } = input;
        return createInspectionItem({
          ...rest,
          situacao: situacaoEvidenciada,
          planoAcao: planoDeAcao,
          observacoes,
          mediaUrls: mediaUrls || [],
        });
      }),
    updateItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        situacaoEvidenciada: z.string().optional(),
        planoDeAcao: z.string().optional(),
        observacoes: z.string().optional(),
        status: z.enum(["resolvido", "pendente", "atencao", "previsto"]).optional(),
        mediaUrls: z.array(z.string()).optional(),
        nrReference: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, situacaoEvidenciada, planoDeAcao, observacoes, mediaUrls, nrReference, ...rest } = input;
        return updateInspectionItem(id, {
          ...rest,
          situacao: situacaoEvidenciada,
          planoAcao: planoDeAcao,
          observacoes,
          mediaUrls: mediaUrls || [],
        });
      }),
    deleteItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteInspectionItem(input.id);
      }),
    weeklyStats: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { inspections: inspTable } = await import("../drizzle/schema");
        const { and, eq, gte, count } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        // Last 7 days
        const days: { date: string; naoIniciada: number; pendente: number; atencao: number; resolvida: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const nextD = new Date(d);
          nextD.setDate(nextD.getDate() + 1);
          const dateStr = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
          const baseWhere = input?.companyId ? eq(inspTable.companyId, input.companyId) : undefined;
          const dayFilter = (status: string) => and(
            baseWhere,
            eq(inspTable.status, status as any),
            gte(inspTable.createdAt, d),
          );
          const [ni] = await db.select({ c: count() }).from(inspTable).where(dayFilter("nao_iniciada"));
          const [pe] = await db.select({ c: count() }).from(inspTable).where(dayFilter("pendente"));
          const [at] = await db.select({ c: count() }).from(inspTable).where(dayFilter("atencao"));
          const [re] = await db.select({ c: count() }).from(inspTable).where(dayFilter("resolvida"));
          days.push({ date: dateStr, naoIniciada: ni.c, pendente: pe.c, atencao: at.c, resolvida: re.c });
        }
        return days;
      }),
  }),

  // =============================================
  // DASHBOARD ROUTER
  // =============================================
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        // For cliente role, restrict to their company
        const companyId = input?.companyId;
        const stats = await getDashboardStats(companyId);
        return stats;
      }),
  }),

  // =============================================
  // NOTIFICATIONS ROUTER
  // =============================================
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        return getNotifications(ctx.user!.id, input?.limit);
      }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user!.id);
    }),
    send: protectedProcedure
      .input(z.object({
        type: z.enum(["whatsapp", "email", "system"]),
        title: z.string().min(1),
        message: z.string().min(1),
        recipientUserId: z.number().optional(),
        recipientCompanyId: z.number().optional(),
        recipientEmail: z.string().optional(),
        recipientPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        let status = "sent";
        
        if (input.type === "whatsapp" && input.recipientPhone) {
          const { sendWhatsappMessage } = await import("./_core/wapi");
          const whatsappMessage = `*${input.title}*\n\n${input.message}`;
          const success = await sendWhatsappMessage(input.recipientPhone, whatsappMessage);
          if (!success) {
             status = "failed";
          }
        }

        // Just create notification record
        return createNotification({
          type: input.type,
          title: input.title,
          message: input.message,
          recipientUserId: input.recipientUserId,
          recipientCompanyId: input.recipientCompanyId,
          status: status as any,
          sentAt: new Date(),
          metadata: { sentBy: ctx.user!.id, recipientEmail: input.recipientEmail, recipientPhone: input.recipientPhone },
        });
      }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return markNotificationRead(input.id);
      }),
  }),

  // =============================================
  // CHAT ROUTER
  // =============================================
  chat: router({
    messages: protectedProcedure
      .input(z.object({
        inspectionId: z.number().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getChatMessages({ inspectionId: input?.inspectionId, limit: input?.limit });
      }),
    send: protectedProcedure
      .input(z.object({
        message: z.string().min(1),
        inspectionId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return createChatMessage({
          message: input.message,
          inspectionId: input.inspectionId || null,
          senderId: ctx.user!.id,
        });
      }),
    markRead: protectedProcedure
      .input(z.object({ inspectionId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        return markMessagesRead(ctx.user!.id);
      }),
  }),

  // =============================================
  // PGR ROUTER
  // =============================================
  pgr: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllPGR(input?.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        obraId: z.number().optional(),
        title: z.string().min(1),
        version: z.string().optional(),
        status: z.enum(["em_elaboracao", "vigente", "revisao", "cancelado"]).default("em_elaboracao"),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
        responsibleId: z.number().optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createPGR(input as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        obraId: z.number().optional(),
        title: z.string().optional(),
        version: z.string().optional(),
        status: z.enum(["em_elaboracao", "vigente", "revisao", "cancelado"]).optional(),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updatePGR(id, rest as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deletePGR(input.id);
      }),
      
    // STAGES
    stages: protectedProcedure
      .input(z.object({ pgrId: z.number() }))
      .query(async ({ input }) => getPgrStages(input.pgrId)),
    createStage: protectedProcedure
      .input(z.object({ pgrId: z.number(), name: z.string().min(1), description: z.string().optional(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createPgrStage(input);
      }),
    updateStage: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updatePgrStage(id, rest);
      }),
    deleteStage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deletePgrStage(input.id);
      }),
    
    // RISK MATRIX
    riskMatrixList: protectedProcedure
      .input(z.object({ stageId: z.number() }))
      .query(async ({ input }) => getRiskMatrixByStage(input.stageId)),
    createRiskMatrix: protectedProcedure
      .input(z.object({ stageId: z.number(), description: z.string().min(1), severity: z.string().optional(), probability: z.string().optional(), mitigation: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createRiskMatrix(input);
      }),
    updateRiskMatrix: protectedProcedure
      .input(z.object({ id: z.number(), description: z.string().optional(), severity: z.string().optional(), probability: z.string().optional(), mitigation: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateRiskMatrix(id, rest);
      }),
    deleteRiskMatrix: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteRiskMatrix(input.id);
      }),

    // SUBCONTRACTORS
    subcontractorsList: protectedProcedure
      .input(z.object({ pgrId: z.number().optional(), stageId: z.number().optional() }))
      .query(async ({ input }) => getSubcontractors(input.pgrId, input.stageId)),
    createSubcontractor: protectedProcedure
      .input(z.object({ pgrId: z.number().optional(), stageId: z.number().optional(), name: z.string().min(1), cnpj: z.string().optional(), activity: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createSubcontractor(input);
      }),
    updateSubcontractor: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), cnpj: z.string().optional(), activity: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateSubcontractor(id, rest);
      }),
    deleteSubcontractor: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteSubcontractor(input.id);
      }),
  }),

  // =============================================
  // ITS ROUTER
  // =============================================
  its: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllITS(input?.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        obraId: z.number().optional(),
        title: z.string().min(1),
        code: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createITS({ ...input, createdById: ctx.user!.id });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        obraId: z.number().optional(),
        title: z.string().optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateITS(id, rest);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteITS(input.id);
      }),
  }),

  // =============================================
  // PT ROUTER
  // =============================================
  pt: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllPT(input?.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        obraId: z.number().optional(),
        title: z.string().min(1),
        code: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(["ativo", "inativo", "revisao"]).default("ativo"),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          console.log("[PT Router] Creating PT with input:", { ...input, content: input.content?.substring(0, 50) + "..." });
          requireAdmOrTecnico(ctx.user?.ehsRole);
          const result = await createPT({ ...input, createdById: ctx.user!.id });
          console.log("[PT Router] Success! New ID:", result);
          return result;
        } catch (error) {
          console.error("[PT Router] Error creating PT:", error);
          throw error;
        }
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        obraId: z.number().optional(),
        title: z.string().optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(["ativo", "inativo", "revisao"]).optional(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updatePT(id, rest);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deletePT(input.id);
      }),
  }),

  // =============================================
  // APR ROUTER
  // =============================================
  apr: router({
    list: protectedProcedure
      .input(z.object({
        companyId: z.number().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
        date: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllAPR(input);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        obraId: z.number().optional(),
        title: z.string().min(1),
        activity: z.string().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"]).default("aberta"),
        date: z.string().optional(),
        responsibleId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { date, ...rest } = input;
        return createAPR({ ...rest, date: date ? date : undefined, createdById: ctx.user!.id });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        activity: z.string().optional(),
        location: z.string().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"]).optional(),
        date: z.string().optional(),
        responsibleId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, date, ...rest } = input;
        return updateAPR(id, { ...rest, date: date ? date : undefined });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteAPR(input.id);
      }),
  }),

  // =============================================
  // EPI FICHA ROUTER
  // =============================================
  epiFicha: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllEpiFicha(input?.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        employeeName: z.string().min(1),
        obraId: z.number().optional(),
        items: z.array(z.object({
          epiName: z.string().min(1),
          ca: z.string().optional(),
          quantity: z.number().optional().default(1),
          validUntil: z.string().optional(),
          reason: z.string().optional(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const payload = input.items.map(item => ({
          companyId: input.companyId,
          employeeName: input.employeeName,
          obraId: input.obraId,
          epiName: item.epiName,
          ca: item.ca,
          quantity: item.quantity || 1,
          validUntil: item.validUntil ? item.validUntil : undefined,
          reason: item.reason,
          createdById: ctx.user!.id,
        }));
        return createEpiFicha(payload as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteEpiFicha(input.id);
      }),
  }),

  // =============================================
  // ADVERTÊNCIAS ROUTER
  // =============================================
  advertencias: router({
    list: protectedProcedure
      .input(z.object({ 
         companyId: z.number().optional(),
         userId: z.number().optional(),
         type: z.string().optional(),
         date: z.string().optional(),
         search: z.string().optional()
      }).optional())
      .query(async ({ input }) => {
        return getAllAdvertencias(input);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        userId: z.number(),
        type: z.enum(["verbal", "escrita", "suspensao", "demissao"]).default("escrita"),
        reason: z.string().min(1),
        description: z.string().optional(),
        date: z.string(),
        witnessId: z.number().optional(),
        signatureUrl: z.string().optional(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { date, ...rest } = input;
        return createAdvertencia({ ...rest, date, createdById: ctx.user!.id });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteAdvertencia(input.id);
      }),
  }),

  // =============================================
  // TACTDRIVER ROUTER
  // =============================================
  tactdriver: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllTactdriver(input?.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        driverName: z.string().min(1),
        vehiclePlate: z.string().optional(),
        vehicleModel: z.string().optional(),
        date: z.string(),
        score: z.number().optional(),
        status: z.enum(["aprovado", "atencao", "reprovado"]).default("aprovado"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { date, ...rest } = input;
        return createTactdriver({ ...rest, date, createdById: ctx.user!.id } as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        driverName: z.string().optional(),
        vehiclePlate: z.string().optional(),
        vehicleModel: z.string().optional(),
        score: z.number().optional(),
        status: z.enum(["aprovado", "atencao", "reprovado"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateTactdriver(id, rest as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteTactdriver(input.id);
      }),
  }),

  // =============================================
  // TRAININGS ROUTER
  // =============================================
  trainings: router({
    list: protectedProcedure
      .input(z.object({ companyId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getAllTrainings(input?.companyId);
      }),
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        nrId: z.number().optional(),
        instructor: z.string().optional(),
        trainingDate: z.string().optional(),
        validityMonths: z.number().optional(),
        location: z.string().optional(),
        status: z.enum(["agendado", "realizado", "cancelado"]).default("agendado"),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createTraining({ ...input, createdById: ctx.user!.id } as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        nrId: z.number().optional(),
        instructor: z.string().optional(),
        trainingDate: z.string().optional(),
        validityMonths: z.number().optional(),
        location: z.string().optional(),
        status: z.enum(["agendado", "realizado", "cancelado"]).optional(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateTraining(id, rest as any);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return deleteTraining(input.id);
      }),
  }),

  // =============================================
  // FILE UPLOAD ROUTER
  // =============================================
  upload: router({
    getPresignedUrl: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ext = input.filename.split(".").pop() || "bin";
        const key = `ehs/${ctx.user!.id}/${nanoid(12)}.${ext}`;
        const { url } = await storagePut(key, Buffer.from(""), input.contentType);
        return { key, url };
      }),
    uploadBase64: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ext = input.filename.split(".").pop() || "bin";
        const key = `ehs/${ctx.user!.id}/${nanoid(12)}.${ext}`;
        const buffer = Buffer.from(input.base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
        const { url } = await storagePut(key, buffer, input.contentType);
        return { key, url };
      }),
  }),
  
  // =============================================
  // W-API ROUTER
  // =============================================
  wapi: router({
    getConsolidatedEmails: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
        
        const { companies, companyUsers, users } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        const consolidated = new Set<string>();

        // 1. E-mails diretos da empresa e matriz de emails
        const companyRows = await db.select().from(companies).where(eq(companies.id, input.companyId)).limit(1);
        if (companyRows.length > 0) {
          const comp = companyRows[0];
          if (comp.email) consolidated.add(comp.email);
          if (comp.emails && Array.isArray(comp.emails)) {
            comp.emails.forEach((e: string) => { if (e) consolidated.add(e) });
          }
        }

        // 2. E-mails dos responsáveis/gestores marcados para receber notificações
        const cUsers = await db.select({ email: users.email })
          .from(companyUsers)
          .innerJoin(users, eq(companyUsers.userId, users.id))
          .where(and(eq(companyUsers.companyId, input.companyId), eq(companyUsers.isNotificationRecipient, true)));

        cUsers.forEach((u: any) => {
          if (u.email) consolidated.add(u.email);
        });

        return Array.from(consolidated).filter(Boolean);
      }),

    shareDocument: protectedProcedure
      .input(z.object({
        phones: z.array(z.string()).optional(),
        emails: z.array(z.string()).optional(),
        phone: z.string().optional(), // kept for backward compatibility
        message: z.string().optional(),
        documentType: z.enum(["inspection", "checklist", "pgr", "apr", "pt", "its", "treinamento", "advertencia", "epi"]),
        documentId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

        let pdfBuffer: Buffer | null = null;
        let fileName = "documento.pdf";
        
        try {
          const { inspections, inspectionItems, checklistExecutions, checklistTemplates, checklistExecutionItems, checklistTemplateItems, pgr, apr, pt, its, trainings, advertencias, epiFicha, nrs, companies, obras, users } = await import("../drizzle/schema");
          const { eq, and } = await import("drizzle-orm");
          const { format } = await import("date-fns");
          const { ptBR } = await import("date-fns/locale");

          if (input.documentType === "inspection") {
            const inspRows = await db.select({ inspection: inspections, company: companies, obra: obras })
              .from(inspections).leftJoin(companies, eq(inspections.companyId, companies.id))
              .leftJoin(obras, eq(inspections.obraId, obras.id)).where(eq(inspections.id, input.documentId)).limit(1);
            if (!inspRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });
            
            const { inspection, company, obra } = inspRows[0];
            const items = await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, input.documentId)).orderBy(inspectionItems.order);
            
            const dataFormatada = inspection.inspectedAt ? format(new Date(inspection.inspectedAt), "dd/MM/yyyy", { locale: ptBR }) : format(new Date(inspection.createdAt), "dd/MM/yyyy", { locale: ptBR });
            const local = obra?.address ? `${obra.address}${obra?.city ? " — " + obra.city : ""}${obra?.state ? "/" + obra.state : ""}` : (inspection as any).location || company?.address || "";
            
            const itens = items.map((item: any) => ({
              titulo: item.title || "Ocorrência",
              status: item.status || "pendente",
              descricao: item.situacao || item.observacoes || "—",
              plano_acao: item.planoAcao || "A definir.",
              prazo: item.resolvedAt ? format(new Date(item.resolvedAt), "dd/MM/yyyy", { locale: ptBR }) : undefined,
              imagens: Array.isArray(item.mediaUrls) ? item.mediaUrls.map((url: string) => ({ url })) : [],
            }));
            
            const { generateTechnicalReportPdf } = await import("./pdfTemplateEngine");
            pdfBuffer = await generateTechnicalReportPdf({
              empresa: company?.name || "—",
              empreendimento: inspection.title,
              local,
              data: dataFormatada,
              observacoes: inspection.description || undefined,
              logoUrl: company?.logoUrl || undefined,
              itens,
            });
            fileName = `Inspecao_${input.documentId}.pdf`;
          } 
          else if (input.documentType === "checklist") {
            const rows = await db.select({ execution: checklistExecutions, template: checklistTemplates, company: companies, obra: obras, inspector: users })
              .from(checklistExecutions).innerJoin(checklistTemplates, eq(checklistExecutions.templateId, checklistTemplates.id))
              .innerJoin(companies, eq(checklistExecutions.companyId, companies.id))
              .leftJoin(obras, eq(checklistExecutions.projectId, obras.id))
              .leftJoin(users, eq(checklistExecutions.createdById, users.id))
              .where(eq(checklistExecutions.id, input.documentId)).limit(1);

            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist execution not found" });
            const record = rows[0];

            const items = await db.select({ execItem: checklistExecutionItems, tempItem: checklistTemplateItems })
              .from(checklistExecutionItems).innerJoin(checklistTemplateItems, eq(checklistExecutionItems.itemId, checklistTemplateItems.id))
              .where(eq(checklistExecutionItems.executionId, input.documentId)).orderBy(checklistTemplateItems.order);

            const itemsMapped = items.map((i: any) => ({
              name: i.tempItem.name, description: i.tempItem.description, norma: i.tempItem.norma,
              status: i.execItem.status, observation: i.execItem.observation, mediaUrls: i.execItem.mediaUrls || []
            }));

            const { generateChecklistPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateChecklistPdf({
              companyName: record.company.name, projectName: record.obra?.name || "N/A", date: record.execution.date,
              templateName: record.template.name, inspectorName: record.inspector?.name || "Inspetor EHS",
              score: record.execution.score, signatureUrl: record.execution.signatureUrl, items: itemsMapped,
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `Checklist_${input.documentId}.pdf`;
          }
          else if (input.documentType === "pgr") {
            const rows = await db.select({ pgr: pgr, company: companies, obra: obras })
              .from(pgr).leftJoin(companies, eq(pgr.companyId, companies.id)).leftJoin(obras, eq(pgr.obraId, obras.id))
              .where(eq(pgr.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "PGR not found" });
            const record = rows[0];

            let parsedContent: any = {};
            try { parsedContent = JSON.parse(record.pgr.content || "{}"); } catch (e) {}

            const { generateGroPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateGroPdf({
              title: record.pgr.title, companyName: record.company?.name || "N/A", obraName: record.obra?.name || "Matriz",
              version: record.pgr.version, validFrom: record.pgr.validFrom, riskMatrix: parsedContent.risks || [],
              actionPlan: parsedContent.actionPlan || [], responsibleName: parsedContent.responsibleName || "Engenheiro Responsável",
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `PGR_${input.documentId}.pdf`;
          }
          else if (input.documentType === "apr") {
            const rows = await db.select({ apr: apr, company: companies, obra: obras })
              .from(apr).leftJoin(companies, eq(apr.companyId, companies.id)).leftJoin(obras, eq(apr.obraId, obras.id))
              .where(eq(apr.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "APR not found" });
            const record = rows[0];

            const { generateAprPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateAprPdf({
              companyName: record.company?.name || "N/A", cnpj: record.company?.cnpj || "",
              obraName: record.obra?.name || record.apr.location || "N/A", activity: record.apr.activity,
              date: record.apr.date || record.apr.createdAt, responsibleName: (record.apr.content as any)?.responsibleName || "Técnico de Segurança",
              materials: (record.apr.content as any)?.materials || [], epis: (record.apr.content as any)?.epis || [],
              epcs: (record.apr.content as any)?.epcs || [], conditions: (record.apr.content as any)?.conditions || [],
              risks: (record.apr.content as any)?.risks || [],
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `APR_${input.documentId}.pdf`;
          }
          else if (input.documentType === "pt") {
            const rows = await db.select({ pt: pt, company: companies, obra: obras })
              .from(pt).leftJoin(companies, eq(pt.companyId, companies.id)).leftJoin(obras, eq(pt.obraId, obras.id))
              .where(eq(pt.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "PT not found" });
            const record = rows[0];
            let parsedContent: any = {};
            try { parsedContent = JSON.parse(record.pt.content || "{}"); } catch (e) {}

            const { generatePtPdf } = await import("./pdfTemplates");
            pdfBuffer = await generatePtPdf({
              ptNumber: record.pt.code || String(record.pt.id).padStart(4, "0"), companyName: record.company?.name || "N/A",
              obraName: record.obra?.name || "N/A", serviceDescription: record.pt.description || record.pt.title,
              startDate: parsedContent.startDate || record.pt.createdAt, endDate: parsedContent.endDate || record.pt.createdAt,
              potentialRisks: parsedContent.potentialRisks || [], protectiveMeasures: parsedContent.protectiveMeasures || [],
              team: parsedContent.team || [], revalidations: parsedContent.revalidations || [],
              issuerName: parsedContent.issuerName || "Emitente Oficial", supervisorName: parsedContent.supervisorName || "Supervisor Oficial",
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `PT_${input.documentId}.pdf`;
          }
          else if (input.documentType === "its") {
            const rows = await db.select({ its: its, company: companies, obra: obras, author: users })
              .from(its).leftJoin(companies, eq(its.companyId, companies.id)).leftJoin(obras, eq(its.obraId, obras.id))
              .leftJoin(users, eq(its.createdById, users.id)).where(eq(its.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "ITS not found" });
            const record = rows[0];

            const { generateItsPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateItsPdf({
              code: record.its.code || undefined, title: record.its.title, description: record.its.description || undefined,
              content: record.its.content || undefined, status: record.its.status || "ativo",
              companyName: record.company?.name || "N/A", obraName: record.obra?.name || undefined,
              obraAddress: record.obra?.address || undefined, createdAt: record.its.createdAt, authorName: (record.author as any)?.name || undefined,
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `ITS_${input.documentId}.pdf`;
          }
          else if (input.documentType === "treinamento") {
            const rows = await db.select({ training: trainings, company: companies, nr: nrs })
              .from(trainings).leftJoin(companies, eq(trainings.companyId, companies.id)).leftJoin(nrs, eq(trainings.nrId, nrs.id))
              .where(eq(trainings.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Treinamento not found" });
            const record = rows[0];
            const fakeParticipants = Array.from({length: 10}).map((_, i) => ({ name: "", role: "", document: "", signature: "" }));

            const { generateTrainingPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateTrainingPdf({
              nrTitle: record.nr ? `${record.nr.code} - ${record.nr.name}` : "Sem NR Base", topic: record.training.title,
              companyName: record.company?.name || "N/A", date: record.training.trainingDate || record.training.createdAt,
              instructorName: record.training.instructor || "Instrutor Indefinido", duration: "8",
              programmaticContent: record.training.description || "Treinamento admissional e periódico.",
              participants: fakeParticipants, instructorRegister: "000.000-0",
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `Treinamento_${input.documentId}.pdf`;
          }
          else if (input.documentType === "advertencia") {
            const rows = await db.select({ advertencia: advertencias, company: companies, user: users })
              .from(advertencias).leftJoin(companies, eq(advertencias.companyId, companies.id)).leftJoin(users, eq(advertencias.userId, users.id))
              .where(eq(advertencias.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Advertencia not found" });
            const record = rows[0];
            let witnessName = "";
            if (record.advertencia.witnessId) {
              const witness = await db.select().from(users).where(eq(users.id, record.advertencia.witnessId)).limit(1);
              if (witness.length > 0) witnessName = witness[0].name || "";
            }

            const { generateWarningPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateWarningPdf({
              warningNumber: input.documentId, type: record.advertencia.type, employeeName: record.user?.name || "Empregado N/A",
              role: record.user?.ehsRole || "N/A", companyName: record.company?.name || "N/A", reason: record.advertencia.reason,
              description: record.advertencia.description || "N/A", date: record.advertencia.date, location: record.company?.city || "Sede",
              issuerName: "Departamento de Segurança ou RH", witnessName,
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `Advertencia_${input.documentId}.pdf`;
          }
          else if (input.documentType === "epi") {
            const rows = await db.select({ epi: epiFicha, company: companies, user: users })
              .from(epiFicha).leftJoin(companies, eq(epiFicha.companyId, companies.id)).leftJoin(users, eq(epiFicha.userId, users.id))
              .where(eq(epiFicha.id, input.documentId)).limit(1);
            if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha EPI not found" });
            const record = rows[0];
            const deliveries = [{
              date: record.epi.deliveredAt || record.epi.createdAt, equipment: record.epi.epiName, ca: record.epi.ca || "-",
              quantity: record.epi.quantity || 1, signature: record.epi.signatureUrl || ""
            }];

            const { generateEpiPdf } = await import("./pdfTemplates");
            pdfBuffer = await generateEpiPdf({
              companyName: record.company?.name || "N/A", cnpj: record.company?.cnpj || "", employeeName: record.user?.name || "N/A",
              role: record.user?.ehsRole || "N/A", admissionDate: record.user?.createdAt || new Date(), deliveries,
              clientLogoUrl: record.company?.logoUrl || undefined
            });
            fileName = `EPI_${input.documentId}.pdf`;
          } else {
             throw new TRPCError({ code: "BAD_REQUEST", message: "Document type not implemented for direct share yet." });
          }
        } catch (err: any) {
          console.error("PDF Gen Error:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message || "Failed to generate PDF" });
        }

        if (!pdfBuffer) {
           throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to generate." });
        }

        // Must prefix with data uri so w-api can detect mime type or handle base64 correctly
        const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

        const { sendWhatsappDocument } = await import("./_core/wapi");
        const { default: nodemailer } = await import("nodemailer");

        // Send to all phones via whatsapp
        const allPhones = [...(input.phones || [])];
        if (input.phone) allPhones.push(input.phone);
        
        let successCount = 0;
        for (const p of allPhones) {
           const success = await sendWhatsappDocument(p, base64Pdf, "pdf", fileName, input.message);
           if (success) successCount++;
        }

        // Send to emails
        if (input.emails && input.emails.length > 0) {
           const transporter = nodemailer.createTransport({
             host: process.env.SMTP_HOST || "smtp.gmail.com",
             port: Number(process.env.SMTP_PORT) || 587,
             secure: false,
             auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
           });
           
           for (const e of input.emails) {
              try {
                await transporter.sendMail({
                  from: `"EHS Platform" <${process.env.SMTP_USER}>`,
                  to: e,
                  subject: `Documento Compartilhado: ${fileName}`,
                  text: input.message || "Segue o documento anexo.",
                  attachments: [{ filename: fileName, content: pdfBuffer }]
                });
                successCount++;
              } catch (err) {
                console.error("Email API failed:", err);
              }
           }
        }

        if (successCount === 0 && (allPhones.length > 0 || (input.emails && input.emails.length > 0))) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar documento." });
        }
        return { success: true, count: successCount };
      }),
  }),
});

export type AppRouter = typeof appRouter;
