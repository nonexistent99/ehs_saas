import "dotenv/config";
import { resolveImageToDataUrl } from "../server/pdfTemplateEngine";
import { getDb } from "../server/db";
import { inspectionItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if(!db) return;
  const items = await db.select().from(inspectionItems);
  console.log("Found items:", items.length);
  for (const item of items) {
    if (item.mediaUrls && item.mediaUrls.length > 0) {
      for (const url of item.mediaUrls) {
        console.log("Checking URL:", url);
        const resolved = await resolveImageToDataUrl(url);
        console.log("Resolved Base64 length:", resolved.length);
        console.log("Starts with:", resolved.substring(0, 30));
      }
    } else {
      console.log("Item has no images.");
    }
  }
  process.exit(0);
}
run();
