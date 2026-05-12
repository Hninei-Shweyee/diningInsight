# DiningInsight Messenger Bot

A Facebook Messenger ordering bot for DiningInsight restaurant.
Built with Node.js + Express. Customers can browse the menu and place orders entirely within Messenger.

---

## Prerequisites

- Node.js v18 or later
- A Facebook Developer account
- A Facebook Page (the bot sends messages as this page)
- [ngrok](https://ngrok.com/) for local development

---

## 1. Clone and Install Dependencies

```bash
# Clone the repository (or copy this folder to your machine)
cd messenger-bot

# Install all packages
npm install
```

---

## 2. Configure Environment Variables

```bash
# Copy the template
cp .env.example .env
```

Open `.env` in any text editor and fill in:

| Variable | Where to get it |
|---|---|
| `PAGE_ACCESS_TOKEN` | Facebook Developer Console → Your App → Messenger → Settings → Access Tokens (Generate Token) |
| `VERIFY_TOKEN` | Choose any string yourself, e.g. `mySecretToken123` — you will enter it again in Facebook later |
| `APP_SECRET` | Facebook Developer Console → Your App → Settings → Basic → App Secret |
| `PORT` | Leave as `3000` unless that port is already in use |
| `FASTAPI_URL` | Leave as `http://localhost:8000` for now (used when your FastAPI backend is ready) |

---

## 3. Get Facebook Credentials

### Step-by-step:

1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in.
2. Click **My Apps** → **Create App** → choose **Business** type.
3. Add the **Messenger** product to your app.
4. Under **Messenger → Settings → Access Tokens**, connect your Facebook Page and click **Generate Token**. Copy it → `PAGE_ACCESS_TOKEN`.
5. Under **App Settings → Basic**, copy the **App Secret** → `APP_SECRET`.
6. Choose your own `VERIFY_TOKEN` string (any text) and remember it for Step 6.

---

## 4. Install and Run ngrok

ngrok creates a public HTTPS URL that tunnels to your local server so Facebook can reach it.

```bash
# Install ngrok (one-time)
brew install ngrok           # macOS with Homebrew
# OR download from https://ngrok.com/download

# Sign up at ngrok.com and authenticate (one-time)
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN

# Start a tunnel to your local port 3000
ngrok http 3000
```

After running, ngrok shows a line like:
```
Forwarding   https://abcd1234.ngrok-free.app -> http://localhost:3000
```

Copy the `https://...ngrok-free.app` URL — you need it in Step 6.

---

## 5. Run the Bot Locally

Open a **new terminal** (keep ngrok running in the other one):

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# OR production mode
npm start
```

You should see:
```
✅ Server is running on port 3000
   Local:   http://localhost:3000
   Webhook: http://localhost:3000/webhook
```

---

## 6. Register the Webhook in Facebook Developer Console

1. Go to [developers.facebook.com](https://developers.facebook.com/) → Your App → **Messenger → Settings**.
2. Scroll to **Webhooks** → click **Add Callback URL**.
3. Enter:
   - **Callback URL**: `https://YOUR_NGROK_URL/webhook`  (e.g. `https://abcd1234.ngrok-free.app/webhook`)
   - **Verify Token**: the same string you put in `.env` as `VERIFY_TOKEN`
4. Click **Verify and Save**. Facebook will send a GET request to your server — if the token matches, it confirms.
5. Under **Webhook Fields**, subscribe to: `messages`, `messaging_postbacks`.
6. Under **Access Tokens**, click **Add or Remove Pages** and subscribe your page to the webhook.

---

## 7. Test the Bot

1. Open **Facebook Messenger** on your phone or at [messenger.com](https://messenger.com).
2. Search for your Facebook Page and start a conversation.
3. Send any message — the bot should reply with the welcome message.
4. Follow the prompts: name → phone → address → category → item → quantity → payment.

### Quick local test (webhook verification only)

```bash
# Test that the server responds to the verification handshake
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
# Expected output: test123
```

### Simulated message (no real Facebook connection needed)

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": { "id": "test_user_001" },
        "message": { "text": "hello" }
      }]
    }]
  }'
# Expected: 200 OK (check server console for the mock API log)
```

---

## File Overview

| File | Purpose |
|---|---|
| [src/index.js](src/index.js) | Express server entry point |
| [src/webhook.js](src/webhook.js) | Facebook webhook routes (GET + POST) |
| [src/flow.js](src/flow.js) | Conversation step logic |
| [src/messenger.js](src/messenger.js) | Functions to send messages to Messenger |
| [src/menu.js](src/menu.js) | Static menu data |
| [src/state.js](src/state.js) | In-memory session storage |
| [src/api.js](src/api.js) | Mock/real FastAPI order submission |

---

## Switching to a Real FastAPI Backend

1. Open [src/api.js](src/api.js).
2. Uncomment `const axios = require('axios');` at the top.
3. Replace the mock `return` with the real axios call (the commented block is already there).
4. Update `FASTAPI_URL` in your `.env` to point to your deployed backend.
