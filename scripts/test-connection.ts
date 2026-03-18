import "dotenv/config";
import postgres from "postgres";
import dnspromises from "dns/promises";
import { URL } from "url";

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;

  console.log("--- Database Connectivity Diagnostic ---");
  
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL is not defined in environment variables.");
    process.exit(1);
  }

  try {
    const parsedUrl = new URL(dbUrl);
    const hostname = parsedUrl.hostname;
    const port = parsedUrl.port || "5432";

    console.log(`1. Target Host: ${hostname}`);
    console.log(`2. Target Port: ${port}`);

    console.log(`3. Attempting DNS Resolution for ${hostname}...`);
    try {
      const addresses = await dnspromises.lookup(hostname);
      console.log(`   SUCCESS: Host resolved to IP: ${addresses.address}`);
    } catch (dnsErr: any) {
      console.error(`   FAILED: DNS lookup failed for ${hostname}.`);
      console.error(`   Reason: ${dnsErr.message} (${dnsErr.code})`);
      console.log("\nTIP: This usually means the hostname is incorrect or your server's DNS cannot reach Supabase.");
      console.log("Check if there are any typos or trailing spaces in your DATABASE_URL.");
      process.exit(1);
    }

    console.log(`4. Attempting Database Connection...`);
    const sql = postgres(dbUrl, { connect_timeout: 10 });
    
    try {
      const result = await sql`SELECT 1 as connected`;
      if (result && result.length > 0) {
        console.log(`   SUCCESS: Connected to the database successfully!`);
      }
    } catch (connErr: any) {
      console.error(`   FAILED: Connection attempt failed.`);
      console.error(`   Reason: ${connErr.message}`);
      console.log("\nTIP: If DNS worked but connection failed, check your database password and if your IP/Server is allowed in Supabase.");
    } finally {
      await sql.end();
    }

  } catch (err: any) {
    console.error(`ERROR: Invalid DATABASE_URL format.`);
    console.error(err.message);
    process.exit(1);
  }
}

testConnection();
