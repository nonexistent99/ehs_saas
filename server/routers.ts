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
        return getUserById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Nome obrigatório"),
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        ehsRole: z.enum(["adm_ehs", "cliente", "tecnico", "apoio"]).default("tecnico"),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
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
        return createUserWithPassword({
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
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdm(ctx.user?.ehsRole);
        const { id, password, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (password) {
          updateData.passwordHash = await bcrypt.hash(password, 10);
        }
        return updateUser(id, updateData);
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
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        return createCompany(input);
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
        logoUrl: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireAdmOrTecnico(ctx.user?.ehsRole);
        const { id, ...rest } = input;
        return updateCompany(id, rest);
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
      .query(async ({ input }) => {
        return getCompanyObras(input.companyId);
      }),
    createObra: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        address: z.string().optional(),
        cep: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
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
});

export type AppRouter = typeof appRouter;
