# Tax Break

**Tax Break** is an online individual income tax estimation portal. It supports detailed Indian
Old vs New Regime calculations for FY 2024-25 and FY 2025-26, plus resident individual income-tax
estimates for Ireland, the Netherlands, the UK, the US, and Singapore.

> ⚠️ **Disclaimer:** This tool is for **informational and estimation purposes only**. It is **not**
> a substitute for professional tax advice, a chartered accountant, or the official Income Tax
> Department e-filing portal. Always verify your tax computation with a qualified professional or
> the official e-filing utility before filing your return.

## Features

- Assessment Year selection: FY 2024-25 and FY 2025-26, with slab rates encoded as versioned
  config objects so future years can be added easily.
- Old Regime and New Regime slabs for individuals below 60, senior citizens (60-80), and super
  senior citizens (80+).
- Salary income with HRA exemption calculation per Section 10(13A).
- Income from house property (self-occupied / let-out) with home loan interest deduction.
- Income from other sources (interest, dividends).
- Deductions: Section 80C, 80D, 80CCD(1B), 80TTA/80TTB, 80E, 80G.
- Section 87A rebate, surcharge with marginal relief, and 4% health & education cess.
- Side-by-side Old vs New regime comparison with a recommendation and savings amount.
- 2025 resident individual income-tax slab estimates for Ireland, the Netherlands, the UK, the US,
  and Singapore in their local currency.

## Project Structure

This is an npm workspaces monorepo:

```
├── packages/tax-engine   # Reusable, framework-agnostic tax calculation engine (TypeScript)
├── server                # Express + TypeScript REST API that wraps the tax-engine
└── client                # React + TypeScript (Vite) + Tailwind CSS frontend
```

Keeping the calculation logic in `packages/tax-engine` means it can be reused by the API, and
later by a mobile app or any other consumer, without duplicating tax logic.

## Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install

From the repository root:

```bash
npm install
```

This installs dependencies for all workspaces (`packages/tax-engine`, `server`, `client`).

### Run the tax-engine tests

```bash
npm test --workspace=packages/tax-engine
```

### Run the backend server

```bash
npm run build --workspace=packages/tax-engine
npm run dev --workspace=server
```

The API will be available at `http://localhost:4000`.

- `POST /api/calculate` — accepts a full income + deductions payload and returns the tax
  breakdown for both regimes.
- `GET /api/config/:assessmentYear` — returns the slab/deduction configuration for a given
  assessment year (e.g. `FY2024-25`, `FY2025-26`).

By default, the API only accepts cross-origin requests from `http://localhost:5173` (the client
dev server). Override this with a comma-separated list via the `CORS_ALLOWED_ORIGINS` environment
variable when deploying.

### Run the frontend client

```bash
npm run dev --workspace=client
```

The app will be available at `http://localhost:5173` and proxies `/api` requests to the backend
server running on port 4000.

### Lint

```bash
npm run lint
```

## Tech Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, Recharts
- **Backend:** Node.js + Express + TypeScript
- **Tax engine:** Standalone TypeScript package, unit tested with Vitest
- **CI/CD:** GitHub Actions (lint + build + test on every PR, plus GitHub Pages deployment for
  the client)

## GitHub Pages

The frontend is published from `client/dist` to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main`.

- Live URL: `https://charles2ke.github.io/tax-break/`
- Pages builds set:
  - `VITE_BASE_PATH=/tax-break/`
  - `VITE_CALCULATION_MODE=local`

`VITE_CALCULATION_MODE=local` makes the deployed Pages site run tax calculations directly in the
browser using `packages/tax-engine`, so it does not depend on a separately hosted backend API.

## Out of Scope (for now)

User authentication/accounts, saving/persisting user data, PDF/Excel export, capital gains,
advance tax, ITR form recommender, admin config panel, and e-filing integration are not part of
this initial version.
