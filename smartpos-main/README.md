# SmartPOS

SmartPOS is a full-stack **Restaurant Management System** built with Next.js (App Router), Supabase, and Tailwind CSS. It provides a Point of Sale (POS) flow for customers, restaurant-mode order processing, menu management, order tracking, sales analytics, kitchen mode, subscription billing (Razorpay), and an owner/admin panel — all in a single web application.

> Documentation lives in [`docs/`](docs/README.md). Start there for architecture, setup, database, API, features, and security details.

## Tech Stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router) + React 18 + TypeScript                    |
| UI         | Tailwind CSS 3, shadcn/ui components, Lucide icons                 |
| State      | Zustand (`lib/store.ts`) + React Context (`contexts/AuthContext.tsx`) |
| Backend    | Supabase (PostgreSQL + Storage)                                    |
| Payments   | Razorpay (UPI / Card / Net Banking) + cash                          |
| Charts     | Recharts (bundled)                                                 |
| Icons      | lucide-react                                                       |

## Key Features

- **Authentication** — Email/password login, self-service sign-up, legacy account migration, and password reset. Restaurant identity is persisted in `localStorage`. Supports role-based accounts (`admin`, `kitchen`, `attendant`).
- **Subscription Billing** — Restaurants get a free trial, then subscribe via Razorpay. Plans are priced per currency/country and can be managed by the owner. A subscription lock screen blocks access once the trial/subscription expires.
- **Multi-Currency** — Sign-up selects a currency + country; subscription plan prices are shown in the restaurant's currency (converted live from FX rates when needed).
- **Customer Mode** — Browse the menu by category (with search), pick per-item customization options and remarks, build a cart, capture customer details, and pay via **Razorpay** (online) or **cash** (with change calculation). A printable receipt is generated for every order.
- **Restaurant Mode** — Gated by a 4-digit MPIN. Includes:
  - **Order Now**: quick walk-in ordering (cash).
  - **Order Status**: view, filter, and update orders (`pending` → `in_progress` → `completed` / `cancelled`).
  - **Menu Management**: CRUD menu items, image uploads to Supabase Storage, predefined/custom category management, and per-item customization options.
  - **Reports/Analytics**: sales totals, average order value, popular items, sales-by-date, with CSV/Excel/PDF export.
  - **Settings**: edit restaurant profile, address, owners, login credentials, tax rate, and MPIN.
  - **Users**: add/edit staff accounts and roles (admin only).
- **Kitchen Mode** — Dedicated view for kitchen staff to see and update order statuses.
- **Owner / Admin Panel** — The Alta Software owner (`/admin`) can view all restaurants, subscription statuses and payments; the Plan Value Change screen (`/owner/plans`) manages subscription plan codes and per-country/currency pricing.
- **Taxation** — Flat 18% GST applied on the cart subtotal (configurable per restaurant via `tax_rate`).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see docs/SETUP.md)
cp .env.example .env.local    # or edit .env

# 3. Run the Supabase migrations (see docs/DATABASE.md)
#    supabase/migrations/0001_create_users_table.sql ... 0008_parameters_currency.sql

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (`.env` sets `PORT=3003` by default).

## Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Next.js dev server         |
| `npm run build`   | Production build                     |
| `npm run start`   | Start the production server          |
| `npm run lint`    | Run ESLint (`next lint`)             |

## Documentation Index

- [docs/README.md](docs/README.md) — Documentation home
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture & folder structure
- [docs/SETUP.md](docs/SETUP.md) — Setup, environment variables, deployment
- [docs/DATABASE.md](docs/DATABASE.md) — Supabase schema & storage
- [docs/API.md](docs/API.md) — API routes
- [docs/FEATURES.md](docs/FEATURES.md) — Feature-by-feature guide
- [docs/SECURITY.md](docs/SECURITY.md) — Security model, known issues, and hardening
