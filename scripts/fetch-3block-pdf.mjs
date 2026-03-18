import fs from "fs";

async function run() {
  console.log("Fetching PDF from new engine...");
  try {
    const res = await fetch("http://localhost:3000/api/test/pdf-engine");
    if (!res.ok) {
      console.error("Failed:", await res.text());
      return;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync("test-3block.pdf", buffer);
    console.log("Success! Saved to test-3block.pdf");
  } catch (e) {
    console.error("Error fetching pdf:", e);
  }
}
run();
