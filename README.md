# Tech Savvys API

Backend API for Tech Savvys website. Built with Express.js, Prisma ORM, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT (access token + refresh token)

## Setup Lokal

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

Copy `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/techsavvys_db"
JWT_SECRET="ganti-dengan-secret-kamu"
JWT_REFRESH_SECRET="ganti-dengan-refresh-secret-kamu"
PORT=4000
```

### 4. Setup database

Pastikan PostgreSQL sudah berjalan, lalu:

```bash
npx prisma migrate dev --name init
```

### 5. Seed admin user

```bash
npm run seed
```

Default admin:
- Email: `m.fikrisandi.p@gmail.com`
- Password: `admin123` (GANTI SEGERA setelah login pertama!)

### 6. Jalankan server

```bash
npm run dev
```

Server berjalan di `http://localhost:4000`

## API Endpoints

### Auth
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/auth/login` | - | Login, return JWT |
| POST | `/api/auth/refresh` | - | Refresh access token |
| POST | `/api/auth/logout` | Bearer | Logout, hapus refresh token |
| GET | `/api/auth/me` | Bearer | Get current user info |

### Portfolios
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/portfolios` | - | List semua portfolio |
| GET | `/api/portfolios/:id` | - | Detail portfolio |
| POST | `/api/portfolios` | Admin | Tambah portfolio |
| PUT | `/api/portfolios/:id` | Admin | Update portfolio |
| DELETE | `/api/portfolios/:id` | Admin | Hapus portfolio |

Query params: `?category=ai-iot` `?featured=true`

### Testimonials
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/testimonials` | - | List testimonial aktif |
| GET | `/api/testimonials/:id` | - | Detail testimonial |
| POST | `/api/testimonials` | Admin | Tambah testimonial |
| PUT | `/api/testimonials/:id` | Admin | Update testimonial |
| DELETE | `/api/testimonials/:id` | Admin | Hapus testimonial |

Query params: `?all=true` (tampilkan semua termasuk non-aktif)

### Contacts
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/contacts` | - | Kirim pesan (dari form) |
| GET | `/api/contacts` | Admin | List semua pesan |
| PATCH | `/api/contacts/:id/read` | Admin | Tandai sudah dibaca |
| DELETE | `/api/contacts/:id` | Admin | Hapus pesan |

### Health Check
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/health` | - | Status server |

## Deploy di Dokploy (VPS)

### 1. Connect GitHub ke Dokploy
- Buka Dokploy dashboard → Settings → Git Providers
- Connect akun GitHub

### 2. Buat Application di Dokploy
- Create Project → Create Service → Application
- Provider: GitHub → pilih repo `techsavvys-be-api`
- Branch: `main`
- Build Type: Dockerfile

### 3. Set Environment Variables
Di tab Environment, tambahkan:

```
DATABASE_URL=postgresql://techsavvys:PASSWORD@dokploy-postgres:5432/techsavvys_db
JWT_SECRET=ganti-secret-production
JWT_REFRESH_SECRET=ganti-refresh-secret-production
PORT=4000
```

### 4. Set Domain
Di tab Domains, tambahkan:
- Host: `api.techsavvys-official.com`
- HTTPS: enable
- Port: 4000

### 5. Deploy
Klik Deploy. Dokploy akan build dari Dockerfile dan jalankan container.

### 6. Jalankan migration dan seed
Buka Terminal di Dokploy, lalu:

```bash
npx prisma migrate deploy
node prisma/seed.js
```
