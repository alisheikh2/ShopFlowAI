<div align="center">

# 🛍️ ShopFlowAI

**A full-stack, AI-assisted e-commerce platform built solo — from checkout reliability to admin operations.**

[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![Redis](https://img.shields.io/badge/Redis-Caching-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Architecture](#architecture-highlights) • [Testing](#testing--ci)

</div>

---

## 📖 Overview

ShopFlowAI is a production-style e-commerce SaaS platform covering the full lifecycle of an online store — customer browsing and checkout, Stripe payments, and a complete admin back office — built with a deliberate focus on the problems that break real systems in production: overselling, duplicate webhook events, dead sessions, and inconsistent state after a crash mid-transaction.

It was designed and built end-to-end by a single developer as a deep dive into full-stack engineering, distributed-systems thinking, and production-readiness — not just "does the feature work," but "does it hold up under failure."

<a id="features"></a>
## ✨ Features

### 🛒 Customer Experience
- Browse, search, and filter products by category
- Cart & wishlist, with persistent state across sessions
- Secure Stripe checkout using Stripe Elements (no raw card data ever touches the server)
- Google Sign-In via Firebase, alongside standard email/password auth
- Email verification, password recovery, and account-recovery flows
- Order tracking, downloadable PDF invoices, and product reviews
- AI-generated product descriptions (Gemini API)

### 🛠️ Admin Dashboard
- Revenue and sales analytics
- Product & category management, with Cloudinary image uploads
- Order management — update fulfillment status, issue refunds, export invoices
- **User management** — search, filter, paginate; change roles; ban/unban accounts with immediate session termination

### ⚙️ Engineering Highlights
- **Inventory reservation system** — stock is held (not deducted) during checkout and auto-released if payment never completes, preventing overselling
- **Idempotent Stripe webhooks** — duplicate events are detected and safely ignored, with amount/currency/order cross-checks
- **Outbox pattern** for refunds and media cleanup, so a crash mid-transaction never leaves the database pointing at something that no longer exists
- **Hashed refresh tokens** (SHA-256, unique `jti`) — a database leak alone can't be used to hijack a session
- **In-memory access tokens** with automatic, deduplicated silent refresh — nothing sensitive sits in `localStorage`
- Redis caching for products, categories, and analytics
- Rate limiting, input validation, and centralized error handling across every module

<a id="tech-stack"></a>
## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose), replica-set transactions |
| Caching | Redis |
| Payments | Stripe (Elements, webhooks, idempotency) |
| Auth | JWT (access + refresh), Firebase Google Sign-In |
| Media | Cloudinary |
| AI | Google Gemini API |
| Email | Nodemailer |
| Testing | Node.js test runner, `mongodb-memory-server`, Vitest |
| CI/CD | GitHub Actions (lint → test → build → audit) |

<a id="getting-started"></a>
## 🚀 Getting Started

### Prerequisites
- **Node.js 22.12+** (`nvm use`)
- Docker (for a local MongoDB replica set — required for transactions)

### 1. Start local infrastructure

```bash
docker compose up -d mongo
docker compose ps          # wait for the health check (initializes replica set rs0)

# optional Redis cache
docker compose --profile cache up -d
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in your MongoDB, JWT, SMTP, Stripe, Cloudinary, Gemini, and Firebase credentials. **Never commit `.env` or Firebase service-account JSON.**

### 3. Install & run

```bash
cd server && npm ci && npm run dev
# in a second terminal
cd client && npm ci && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API health check | http://localhost:5000/api/v1/health |

<a id="architecture-highlights"></a>
## 🏗️ Architecture Highlights

<details>
<summary><strong>💳 Payment lifecycle (click to expand)</strong></summary>

Stripe checkout uses a bounded inventory reservation and idempotent payment flow:

1. The client sends a UUID `checkoutId`; duplicate order requests return the same order.
2. `POST /orders` reserves inventory for Stripe but keeps cart items until payment succeeds.
3. The reservation expires after `PAYMENT_RESERVATION_MINUTES` (default 30).
4. `POST /payments/create-intent` snapshots the exchange rate, USD minor amount, and currency, and uses a Stripe idempotency key.
5. Signed webhooks are stored once by Stripe event ID and must match order ID, user ID, PaymentIntent ID, amount, and currency.
6. A success webhook commits inventory, marks the order paid/processing, removes purchased cart items, and sends paid invoice/notifications.
7. Failed card payments remain retryable until reservation expiry.
8. Expired/cancelled reservations restore stock and queue PaymentIntent cancellation.
9. Late payment after cancellation never revives the order; it queues an idempotent refund.
10. Refunds run through a Mongo-backed outbox (`OutboxEvent`) rather than inside Mongo transactions.
11. Cloudinary image replacement/deletion is also queued through the outbox so DB state never points at an image deleted before commit.

The API process starts the commerce worker automatically. For a separate scheduled worker, set `DISABLE_COMMERCE_WORKER=true` on API instances and run:

```bash
cd server
npm run worker:once
```

Run it every 30–60 seconds via your process manager/scheduler. Multiple workers are safe — events are atomically claimed and Stripe calls use idempotency keys.

</details>

<details>
<summary><strong>🔐 Session security (click to expand)</strong></summary>

- Access tokens live only in browser memory; legacy `localStorage` tokens are removed automatically.
- The HttpOnly refresh cookie restores a session after reload.
- One failed authenticated request performs a single deduplicated refresh and retries once.
- Refresh tokens are stored as SHA-256 hashes in MongoDB with a unique JWT `jti`.
- Existing raw refresh-token sessions migrate automatically on their next rotation/logout.
- Banned users are rejected immediately — even with a still-valid access token — and lose all active sessions the moment they're banned.

</details>

<details>
<summary><strong>🗄️ Upgrading an existing database (click to expand)</strong></summary>

Back up MongoDB first, deploy with the commerce worker disabled, then run once:

```bash
cd server
npm run migrate:phase1   # marks legacy inventory state, snapshots Stripe amounts
npm run migrate:phase2   # hashes any legacy raw refresh tokens (idempotent)
```

Fresh databases do not need either step.

</details>

<details>
<summary><strong>🔥 Firebase Admin setup (click to expand)</strong></summary>

The current adapter reads:

```text
server/src/config/firebase/shopflowai-firebase-adminsdk.json
```

That path is gitignored. Download the service-account file from Firebase for local development. In production, mount it from a secret store or replace the adapter with Application Default Credentials.

</details>

<a id="testing--ci"></a>
## 🧪 Testing & CI

```bash
# Client
cd client
npm run lint
npm test
npm run build

# Server
cd server
npm test
```

GitHub Actions runs this full pipeline — lint, test, build, and `npm audit` — on every push and pull request to `main`. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Server integration tests run against a real in-memory MongoDB **replica set** (via `mongodb-memory-server`), so transactional flows (checkout, reservations, refunds) are tested against real Mongo transaction semantics — not mocks.

<details>
<summary><strong>Stripe local webhook testing</strong></summary>

```bash
stripe listen --forward-to localhost:5000/api/v1/payments/webhook
```

Copy the CLI webhook secret to `STRIPE_WEBHOOK_SECRET`. Use Stripe **test mode** only.

</details>

## 📁 Project Structure

```
ShopFlowAI/
├── client/                 # React 19 + Vite frontend
│   └── src/
│       ├── pages/          # Route-level views (customer + admin)
│       ├── components/     # Shared UI components
│       ├── contexts/       # Auth, Cart, Wishlist, Toast providers
│       └── services/       # API client, Stripe, Firebase
├── server/                 # Express + MongoDB backend
│   └── src/
│       ├── controllers/    # Route handlers
│       ├── services/       # Business logic (orders, payments, reservations…)
│       ├── models/         # Mongoose schemas
│       ├── middleware/     # Auth, validation, rate limiting, error handling
│       └── routes/         # API route definitions
├── docker-compose.yml       # Local MongoDB replica set + optional Redis
└── .github/workflows/ci.yml # Lint → test → build → audit pipeline
```

## 🌐 Deployment Notes

- Use Node 22.12+ on all API, worker, build, and CI machines.
- Use MongoDB Atlas or a production replica set — never deploy a standalone MongoDB (transactions require a replica set).
- Run at least one commerce worker continuously.
- Use a shared Redis rate-limit/cache store when scaling horizontally.
- Configure Stripe webhooks with the raw request body and HTTPS.
- Back up and monitor the `orders`, `stripeevents`, and `outboxevents` collections.
- Alert on failed outbox events and `refundStatus: failed`.

## 🗺️ Roadmap

- [ ] Production deployment (Vercel + Render/Atlas)
- [ ] Replace placeholder catalog imagery with verified product photos
- [ ] UI polish pass

## 👤 Author

**Ali Hassan**
BS Computer Science, COMSATS University Islamabad (Sahiwal Campus)

- GitHub: [@alisheikh2](https://github.com/alisheikh2)

---

<div align="center">
Built as an independent, production-style engineering project — not a tutorial clone.
</div>
