const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Pastikan folder uploads ada
const uploadDir = path.join(process.cwd(), "uploads", "portfolios");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // max 2MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP allowed"));
    }
  },
});

// POST /api/upload — admin only
router.post("/", authenticate, requireAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File terlalu besar. Maksimal 2MB." });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imageUrl = `/uploads/portfolios/${req.file.filename}`;
    res.json({ imageUrl });
  });
});

module.exports = router;
