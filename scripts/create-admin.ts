import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import * as bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

async function createAdmin() {
  console.log("Creating admin user...");
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    process.exit(1);
  }

  const email = "admin@ehs.com";
  const password = "adminpassword123";
  const passwordHash = await bcrypt.hash(password, 10);
  const openId = `ehs_${nanoid(16)}`;


  // email is not strictly unique constraint in our schema by default (only openId). 
  // Let's just select by email.
  const { eq } = await import("drizzle-orm");
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    console.log("Admin user already exists. Updating password and permissions.");
    await db.update(users).set({
      passwordHash,
      role: "admin",
      ehsRole: "adm_ehs",
      isActive: true,
    }).where(eq(users.id, existing[0].id));
    console.log(`Admin user updated. Email: ${email} | Password: ${password}`);
  } else {
    await db.insert(users).values({
      openId,
      name: "Administrador Principal",
      email,
      passwordHash,
      role: "admin",
      ehsRole: "adm_ehs",
      loginMethod: "email",
      isActive: true,
    });
    console.log(`Admin user created. Email: ${email} | Password: ${password}`);
  }
  process.exit(0);
}

createAdmin().catch(console.error);
