# MediLink – AI‑Powered Healthcare Coordination Platform (Web‑Only MVP)

> **Note:** This repository contains the **web‑only** version of MediLink (patient, doctor, hospital, and admin portals) built for a hackathon demo. It follows the architecture outlined in the technical specification and revised hackathon proposal.

## 🚧 Project Status

This repo is being built in phases (see `docs/plan-the-entire-project-quiet-zebra.md` for the full plan). Current state:

| Phase | Status | What's there |
|-------|--------|---------------|
| **Phase 0 – Project setup & infra** | ✅ Done | Monorepo scaffold (`apps/web-portal`, `services/api`, `services/ai-service`, `packages/shared-types`), Docker Compose, CI |
| **Phase 1 – Auth & identity** | ✅ Done | Registration/login with local bcrypt + JWT auth, RBAC on the backend, role-selection dashboard |
| **Phase 2 – Patient profile & medical records** | ✅ Done | Patient profile (demographics, address, emergency contacts, insurance, photo), medical history/allergies/medications, longitudinal timeline, medical report upload to MinIO with simulated OCR, consent grant/revoke (all-records or single-record scope), access audit log |
| **Phase 3 – AI Risk Prediction & Triage** | ✅ Done | Symptom + vitals intake, FastAPI risk-scoring engine (red-flag thresholds → LOW/MEDIUM/HIGH/EMERGENCY), triage session history |
| **Phase 4 – AI Hospital Intelligence Engine** | ✅ Done | Weighted hospital scoring (specialty match, ETA, bed/doctor availability, queue length, reliability, insurance), explainable recommendations, hard emergency-capability filtering for EMERGENCY triage results |
| **Phase 5 – Appointment Booking & Queue Management** | ✅ Done | Doctor profiles & schedules, availability-based slot booking, double-booking prevention, reschedule/cancel, live priority-sorted queue |
| **Phase 6 – Pharmacy Lookup & Medicine Search** | ✅ Done | Medicine search with generic-alternative suggestions, distance-ranked nearby pharmacy lookup, stock availability check, reserve-for-pickup with pickup codes and transactional stock management |
| **Phases 7–12** (report summarization, live vitals, notifications, doctor/hospital dashboards, admin panel, integration polish) | ⏳ Not started | See the plan doc |

**What you can actually demo right now:** register → log in → pick a role on the dashboard → (patient) fill in your profile, upload/share a medical report, run AI triage, get ranked hospital recommendations, browse doctors and book/reschedule/cancel appointments, search medicines and reserve them for pickup at a nearby pharmacy → (doctor) fill in your profile/schedule and see your queue.

One architectural note worth knowing: **auth is fully local** — bcrypt-hashed passwords and HS256 JWTs issued by the NestJS API, not a third-party identity provider. `users.role_id` is nullable and doubles as the "has this user picked a role yet" signal that drives the dashboard's role-selection flow.

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
| **Auth & Identity** | Local email/password registration + login, bcrypt hashing, JWT-verified RBAC | ✅ |
| **Patient Profile** | Demographic info, medical history, allergies, medications, uploaded reports | ✅ |
| **Medical Records & Consent** | Upload PDF/PNG, simulated OCR extraction, secure share links, access audit logs | ✅ |
| **AI Risk Prediction** | Symptom + vitals entry → risk score, urgency band, red‑flag markers | ✅ |
| **AI Hospital Intelligence Engine** | Weighted scoring (specialty, ETA, bed/doctor availability, queue, reliability, insurance) → ranked hospital recommendations with explanations | ✅ |
| **Appointment Booking** | Slot availability, booking, rescheduling, cancellation, queue token | ✅ |
| **Queue Tracking** | Live queue estimate, token position, priority insertion | ✅ |
| **Pharmacy Lookup** | Medicine search (generic & brand), nearby pharmacy ranking, stock status, reserve for pickup | ✅ |
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
| **AI / Data Services** | FastAPI (Python) – risk scoring (triage) and weighted hospital-ranking implemented; report summarization not yet |
| **Auth / Identity** | Local auth — bcrypt password hashing + HS256 JWTs issued/verified by the NestJS API |
| **Database** | Neon PostgreSQL (cloud-hosted) via Prisma — local Docker Postgres is also supported for offline dev |
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
│       └─ src/app/         # dashboard, profile, records, triage, hospitals,
│                            # doctors, doctor (profile/schedule), appointments, pharmacy
├─ services/
│   ├─ api/                 # NestJS backend (Prisma, auth guards, RBAC)
│   │   └─ src/             # auth, patients, records, storage, triage, hospitals,
│   │                        # doctors, appointments, pharmacy
│   └─ ai-service/          # FastAPI AI microservice (risk scoring, hospital scoring)
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
- **A Postgres database** — either a [Neon](https://neon.tech) cloud project or local Docker Postgres; either way you just need a `DATABASE_URL`
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
Copy `.env.example` to `.env` at the repository root and fill in real values — a `DATABASE_URL` and an `AUTH_SECRET`. See the comments in `.env.example` for the rest. Generate a strong `AUTH_SECRET` with:
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
npx prisma migrate dev   # applies migrations to your Postgres database
npx prisma generate      # regenerate the Prisma client (run after every migration)
npm run db:seed          # seeds roles, specializations, demo hospitals/doctors/medicines/pharmacies
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

**Or** run everything via Docker Compose instead of step 5 (needs Docker Desktop running):
```bash
cd infra/docker
docker compose up --build -d
docker compose ps   # confirm api, ai-service, web, redis, minio, nginx are Up
```

## 🎬 What You Can Demo Today
1. Open **http://localhost:3001** — you'll see login/register links.
2. **Register** at `/register` with an email + password.
3. **Log in** at `/login`.
4. You'll land on `/dashboard` — since this is your first login, you'll be asked to pick a role (patient/doctor/hospital/admin). This calls the NestJS backend's `/api/v1/auth/complete-profile`, which JIT-provisions your profile in Postgres (and, if you picked **patient**, a `patients` row, or **doctor**, a `doctors` row).
5. You'll be redirected based on role: patients go to `/profile`, doctors to `/doctor/profile`.
6. As a **patient**:
   - `/profile` — fill in demographics, address, emergency contacts, insurance, a profile photo, medical history, allergies, and medications.
   - `/records` — drag a PDF/PNG onto the upload zone (simulated OCR text is generated automatically), then use **Share** on a record or the **Consent & Sharing** panel to grant another account (paste its user id) access, and **Revoke** to take it back.
   - `/triage` — enter symptoms and vitals to get an AI-generated risk score and urgency level.
   - `/hospitals` — get ranked, explainable hospital recommendations (optionally linked to a triage session).
   - `/doctors` — browse doctors, view a profile with open slots, and book an appointment; `/appointments` to reschedule or cancel.
   - `/pharmacy` — search for a medicine, see generic alternatives, find nearby pharmacies with stock, and reserve for pickup; `/pharmacy/reservations` to track or cancel a reservation.
7. As a **doctor**: `/doctor/profile` to set your specialization and weekly schedule, `/appointments/doctor` to see your live queue and update appointment status.

Everything past this (report summarization, live vitals, notifications, doctor/hospital dashboards, admin panel) is not built yet — see [Project Status](#-project-status).

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
  - New migration after schema changes: `npx prisma migrate dev --name <description>`, then `npx prisma generate` to refresh the client
  - Re-seed: `npm run db:seed` inside `services/api`
  - After a migration, do a full restart of `npm run dev:api` (not just wait for the file-watcher) — the incremental TypeScript build cache can go stale and miss newly generated Prisma types
- **Redis CLI (when running via Docker Compose):**
  ```bash
  docker exec -it medilink-redis-1 redis-cli
  ```
- **MinIO console (when running via Docker Compose):** `http://localhost:9001` (login `minioadmin` / `minioadmin`)

## 🐞 Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `npm run dev:api` fails to connect to the database | `DATABASE_URL` missing/wrong in `.env` | Copy the Prisma connection string from your Neon dashboard (or local Postgres connection details) |
| `/api/v1/auth/me` always 401 | `AUTH_SECRET` missing/wrong, or JWT expired | Verify `AUTH_SECRET` is set and matches what the token was signed with; log in again to get a fresh token |
| `/dashboard` redirects to `/login` even when logged in | `session_token` cookie not set, or `proxy.ts` matcher misconfigured | Confirm you're on `http://localhost:3001` (not a different port); check the cookie is present in dev tools |
| New user isn't shown the role picker | `role_id` already set on that user | `role_id` is only `null` for brand-new accounts — this is expected once a role has been chosen |
| Docker containers exit immediately | Missing env vars or port conflicts | Check `docker compose logs <service>` from `infra/docker`; ensure `.env` is present and ports 3000, 3001, 8000, 6379, 9000, 9001, 80 are free |
| `npm run build` fails on `apps/web-portal` with a lightningcss/musl error | Windows-generated lockfile lacks Linux binary metadata (Docker builds only) | Already handled in `infra/docker/web/Dockerfile` — if you hit this outside Docker, delete `apps/web-portal/node_modules` and reinstall on Linux/WSL |
| Backend compiles but new Prisma model fields show as `unknown`/missing types | `nest start --watch`'s incremental build cache is stale | Kill the process fully and re-run `npm run dev:api` (a save-triggered incremental recompile isn't always enough after a migration) |

If you're still stuck and running via Docker Compose:
```bash
cd infra/docker
docker compose logs -f   # follow all logs
```

## 📄 License
This project is **open source** and available under the MIT License – feel free to fork, modify, and use it for learning or hackathon purposes.

> **Happy hacking!** If you have any questions, open an issue or reach out. 🚀
