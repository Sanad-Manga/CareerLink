# GIU Nexus — AI-Powered Career & Talent Platform

A RESTful backend API connecting German International University students with internships and jobs using AI-powered skill matching, job classification, and recommendations.

## Contributors

- [Ahmed Sanad](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=Sanad-Manga)
- [Ziad Mohsen](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=ziadmosen06)
- [Abdelrahman ElGabarty](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=AbdelrahmanElGabarty)
- [Ali Issa](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=Ali-Issa-8792)
- [Baraa Tantawy](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=baraatantawy16008335)
- [Eyad Nader](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=EyadNader101)
- [Mohamed Walid](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=MohamedWalid16006402)
- [Mohamed Nazmy](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=mohamednazmy23)
- [Mostafa Ayman](https://github.com/Sanad-Manga/GIU-Nexus/commits?author=Mostafa11Ayman)

---

## Features

- **Auth** — Register, login, logout with JWT. Forgot password via OTP email (Nodemailer). JWT blacklisting on logout.
- **Role-based access** — Job Seeker, Recruiter, Admin with route-level authorization.
- **Recruiter approval** — Recruiters start as `pending` and must be approved by an admin before posting jobs.
- **Jobs** — Create, filter, update, delete. AI auto-assigns category (HuggingFace zero-shot classification). Save/unsave jobs.
- **Applications** — Apply to jobs, track status (pending → shortlisted / rejected). Recruiters manage applicants per job.
- **Profile** — View and update profile. AI extracts skills from bio (HuggingFace NER). Profile picture upload via Cloudinary.
- **Recommendations** — AI-powered job recommendations based on user skills (sentence-transformers + cosine similarity).
- **Admin** — Platform stats, user management, recruiter approval/rejection.
- **Rate limiting** — Auth routes limited to 10 requests per 15 minutes per IP.
- **Security** — Helmet, CORS, XSS sanitization, input validation, mongo-sanitize.
- **Swagger docs** — Interactive API docs at `/api-docs`.
- **Tests** — Jest integration test suite with MongoDB in-memory server.

---

## AI Features

Three HuggingFace-powered features are integrated into the platform:

### 1. Job Category Classification
**Model:** `facebook/bart-large-mnli` (zero-shot classification)

When a recruiter posts or updates a job, the title and description are sent to HuggingFace. The model classifies the job into one of: `Backend`, `Frontend`, `AI/ML`, `DevOps`, `Data Engineering`, `Mobile`, `Security`, or `Other` — automatically, no manual tagging needed.

### 2. Skill Extraction from Bio
**Model:** `dslim/bert-base-NER` (Named Entity Recognition)

Job seekers write a bio and hit the extract-skills endpoint. The NER model scans the text and pulls out technical skills and tools (e.g. React, Python, Docker). These are saved to the user's profile and used for recommendations.

### 3. AI Job Recommendations
**Model:** `sentence-transformers/all-MiniLM-L6-v2` (sentence embeddings)

When a job seeker requests recommendations, their skills are encoded into a vector. All open jobs are also encoded. Cosine similarity is computed between the user vector and each job vector, and the top matches are returned ranked by relevance.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express.js v5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Email | Nodemailer (SMTP) |
| AI | HuggingFace Inference API |
| File storage | Cloudinary |
| Docs | Swagger / OpenAPI 3.0 |
| Testing | Jest + Supertest + mongodb-memory-server |
| Deployment | Railway |
| Container | Docker + Docker Compose |

---

## Project Structure

```
├── backend/
│   ├── config/         # DB connection, Swagger config
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth, error handler, rate limiter
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routers
│   ├── services/       # Email, classification, upload logic
│   ├── __tests__/      # Jest integration tests
│   ├── seed.js         # DB seed script
│   └── server.js       # Entry point
├── client/             # React frontend (Vite)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── railway.toml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas URI (or local MongoDB)
- HuggingFace API token
- Gmail account with App Password (for OTP emails)
- Cloudinary account (for profile pictures)

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/Sanad-Manga/GIU-Nexus.git
cd GIU-Nexus

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your values in .env

# 4. Start the server
npm run dev
```

Server runs on `http://localhost:5000`. Swagger docs at `http://localhost:5000/api-docs`.

### Docker Setup

```bash
docker compose up --build
```

Starts the API and a local MongoDB container together. API available at `http://localhost:5000`.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_URI_DOCKER` | MongoDB URI for Docker Compose |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRE` | JWT expiry (e.g. `7d`) |
| `ADMIN_REGISTRATION_SECRET` | Secret required to register admin accounts |
| `SEED_ADMIN_EMAIL` | Admin email for `npm run seed` (required by the seed script) |
| `SEED_ADMIN_PASSWORD` | Admin password for `npm run seed`, min 8 chars (required by the seed script) |
| `HF_TOKEN` | HuggingFace API token |
| `EMAIL_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | SMTP port (e.g. `587`) |
| `EMAIL_USER` | Sender email address |
| `EMAIL_PASS` | App password for SMTP auth |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

---

## API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/v1/auth/register` | Register as jobSeeker or recruiter |
| `POST /api/v1/auth/login` | Login and receive JWT |
| `POST /api/v1/auth/forgot-password` | Send OTP to email |
| `POST /api/v1/auth/verify-otp` | Verify OTP, receive reset token |
| `PATCH /api/v1/auth/reset-password/:token` | Set new password |
| `POST /api/v1/auth/logout` | Blacklist current JWT |
| `GET /api/v1/jobs` | List jobs (public, filterable) |
| `POST /api/v1/jobs` | Create job (approved recruiter only) |
| `GET /api/v1/jobs/recommended` | AI job recommendations |
| `POST /api/v1/jobs/:id/apply` | Apply to a job |
| `GET /api/v1/profile` | Get own profile |
| `PATCH /api/v1/profile` | Update profile / upload picture |
| `POST /api/v1/profile/extract-skills` | AI skill extraction from bio |
| `GET /api/v1/users` | List users (admin only) |
| `PATCH /api/v1/users/:id/status` | Approve / reject recruiter |
| `GET /api/v1/applications/my` | My applications (job seeker) |
| `PATCH /api/v1/applications/:id/status` | Update application status (recruiter) |
| `GET /api/v1/admin/stats` | Platform statistics (admin) |

Full interactive docs: `/api-docs`

---

## Running Tests

```bash
npm test
```

Uses an in-memory MongoDB instance — no external DB required. Covers auth, jobs, applications, profile, rate limiting, and OTP flows.

---

## Seeding the Database

```bash
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=your-strong-password npm run seed
```

Creates a single admin account (`role: admin`, `status: approved`) from `SEED_ADMIN_EMAIL`
and `SEED_ADMIN_PASSWORD`. Both are required — the script refuses to run if either is unset.
If an account with that email already exists, it is left untouched (no password reset).
Running with `NODE_ENV=production` is refused unless you also pass `--force`.

---

## Deployment

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Vercel | **https://giu-nexus-beta.vercel.app** |
| Backend | Railway | **https://giu-nexus-api.up.railway.app** |
| Database | MongoDB Atlas | — |

Full interactive API docs: https://giu-nexus-api.up.railway.app/api-docs
