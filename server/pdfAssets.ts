import fs from "fs";
import path from "path";

export const TACT_FOOTER_LOGO_PATH = path.join(process.cwd(), "public", "assets", "tact-logo.png");

let tactFooterLogoDataUrl: string | null = null;

export function getTactFooterLogoDataUrl(): string {
  if (tactFooterLogoDataUrl) return tactFooterLogoDataUrl;

  if (!fs.existsSync(TACT_FOOTER_LOGO_PATH)) {
    throw new Error(`Official TACT footer logo not found: ${TACT_FOOTER_LOGO_PATH}`);
  }

  const buffer = fs.readFileSync(TACT_FOOTER_LOGO_PATH);
  tactFooterLogoDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  return tactFooterLogoDataUrl;
}
