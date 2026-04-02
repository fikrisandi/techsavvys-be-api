const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// POST /api/contacts — public (form submission)
router.post("/", async (req, res) => {
  try {
    const { name, email, whatsapp, service, budget, message } = req.body;
    if (!name || !email || !whatsapp || !service || !message) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    const contact = await prisma.contact.create({
      data: { name, email, whatsapp, service, budget: budget || null, message },
    });
    res.status(201).json({ message: "Message sent successfully", id: contact.id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/contacts — admin only
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/contacts/:id/read — admin only (mark as read)
router.patch("/:id/read", authenticate, requireAdmin, async (req, res) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(contact);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/contacts/:id — admin only
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
