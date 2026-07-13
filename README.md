# MediLink – AI‑Powered Healthcare Coordination Platform (Web‑Only MVP)

> **Note:** This repository contains the **web‑only** version of MediLink (patient, doctor, hospital, and admin portals) built for a hackathon demo. It follows the architecture outlined in the technical specification and revised hackathon proposal.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the repo](#1-clone-the-repo)
  - [2. Configure environment](#2-configure-environment)
  - [3. Start infra with Docker‑Compose](#3-start-infra-with-docker-compose)
  - [4. Run migrations & seed demo data](#4-run-migrations--seed-demo-data)
  - [5. Launch the frontend](#5-launch-the-frontend)
- [Demo Flow](#demo-flow)
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
| Module | Key Capabilities |
|--------|------------------|
| **Auth & Identity** | Email/phone registration, OTP/password login, JWT access & refresh tokens |
| **Patient Profile** | Demographic info, medical history, allergies, medications, uploaded reports |
| **Medical Records & Consent** | Upload PDF/PNG, OCR extraction, tagging, secure share links, access audit logs |
| **AI Risk Prediction** | Symptom + vitals entry → risk score, urgency band, red‑flag markers |
| **AI Hospital Intelligence Engine** | Weighted scoring (specialty, ETA, bed/doctor availability, queue, reliability, insurance) → ranked hospital recommendations with explanations |
| **Appointment Booking** | Slot availability, booking, rescheduling, cancellation, queue token |
| **Queue Tracking** | Live queue estimate, token position, average consultation time, priority insertion |
| **Pharmacy Lookup** | Medicine search (generic & brand), nearby pharmacy ranking, stock status |
| **AI Clinical Report Summarization** | Upload report → simplified patient summary + doctor‑facing brief + abnormality highlights |
| **Simulated Live Vitals Dashboard** | Timer‑driven vitals stream, WebSocket push, alert generation on threshold breach |
| **Doctor Dashboard** | Patient summary card, record view, vitals trend, triage view, consultation notes & prescription export |
| **Hospital Dashboard** | Incoming case notifications, queue status, bed/ICU availability, alerts |
| **Admin Panel** | User & institution management, configuration weights, audit logs, platform analytics |
| **Notifications & Alerts** | In‑app notifications (push/SMS/WhatsApp placeholder), appointment reminders, emergency alerts |
| **Realtime** | WebSocket (Socket.IO) + Redis Pub/Sub for live vitals & queue updates |
| **Maps / ETA** | Google Maps API (or OSRM) for travel‑time calculations in hospital ranking |

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (React) + Tailwind CSS (or Material‑UI) |
| **Backend** | NestJS (Node.js) – modular monolith API |
| **AI / Data Services** | FastAPI (Python) – risk scoring, report summarization, hospital‑intelligence engine |
| **Database** | PostgreSQL (relational) |
| **Cache / PubSub** | Redis |
| **Object Storage** | MinIO (S3‑compatible) – for uploaded reports |
| **Realtime** | Socket.IO (WebSocket) + Redis Pub/Sub |
| **Maps / ETA** | Google Maps API (or OpenStreetMap + OSRM) |
| **DevOps** | Docker + Docker‑Compose (local) → optional Kubernetes |
| **CI/CD** | GitHub Actions (lint, test, build, push) – optional for hackathon |
| **Language** | TypeScript (backend & frontend), Python (AI service) |

## 📂 Repository Structure
```
medilink/
├─ apps/
│   └─ web-portal/          # Next.js frontend (patient, doctor, hospital, admin)
├─ services/
│   ├─ api/                 # NestJS backend
│   └─ ai-service/          # FastAPI AI microservice
├─ infra/
│   └─ docker/              # Docker‑Compose & Dockerfiles
├─ packages/
│   └─ shared-types/        # (optional) TS interfaces shared by frontend & API
└─ docs/
    ├─ api/                 # OpenAPI spec (generated)
    └─ architecture/        # diagrams, DB schema, notes
```

## 🔧 Prerequisites
- **Git** – version control
- **Node.js** ≥ 20.x LTS (includes npm)
- **Python** ≥ 3.11
- **Docker Desktop** ≥ 4.x
- **(Optional) MinIO** – runs automatically via Docker‑Compose; otherwise you can use any S3‑compatible service
- **Google Maps API key** – for travel‑time calculations (get a key from Google Cloud Console)

Install via your package manager (example for Windows + WSL2):
```bash
winget install Git.Git
winget install OpenJS.NodeJS
winget install Python.Python.3
# Docker Desktop: https://www.docker.com/products/docker-desktop
```

## 🚀 Getting Started
Follow these steps to spin up the entire stack locally.

### 1. Clone the repo
```bash
git clone https://github.com/your-org/medilink.git
cd medilink
```

### 2. Configure environment
Create a `.env` file at the repository root (you can copy `.env.example` if it exists). Adjust values as needed; the defaults work with the supplied `docker‑compose.yml`.

```dotenv
# ======================
#  Backend (NestJS) API
# ======================
POSTGRES_USER=medilink
POSTGRES_PASSWORD=medilink_pass
POSTGRES_DB=medilink
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
JWT_SECRET=super-secret-change-me   # replace with a strong random string in prod
JWT_EXPIRES_IN=7d

# ======================
#  Redis (cache/pubsub)
# ======================
REDIS_HOST=redis
REDIS_PORT=6379

# ======================
#  Object Storage (MinIO)
# ======================
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=medilink-reports

# ======================
#  AI Service (FastAPI)
# ======================
OPENAI_API_KEY=sk-...          # optional – for LLM summarization
HF_API_KEY=...                 # optional – for HuggingFace models
AI_SERVICE_PORT=8000

# ======================
#  Maps / ETA
# ======================
GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE   # get from Google Cloud Console

# ======================
#  Miscellaneous
# ======================
NODE_ENV=development
PORT=3000                     # API gateway port (NGINX forwards to this)
FRONTEND_PORT=3001          # Next.js dev server (if you run it separately)
```

> **Security note:** For a hackathon demo it’s fine to use placeholder secrets. Never commit real secrets to Git.

### 3. Start infra with Docker‑Compose
```bash
# From the repo root
cd infra/docker
docker compose up --build -d
```
This command builds the NestJS and FastAPI images, starts PostgreSQL, Redis, MinIO, and an NGINX reverse proxy.

Check that all containers are healthy:
```bash
docker compose ps
```
You should see services like `medilink-api`, `medilink-ai`, `postgres`, `redis`, `minio`, `nginx` with `State: Up`.

### 4. Run migrations & seed demo data
The backend (NestJS) uses an ORM (TypeORM/Prisma). Run the migration script that creates tables per the spec, then seed demo data (hospitals, pharmacies, sample patients, reports, etc.).

```bash
# Inside the API container (or locally if you have the CLI)
docker exec -it medilink-api npm run typeorm:migration:run   # if using TypeORM
# OR
docker exec -it medilink-api npm run prisma:migrate          # if using Prisma

# Seed demo data
docker exec -it medilink-api npm run seed:demo
```
The seed script creates:
- 10‑20 hospitals with specialties, lat/lng, bed/ICU capacity
- 5‑10 pharmacies with medicine inventory
- 3 patient scenarios (stable, respiratory distress, hypertensive crisis)
- 3 sample medical reports (PDF/PNG) uploaded to MinIO
- Doctor & admin users (feel free to create your own via the API)

### 5. Launch the frontend
```bash
# From repo root
cd apps/web-portal
npm install          # first time only
npm run dev          # starts Next.js dev server on http://localhost:3001
```
The frontend proxies API calls to `http://localhost:3000` (NGINX) and the AI service to `http://localhost:8000` via environment variables in `.env.local`.

If you prefer the frontend to be served through NGINX on the same port as the API, you can build the Next.js app and let NGINX serve the static files:
```bash
npm run build
# Then copy the .next output to infra/docker/nginx/html or adjust the NGINX config.
```
For hackathon speed, running `npm run dev` on a separate port is simplest.

## 📊 Demo Flow (SOS → Care Completion)
1. **Open the patient portal** – usually `http://localhost:3001` (or `http://localhost:3000` if you proxied via NGINX).
2. **Start SOS / Symptom Intake** – click **“Start SOS”** or select a pre‑loaded scenario (e.g., *Patient B – high‑risk*).
3. **Enter vitals** (or let the simulation fill them).
4. **AI Risk Prediction** – see urgency score, explanation, red‑flag markers.
5. **Get Hospital Recommendation** – view ranked list with ETA, predicted wait, match score, and rationale.
6. **Upload a medical report** (PDF/PNG) – file goes to MinIO, metadata stored in PostgreSQL.
7. **Share record with doctor** – creates a consent record and notifies the doctor portal.
8. **Doctor portal** (`/doctor`) – see incoming case notification, patient summary card, AI‑generated report brief, vitals trend.
9. **Confirm appointment** – doctor books a slot; backend creates appointment and updates queue service.
10. **Patient sees appointment confirmation & estimated wait time**.
11. **Hospital dashboard** (`/hospital`) – view new token, updated queue length, bed/ICU status, alerts if vitals cross thresholds.
12. **Pharmacy lookup** – from the prescription screen, click **“Check Pharmacy”** → see nearby pharmacies with stock status and distance.
13. **Longitudinal profile** – after the visit, the patient’s timeline is updated with visit note, prescription, and any new vitals.

All steps work with the simulated/demo data you seeded. Feel free to tweak vitals to watch the AI risk score change and observe different hospital recommendations.

## 🛠️ Development Tips
- **Backend hot‑reload:** `npm run start:dev` inside `services/api`.
- **AI service hot‑reload:** `uvicorn main:app --reload --host 0.0.0.0 --port 8000` inside `services/ai-service`.
- **Frontend hot‑reload:** `npm run dev` inside `apps/web-portal`.
- **Linting / Formatting:**  
  - Backend: `npm run lint` (ESLint) & `npm run format` (Prettier).  
  - Frontend: `npm run lint` (ESLint) & `npm run format` (Prettier).  
  - Python: `flake8` & `black` (configured in `services/ai-service`).
- **Running tests:**  
  - Backend: `npm test` (Jest).  
  - Frontend: `npm test` (Jest/Rocket).  
  - AI service: `pytest` inside `services/ai-service`.
- **Database inspection:**  
  ```bash
  docker exec -it postgres psql -U medilink -d medilink
  ```
- **Redis CLI:**  
  ```bash
  docker exec -it redis redis-cli
  ```
- **MinIO console:** Visit `http://localhost:9001` (login `minioadmin` / `minioadmin`) to inspect uploaded objects.

## 🐞 Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Containers exit immediately | Missing env vars or port conflicts | Check `docker compose logs <service>`; ensure `.env` is present and ports 3000, 3001, 8000, 5432, 6379, 9000, 9001 are free. |
| API returns 500 | DB connection failed | Verify PostgreSQL is up (`docker compose logs postgres`) and credentials in `.env` match. |
| Frontend cannot reach API | CORS or proxy mis‑config | Ensure `.env.local` has correct `NEXT_PUBLIC_API_BASE_URL` and that NGINX is forwarding `/api` to the backend. |
| AI service health check fails | Missing Python packages | Re‑run `pip install -r requirements.txt` inside `services/ai-service` or rebuild the image (`docker compose build ai-service`). |
| MinIO upload fails | Wrong bucket name or credentials | Verify `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` in `.env`. |
| No live vitals updates | WebSocket not connecting | Check browser console for WS errors; ensure Redis Pub/Sub is working (`docker compose logs redis`). |

If you’re still stuck, run:
```bash
cd infra/docker
docker compose logs -f   # follow all logs
```
or inspect a specific service:
```bash
docker compose logs -f medilink-api
```

## 📄 License
This project is **open source** and available under the MIT License – feel free to fork, modify, and use it for learning or hackathon purposes.

> **Happy hacking!** If you have any questions, open an issue or reach out. 🚀
