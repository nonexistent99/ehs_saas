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
    // adm_ehs bypasses company checks
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (ctx.user.ehsRole === "adm_ehs") return next();
    
    // Check if input has companyId and if it's authorized
    const companyId = (input as any)?.companyId;
    if (companyId && !ctx.authorizedCompanyIds.includes(companyId)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Acesso a esta empresa não autorizado para seu perfil" 
      });
    }
    return next();
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
