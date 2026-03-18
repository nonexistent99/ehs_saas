import express from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router = express.Router();

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer in-memory storage (we process it with sharp before saving)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB size limit
});

// Single image upload endpoint
router.post("/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    
    // Generate a unique filename
    const filename = `${randomUUID()}.jpeg`;
    const outputPath = path.join(UPLOADS_DIR, filename);

    // Apply Sharp compression
    // Convert everything to JPEG, resize max width/height to 1200px maintaining aspect ratio
    await sharp(fileBuffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: sharp.fit.inside,
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Return the public URL
    const url = `/uploads/${filename}`;
    res.status(200).json({ url, success: true });
    
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process and save image" });
  }
});

// Multiple image upload endpoint (Optional utility)
router.post("/images", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const urls: string[] = [];

    for (const file of req.files) {
      const filename = `${randomUUID()}.jpeg`;
      const outputPath = path.join(UPLOADS_DIR, filename);

      await sharp(file.buffer)
        .resize({ width: 1200, height: 1200, fit: sharp.fit.inside, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      urls.push(`/uploads/${filename}`);
    }

    res.status(200).json({ urls, success: true });
  } catch (error) {
    console.error("Multi-upload error:", error);
    res.status(500).json({ error: "Failed to process images" });
  }
});

export const uploadRouter = router;
