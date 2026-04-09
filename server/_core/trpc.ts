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
    
    // adm_ehs bypasses company checks and uses input if provided, else undefined (all)
    if (ctx.user.ehsRole === "adm_ehs") {
      return next({
        ctx: { 
          ...ctx, 
          effectiveCompanyId: inputCompanyId 
        }
      });
    }
    
    // For non-admins, if companyId is in input, validate it
    if (inputCompanyId) {
      if (!ctx.authorizedCompanyIds.includes(inputCompanyId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Acesso a esta empresa não autorizado para seu perfil" 
        });
      }
      return next({
        ctx: { 
          ...ctx, 
          effectiveCompanyId: inputCompanyId 
        }
      });
    }
    
    // If companyId is missing, default to all authorized companies
    return next({
      ctx: { 
        ...ctx, 
        effectiveCompanyId: ctx.authorizedCompanyIds 
      }
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
