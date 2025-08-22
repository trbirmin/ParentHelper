# Parent Helper – Deploying to Azure Static Web Apps

This repo is set up to deploy a Vite React frontend (`web/`) and an Azure Functions backend (`api/`) to Azure Static Web Apps using GitHub Actions.

## Build configuration
- app_location: `web`
- output_location: `dist`
- api_location: `api`

## Required configuration (in Azure portal → Static Web App → Configuration)
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION` (e.g., `2024-06-01`)
- `AZURE_DOCINTEL_ENDPOINT`
- `AZURE_DOCINTEL_KEY`
 - `AZURE_TRANSLATOR_KEY` (for translation)
 - `AZURE_TRANSLATOR_REGION` (required if using multi-service Cognitive resource)
 - `AZURE_TRANSLATOR_ENDPOINT` (optional; defaults to `https://api.cognitive.microsofttranslator.com`)

## How to deploy
1. Create a Static Web App resource in Azure and connect this GitHub repo to it.
2. Add a repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN` (or let the portal create it automatically).
3. Push to `main`. The workflow `.github/workflows/azure-static-web-apps.yml` will build and deploy.

## Local development
```powershell
npm --prefix .\web run dev
npm --prefix .\api start
```
# Parent Homework Helper (Azure Static Web Apps + Azure Functions)

Monorepo scaffold with a React + Tailwind frontend and an Azure Functions backend. Backend endpoints return mock JSON so you can test structure before wiring Azure AI services.

## Structure

- `web/` – React (Vite) + TailwindCSS frontend
- `api/` – Azure Functions (Node.js v4) backend
- `.env.example` – Template for Azure service keys and endpoints
- `package.json` (root) – convenience scripts

## Prereqs

- Node.js 18+
- Azure Functions Core Tools v4
- npm

## Quick start (local)

1) Install dependencies

```powershell
npm run install:all
```

2) Start the backend (Functions)

```powershell
npm run start:api
```

This starts Azure Functions on http://localhost:7071 with endpoints:
- POST http://localhost:7071/api/uploadFile
- POST http://localhost:7071/api/processImage
- POST http://localhost:7071/api/processText

3) Start the frontend

```powershell
npm start
```

The React dev server runs on http://localhost:5173. It proxies `/api/*` calls to `http://localhost:7071`.

## Frontend features

- Mobile-first layout, soft colors, rounded corners, large readable fonts
- Navbar: Home, About, Contact
- Home page placeholder actions for Upload file, Take picture, Type question

## Backend endpoints (mock responses)

- `POST /api/uploadFile` – Placeholder for Document Intelligence
- `POST /api/processImage` – Placeholder for Vision OCR
- `POST /api/processText` – Placeholder for Azure OpenAI reasoning

Each returns a simple JSON payload to verify wiring.

## Environment variables

Copy `.env.example` to `.env` and fill in your values when you start integrating services:

```
AZURE_OPENAI_KEY=
AZURE_OPENAI_ENDPOINT=

AZURE_VISION_KEY=
AZURE_VISION_ENDPOINT=

AZURE_DOCINTEL_KEY=
AZURE_DOCINTEL_ENDPOINT=
```

The `.env` file is not required for local mock testing.

## Deploy to Azure Static Web Apps

You can deploy using the Azure Portal or GitHub Actions. Typical SWA settings for this repo:

- App location: `web`
- API location: `api`
- Output location: `dist`

Build commands (GitHub Action autodetects Vite):
- Frontend build: `npm ci && npm run build` in `web/`
- API deployment uses Functions app under `api/`

### Option A: Azure Portal
- Create Static Web App (Build preset: Custom)
- Set paths per above
- Connect your repo when prompted (Portal will create a GitHub workflow)

### Option B: GitHub Actions manually
- Use the Static Web Apps workflow, set `app_location: "web"`, `output_location: "dist"`, `api_location: "api"`

### Routing
`web/staticwebapp.config.json` includes SPA fallback to `index.html`.

## Next steps

- Connect real services using values in `.env`
- Add auth and per-user data if needed
- Polish UI and add upload/camera features

---

Happy hacking!
