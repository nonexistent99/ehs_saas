const isProduction = process.env.NODE_ENV === "production";
const cookieSecret = process.env.JWT_SECRET || (isProduction ? "" : "dev_only_jwt_secret_change_me");

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production");
}

export const ENV = {
  appId: process.env.VITE_APP_ID || "app_local",
  cookieSecret,
  databaseUrl: process.env.DATABASE_URL || "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "http://localhost:5000",
  ownerOpenId: process.env.OWNER_OPEN_ID || "owner_id",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || "",
};
