const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Ensure upload directories exist
const dirs = {
  photos: path.join(process.cwd(), "uploads", "invitations", "photos"),
  music: path.join(process.cwd(), "uploads", "invitations", "music"),
  couple: path.join(process.cwd(), "uploads", "invitations", "couple"),
};

for (const dir of Object.values(dirs)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeStorage(dest) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
}

const imageFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Hanya JPG, PNG, dan WebP yang diizinkan"));
};

const audioFilter = (req, file, cb) => {
  const allowed = [".mp3", ".ogg", ".wav", ".m4a"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Hanya MP3, OGG, WAV, dan M4A yang diizinkan"));
};

const uploadPhoto = multer({
  storage: makeStorage(dirs.photos),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per photo
  fileFilter: imageFilter,
});

const uploadCouple = multer({
  storage: makeStorage(dirs.couple),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadMusic = multer({
  storage: makeStorage(dirs.music),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB for music
  fileFilter: audioFilter,
});

// POST /api/upload-invitation/photo — upload single gallery photo
router.post("/photo", authenticate, requireAdmin, (req, res) => {
  uploadPhoto.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File terlalu besar. Maksimal 5MB." });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/invitations/photos/${req.file.filename}` });
  });
});

// POST /api/upload-invitation/photos — upload multiple gallery photos
router.post("/photos", authenticate, requireAdmin, (req, res) => {
  uploadPhoto.array("files", 20)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File terlalu besar. Maksimal 5MB per foto." });
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    const urls = req.files.map((f) => `/uploads/invitations/photos/${f.filename}`);
    res.json({ urls });
  });
});

// POST /api/upload-invitation/couple — upload groom/bride photo
router.post("/couple", authenticate, requireAdmin, (req, res) => {
  uploadCouple.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File terlalu besar. Maksimal 5MB." });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/invitations/couple/${req.file.filename}` });
  });
});

// POST /api/upload-invitation/music — upload music file
router.post("/music", authenticate, requireAdmin, (req, res) => {
  uploadMusic.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File terlalu besar. Maksimal 15MB." });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/invitations/music/${req.file.filename}` });
  });
});

// DELETE /api/upload-invitation/file — delete a file by URL path
router.delete("/file", authenticate, requireAdmin, (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith("/uploads/invitations/")) {
    return res.status(400).json({ error: "Invalid file URL" });
  }

  const filePath = path.join(process.cwd(), url);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

module.exports = router;
