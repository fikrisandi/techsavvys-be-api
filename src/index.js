require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const portfolioRoutes = require("./routes/portfolios");
const testimonialRoutes = require("./routes/testimonials");
const contactRoutes = require("./routes/contacts");
const uploadRoutes = require("./routes/upload");
const invitationRoutes = require("./routes/invitations");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: [
    "https://techsavvys.com",
    "https://www.techsavvys.com",
    "https://techsavvys-official.com",
    "https://www.techsavvys-official.com",
    "https://invitation.techsavvys.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/invitations", invitationRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
