require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

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
];
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];
const allowedOrigins = [...new Set([...productionOrigins, ...envOrigins])];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // Handle preflight requests
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
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
