# DiningInsight

**Senior Project — Chiang Mai University**

| Name | Student ID |
|------|-----------|
| Hnin Ei Shwe Yee | 662115503 |
| Ju Zuu Hlaing | 662115505 |

---

## About

DiningInsight is a restaurant management platform designed to help restaurant owners manage their business more efficiently in one place. The system includes:

- **Dashboard** — Business analytics and sales insights (revenue, order trends, top-selling items)
- **Orders** — Track and manage customer orders in real time
- **Customers** — View customer profiles and purchase history
- **Menu Management** — Add, edit, and organize menu items with images and categories
- **Facebook Messenger Bot** — Automated order-taking and menu browsing via Facebook Messenger

The platform is built with a Vue.js frontend, a FastAPI (Python) backend connected to a PostgreSQL database, and a Node.js Messenger bot integrated with the Facebook API.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue.js 3, Pinia, Vue Router, Tailwind CSS |
| Backend | FastAPI (Python), SQLAlchemy, PostgreSQL (Neon) |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Bot | Node.js, Facebook Messenger API |

---

## Setup & Run Guide

## Prerequisites

Make sure these are installed on your machine:

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)
- npm (comes with Node.js)

---

## One-Time Setup (do this once after cloning)

### 1. Install dashboard dependencies
```bash
cd dashboard
npm install
```

### 2. Install bot dependencies
```bash
cd ../messenger-bot
npm install
```

### 3. Set up Python backend
```bash
cd ../fastapi-backend
python -m venv venv
```

Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac
source venv/bin/activate
```

Then install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Add environment files

You will receive two `.env` files separately. Place them here:

- `dashboard/.env`
- `fastapi-backend/.env`

---

## Running the Project

Run this command from the **`dashboard`** folder every time:

**Windows:**
```bash
npm run start:win
```

**Mac:**
```bash
npm run start
```

This starts all three services at once:
- Vue dashboard (frontend)
- FastAPI backend
- Messenger bot

---

## Project Structure

```
DiningInsight/
├── dashboard/        # Vue.js frontend
├── fastapi-backend/  # Python FastAPI backend
└── messenger-bot/    # Facebook Messenger bot (Node.js)
```
