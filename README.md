# DiningInsight

**Senior Project - Chiang Mai University**

| Name | Student ID |
|------|------------|
| Hnin Ei Shwe Yee | 662115503 |
| Ju Zuu Hlaing | 662115505 |

## About

DiningInsight is a restaurant management platform that helps restaurant owners manage orders, customers, menus, and business insights in one place.

The system includes:

- **Dashboard** - analytics, order management, customer profiles, and menu management
- **Orders** - track customer orders and update order status
- **Customers** - view customer history, favourite menu items, and order frequency
- **Menu Management** - add, edit, and organize menu items by category
- **Messenger AI Chat** - customers can ask for the menu and place food orders through Facebook Messenger
- **Telegram Notifications** - restaurants receive an order invoice notification when a Messenger order is confirmed

The active Messenger AI chat is powered by a Cloudflare Worker. It reads menu items from the PostgreSQL database, remembers customer order details during the chat, saves confirmed orders to the database, and sends Telegram notifications to the restaurant.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue.js 3, Pinia, Vue Router, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy |
| Database | PostgreSQL / Neon |
| Authentication | Firebase Authentication |
| Storage | Firebase Storage |
| Messenger AI Bot | Cloudflare Workers, Facebook Messenger API, DeepSeek API |
| Notifications | Telegram Bot API |

## Project Structure

```text
DiningInsight/
├── dashboard/                # Vue.js dashboard frontend
├── fastapi-backend/          # FastAPI backend and database models
├── dining-insight-worker/    # Active Cloudflare Worker for Messenger AI chat
└── messenger-bot/            # Legacy/local Node.js Messenger bot
```

## Prerequisites

Install these before running the project:

- Node.js v18+
- npm
- Python v3.10+
- PostgreSQL database, such as Neon
- Firebase project
- Cloudflare account with Wrangler CLI
- Facebook Developer app and Facebook Page
- Telegram bot, if order notifications are enabled

## Environment Files

Environment files are not committed to GitHub. Create them locally.

Required local files:

```text
dashboard/.env
fastapi-backend/.env
dining-insight-worker/.dev.vars
```

Cloudflare Worker secrets should be set with `wrangler secret put`.

Worker secrets used by the Messenger AI chat:

```text
DATABASE_URL
PAGE_ACCESS_TOKEN
VERIFY_TOKEN
DEEPSEEK_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Worker environment variables:

```text
RESTAURANT_ID
DATABASE_WORKER_URL
```

Do not commit `.env`, `.dev.vars`, `.wrangler`, or `node_modules`.

## Setup

Install dashboard dependencies:

```bash
cd dashboard
npm install
```

Set up the FastAPI backend:

```bash
cd ../fastapi-backend
python -m venv venv
```

Activate the virtual environment:

```bash
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Install Cloudflare Worker dependencies:

```bash
cd ../dining-insight-worker
npm install
```

## Run Locally

Run the dashboard and backend from the `dashboard` folder:

```bash
npm run start
```

This starts:

- Vue dashboard
- FastAPI backend
- legacy local Messenger bot

For the active Cloudflare Worker bot, run from `dining-insight-worker`:

```bash
npm run dev
```

## Deploy Messenger AI Worker

Deploy the active Messenger AI chat worker:

```bash
cd dining-insight-worker
npm run deploy
```

For the Messenger webhook worker configuration:

```bash
wrangler deploy -c wrangler.young-bread.jsonc
```

After deployment, use the Worker URL as the Facebook Messenger webhook callback URL.

## Messenger AI Chat Flow

The Messenger AI chat can:

- show the restaurant menu from the database
- understand customer order messages
- collect customer name, phone number, address, quantity, and payment method
- validate phone number format
- allow customers to correct order details before confirmation
- save confirmed orders into the PostgreSQL database
- show saved orders on the website dashboard
- send a Telegram notification invoice to the restaurant

Admin menu updates in the dashboard are stored in the database, so the Messenger AI chat can show the latest menu without hardcoded menu text.

## Notes

The `messenger-bot/` folder is kept as a legacy/local Node.js Messenger bot. The current production-style Messenger AI chat is in `dining-insight-worker/`.

`node_modules` is intentionally excluded from GitHub. After cloning the project, run `npm install` inside each JavaScript project folder to recreate dependencies.
