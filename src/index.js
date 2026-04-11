require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const portfolioRoutes = require("./routes/portfolios");
const testimonialRoutes = require("./routes/testimonials");
const contactRoutes = require("./routes/contacts");
const uploadRoutes = require("./routes/upload");
const uploadInvitationRoutes = require("./routes/upload-invitation");
const invitationRoutes = require("./routes/invitations");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
// Production origins always allowed regardless of env var
const productionOrigins = [
  'https://techsavvys-official.com',
  'https://www.techsavvys-official.com',
  'https://invitation.techsavvys-official.com',
];
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];
const allowedOrigins = [...new Set([...productionOrigins, ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow Vercel preview/production URLs
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Global rate limit — 100 requests per 15 menit per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

// API Key protection — tolak request tanpa key yang valid
const API_KEY = process.env.API_KEY;
if (API_KEY) {
  app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();
    const key = req.headers["x-api-key"];
    if (key !== API_KEY) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
}

// Auth rate limit — ketat untuk cegah brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/upload-invitation", uploadInvitationRoutes);
app.use("/api/invitations", invitationRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
