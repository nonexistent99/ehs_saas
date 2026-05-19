import { createPT } from "../server/db";
import "dotenv/config";

async function test() {
  try {
    const id = await createPT({
      companyId: 1, // Assuming company 1 exists
      title: "Test PT " + new Date().toISOString(),
      content: JSON.stringify({ test: true }),
      status: "ativo",
      createdById: 1, // Assuming user 1 exists
    });
    console.log("Successfully created PT with ID:", id);
    process.exit(0);
  } catch (error) {
    console.error("Failed to create PT:", error);
    process.exit(1);
  }
}

test();
