# Tech Savvys API (Backend)

Backend API for Tech Savvys website. Built with Express.js, Prisma ORM, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express.js 5
- **ORM:** Prisma 6
- **Database:** PostgreSQL
- **Auth:** JWT (access token + refresh token)
- **Deploy:** Docker + Dokploy (VPS)

## Setup Lokal (Development)

### Prasyarat

- Node.js 20+
- PostgreSQL (running di localhost)
- Git

### 1. Clone repository

```bash
git clone https://github.com/fikrisandi/techsavvys-be-api.git
cd techsavvys-be-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

```bash
cp .env.example .env
```

Edit `.env` sesuaikan dengan PostgreSQL lokal kamu:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/techsavvys_db"
JWT_SECRET="dev-jwt-secret-123"
JWT_REFRESH_SECRET="dev-refresh-secret-456"
PORT=4000
```

### 4. Buat database

Masuk ke PostgreSQL dan buat database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE techsavvys_db;
\q
```

### 5. Jalankan migration

```bash
npx prisma migrate dev --name init
```

Ini akan membuat semua tabel di database.

### 6. Seed admin user

```bash
npm run seed
```

Output:
```
Admin seeded: m.fikrisandi.p@gmail.com
Default password: admin123 (GANTI SEGERA!)
```

### 7. Jalankan server

```bash
npm run dev
```

Server berjalan di `http://localhost:4000`

### 8. Test API

```bash
curl http://localhost:4000/api/health
# Output: {"status":"ok","timestamp":"..."}
```

## Testing Login (QA Manual)

### Login sebagai admin

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"m.fikrisandi.p@gmail.com","password":"admin123"}'
```

Response:
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { "id": "...", "name": "Muhammad Fikri Sandi Pratama", "email": "m.fikrisandi.p@gmail.com", "role": "ADMIN" }
}
```

### Gunakan token untuk CRUD

Simpan `accessToken` dari response login, lalu gunakan di header:

```bash
# List portfolios (public)
curl http://localhost:4000/api/portfolios

# Tambah portfolio (admin)
curl -X POST http://localhost:4000/api/portfolios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN_DISINI" \
  -d '{
    "title": "Website Company Profile",
    "description": "Company profile profesional dengan WordPress",
    "category": "software-dev",
    "techStack": ["WordPress", "Elementor"],
    "isFeatured": true
  }'

# List testimonials (public)
curl http://localhost:4000/api/testimonials

# Tambah testimonial (admin)
curl -X POST http://localhost:4000/api/testimonials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN_DISINI" \
  -d '{
    "name": "Budi Santoso",
    "role": "CEO, PT Contoh",
    "content": "Tech Savvys sangat profesional dan hasilnya memuaskan.",
    "rating": 5
  }'
```

## Scripts

| Command | Keterangan |
|---------|------------|
| `npm run dev` | Jalankan server (auto-reload) |
| `npm start` | Jalankan server (production) |
| `npm run seed` | Seed admin user |
| `npm run migrate` | Jalankan Prisma migration |
| `npm run generate` | Generate Prisma client |

## API Endpoints

### Auth
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/auth/login` | - | Login, return JWT |
| POST | `/api/auth/refresh` | - | Refresh access token |
| POST | `/api/auth/logout` | Bearer | Logout |
| GET | `/api/auth/me` | Bearer | Get current user |

### Portfolios
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/portfolios` | - | List semua |
| GET | `/api/portfolios?category=ai-iot` | - | Filter by category |
| GET | `/api/portfolios?featured=true` | - | Hanya featured |
| GET | `/api/portfolios/:id` | - | Detail |
| POST | `/api/portfolios` | Admin | Tambah |
| PUT | `/api/portfolios/:id` | Admin | Update |
| DELETE | `/api/portfolios/:id` | Admin | Hapus |

Categories: `ai-iot`, `data-science`, `software-dev`

### Testimonials
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/testimonials` | - | List aktif saja |
| GET | `/api/testimonials?all=true` | - | List semua |
| GET | `/api/testimonials/:id` | - | Detail |
| POST | `/api/testimonials` | Admin | Tambah |
| PUT | `/api/testimonials/:id` | Admin | Update |
| DELETE | `/api/testimonials/:id` | Admin | Hapus |

### Contacts
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/contacts` | - | Kirim pesan (public form) |
| GET | `/api/contacts` | Admin | List semua pesan |
| PATCH | `/api/contacts/:id/read` | Admin | Tandai sudah dibaca |
| DELETE | `/api/contacts/:id` | Admin | Hapus pesan |

### Health
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/health` | - | Status server |

## Struktur Folder

```
techsavvys-be-api/
├── src/
│   ├── index.js              # Entry point, Express server
│   ├── middleware/
│   │   └── auth.js           # JWT verify & role check
│   └── routes/
│       ├── auth.js           # Login, refresh, logout
│       ├── portfolios.js     # CRUD portfolio
│       ├── testimonials.js   # CRUD testimonial
│       └── contacts.js       # Pesan masuk
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.js               # Seed admin user
├── Dockerfile                # Docker build untuk deploy
├── .env.example              # Template environment
└── package.json
```

## Deploy (Production - Dokploy/VPS)

Lihat section deploy di bawah jika ingin deploy ke VPS.

### Environment Variables (Production)

```env
DATABASE_URL=postgresql://dokploy:PASSWORD@dokploy-postgres:5432/techsavvys_db
JWT_SECRET=random-strong-secret-production
JWT_REFRESH_SECRET=random-strong-refresh-secret-production
PORT=4000
```

### Domain

`https://api.techsavvys-official.com`

