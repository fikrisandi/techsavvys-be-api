const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────

function formatInvitation(inv) {
  return {
    slug: inv.slug,
    theme: inv.theme,
    expiredAt: inv.expiredAt.toISOString(),
    openingText: inv.openingText ?? undefined,
    groom: {
      nickname: inv.groomNickname,
      fullName: inv.groomFullName,
      parents: inv.groomParents,
      photo: inv.groomPhoto ?? undefined,
    },
    bride: {
      nickname: inv.brideNickname,
      fullName: inv.brideFullName,
      parents: inv.brideParents,
      photo: inv.bridePhoto ?? undefined,
    },
    events: inv.events,
    photos: inv.photos,
    banks: inv.banks,
    musicUrl: inv.musicUrl ?? undefined,
    rsvpEnabled: inv.rsvpEnabled,
    wishesEnabled: inv.wishesEnabled,
  };
}

// ── PUBLIC ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/invitations/:slug — get invitation by slug (public)
router.get("/:slug", async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });
    res.json(formatInvitation(inv));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/invitations/:slug/rsvp — submit RSVP (public)
router.post("/:slug/rsvp", async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });
    if (!inv.rsvpEnabled) return res.status(403).json({ error: "RSVP disabled" });
    if (new Date(inv.expiredAt) < new Date()) {
      return res.status(403).json({ error: "Invitation expired" });
    }

    const { name, attendance, guests, message } = req.body;
    if (!name || !attendance) {
      return res.status(400).json({ error: "name and attendance required" });
    }

    const rsvp = await prisma.rsvp.create({
      data: {
        invitationId: inv.id,
        name: String(name).trim(),
        attendance: String(attendance),
        guests: Number(guests) || 1,
        message: message ? String(message).trim() : null,
      },
    });
    res.status(201).json({ success: true, id: rsvp.id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/invitations/:slug/wishes — get wishes list (public)
router.get("/:slug/wishes", async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });
    if (!inv.wishesEnabled) return res.json([]);

    const rsvps = await prisma.rsvp.findMany({
      where: { invitationId: inv.id, message: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { name: true, message: true, attendance: true, createdAt: true },
    });

    const wishes = rsvps.map((r) => ({
      name: r.name,
      msg: r.message,
      badge: r.attendance,
      date: r.createdAt.toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      }),
    }));
    res.json(wishes);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/invitations — list all invitations (admin)
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, theme: true, expiredAt: true, isActive: true,
        groomNickname: true, brideNickname: true, createdAt: true,
        _count: { select: { rsvps: true } },
      },
    });
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/invitations — create invitation (admin)
router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      slug, theme, expiredAt, openingText,
      groom, bride, events, photos, banks,
      musicUrl, rsvpEnabled, wishesEnabled,
    } = req.body;

    if (!slug || !theme || !expiredAt || !groom || !bride) {
      return res.status(400).json({ error: "slug, theme, expiredAt, groom, bride required" });
    }

    const inv = await prisma.invitation.create({
      data: {
        slug: String(slug).toLowerCase().trim(),
        theme: String(theme),
        expiredAt: new Date(expiredAt),
        openingText: openingText ?? null,
        groomNickname: groom.nickname,
        groomFullName: groom.fullName,
        groomParents: groom.parents,
        groomPhoto: groom.photo ?? null,
        brideNickname: bride.nickname,
        brideFullName: bride.fullName,
        brideParents: bride.parents,
        bridePhoto: bride.photo ?? null,
        events: events ?? [],
        photos: photos ?? [],
        banks: banks ?? [],
        musicUrl: musicUrl ?? null,
        rsvpEnabled: rsvpEnabled ?? true,
        wishesEnabled: wishesEnabled ?? true,
      },
    });
    res.status(201).json({ success: true, id: inv.id, slug: inv.slug });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/invitations/:id — update invitation (admin)
router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      theme, expiredAt, openingText,
      groom, bride, events, photos, banks,
      musicUrl, rsvpEnabled, wishesEnabled, isActive,
    } = req.body;

    const data = {};
    if (theme) data.theme = theme;
    if (expiredAt) data.expiredAt = new Date(expiredAt);
    if (openingText !== undefined) data.openingText = openingText;
    if (groom) {
      if (groom.nickname) data.groomNickname = groom.nickname;
      if (groom.fullName) data.groomFullName = groom.fullName;
      if (groom.parents) data.groomParents = groom.parents;
      if (groom.photo !== undefined) data.groomPhoto = groom.photo;
    }
    if (bride) {
      if (bride.nickname) data.brideNickname = bride.nickname;
      if (bride.fullName) data.brideFullName = bride.fullName;
      if (bride.parents) data.brideParents = bride.parents;
      if (bride.photo !== undefined) data.bridePhoto = bride.photo;
    }
    if (events) data.events = events;
    if (photos) data.photos = photos;
    if (banks) data.banks = banks;
    if (musicUrl !== undefined) data.musicUrl = musicUrl;
    if (rsvpEnabled !== undefined) data.rsvpEnabled = rsvpEnabled;
    if (wishesEnabled !== undefined) data.wishesEnabled = wishesEnabled;
    if (isActive !== undefined) data.isActive = isActive;

    const inv = await prisma.invitation.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, id: inv.id });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Invitation not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/invitations/:id — delete invitation (admin)
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.invitation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Invitation not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/invitations/:id/rsvps — list RSVPs for an invitation (admin)
router.get("/:id/rsvps", authenticate, requireAdmin, async (req, res) => {
  try {
    const rsvps = await prisma.rsvp.findMany({
      where: { invitationId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(rsvps);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
