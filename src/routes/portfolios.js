const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/portfolios — public
router.get("/", async (req, res) => {
  try {
    const { category, featured } = req.query;
    const where = {};
    if (category) where.category = category;
    if (featured === "true") where.isFeatured = true;

    const portfolios = await prisma.portfolio.findMany({
      where,
      orderBy: { order: "asc" },
    });
    res.json(portfolios);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/portfolios/:id — public
router.get("/:id", async (req, res) => {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
    });
    if (!portfolio) return res.status(404).json({ error: "Not found" });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/portfolios — admin only
router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, imageUrl, techStack, clientName, projectUrl, isFeatured, order } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description, and category required" });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        title,
        description,
        category,
        imageUrl: imageUrl || null,
        techStack: techStack || [],
        clientName: clientName || null,
        projectUrl: projectUrl || null,
        isFeatured: isFeatured || false,
        order: order || 0,
      },
    });
    res.status(201).json(portfolio);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/portfolios/:id — admin only
router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const portfolio = await prisma.portfolio.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(portfolio);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/portfolios/:id — admin only
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.portfolio.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
