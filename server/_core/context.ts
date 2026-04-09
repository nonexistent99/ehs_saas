import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authorizedCompanyIds: number[];
  effectiveCompanyId?: number | number[];
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    console.log("[AuthDebug] Context created with user:", user?.openId);
  } catch (error) {
    if (error instanceof Error) {
      console.log("[AuthDebug] Context creation failed auth:", error.message);
    }
    // Authentication is optional for public procedures.
    user = null;
  }

  let authorizedCompanyIds: number[] = [];
  if (user) {
    const { getUserLinkedCompanies } = await import("../db");
    authorizedCompanyIds = await getUserLinkedCompanies(user.id);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    authorizedCompanyIds,
  };
}
