# MediLink – AI‑Powered Healthcare Coordination Platform (Web‑Only MVP)

> **Note:** This repository contains the **web‑only** version of MediLink (patient, doctor, hospital, and admin portals) built for a hackathon demo. It follows the architecture outlined in the technical specification and revised hackathon proposal.

## 🚧 Project Status

This repo is being built in phases (see `docs/plan-the-entire-project-quiet-zebra.md` for the full plan). Current state:

| Phase | Status | What's there |
|-------|--------|---------------|
| **Phase 0 – Project setup & infra** | ✅ Done | Monorepo scaffold (`apps/web-portal`, `services/api`, `services/ai-service`, `packages/shared-types`), Docker Compose, CI |
| **Phase 1 – Auth & identity** | ✅ Done | Registration/login (Neon Auth), email OTP verification, JWT-verified RBAC on the backend, role-selection dashboard |
| **Phase 2 – Patient profile & medical records** | ✅ Done | Patient profile (demographics, address, emergency contacts, insurance, photo), medical history/allergies/medications, longitudinal timeline, medical report upload to MinIO with simulated OCR, consent grant/revoke (all-records or single-record scope), access audit log, `/profile` and `/records` pages in the Neo-Brutalist design system |
| **Phases 3–12** (triage, hospital intelligence, appointments, pharmacy, vitals, dashboards, admin) | ⏳ Not started | See the plan doc |

**What you can actually demo right now:** register → verify email (OTP) → log in → pick the patient role on the dashboard → fill in your profile at `/profile` → upload and share a medical report at `/records`. The rest of the "Demo Flow" and "Features" sections below describe the target end state, not what's runnable today.

One architectural deviation from the original plan worth knowing: **auth uses [Neon Auth](https://neon.com/docs/auth/overview)** (Neon's managed identity/credentials service) rather than a hand-rolled NestJS JWT auth service. Neon Auth owns registration, login, sessions, and email verification; our own Postgres `users`/`roles` tables only hold MediLink-domain data (role assignment) keyed by Neon Auth's external user id, and the NestJS API verifies bearer tokens against Neon Auth's JWKS endpoint for RBAC.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [What You Can Demo Today](#what-you-can-demo-today)
- [Development Tips](#development-tips)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## 🎯 Overview
MediLink is a software‑first, AI‑enabled care‑coordination platform that helps patients reach the right care setting faster by combining:
- **AI risk prediction** (triage support)
- **AI Hospital Intelligence Engine** (explainable hospital recommendation)
- **Secure digital medical record vault** (upload, OCR, summarization, consent‑based sharing)
- **Appointment booking with queue awareness**
- **Pharmacy medicine lookup & fulfillment support**
- **Simulated live vitals dashboard** (for demo scenarios)
- **Doctor & hospital dashboards** (real‑time alerts, patient summary cards)
- **Admin panel** (user & institution management, analytics)

All components are containerized and can be spun up with a single `docker compose up` command, making the MVP demo‑ready in minutes.

## ✨ Features (MVP)
*Target feature set per the full plan — ✅ marks what's actually implemented today.*

| Module | Key Capabilities | Status |
|--------|------------------|--------|
| **Auth & Identity** | Email registration + OTP email verification (Neon Auth), JWT-verified RBAC | ✅ |
| **Patient Profile** | Demographic info, medical history, allergies, medications, uploaded reports | ✅ |
| **Medical Records & Consent** | Upload PDF/PNG, simulated OCR extraction, secure share links, access audit logs | ✅ |
| **AI Risk Prediction** | Symptom + vitals entry → risk score, urgency band, red‑flag markers | ⏳ |
| **AI Hospital Intelligence Engine** | Weighted scoring (specialty, ETA, bed/doctor availability, queue, reliability, insurance) → ranked hospital recommendations with explanations | ⏳ |
| **Appointment Booking** | Slot availability, booking, rescheduling, cancellation, queue token | ⏳ |
| **Queue Tracking** | Live queue estimate, token position, average consultation time, priority insertion | ⏳ |
| **Pharmacy Lookup** | Medicine search (generic & brand), nearby pharmacy ranking, stock status | ⏳ |
| **AI Clinical Report Summarization** | Upload report → simplified patient summary + doctor‑facing brief + abnormality highlights | ⏳ |
| **Simulated Live Vitals Dashboard** | Timer‑driven vitals stream, WebSocket push, alert generation on threshold breach | ⏳ |
| **Doctor Dashboard** | Patient summary card, record view, vitals trend, triage view, consultation notes & prescription export | ⏳ |
| **Hospital Dashboard** | Incoming case notifications, queue status, bed/ICU availability, alerts | ⏳ |
| **Admin Panel** | User & institution management, configuration weights, audit logs, platform analytics | ⏳ |
| **Notifications & Alerts** | In‑app notifications (push/SMS/WhatsApp placeholder), appointment reminders, emergency alerts | ⏳ |
| **Realtime** | WebSocket (Socket.IO) + Redis Pub/Sub for live vitals & queue updates | ⏳ |
| **Maps / ETA** | Google Maps API (or OSRM) for travel‑time calculations in hospital ranking | ⏳ |

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (React 19, App Router) + Tailwind CSS |
| **Backend** | NestJS (Node.js) – modular monolith API |
| **AI / Data Services** | FastAPI (Python) – risk scoring, report summarization, hospital‑intelligence engine (not yet implemented) |
| **Auth / Identity** | [Neon Auth](https://neon.com/docs/auth/overview) — registration, login, sessions, email OTP verification. NestJS verifies bearer JWTs against Neon Auth's JWKS for RBAC |
| **Email delivery** | [Resend](https://resend.com), invoked via Neon Auth's `send.otp`/`send.magic_link` webhooks (Neon's own shared sender has unreliable deliverability) |
| **Database** | Neon PostgreSQL (cloud-hosted; no local Postgres container) via Prisma |
| **Cache / PubSub** | Redis |
| **Object Storage** | MinIO (S3‑compatible) – patient report uploads, keyed under `patients/<patientId>/<recordId>/…`, accessed via short-lived presigned URLs |
| **Realtime** | Socket.IO (WebSocket) + Redis Pub/Sub (not yet implemented) |
| **Maps / ETA** | Google Maps API (or OpenStreetMap + OSRM) (not yet implemented) |
| **DevOps** | Docker + Docker‑Compose (local) → optional Kubernetes |
| **CI/CD** | GitHub Actions — lint/build/test on PR (`.github/workflows/ci.yml`), Neon branch-per-PR (`neon_workflow.yml`) |
| **Language** | TypeScript (backend & frontend), Python (AI service) |

## 📂 Repository Structure
```
medilink/
├─ apps/
│   └─ web-portal/          # Next.js frontend (patient, doctor, hospital, admin)
├─ services/
│   ├─ api/                 # NestJS backend (Prisma, auth guards, RBAC)
│   └─ ai-service/          # FastAPI AI microservice (health check only so far)
├─ infra/
│   └─ docker/              # Docker‑Compose & Dockerfiles
├─ packages/
│   └─ shared-types/        # TS interfaces/enums shared by frontend & API (e.g. UserRole)
└─ docs/
    └─ plan-the-entire-project-quiet-zebra.md   # full phased implementation plan
```

## 🔧 Prerequisites
- **Git** – version control
- **Node.js** ≥ 20.x LTS (includes npm)
- **Python** ≥ 3.10 (3.11+ per the original spec, 3.10 also works)
- **Docker Desktop** ≥ 4.x — only needed if you want to run the full stack via `docker compose`; local dev (`npm run dev`) doesn't require it
- **A [Neon](https://neon.tech) project with Auth enabled** — provides `DATABASE_URL`, `Auth_URL`, `JWKS_URL` (Neon dashboard → your project → Auth → Configuration)
- **A [Resend](https://resend.com) account** — free tier is enough; provides `RESEND_API_KEY`. Sandbox mode only delivers to the email your Resend account is registered under until you verify a sending domain
- **Google Maps API key** – for travel‑time calculations (not yet used, needed in a later phase)

Install via your package manager (example for Windows):
```bash
winget install Git.Git
winget install OpenJS.NodeJS
winget install Python.Python.3
# Docker Desktop (optional): https://www.docker.com/products/docker-desktop
```

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-org/medilink.git
cd medilink
```

### 2. Configure environment
Copy `.env.example` to `.env` at the repository root and fill in real values — Neon connection details, Neon Auth config, and a Resend API key. See the comments in `.env.example` for where to get each one. Generate `NEON_AUTH_COOKIE_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Security note:** Never commit your real `.env` — it's already gitignored.

### 3. Install dependencies
This is an npm workspaces monorepo — install once from the root:
```bash
npm install
```

### 4. Set up the database
```bash
cd services/api
npx prisma migrate dev   # applies migrations to your Neon database
npm run db:seed          # seeds the 4 roles: patient, doctor, hospital, admin
cd ../..
```

### 5. Run the services locally (fastest for development)
Each in its own terminal, from the repo root:
```bash
npm run dev:api    # NestJS on http://localhost:3000
npm run dev:web    # Next.js on http://localhost:3001
```
For the AI service (Python):
```bash
.venv\Scripts\Activate.ps1        # Windows PowerShell; adjust for your shell
cd services\ai-service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Or** run everything via Docker Compose instead of steps 5 (needs Docker Desktop running):
```bash
cd infra/docker
docker compose up --build -d
docker compose ps   # confirm api, ai-service, web, redis, minio, nginx are Up
```

### 6. Enable email delivery for OTP verification (optional but recommended)
By default Neon Auth's shared email sender has unreliable deliverability. This repo routes verification emails through Resend instead via a webhook. To test this locally, Neon requires the webhook URL to be public HTTPS (it rejects `localhost`), so you need a tunnel:
```bash
cloudflared tunnel --url http://localhost:3001
```
Then register the tunnel's HTTPS URL + `/api/webhooks/neon` as your webhook (see `NEON_AUTH_WEBHOOK_URL` in `.env.example` for the shape) via:
```bash
curl -X PUT "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$NEON_BRANCH_ID/auth/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -d '{"enabled": true, "webhook_url": "<your-tunnel-url>/api/webhooks/neon", "enabled_events": ["send.otp", "send.magic_link"]}'
```
The tunnel URL changes every time it restarts (free/anonymous `cloudflared` tunnels aren't persistent) — re-run the registration whenever that happens.

## 🎬 What You Can Demo Today
1. Open **http://localhost:3001** — you'll see login/register links.
2. **Register** at `/register` with an email + password. You'll be prompted for a 6-digit code.
3. **Check your email** for the code (see step 6 above to get this actually delivered) and enter it to verify.
4. **Log in** at `/login`.
5. You'll land on `/dashboard` — since this is your first login, you'll be asked to pick a role (patient/doctor/hospital/admin). This calls the NestJS backend's `/api/v1/auth/complete-profile`, which JIT-provisions your profile in Postgres (and, if you picked **patient**, a `patients` row too).
6. Reload `/dashboard` — you'll now see your email, role, and account status, fetched from `/api/v1/auth/me` with a JWT verified against Neon Auth's JWKS.
7. As a patient, visit **`/profile`** — fill in demographics, address, emergency contacts, insurance, a profile photo, medical history, allergies, and medications. Everything persists via the NestJS API.
8. Visit **`/records`** — drag a PDF/PNG onto the upload zone (simulated OCR text is generated automatically), then use **Share** on a record or the **Consent & Sharing** panel to grant another account (paste its user id) access, and **Revoke** to take it back. The access audit trail is recorded server-side on every view.

Everything past this (triage, hospital recommendations, appointments, pharmacy, etc.) is not built yet — see [Project Status](#-project-status).

## 🛠️ Development Tips
- **Backend hot‑reload:** `npm run dev:api` from repo root, or `npm run start:dev` inside `services/api`.
- **AI service hot‑reload:** `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` inside `services/ai-service`.
- **Frontend hot‑reload:** `npm run dev:web` from repo root, or `npm run dev` inside `apps/web-portal`.
- **Linting / Formatting:**
  - Backend & frontend: `npm run lint` (per-workspace, or `npm run lint --workspaces` from root)
  - Python: `flake8 app tests` & `black .` inside `services/ai-service`
- **Running tests:**
  - Backend: `npm test` (unit) and `npm run test:e2e` (e2e) inside `services/api`, or `npm test --workspaces` from root
  - AI service: `pytest` inside `services/ai-service`
- **Database:**
  - Inspect/browse: `npx prisma studio` inside `services/api`
  - New migration after schema changes: `npx prisma migrate dev --name <description>`
  - Re-seed roles: `npm run db:seed` inside `services/api`
- **Redis CLI (when running via Docker Compose):**
  ```bash
  docker exec -it medilink-redis-1 redis-cli
  ```
- **MinIO console (when running via Docker Compose):** `http://localhost:9001` (login `minioadmin` / `minioadmin`)

## 🐞 Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `npm run dev:api` fails to connect to the database | `DATABASE_URL` missing/wrong in `.env` | Copy the Prisma connection string from Neon dashboard → your project → Connect |
| `/api/v1/auth/me` always 401 | `JWKS_URL` missing/wrong, or bearer token expired (Neon Auth tokens last ~15 min) | Verify `JWKS_URL` in `.env`; re-fetch a token via `authClient.token()` |
| `/dashboard` redirects to `/login` even when logged in | Session cookie not set, or `proxy.ts` matcher misconfigured | Check `NEON_AUTH_COOKIE_SECRET` is set; confirm you're on `http://localhost:3001` (not a different port) |
| Registered but never received a verification email | Neon Auth's shared sender is unreliable, or the Resend webhook isn't registered/reachable | Follow [step 6](#6-enable-email-delivery-for-otp-verification-optional-but-recommended); check the tunnel is still running (URLs expire on restart) |
| Resend returns `403` "can only send to your own email" | Sandbox mode restriction | Only your Resend account's registered email can receive mail until you verify a sending domain at resend.com/domains |
| Docker containers exit immediately | Missing env vars or port conflicts | Check `docker compose logs <service>` from `infra/docker`; ensure `.env` is present and ports 3000, 3001, 8000, 6379, 9000, 9001, 80 are free |
| `npm run build` fails on `apps/web-portal` with a lightningcss/musl error | Windows-generated lockfile lacks Linux binary metadata (Docker builds only) | Already handled in `infra/docker/web/Dockerfile` — if you hit this outside Docker, delete `apps/web-portal/node_modules` and reinstall on Linux/WSL |

If you're still stuck and running via Docker Compose:
```bash
cd infra/docker
docker compose logs -f   # follow all logs
```

## 📄 License
This project is **open source** and available under the MIT License – feel free to fork, modify, and use it for learning or hackathon purposes.

> **Happy hacking!** If you have any questions, open an issue or reach out. 🚀
