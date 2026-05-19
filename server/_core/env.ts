export const ENV = {
  appId: process.env.VITE_APP_ID || "app_local",
  cookieSecret: process.env.JWT_SECRET || "super_secret_fallback_key_for_testing_only",
  databaseUrl: process.env.DATABASE_URL || "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "http://localhost:5000",
  ownerOpenId: process.env.OWNER_OPEN_ID || "owner_id",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || "",
};
