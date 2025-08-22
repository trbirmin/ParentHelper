# Copilot Coding Agent Onboarding Guide

This repository hosts Parent Homework Helper — a React (Vite) + Tailwind frontend with an Azure Functions backend, deployed via Azure Static Web Apps (SWA). The app accepts uploads, camera images, or typed questions; uses Azure Document Intelligence for OCR; optionally Azure OpenAI for general answers; and includes math/definitions/time fallbacks and translation support (Azure Translator).

Read this once, then trust it. Only search code when something is missing or demonstrably incorrect.

## High-level overview
- Stack: React 18 + Vite 5, Tailwind 3, JavaScript. Routing via react-router.
- Backend: Azure Functions v4 (Node 18+).
- Services: Azure Document Intelligence (OCR), optional Azure OpenAI (chat completions), Azure Translator.
- Deployment: Azure Static Web Apps (SWA) with GitHub Actions (portal-created workflow).
- Structure size: Single workspace with `web/` and `api/` projects.

## Project layout (where to change things)
- Frontend (Vite React): `web/`
  - Entry and routing: `web/src/main.jsx`, `web/src/App.jsx`
  - Pages: `web/src/pages/Home.jsx`, `About.jsx`, `Contact.jsx`
  - Components: `web/src/components/*` (UploadCard, CameraCard, QuestionCard, Navbar)
  - Styles/Tailwind: `web/src/index.css`, `web/tailwind.config.js`
  - Dev proxy: `web/vite.config.js` (proxies `/api` to Functions port)
- Backend (Azure Functions): `api/`
  - HTTP functions: `api/uploadFile.js`, `api/processImage.js`, `api/processText.js`
  - Helpers: `api/aiAnswer.js`, `api/mathSolver.js`, `api/fallbackDefinitions.js`, `api/fallbackTime.js`, `api/translator.js`
  - Host/config: `api/index.js`, `api/host.json`, `api/package.json`
- Root scripts: `package.json` shortcuts to run web/api; `.github/workflows/*` for SWA CI.

## Environment and secrets
Create and set the following (local: `api/local.settings.json` and/or `web/.env.local`; cloud: SWA Configuration):
- AZURE_DOCINTEL_ENDPOINT, AZURE_DOCINTEL_KEY
- Optional Azure OpenAI: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION
- Azure Translator: AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_REGION (and optional AZURE_TRANSLATOR_ENDPOINT)

Notes:
- Frontend calls backend via `/api/*`; no secrets in the browser.
- For local dev, the Vite dev server proxies `/api` to the Functions host.

## Build, run, and validate (local)
1) Install dependencies
- From repo root: `npm run install:all`

2) Start dev servers
- Web: `npm start` (runs Vite in `web/`)
- Functions: `npm run start:api` (runs Functions host in `api/`)
  - Alternate port (7072): `npm run start:api:alt`

3) Build frontend
- `npm run build` (builds `web/` into `web/dist`)

Troubleshooting:
- If `/api` calls fail locally, confirm Functions host is running and `vite.config.js` proxy target matches its port.
- Ensure required environment variables are set. Missing keys disable related features (e.g., AOAI, Translator).

## SWA deployment
- Workflow: `.github/workflows/azure-static-web-apps-mango-tree-037767310.yml` (portal-created)
- App location: `web`
- API location: `api`
- Output location: `web/dist`
- Configure secrets/values in the SWA portal under Configuration (for OCR/AOAI/Translator).

## Conventions and guardrails
- Keep public responses structured: subject, problem, answer, explanation.
- Keep frontend components small and use Tailwind utility classes for layout/styling.
- Avoid storing secrets in the frontend. Backend functions handle all service keys.
- When adding new API routes, expose a consistent JSON shape and handle errors with helpful messages.
- For OCR heuristics: prefer enumerated blocks, de-duplicate text, and handle stacked fractions/operands.

## Files in repo root (quick map)
- `package.json` — root scripts: install:all, start, start:api, build
- `web/` — Vite React app (source, Tailwind, proxy)
- `api/` — Azure Functions (handlers and helpers)
- `.github/workflows/azure-static-web-apps-mango-tree-037767310.yml` — SWA CI/CD
- `README.md` — overview and quickstart (app-specific)

## Final guidance
- Trust these instructions; search the repo only to look up filenames or specific contracts.
- Favor small, focused edits and keep style consistent.
- After non-trivial changes, build locally and let SWA pipeline deploy.
