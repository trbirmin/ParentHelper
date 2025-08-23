# Copilot Coding Agent Onboarding Guide

This repository hosts Parent Helper — a Next.js 15 web app for Microsoft cloud administration (Azure, Microsoft 365/Graph, Power Platform, Intune). It uses the App Router, server and client components, and integrates with Microsoft Entra ID via NextAuth + MSAL for delegated and app-only access to Microsoft APIs.

Read this once, then trust it. Only search the code when something here is missing or demonstrably incorrect.

## High-level overview
- Stack: Next.js 15 (App Router), React 19, TypeScript/JS mix, Tailwind 4, Playwright tests.
- Auth: NextAuth Azure AD provider; msal-node for On-Behalf-Of (OBO) and refresh-token exchange.
- APIs: Microsoft Graph, Azure Resource Graph/ARM, Power Platform unified API (api.powerplatform.com), plus some local API routes.
- Node: Target Node.js 18+.
- Structure size: Single app workspace, modest size (<2k files). Key roots are `src/app`, `src/lib`, `tests`, `tools`, and `scripts`.

## Project layout (where to change things)
- Pages/routes (App Router): `src/app/**/page.(tsx|jsx)`; API routes: `src/app/**/route.(ts|js)`
  - Example: Azure resources UI `src/app/azure/resources/page.jsx`; REST handlers under `src/app/api/...`
- Shared libs:
  - `src/lib/auth.ts` — NextAuth config and token surfacing.
  - `src/lib/ppToken.js` — builds delegated tokens for `https://api.powerplatform.com/.default` via OBO/refresh.
  - `src/lib/obo.js` — generic OBO helper (msal-node).
  - `src/lib/graphClient.ts|js` — Graph client helpers.
- Tests: Playwright specs in `tests/*.spec.ts`; global setup in `tests/playwright-global-setup.ts`.
- Config:
  - Lint: `eslint.config.mjs` (flat config) and legacy `.eslintrc.json` (Next extends). Prefer `npm run lint`.
  - Next: `next.config.ts`, `tsconfig.json`.
  - Playwright: `playwright.config.ts` (auto-starts dev server on port 3000).
- Utilities:
  - `scripts/capture-screenshots.js` — optional dark-mode screenshot batcher (uses Playwright Chromium).
  - `tools/*` — crawling/coverage utilities.

## Environment and secrets (required to run most pages)
Create `.env.local` with at minimum:
- NEXTAUTH_URL (e.g., http://localhost:3000)
- NEXTAUTH_SECRET (random string)
- AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET (app registration with proper permissions)
Optional but recommended for features:
- AZURE_SUBSCRIPTION_ID (for Azure Resource Graph examples)

Notes:
- Do not mix resource `.default` scopes into the initial login scope. Login keeps OIDC + user scopes only (see `src/lib/auth.ts`). Resource tokens are requested server-side via OBO.
- For Power Platform delegated calls, we use OBO against `https://api.powerplatform.com/.default`.

## Build, run, and validate
Always follow this sequence in a fresh clone:
1) Install dependencies
- Command: `npm install`
- Preconditions: Node 18+. Internet access.
- Postconditions: `node_modules` present. No errors.

2) Development server
- Command: `npm run dev`
- Behavior: Next.js dev server on port 3000. If the port is occupied, Next picks another port; set `NEXTAUTH_URL` accordingly.
- Common issues: Missing env vars will cause 401s on delegated routes. Fix `.env.local`.

3) Build for production
- Command: `npm run build`
- Preconditions: TypeScript can typecheck; dependencies installed.
- Postconditions: `.next` built successfully. Exit code 0. If type or lint errors appear, address them first.

4) Start production server
- Command: `npm start`
- Preconditions: Built artifacts present (`npm run build`).
- Postconditions: Server listens (default 3000). Use the same `NEXTAUTH_URL` host/port.

5) Lint
- Command: `npm run lint`
- Notes: Uses Next + ESLint flat config. Warnings are tolerated; errors should be fixed.

6) Tests (Playwright)
- Default smoke route coverage: `npx playwright test tests/route-coverage.spec.ts`
- Dark-mode screenshots (optional): `npx playwright test tests/dark-mode-screenshots.spec.ts`
- Behavior: `playwright.config.ts` auto-starts `npm run dev` (port 3000) with a 3-minute timeout and reuses if already running.
- Tips:
  - Set `BASE_URL=http://localhost:3000` for screenshot test if different.
  - First run may take longer due to Next compilation. Timeouts are already generous.

7) Docs screenshots (optional)
- Ensure server is running. Then: `npm run screenshots`
- Outputs to `docs/screenshots/` with a summary and gallery README.

Order and pitfalls
- Always run `npm install` before `npm run dev` or `npm run build`.
- If Playwright tests fail to connect, ensure the dev server is not stuck; you can use `npm run dev:kill` then restart.
- If you change auth or API routes, restart the dev server.
- Some pages require authentication; unauthenticated tests/pages may 401 and still be acceptable depending on the spec.

## Validation expectations (pre-PR confidence)
- Local build passes: `npm run build` → exit code 0.
- Lint passes (or only warnings): `npm run lint`.
- Optional: Run the smoke test `npx playwright test tests/route-coverage.spec.ts` and confirm it produces `tmp/route-coverage.json` without unhandled exceptions.

## Conventions and guardrails
- Client components must include `'use client'` at the top (see existing patterns in `src/app/**`).
- API routes must run on Node runtime where noted and should not attempt browser APIs.
- When calling Power Platform APIs:
  - Use delegated tokens via `getPowerPlatformDelegatedToken` from `src/lib/ppToken.js` (OBO with `.default`).
  - Avoid the Default-* environment for management settings (use GUID environments).
  - Implement small retry/backoff for 502/503/504/429 and, on 404, try `dataverseId` fallback when appropriate.
- Use correlation headers (`x-ms-client-request-id`, `x-ms-correlation-id`) for upstream calls when troubleshooting.

## Files in repo root (quick map)
- `package.json` — scripts and deps. Key scripts: dev, build, start, lint, screenshots.
- `next.config.ts`, `tsconfig.json` — Next/TS config.
- `playwright.config.ts` — e2e config with webServer auto-start.
- `eslint.config.mjs`, `.eslintrc.json` — linting.
- `README.md` — functional overview and quickstart.
- `scripts/`, `tools/`, `tests/`, `docs/`, `public/`, `src/` — main folders.

## CI and workflows
- No GitHub Actions files are present in `.github/workflows` at this time. Expect local validation (build/lint/tests) before PRs.
- Active PRs may include layout/UX refactors; keep CSS/Tailwind changes minimal unless requested.

## Final guidance
- Trust these instructions. Only search the repo when you need a filename not listed here or an API contract you’re about to change.
- Prefer small, focused edits; keep stylistic consistency.
- After non-trivial changes: run build, lint, and the route-coverage test for a quick smoke signal.
- If you add new pages, put them under `src/app/.../page.tsx` and wire any API under `src/app/api/.../route.ts`. Keep auth considerations in mind.
