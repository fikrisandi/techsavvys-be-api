const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/testimonials — public (only active)
router.get("/", async (req, res) => {
  try {
    const { all } = req.query;
    const where = all === "true" ? {} : { isActive: true };

    const testimonials = await prisma.testimonial.findMany({
      where,
      orderBy: { order: "asc" },
    });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/testimonials/:id — public
router.get("/:id", async (req, res) => {
  try {
    const testimonial = await prisma.testimonial.findUnique({
      where: { id: req.params.id },
    });
    if (!testimonial) return res.status(404).json({ error: "Not found" });
    res.json(testimonial);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/testimonials — admin only
router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, role, content, rating, avatarUrl, isActive, order } = req.body;
    if (!name || !role || !content) {
      return res.status(400).json({ error: "Name, role, and content required" });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        role,
        content,
        rating: rating || null,
        avatarUrl: avatarUrl || null,
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
      },
    });
    res.status(201).json(testimonial);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/testimonials/:id — admin only
router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(testimonial);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/testimonials/:id — admin only
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
