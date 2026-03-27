const express = require("express");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Delete uploaded file if it's a local upload path
function deleteFile(url) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), url);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

// Cleanup all uploaded files for an invitation
function cleanupInvitationFiles(inv) {
  if (inv.groomPhoto) deleteFile(inv.groomPhoto);
  if (inv.bridePhoto) deleteFile(inv.bridePhoto);
  if (inv.musicUrl) deleteFile(inv.musicUrl);
  const photos = Array.isArray(inv.photos) ? inv.photos : [];
  for (const url of photos) deleteFile(url);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatInvitation(inv, guestReceptions) {
  const events = [];
  if (inv.akad) {
    events.push({ ...inv.akad, type: "akad", icon: "akad" });
  }

  const receptions = Array.isArray(inv.receptions) ? inv.receptions : [];
  if (guestReceptions) {
    const codes = guestReceptions.map((r) => r.toLowerCase());
    for (const r of receptions) {
      if (r.code && codes.includes(r.code.toLowerCase())) {
        events.push({ ...r, type: "reception", icon: "reception" });
      }
    }
  } else {
    for (const r of receptions) {
      events.push({ ...r, type: "reception", icon: "reception" });
    }
  }

  return {
    slug: inv.slug,
    theme: inv.theme,
    customColors: inv.customColors ?? undefined,
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
    events,
    photos: inv.photos,
    banks: inv.banks,
    musicUrl: inv.musicUrl ?? undefined,
    rsvpEnabled: inv.rsvpEnabled,
    wishesEnabled: inv.wishesEnabled,
  };
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const nameIdx = headers.indexOf("nama_tamu");
  const slugIdx = headers.indexOf("slug");
  const receptionIdx = headers.indexOf("resepsi");

  if (nameIdx === -1 || slugIdx === -1 || receptionIdx === -1) {
    throw new Error("CSV harus memiliki kolom: nama_tamu, slug, resepsi");
  }

  const guests = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    const name = cols[nameIdx]?.replace(/^"|"$/g, "").trim();
    const slug = cols[slugIdx]?.replace(/^"|"$/g, "").trim();
    const receptions = cols[receptionIdx]
      ?.replace(/^"|"$/g, "")
      .split("|")
      .map((r) => r.trim())
      .filter(Boolean);

    if (name && slug && receptions && receptions.length > 0) {
      guests.push({ name, slug, receptions });
    }
  }
  return guests;
}

// ── ADMIN ENDPOINTS (defined first to avoid /:slug catching admin paths) ──

// GET /api/invitations — list all invitations (admin)
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, theme: true, expiredAt: true, isActive: true,
        groomNickname: true, brideNickname: true, createdAt: true,
        customColors: true,
        _count: { select: { rsvps: true, guests: true } },
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
      slug, theme, customColors, expiredAt, openingText,
      groom, bride, akad, receptions, photos, banks,
      musicUrl, rsvpEnabled, wishesEnabled,
    } = req.body;

    if (!slug || !theme || !expiredAt || !groom || !bride) {
      return res.status(400).json({ error: "slug, theme, expiredAt, groom, bride required" });
    }

    const inv = await prisma.invitation.create({
      data: {
        slug: String(slug).toLowerCase().replace(/\s+/g, "-").trim(),
        theme: String(theme),
        customColors: customColors ?? null,
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
        akad: akad ?? null,
        receptions: receptions ?? [],
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

// GET /api/invitations/:id/detail — get full invitation detail for admin
router.get("/:id/detail", authenticate, requireAdmin, async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { id: req.params.id },
    });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });
    res.json(inv);
  } catch (err) {
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

// GET /api/invitations/:id/guests — list guests for an invitation (admin)
router.get("/:id/guests", authenticate, requireAdmin, async (req, res) => {
  try {
    const guests = await prisma.guest.findMany({
      where: { invitationId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/invitations/:id/guests/csv — upload guests via CSV (admin)
router.post("/:id/guests/csv", authenticate, requireAdmin, async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { id: req.params.id },
    });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });

    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: "csv field required" });

    let parsed;
    try {
      parsed = parseCSV(csv);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    if (parsed.length === 0) {
      return res.status(400).json({ error: "CSV tidak berisi data tamu yang valid" });
    }

    const invalidSlugs = parsed.filter((g) => g.slug !== inv.slug);
    if (invalidSlugs.length > 0) {
      return res.status(400).json({
        error: `Slug tidak sesuai. Harusnya "${inv.slug}", ditemukan: ${[...new Set(invalidSlugs.map((g) => g.slug))].join(", ")}`,
      });
    }

    const validCodes = (Array.isArray(inv.receptions) ? inv.receptions : []).map((r) => r.code?.toLowerCase());
    for (const g of parsed) {
      for (const r of g.receptions) {
        if (!validCodes.includes(r.toLowerCase())) {
          return res.status(400).json({
            error: `Kode resepsi "${r}" tidak ditemukan. Kode yang tersedia: ${validCodes.join(", ")}`,
          });
        }
      }
    }

    const created = await prisma.guest.createMany({
      data: parsed.map((g) => ({
        invitationId: inv.id,
        name: g.name,
        receptions: g.receptions,
      })),
    });

    res.status(201).json({ success: true, count: created.count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/invitations/:id/guests — add single guest (admin)
router.post("/:id/guests", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, receptions } = req.body;
    if (!name || !receptions || !Array.isArray(receptions)) {
      return res.status(400).json({ error: "name and receptions[] required" });
    }

    const guest = await prisma.guest.create({
      data: {
        invitationId: req.params.id,
        name: String(name).trim(),
        receptions,
      },
    });
    res.status(201).json({ success: true, id: guest.id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/invitations/:id/guests/:guestId — delete guest (admin)
router.delete("/:id/guests/:guestId", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.guest.delete({ where: { id: req.params.guestId } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Guest not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/invitations/:id/guests — delete all guests for invitation (admin)
router.delete("/:id/guests", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await prisma.guest.deleteMany({
      where: { invitationId: req.params.id },
    });
    res.json({ success: true, count: result.count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/invitations/:id — update invitation (admin)
router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      theme, customColors, expiredAt, openingText,
      groom, bride, akad, receptions, photos, banks,
      musicUrl, rsvpEnabled, wishesEnabled, isActive,
    } = req.body;

    const data = {};
    if (theme) data.theme = theme;
    if (customColors !== undefined) data.customColors = customColors;
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
    if (akad !== undefined) data.akad = akad;
    if (receptions) data.receptions = receptions;
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

// DELETE /api/invitations/:id — delete invitation + cleanup files (admin)
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });

    await prisma.invitation.delete({ where: { id: req.params.id } });
    cleanupInvitationFiles(inv);

    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Invitation not found" });
    res.status(500).json({ error: "Server error" });
  }
});

// ── PUBLIC ENDPOINTS (defined last so /:slug doesn't catch admin routes) ──

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

// GET /api/invitations/:slug — get invitation by slug (public)
// MUST be last — /:slug catches any single-segment path
router.get("/:slug", async (req, res) => {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!inv) return res.status(404).json({ error: "Invitation not found" });

    let guestReceptions = null;
    const guestName = req.query.to;
    if (guestName) {
      const decoded = decodeURIComponent(String(guestName)).trim();
      const guest = await prisma.guest.findFirst({
        where: {
          invitationId: inv.id,
          name: { equals: decoded, mode: "insensitive" },
        },
      });
      if (guest) {
        guestReceptions = guest.receptions;
      }
    }

    res.json(formatInvitation(inv, guestReceptions));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
