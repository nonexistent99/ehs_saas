import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const companyProcedure = t.procedure.use(requireUser).use(
  t.middleware(async (opts) => {
    const { ctx, next, input } = opts;
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const inputCompanyId = (input as any)?.companyId;

    // ADM EHS can access all companies; skip the extra company link query.
    if (ctx.user.ehsRole === "adm_ehs") {
      return next({
        ctx: {
          ...ctx,
          effectiveCompanyId: inputCompanyId,
        },
      });
    }

    const userId = ctx.user.id;
    const authorizedCompanyIds: number[] = ctx.authorizedCompanyIds.length
      ? ctx.authorizedCompanyIds
      : await ((ctx as any).__authorizedCompanyIdsPromise ??=
          import("../db").then(({ getUserLinkedCompanies }) =>
            getUserLinkedCompanies(userId)
          ));

    if (inputCompanyId) {
      if (!authorizedCompanyIds.includes(inputCompanyId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso a esta empresa nao autorizado para seu perfil",
        });
      }
      return next({
        ctx: {
          ...ctx,
          authorizedCompanyIds,
          effectiveCompanyId: inputCompanyId,
        },
      });
    }

    return next({
      ctx: {
        ...ctx,
        authorizedCompanyIds,
        effectiveCompanyId: authorizedCompanyIds,
      },
    });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user as any).role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
