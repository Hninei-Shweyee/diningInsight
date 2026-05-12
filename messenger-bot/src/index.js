// index.js — Entry point for the DiningInsight Messenger Bot
// Starts an Express server and mounts the webhook router.

require('dotenv').config(); // Load .env variables before anything else

const express = require('express');
const webhookRouter = require('./webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON bodies (required for Facebook webhook POST events)
app.use(express.json());

// Mount the webhook routes (GET /webhook and POST /webhook)
app.use('/', webhookRouter);

// Simple health-check route — useful for verifying the server is up
app.get('/', (req, res) => {
  res.send('DiningInsight Messenger Bot is running! 🍽️');
});

// Start listening
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   Run ngrok to expose it: ngrok http ${PORT}`);
});
