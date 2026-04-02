const request = require("supertest");
const jwt = require("jsonwebtoken");

// Mock prisma before requiring app
jest.mock("../lib/prisma", () => require("../__mocks__/prisma"));

// Set env vars before requiring app
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.INVITATION_BASE_URL = "https://invitation.techsavvys-official.com";

const app = require("../index");
const prisma = require("../lib/prisma");

// Helper: generate admin JWT token
function adminToken() {
  return jwt.sign(
    { id: "admin-uuid", email: "admin@test.com", role: "ADMIN" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

// Helper: generate non-admin JWT token
function userToken() {
  return jwt.sign(
    { id: "user-uuid", email: "user@test.com", role: "USER" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

// Sample invitation data
const sampleInvitation = {
  id: "inv-uuid-1",
  slug: "reza-aulia",
  theme: "sakura-bloom",
  customColors: null,
  expiredAt: new Date("2027-12-31"),
  openingText: "Bismillahirrahmanirrahim",
  groomNickname: "Reza",
  groomFullName: "Reza Pratama",
  groomParents: "Bapak Ahmad & Ibu Siti",
  groomPhoto: null,
  brideNickname: "Aulia",
  brideFullName: "Aulia Putri",
  brideParents: "Bapak Budi & Ibu Ani",
  bridePhoto: null,
  akad: {
    title: "Akad Nikah",
    date: "2027-06-15",
    startTime: "08:00",
    endTime: "10:00",
    venue: "Masjid Agung",
    address: "Jl. Raya No. 1",
    mapsUrl: "https://maps.google.com/example",
  },
  receptions: [
    {
      code: "resepsi-1",
      title: "Resepsi",
      date: "2027-06-15",
      startTime: "11:00",
      endTime: "14:00",
      venue: "Hotel Grand",
      address: "Jl. Merdeka No. 10",
      mapsUrl: "https://maps.google.com/example2",
    },
  ],
  photos: [],
  banks: [{ bank: "BCA", accountNumber: "1234567890", accountName: "Reza Pratama" }],
  musicUrl: null,
  rsvpEnabled: true,
  wishesEnabled: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/invitations (Create Invitation)", () => {
  const validPayload = {
    slug: "reza-aulia",
    theme: "sakura-bloom",
    expiredAt: "2027-12-31T00:00:00.000Z",
    groom: {
      nickname: "Reza",
      fullName: "Reza Pratama",
      parents: "Bapak Ahmad & Ibu Siti",
    },
    bride: {
      nickname: "Aulia",
      fullName: "Aulia Putri",
      parents: "Bapak Budi & Ibu Ani",
    },
    akad: {
      title: "Akad Nikah",
      date: "2027-06-15",
      startTime: "08:00",
      endTime: "10:00",
      venue: "Masjid Agung",
      address: "Jl. Raya No. 1",
    },
    receptions: [
      {
        code: "resepsi-1",
        title: "Resepsi",
        date: "2027-06-15",
        startTime: "11:00",
        endTime: "14:00",
        venue: "Hotel Grand",
        address: "Jl. Merdeka No. 10",
      },
    ],
    banks: [{ bank: "BCA", accountNumber: "1234567890", accountName: "Reza Pratama" }],
    rsvpEnabled: true,
    wishesEnabled: true,
  };

  test("should create invitation successfully with valid data", async () => {
    prisma.invitation.create.mockResolvedValue({
      id: "inv-uuid-1",
      slug: "reza-aulia",
    });

    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe("inv-uuid-1");
    expect(res.body.slug).toBe("reza-aulia");
    expect(res.body.link).toBe("https://invitation.techsavvys-official.com/reza-aulia");
    expect(prisma.invitation.create).toHaveBeenCalledTimes(1);
  });

  test("should normalize slug (lowercase, hyphens)", async () => {
    prisma.invitation.create.mockResolvedValue({
      id: "inv-uuid-2",
      slug: "reza-aulia",
    });

    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...validPayload, slug: "Reza Aulia" });

    expect(res.status).toBe(201);
    const createCall = prisma.invitation.create.mock.calls[0][0];
    expect(createCall.data.slug).toBe("reza-aulia");
  });

  test("should return 400 if required fields missing", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ slug: "test" }); // missing theme, expiredAt, groom, bride

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("should return 400 if groom missing", async () => {
    const { groom, ...noGroom } = validPayload;
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(noGroom);

    expect(res.status).toBe(400);
  });

  test("should return 400 if bride missing", async () => {
    const { bride, ...noBride } = validPayload;
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(noBride);

    expect(res.status).toBe(400);
  });

  test("should return 409 if slug already exists", async () => {
    prisma.invitation.create.mockRejectedValue({ code: "P2002" });

    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/slug already exists/i);
  });

  test("should return 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  test("should return 403 for non-admin user", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${userToken()}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  test("should create invitation with optional fields (customColors, openingText, photos, musicUrl)", async () => {
    const payloadWithOptionals = {
      ...validPayload,
      customColors: { primary: "#ff0000", accent: "#00ff00" },
      openingText: "Bismillahirrahmanirrahim",
      photos: ["/uploads/invitations/photos/img1.jpg"],
      musicUrl: "/uploads/invitations/music/song.mp3",
    };

    prisma.invitation.create.mockResolvedValue({
      id: "inv-uuid-3",
      slug: "reza-aulia",
    });

    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(payloadWithOptionals);

    expect(res.status).toBe(201);
    const createCall = prisma.invitation.create.mock.calls[0][0];
    expect(createCall.data.customColors).toEqual({ primary: "#ff0000", accent: "#00ff00" });
    expect(createCall.data.openingText).toBe("Bismillahirrahmanirrahim");
    expect(createCall.data.photos).toEqual(["/uploads/invitations/photos/img1.jpg"]);
    expect(createCall.data.musicUrl).toBe("/uploads/invitations/music/song.mp3");
  });

  test("should reject invalid customColors key", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...validPayload, customColors: { primary: "#ff0000", background: "#000" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/background.*tidak valid/i);
  });

  test("should reject invalid customColors hex value", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...validPayload, customColors: { primary: "red" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hex color/i);
  });

  test("should reject customColors as array", async () => {
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...validPayload, customColors: ["#ff0000"] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/object/i);
  });

  test("should accept partial customColors (only some fields)", async () => {
    prisma.invitation.create.mockResolvedValue({ id: "inv-partial", slug: "reza-aulia" });

    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...validPayload, customColors: { accent: "#D4A853" } });

    expect(res.status).toBe(201);
    const createCall = prisma.invitation.create.mock.calls[0][0];
    expect(createCall.data.customColors).toEqual({ accent: "#D4A853" });
  });

  test("should handle server error gracefully", async () => {
    prisma.invitation.create.mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Server error");
  });
});

describe("GET /api/invitations (List Invitations - Admin)", () => {
  test("should list all invitations with counts", async () => {
    prisma.invitation.findMany.mockResolvedValue([
      {
        id: "inv-1",
        slug: "reza-aulia",
        theme: "sakura-bloom",
        expiredAt: new Date("2027-12-31"),
        isActive: true,
        groomNickname: "Reza",
        brideNickname: "Aulia",
        createdAt: new Date(),
        customColors: null,
        _count: { rsvps: 5, guests: 10 },
      },
    ]);

    const res = await request(app)
      .get("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe("reza-aulia");
    expect(res.body[0].link).toBe("https://invitation.techsavvys-official.com/reza-aulia");
    expect(res.body[0]._count.rsvps).toBe(5);
    expect(res.body[0]._count.guests).toBe(10);
  });

  test("should return empty array when no invitations", async () => {
    prisma.invitation.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/invitations")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("should return 401 without auth", async () => {
    const res = await request(app).get("/api/invitations");
    expect(res.status).toBe(401);
  });

  test("should return 403 for non-admin", async () => {
    const res = await request(app)
      .get("/api/invitations")
      .set("Authorization", `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/invitations/:id/detail (Admin Detail)", () => {
  test("should return full invitation details", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const res = await request(app)
      .get("/api/invitations/inv-uuid-1/detail")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("reza-aulia");
    expect(res.body.groomNickname).toBe("Reza");
    expect(res.body.brideNickname).toBe("Aulia");
  });

  test("should return 404 if invitation not found", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/invitations/nonexistent-id/detail")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  test("should return 401 without auth", async () => {
    const res = await request(app).get("/api/invitations/inv-uuid-1/detail");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/invitations/:id (Update Invitation)", () => {
  test("should update invitation theme", async () => {
    prisma.invitation.update.mockResolvedValue({ id: "inv-uuid-1" });

    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ theme: "emerald-gold" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updateCall = prisma.invitation.update.mock.calls[0][0];
    expect(updateCall.data.theme).toBe("emerald-gold");
  });

  test("should update groom and bride info", async () => {
    prisma.invitation.update.mockResolvedValue({ id: "inv-uuid-1" });

    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        groom: { nickname: "Ahmad", fullName: "Ahmad Fauzi" },
        bride: { nickname: "Putri", fullName: "Putri Indah" },
      });

    expect(res.status).toBe(200);
    const updateCall = prisma.invitation.update.mock.calls[0][0];
    expect(updateCall.data.groomNickname).toBe("Ahmad");
    expect(updateCall.data.groomFullName).toBe("Ahmad Fauzi");
    expect(updateCall.data.brideNickname).toBe("Putri");
    expect(updateCall.data.brideFullName).toBe("Putri Indah");
  });

  test("should update rsvpEnabled and wishesEnabled", async () => {
    prisma.invitation.update.mockResolvedValue({ id: "inv-uuid-1" });

    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ rsvpEnabled: false, wishesEnabled: false });

    expect(res.status).toBe(200);
    const updateCall = prisma.invitation.update.mock.calls[0][0];
    expect(updateCall.data.rsvpEnabled).toBe(false);
    expect(updateCall.data.wishesEnabled).toBe(false);
  });

  test("should update isActive status", async () => {
    prisma.invitation.update.mockResolvedValue({ id: "inv-uuid-1" });

    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    const updateCall = prisma.invitation.update.mock.calls[0][0];
    expect(updateCall.data.isActive).toBe(false);
  });

  test("should return 404 if invitation not found", async () => {
    prisma.invitation.update.mockRejectedValue({ code: "P2025" });

    const res = await request(app)
      .put("/api/invitations/nonexistent-id")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ theme: "galaxy" });

    expect(res.status).toBe(404);
  });

  test("should return 401 without auth", async () => {
    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .send({ theme: "galaxy" });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/invitations/:id (Delete Invitation)", () => {
  test("should delete invitation successfully", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.invitation.delete.mockResolvedValue(sampleInvitation);

    const res = await request(app)
      .delete("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.invitation.delete).toHaveBeenCalledWith({ where: { id: "inv-uuid-1" } });
  });

  test("should return 404 if invitation not found", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/invitations/nonexistent-id")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  test("should return 401 without auth", async () => {
    const res = await request(app).delete("/api/invitations/inv-uuid-1");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GUEST MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/invitations/:id/guests (Add Single Guest)", () => {
  test("should add guest successfully with personal link", async () => {
    prisma.invitation.findUnique.mockResolvedValue({ slug: "reza-aulia" });
    prisma.guest.create.mockResolvedValue({ id: "guest-uuid-1" });

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Budi Santoso", receptions: ["resepsi-1"] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe("guest-uuid-1");
    expect(res.body.link).toBe(
      "https://invitation.techsavvys-official.com/reza-aulia?to=Budi+Santoso&resepsi=resepsi-1"
    );
  });

  test("should return 400 if name missing", async () => {
    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ receptions: ["resepsi-1"] });

    expect(res.status).toBe(400);
  });

  test("should return 400 if receptions missing", async () => {
    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Budi" });

    expect(res.status).toBe(400);
  });

  test("should return 400 if receptions not array", async () => {
    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Budi", receptions: "resepsi-1" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/invitations/:id/guests/csv (Upload Guests via CSV)", () => {
  test("should upload guests via CSV successfully with personal links", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.guest.createMany.mockResolvedValue({ count: 2 });

    const csv = `nama_tamu,slug,resepsi
Budi Santoso,reza-aulia,resepsi-1
Siti Rahayu,reza-aulia,resepsi-1`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.guests).toHaveLength(2);
    expect(res.body.guests[0].name).toBe("Budi Santoso");
    expect(res.body.guests[0].link).toContain("to=Budi+Santoso");
    expect(res.body.guests[0].link).toContain("resepsi=resepsi-1");
    expect(res.body.guests[1].name).toBe("Siti Rahayu");
    expect(res.body.guests[1].link).toContain("to=Siti+Rahayu");
    expect(res.body.guests[1].link).toContain("resepsi=resepsi-1");
  });

  test("should return 400 if csv field missing", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/csv/i);
  });

  test("should return 400 if CSV has wrong slug", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const csv = `nama_tamu,slug,resepsi
Budi Santoso,wrong-slug,resepsi-1`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/slug tidak sesuai/i);
  });

  test("should return 400 if CSV has invalid reception code", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const csv = `nama_tamu,slug,resepsi
Budi Santoso,reza-aulia,resepsi-99`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/kode resepsi/i);
  });

  test("should return 400 if CSV missing required columns", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const csv = `nama,slug
Budi,reza-aulia`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/kolom/i);
  });

  test("should return 400 if CSV has no valid data rows", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const csv = `nama_tamu,slug,resepsi`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tidak berisi data/i);
  });

  test("should return 404 if invitation not found", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/invitations/nonexistent/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv: "nama_tamu,slug,resepsi\nBudi,test,resepsi-1" });

    expect(res.status).toBe(404);
  });

  test("should handle CSV with quoted fields", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.guest.createMany.mockResolvedValue({ count: 1 });

    const csv = `nama_tamu,slug,resepsi
"Budi Santoso, S.Pd",reza-aulia,resepsi-1`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
  });

  test("should handle CSV with multiple receptions separated by pipe", async () => {
    const invWithMultiReceptions = {
      ...sampleInvitation,
      receptions: [
        { code: "resepsi-1", title: "Resepsi Siang" },
        { code: "resepsi-2", title: "Resepsi Malam" },
      ],
    };
    prisma.invitation.findUnique.mockResolvedValue(invWithMultiReceptions);
    prisma.guest.createMany.mockResolvedValue({ count: 1 });

    const csv = `nama_tamu,slug,resepsi
Budi Santoso,reza-aulia,resepsi-1|resepsi-2`;

    const res = await request(app)
      .post("/api/invitations/inv-uuid-1/guests/csv")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv });

    expect(res.status).toBe(201);
  });
});

describe("GET /api/invitations/:id/guests (List Guests)", () => {
  test("should return guests list with personal links", async () => {
    prisma.invitation.findUnique.mockResolvedValue({ slug: "reza-aulia" });
    prisma.guest.findMany.mockResolvedValue([
      { id: "g1", name: "Budi", receptions: ["resepsi-1"], createdAt: new Date() },
      { id: "g2", name: "Siti", receptions: ["resepsi-1"], createdAt: new Date() },
    ]);

    const res = await request(app)
      .get("/api/invitations/inv-uuid-1/guests")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].link).toContain("to=Budi");
    expect(res.body[0].link).toContain("resepsi=resepsi-1");
    expect(res.body[1].link).toContain("to=Siti");
    expect(res.body[1].link).toContain("resepsi=resepsi-1");
  });

  test("should return 401 without auth", async () => {
    const res = await request(app).get("/api/invitations/inv-uuid-1/guests");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/invitations/:id/guests/:guestId (Delete Single Guest)", () => {
  test("should delete guest successfully", async () => {
    prisma.guest.delete.mockResolvedValue({ id: "g1" });

    const res = await request(app)
      .delete("/api/invitations/inv-uuid-1/guests/g1")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("should return 404 if guest not found", async () => {
    prisma.guest.delete.mockRejectedValue({ code: "P2025" });

    const res = await request(app)
      .delete("/api/invitations/inv-uuid-1/guests/nonexistent")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/invitations/:id/guests (Delete All Guests)", () => {
  test("should delete all guests for invitation", async () => {
    prisma.guest.deleteMany.mockResolvedValue({ count: 5 });

    const res = await request(app)
      .delete("/api/invitations/inv-uuid-1/guests")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RSVP ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/invitations/:id/rsvps (List RSVPs - Admin)", () => {
  test("should return RSVP list", async () => {
    prisma.rsvp.findMany.mockResolvedValue([
      {
        id: "rsvp-1",
        name: "Budi",
        attendance: "hadir",
        guests: 2,
        message: "Selamat!",
        createdAt: new Date(),
      },
    ]);

    const res = await request(app)
      .get("/api/invitations/inv-uuid-1/rsvps")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].attendance).toBe("hadir");
  });
});

describe("POST /api/invitations/:slug/rsvp (Submit RSVP - Public)", () => {
  test("should submit RSVP successfully", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.rsvp.create.mockResolvedValue({ id: "rsvp-uuid-1" });

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({
        name: "Budi Santoso",
        attendance: "hadir",
        guests: 2,
        message: "Selamat menempuh hidup baru!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe("rsvp-uuid-1");
  });

  test("should submit RSVP without optional message", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.rsvp.create.mockResolvedValue({ id: "rsvp-uuid-2" });

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({ name: "Siti", attendance: "tidak_hadir" });

    expect(res.status).toBe(201);
    const createCall = prisma.rsvp.create.mock.calls[0][0];
    expect(createCall.data.message).toBeNull();
    expect(createCall.data.guests).toBe(1); // default
  });

  test("should return 400 if name missing", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({ attendance: "hadir" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name.*attendance/i);
  });

  test("should return 400 if attendance missing", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({ name: "Budi" });

    expect(res.status).toBe(400);
  });

  test("should return 404 if invitation not found", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/invitations/nonexistent/rsvp")
      .send({ name: "Budi", attendance: "hadir" });

    expect(res.status).toBe(404);
  });

  test("should return 403 if RSVP disabled", async () => {
    prisma.invitation.findUnique.mockResolvedValue({
      ...sampleInvitation,
      rsvpEnabled: false,
    });

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({ name: "Budi", attendance: "hadir" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/rsvp disabled/i);
  });

  test("should return 403 if invitation expired", async () => {
    prisma.invitation.findUnique.mockResolvedValue({
      ...sampleInvitation,
      expiredAt: new Date("2020-01-01"), // past date
    });

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({ name: "Budi", attendance: "hadir" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/expired/i);
  });

  test("should default guests to 1 if not provided or invalid", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.rsvp.create.mockResolvedValue({ id: "rsvp-uuid-3" });

    const res = await request(app)
      .post("/api/invitations/reza-aulia/rsvp")
      .send({ name: "Budi", attendance: "hadir", guests: "abc" });

    expect(res.status).toBe(201);
    const createCall = prisma.rsvp.create.mock.calls[0][0];
    expect(createCall.data.guests).toBe(1); // NaN || 1 = 1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WISHES ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/invitations/:slug/wishes (Get Wishes - Public)", () => {
  test("should return wishes list", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.rsvp.findMany.mockResolvedValue([
      {
        name: "Budi",
        message: "Selamat!",
        attendance: "hadir",
        createdAt: new Date("2027-06-10"),
      },
      {
        name: "Siti",
        message: "Bahagia selalu",
        attendance: "hadir",
        createdAt: new Date("2027-06-11"),
      },
    ]);

    const res = await request(app).get("/api/invitations/reza-aulia/wishes");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Budi");
    expect(res.body[0].msg).toBe("Selamat!");
    expect(res.body[0].badge).toBe("hadir");
    expect(res.body[0].date).toBeDefined();
  });

  test("should return empty array if wishes disabled", async () => {
    prisma.invitation.findUnique.mockResolvedValue({
      ...sampleInvitation,
      wishesEnabled: false,
    });

    const res = await request(app).get("/api/invitations/reza-aulia/wishes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("should return 404 if invitation not found", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/invitations/nonexistent/wishes");

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC INVITATION ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/invitations/:slug (Get Invitation - Public)", () => {
  test("should return formatted invitation data", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);

    const res = await request(app).get("/api/invitations/reza-aulia");

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("reza-aulia");
    expect(res.body.theme).toBe("sakura-bloom");
    expect(res.body.groom.nickname).toBe("Reza");
    expect(res.body.bride.nickname).toBe("Aulia");
    expect(res.body.events).toBeDefined();
    expect(Array.isArray(res.body.events)).toBe(true);
    // Should have akad + 1 reception = 2 events
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].type).toBe("akad");
    expect(res.body.events[1].type).toBe("reception");
    expect(res.body.rsvpEnabled).toBe(true);
    expect(res.body.wishesEnabled).toBe(true);
  });

  test("should have maps embedded per event card (akad and reception separate)", async () => {
    const invWithMaps = {
      ...sampleInvitation,
      akad: {
        title: "Akad Nikah",
        date: "2027-06-15",
        startTime: "08:00",
        endTime: "10:00",
        venue: "Masjid Agung",
        address: "Jl. Masjid No. 1",
        mapsUrl: "https://maps.google.com/akad-location",
      },
      receptions: [
        {
          code: "resepsi-1",
          title: "Resepsi Siang",
          date: "2027-06-16",
          startTime: "11:00",
          endTime: "14:00",
          venue: "Hotel Grand",
          address: "Jl. Hotel No. 10",
          mapsUrl: "https://maps.google.com/resepsi-location",
        },
      ],
    };
    prisma.invitation.findUnique.mockResolvedValue(invWithMaps);

    const res = await request(app).get("/api/invitations/reza-aulia");

    expect(res.status).toBe(200);

    // Akad card has its own maps
    const akadEvent = res.body.events.find((e) => e.type === "akad");
    expect(akadEvent.venue).toBe("Masjid Agung");
    expect(akadEvent.address).toBe("Jl. Masjid No. 1");
    expect(akadEvent.mapsUrl).toBe("https://maps.google.com/akad-location");
    expect(akadEvent.date).toBe("2027-06-15");

    // Resepsi card has its own maps (different location & date)
    const resepsiEvent = res.body.events.find((e) => e.type === "reception");
    expect(resepsiEvent.venue).toBe("Hotel Grand");
    expect(resepsiEvent.address).toBe("Jl. Hotel No. 10");
    expect(resepsiEvent.mapsUrl).toBe("https://maps.google.com/resepsi-location");
    expect(resepsiEvent.date).toBe("2027-06-16");
  });

  test("should have separate maps for multiple receptions at different venues", async () => {
    const invMultiVenue = {
      ...sampleInvitation,
      akad: null,
      receptions: [
        {
          code: "resepsi-keluarga",
          title: "Resepsi Keluarga",
          date: "2027-06-15",
          startTime: "10:00",
          endTime: "13:00",
          venue: "Rumah Mempelai",
          address: "Jl. Rumah No. 5",
          mapsUrl: "https://maps.google.com/rumah",
        },
        {
          code: "resepsi-umum",
          title: "Resepsi Umum",
          date: "2027-06-16",
          startTime: "18:00",
          endTime: "21:00",
          venue: "Gedung Serbaguna",
          address: "Jl. Gedung No. 20",
          mapsUrl: "https://maps.google.com/gedung",
        },
      ],
    };
    prisma.invitation.findUnique.mockResolvedValue(invMultiVenue);

    const res = await request(app).get("/api/invitations/reza-aulia");

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);

    // Each reception has its own venue + maps
    expect(res.body.events[0].venue).toBe("Rumah Mempelai");
    expect(res.body.events[0].mapsUrl).toBe("https://maps.google.com/rumah");
    expect(res.body.events[1].venue).toBe("Gedung Serbaguna");
    expect(res.body.events[1].mapsUrl).toBe("https://maps.google.com/gedung");
  });

  test("should filter events by guest receptions when ?to= provided", async () => {
    prisma.invitation.findUnique.mockResolvedValue({
      ...sampleInvitation,
      receptions: [
        { code: "resepsi-1", title: "Resepsi Siang" },
        { code: "resepsi-2", title: "Resepsi Malam" },
      ],
    });
    prisma.guest.findFirst.mockResolvedValue({
      id: "g1",
      name: "Budi",
      receptions: ["resepsi-1"], // only attending resepsi-1
    });

    const res = await request(app).get("/api/invitations/reza-aulia?to=Budi");

    expect(res.status).toBe(200);
    // Should have akad + only resepsi-1 (not resepsi-2)
    const receptionEvents = res.body.events.filter((e) => e.type === "reception");
    expect(receptionEvents).toHaveLength(1);
    expect(receptionEvents[0].code).toBe("resepsi-1");
  });

  test("should return all events if guest not found in ?to=", async () => {
    prisma.invitation.findUnique.mockResolvedValue(sampleInvitation);
    prisma.guest.findFirst.mockResolvedValue(null); // guest not found

    const res = await request(app).get("/api/invitations/reza-aulia?to=Unknown");

    expect(res.status).toBe(200);
    // Should return all events since guest not found
    expect(res.body.events).toHaveLength(2);
  });

  test("should return 404 if invitation not found or inactive", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/invitations/nonexistent");

    expect(res.status).toBe(404);
  });

  test("should return invitation without akad if akad is null", async () => {
    prisma.invitation.findUnique.mockResolvedValue({
      ...sampleInvitation,
      akad: null,
    });

    const res = await request(app).get("/api/invitations/reza-aulia");

    expect(res.status).toBe(200);
    // Only 1 reception event, no akad
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].type).toBe("reception");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKENARIO: RESEPSI 2x (SIANG + MALAM) + TAMU PRIA/WANITA TERPISAH
// ═══════════════════════════════════════════════════════════════════════════════

const multiReceptionInvitation = {
  ...sampleInvitation,
  slug: "reza-aulia",
  akad: {
    title: "Akad Nikah",
    date: "2027-06-15",
    startTime: "08:00",
    endTime: "09:30",
    venue: "Masjid Al-Ikhlas",
    address: "Jl. Masjid No. 1",
    mapsUrl: "https://maps.google.com/masjid",
  },
  receptions: [
    {
      code: "pria-siang",
      title: "Resepsi Pria - Siang",
      date: "2027-06-15",
      startTime: "10:00",
      endTime: "14:00",
      venue: "Gedung Serba Guna",
      address: "Jl. Gedung No. 5",
      mapsUrl: "https://maps.google.com/gedung",
    },
    {
      code: "pria-malam",
      title: "Resepsi Pria - Malam",
      date: "2027-06-15",
      startTime: "19:00",
      endTime: "22:00",
      venue: "Gedung Serba Guna",
      address: "Jl. Gedung No. 5",
      mapsUrl: "https://maps.google.com/gedung",
    },
    {
      code: "wanita-siang",
      title: "Resepsi Wanita - Siang",
      date: "2027-06-15",
      startTime: "10:00",
      endTime: "14:00",
      venue: "Aula Kartini",
      address: "Jl. Kartini No. 10",
      mapsUrl: "https://maps.google.com/aula-kartini",
    },
    {
      code: "wanita-malam",
      title: "Resepsi Wanita - Malam",
      date: "2027-06-15",
      startTime: "19:00",
      endTime: "22:00",
      venue: "Aula Kartini",
      address: "Jl. Kartini No. 10",
      mapsUrl: "https://maps.google.com/aula-kartini",
    },
  ],
};

describe("Skenario: Resepsi 2x (Siang+Malam) + Tamu Pria/Wanita Terpisah", () => {

  describe("Create invitation with multiple receptions", () => {
    test("should create invitation with 4 reception codes", async () => {
      prisma.invitation.create.mockResolvedValue({
        id: "inv-multi",
        slug: "reza-aulia",
      });

      const res = await request(app)
        .post("/api/invitations")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({
          slug: "reza-aulia",
          theme: "sakura-bloom",
          expiredAt: "2027-12-31T00:00:00.000Z",
          groom: { nickname: "Reza", fullName: "Reza Pratama", parents: "Bapak Ahmad & Ibu Siti" },
          bride: { nickname: "Aulia", fullName: "Aulia Putri", parents: "Bapak Budi & Ibu Ani" },
          akad: multiReceptionInvitation.akad,
          receptions: multiReceptionInvitation.receptions,
        });

      expect(res.status).toBe(201);
      expect(res.body.link).toBe("https://invitation.techsavvys-official.com/reza-aulia");

      // Verify 4 receptions stored
      const createCall = prisma.invitation.create.mock.calls[0][0];
      expect(createCall.data.receptions).toHaveLength(4);
      expect(createCall.data.receptions.map((r) => r.code)).toEqual([
        "pria-siang", "pria-malam", "wanita-siang", "wanita-malam",
      ]);
    });
  });

  describe("Add guests with different reception assignments", () => {
    test("should add tamu pria assigned to pria-siang — link includes resepsi", async () => {
      prisma.invitation.findUnique.mockResolvedValue({ slug: "reza-aulia" });
      prisma.guest.create.mockResolvedValue({ id: "g-pria-1" });

      const res = await request(app)
        .post("/api/invitations/inv-multi/guests")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ name: "Ahmad Fauzi", receptions: ["pria-siang"] });

      expect(res.status).toBe(201);
      expect(res.body.link).toContain("to=Ahmad+Fauzi");
      expect(res.body.link).toContain("resepsi=pria-siang");
    });

    test("should add tamu wanita assigned to wanita-malam — link includes resepsi", async () => {
      prisma.invitation.findUnique.mockResolvedValue({ slug: "reza-aulia" });
      prisma.guest.create.mockResolvedValue({ id: "g-wanita-1" });

      const res = await request(app)
        .post("/api/invitations/inv-multi/guests")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ name: "Siti Nurhaliza", receptions: ["wanita-malam"] });

      expect(res.status).toBe(201);
      expect(res.body.link).toContain("to=Siti+Nurhaliza");
      expect(res.body.link).toContain("resepsi=wanita-malam");
    });

    test("should add tamu with both siang+malam — link includes both resepsi", async () => {
      prisma.invitation.findUnique.mockResolvedValue({ slug: "reza-aulia" });
      prisma.guest.create.mockResolvedValue({ id: "g-vip-1" });

      const res = await request(app)
        .post("/api/invitations/inv-multi/guests")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ name: "Keluarga Besar", receptions: ["pria-siang", "pria-malam"] });

      expect(res.status).toBe(201);
      expect(res.body.link).toContain("to=Keluarga+Besar");
      expect(res.body.link).toContain("resepsi=pria-siang%2Cpria-malam");
    });
  });

  describe("CSV upload with mixed reception assignments", () => {
    test("should upload CSV with pria-siang, pria-malam, wanita-siang, wanita-malam", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
      prisma.guest.createMany.mockResolvedValue({ count: 4 });

      const csv = `nama_tamu,slug,resepsi
Ahmad Fauzi,reza-aulia,pria-siang
Budi Santoso,reza-aulia,pria-malam
Siti Nurhaliza,reza-aulia,wanita-siang
Dewi Lestari,reza-aulia,wanita-malam`;

      const res = await request(app)
        .post("/api/invitations/inv-multi/guests/csv")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ csv });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(4);
      expect(res.body.guests).toHaveLength(4);
      expect(res.body.guests[0].name).toBe("Ahmad Fauzi");
      expect(res.body.guests[0].link).toContain("to=Ahmad+Fauzi");
      expect(res.body.guests[0].link).toContain("resepsi=pria-siang");
      expect(res.body.guests[1].link).toContain("resepsi=pria-malam");
      expect(res.body.guests[2].link).toContain("resepsi=wanita-siang");
      expect(res.body.guests[3].name).toBe("Dewi Lestari");
      expect(res.body.guests[3].link).toContain("resepsi=wanita-malam");
    });

    test("should upload CSV with tamu attending multiple receptions via pipe separator", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
      prisma.guest.createMany.mockResolvedValue({ count: 2 });

      const csv = `nama_tamu,slug,resepsi
Keluarga Besar,reza-aulia,pria-siang|pria-malam
VIP Wanita,reza-aulia,wanita-siang|wanita-malam`;

      const res = await request(app)
        .post("/api/invitations/inv-multi/guests/csv")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ csv });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(2);
    });

    test("should reject CSV with invalid reception code", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);

      const csv = `nama_tamu,slug,resepsi
Ahmad,reza-aulia,resepsi-invalid`;

      const res = await request(app)
        .post("/api/invitations/inv-multi/guests/csv")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ csv });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/kode resepsi/i);
    });
  });

  describe("Public view — tamu pria hanya lihat resepsi pria", () => {
    test("tamu pria-siang hanya lihat akad + resepsi pria-siang", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
      prisma.guest.findFirst.mockResolvedValue({
        id: "g1",
        name: "Ahmad Fauzi",
        receptions: ["pria-siang"],
      });

      const res = await request(app)
        .get("/api/invitations/reza-aulia?to=Ahmad%20Fauzi");

      expect(res.status).toBe(200);

      // Should see: akad + pria-siang only
      expect(res.body.events).toHaveLength(2);
      expect(res.body.events[0].type).toBe("akad");
      expect(res.body.events[0].venue).toBe("Masjid Al-Ikhlas");
      expect(res.body.events[0].mapsUrl).toBe("https://maps.google.com/masjid");

      expect(res.body.events[1].type).toBe("reception");
      expect(res.body.events[1].code).toBe("pria-siang");
      expect(res.body.events[1].title).toBe("Resepsi Pria - Siang");
      expect(res.body.events[1].startTime).toBe("10:00");
      expect(res.body.events[1].endTime).toBe("14:00");
      expect(res.body.events[1].venue).toBe("Gedung Serba Guna");
      expect(res.body.events[1].mapsUrl).toBe("https://maps.google.com/gedung");
    });

    test("tamu wanita-malam hanya lihat akad + resepsi wanita-malam", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
      prisma.guest.findFirst.mockResolvedValue({
        id: "g2",
        name: "Siti Nurhaliza",
        receptions: ["wanita-malam"],
      });

      const res = await request(app)
        .get("/api/invitations/reza-aulia?to=Siti%20Nurhaliza");

      expect(res.status).toBe(200);

      // Should see: akad + wanita-malam only
      expect(res.body.events).toHaveLength(2);
      expect(res.body.events[0].type).toBe("akad");

      expect(res.body.events[1].type).toBe("reception");
      expect(res.body.events[1].code).toBe("wanita-malam");
      expect(res.body.events[1].title).toBe("Resepsi Wanita - Malam");
      expect(res.body.events[1].startTime).toBe("19:00");
      expect(res.body.events[1].endTime).toBe("22:00");
      expect(res.body.events[1].venue).toBe("Aula Kartini");
      expect(res.body.events[1].mapsUrl).toBe("https://maps.google.com/aula-kartini");
    });

    test("tamu VIP lihat akad + pria-siang + pria-malam (2 resepsi)", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
      prisma.guest.findFirst.mockResolvedValue({
        id: "g3",
        name: "Keluarga Besar",
        receptions: ["pria-siang", "pria-malam"],
      });

      const res = await request(app)
        .get("/api/invitations/reza-aulia?to=Keluarga%20Besar");

      expect(res.status).toBe(200);

      // Should see: akad + pria-siang + pria-malam = 3 events
      expect(res.body.events).toHaveLength(3);
      expect(res.body.events[0].type).toBe("akad");
      expect(res.body.events[1].code).toBe("pria-siang");
      expect(res.body.events[1].startTime).toBe("10:00");
      expect(res.body.events[2].code).toBe("pria-malam");
      expect(res.body.events[2].startTime).toBe("19:00");
    });

    test("tamu tanpa ?to= lihat semua events (akad + 4 resepsi)", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);

      const res = await request(app).get("/api/invitations/reza-aulia");

      expect(res.status).toBe(200);

      // No guest filter = see everything: akad + 4 receptions = 5
      expect(res.body.events).toHaveLength(5);
      expect(res.body.events[0].type).toBe("akad");
      expect(res.body.events[1].code).toBe("pria-siang");
      expect(res.body.events[2].code).toBe("pria-malam");
      expect(res.body.events[3].code).toBe("wanita-siang");
      expect(res.body.events[4].code).toBe("wanita-malam");
    });
  });

  describe("Each event card has its own maps", () => {
    test("pria venue and wanita venue have different maps", async () => {
      prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
      prisma.guest.findFirst.mockResolvedValue({
        id: "g-all",
        name: "Super VIP",
        receptions: ["pria-siang", "wanita-malam"],
      });

      const res = await request(app)
        .get("/api/invitations/reza-aulia?to=Super%20VIP");

      expect(res.status).toBe(200);

      // akad + pria-siang + wanita-malam = 3 events, all with different maps
      expect(res.body.events).toHaveLength(3);

      // Akad - Masjid
      expect(res.body.events[0].venue).toBe("Masjid Al-Ikhlas");
      expect(res.body.events[0].mapsUrl).toBe("https://maps.google.com/masjid");

      // Pria siang - Gedung
      expect(res.body.events[1].venue).toBe("Gedung Serba Guna");
      expect(res.body.events[1].mapsUrl).toBe("https://maps.google.com/gedung");

      // Wanita malam - Aula Kartini (different venue!)
      expect(res.body.events[2].venue).toBe("Aula Kartini");
      expect(res.body.events[2].mapsUrl).toBe("https://maps.google.com/aula-kartini");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ?resepsi= QUERY PARAM FILTER (direct URL-based filtering)
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/invitations/:slug?resepsi= (Filter by reception code in URL)", () => {
  test("should filter events by ?resepsi=pria-siang", async () => {
    prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);

    const res = await request(app)
      .get("/api/invitations/reza-aulia?to=Ahmad&resepsi=pria-siang");

    expect(res.status).toBe(200);
    // akad + pria-siang only
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].type).toBe("akad");
    expect(res.body.events[1].code).toBe("pria-siang");
  });

  test("should filter events by ?resepsi=wanita-malam", async () => {
    prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);

    const res = await request(app)
      .get("/api/invitations/reza-aulia?to=Siti&resepsi=wanita-malam");

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].type).toBe("akad");
    expect(res.body.events[1].code).toBe("wanita-malam");
    expect(res.body.events[1].venue).toBe("Aula Kartini");
  });

  test("should filter events by ?resepsi=pria-siang,pria-malam (multiple)", async () => {
    prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);

    const res = await request(app)
      .get("/api/invitations/reza-aulia?to=VIP&resepsi=pria-siang,pria-malam");

    expect(res.status).toBe(200);
    // akad + pria-siang + pria-malam = 3
    expect(res.body.events).toHaveLength(3);
    expect(res.body.events[1].code).toBe("pria-siang");
    expect(res.body.events[2].code).toBe("pria-malam");
  });

  test("?resepsi= takes priority over guest name lookup", async () => {
    prisma.invitation.findUnique.mockResolvedValue(multiReceptionInvitation);
    // Guest in DB has pria-siang + pria-malam, but URL says only wanita-siang
    // resepsi param should win

    const res = await request(app)
      .get("/api/invitations/reza-aulia?to=Ahmad&resepsi=wanita-siang");

    expect(res.status).toBe(200);
    const receptionEvents = res.body.events.filter((e) => e.type === "reception");
    expect(receptionEvents).toHaveLength(1);
    expect(receptionEvents[0].code).toBe("wanita-siang");
    // prisma.guest.findFirst should NOT be called since resepsi param already provided
    expect(prisma.guest.findFirst).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR GUIDE & CUSTOM COLORS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/invitations/color-guide (Color Reference)", () => {
  test("should return color guide with all 4 fields explained", async () => {
    const res = await request(app)
      .get("/api/invitations/color-guide")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.fields).toBeDefined();
    expect(res.body.fields.primary).toBeDefined();
    expect(res.body.fields.accent).toBeDefined();
    expect(res.body.fields.text).toBeDefined();
    expect(res.body.fields.secondary).toBeDefined();

    // Each field has description, affects, example
    expect(res.body.fields.primary.description).toBeDefined();
    expect(Array.isArray(res.body.fields.primary.affects)).toBe(true);
    expect(res.body.fields.primary.affects.length).toBeGreaterThan(0);
    expect(res.body.fields.primary.example).toMatch(/^#/);
  });

  test("should return 401 without auth", async () => {
    const res = await request(app).get("/api/invitations/color-guide");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/invitations/:id — customColors validation", () => {
  test("should reject invalid hex color on update", async () => {
    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ customColors: { primary: "bukan-warna" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hex color/i);
  });

  test("should reject invalid key on update", async () => {
    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ customColors: { border: "#fff" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tidak valid/i);
  });

  test("should accept valid customColors on update", async () => {
    prisma.invitation.update.mockResolvedValue({ id: "inv-uuid-1" });

    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ customColors: { primary: "#0A3D2E", accent: "#D4A853" } });

    expect(res.status).toBe(200);
    const updateCall = prisma.invitation.update.mock.calls[0][0];
    expect(updateCall.data.customColors).toEqual({ primary: "#0A3D2E", accent: "#D4A853" });
  });

  test("should accept null to reset customColors", async () => {
    prisma.invitation.update.mockResolvedValue({ id: "inv-uuid-1" });

    const res = await request(app)
      .put("/api/invitations/inv-uuid-1")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ customColors: null });

    expect(res.status).toBe(200);
    const updateCall = prisma.invitation.update.mock.calls[0][0];
    expect(updateCall.data.customColors).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/health", () => {
  test("should return ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});
