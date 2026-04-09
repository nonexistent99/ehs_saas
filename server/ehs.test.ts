import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserById: vi.fn().mockResolvedValue(null),
  createUser: vi.fn().mockResolvedValue(1),
  createUserWithPassword: vi.fn().mockResolvedValue({ id: 1, success: true }),
  updateUser: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  getAllCompanies: vi.fn().mockResolvedValue([]),
  getCompanyById: vi.fn().mockResolvedValue(null),
  createCompany: vi.fn().mockResolvedValue(1),
  updateCompany: vi.fn().mockResolvedValue(undefined),
  deleteCompany: vi.fn().mockResolvedValue(undefined),
  getAllNRs: vi.fn().mockResolvedValue([]),
  getAllCheckLists: vi.fn().mockResolvedValue([]),
  createCheckList: vi.fn().mockResolvedValue(1),
  createCheckListItem: vi.fn().mockResolvedValue(1),
  updateCheckListItem: vi.fn().mockResolvedValue(undefined),
  getCheckListById: vi.fn().mockResolvedValue(null),
  getCheckListItems: vi.fn().mockResolvedValue([]),
  deleteCheckList: vi.fn().mockResolvedValue(undefined),
  getAllInspections: vi.fn().mockResolvedValue([]),
  getInspectionById: vi.fn().mockResolvedValue(null),
  createInspection: vi.fn().mockResolvedValue(1),
  updateInspection: vi.fn().mockResolvedValue(undefined),
  deleteInspection: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalInspections: 5,
    pending: 2,
    attention: 1,
    resolved: 2,
    notStarted: 0,
    totalUsers: 3,
    totalNrs: 16,
    sentNotifications: 10,
    readNotifications: 8,
    recentInspections: [],
  }),
  getNotifications: vi.fn().mockResolvedValue([]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  createNotification: vi.fn().mockResolvedValue(1),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  getChatMessages: vi.fn().mockResolvedValue([]),
  createChatMessage: vi.fn().mockResolvedValue(1),
  markMessagesRead: vi.fn().mockResolvedValue(undefined),
  getAllPGR: vi.fn().mockResolvedValue([]),
  createPGR: vi.fn().mockResolvedValue(1),
  updatePGR: vi.fn().mockResolvedValue(undefined),
  getAllITS: vi.fn().mockResolvedValue([]),
  createITS: vi.fn().mockResolvedValue(1),
  getAllPT: vi.fn().mockResolvedValue([]),
  createPT: vi.fn().mockResolvedValue(1),
  getAllTrainings: vi.fn().mockResolvedValue([]),
  createTraining: vi.fn().mockResolvedValue(1),
  updateTraining: vi.fn().mockResolvedValue(undefined),
  getAllAPR: vi.fn().mockResolvedValue([]),
  createAPR: vi.fn().mockResolvedValue(1),
  getAllEpiFicha: vi.fn().mockResolvedValue([]),
  createEpiFicha: vi.fn().mockResolvedValue(1),
  getAllAdvertencias: vi.fn().mockResolvedValue([]),
  createAdvertencia: vi.fn().mockResolvedValue(1),
  getAllTactdriver: vi.fn().mockResolvedValue([]),
  createTactdriver: vi.fn().mockResolvedValue(1),
  updateTactdriver: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
}));

// ─── Context factory ──────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@ehs.com",
      loginMethod: "manus",
      role: "admin",
      ehsRole: "adm_ehs",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@ehs.com");
  });

  it("logout clears session cookie", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

// ─── Dashboard tests ──────────────────────────────────────────────────────────
describe("dashboard", () => {
  it("stats returns aggregated metrics", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalInspections).toBe("number");
    expect(typeof stats.pending).toBe("number");
    expect(typeof stats.resolved).toBe("number");
    expect(typeof stats.totalUsers).toBe("number");
    expect(typeof stats.totalNrs).toBe("number");
    expect(typeof stats.sentNotifications).toBe("number");
    expect(typeof stats.readNotifications).toBe("number");
    expect(Array.isArray(stats.recentInspections)).toBe(true);
  });
});

// ─── Users tests ──────────────────────────────────────────────────────────────
describe("users", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns success (adm_ehs role)", async () => {
    const ctx = makeCtx();
    // Simulate adm_ehs role
    (ctx.user as any).ehsRole = "adm_ehs";
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.create({
      name: "João Silva",
      email: "joao@ehs.com",
      ehsRole: "tecnico",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Companies tests ──────────────────────────────────────────────────────────
describe("companies", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.companies.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns success (tecnico role)", async () => {
    const ctx = makeCtx();
    (ctx.user as any).ehsRole = "tecnico";
    const caller = appRouter.createCaller(ctx);
    const result = await caller.companies.create({
      name: "Empresa Teste LTDA",
      cnpj: "12.345.678/0001-90",
    });
    expect(result.success).toBe(true);
  });
});

// ─── NRs tests ────────────────────────────────────────────────────────────────
describe("nrs", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nrs.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── CheckLists tests ─────────────────────────────────────────────────────────
describe("checkLists", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkLists.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns id", async () => {
    const ctx = makeCtx();
    (ctx.user as any).ehsRole = "tecnico";
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkLists.create({
      nrId: 1,
      title: "Check List NR-35",
      items: [{ description: "Verificar EPI" }],
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });
});

// ─── Inspections tests ────────────────────────────────────────────────────────
describe("inspections", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inspections.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns id", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inspections.create({
      companyId: 1,
      title: "Inspeção de Segurança - Área A",
      status: "pendente",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });
});

// ─── Notifications tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("unreadCount returns number", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
  });

  it("send creates notification", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.send({
      type: "email",
      title: "Alerta de Segurança",
      message: "Verificar EPI na área B",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Chat tests ───────────────────────────────────────────────────────────────
describe("chat", () => {
  it("messages returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.messages({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("send creates message", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.send({ message: "Olá equipe!" });
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });
});

// ─── PGR tests ────────────────────────────────────────────────────────────────
describe("pgr", () => {
  it("list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pgr.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Security modules tests ───────────────────────────────────────────────────
describe("security modules", () => {
  it("its.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.its.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("pt.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pt.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("apr.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.apr.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("epiFicha.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.epiFicha.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("advertencias.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.advertencias.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("tactdriver.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tactdriver.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("trainings.list returns array", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trainings.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
