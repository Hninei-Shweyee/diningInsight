
require('dotenv').config(); // Load .env variables before anything else

const express = require('express');
const webhookRouter = require('./webhook');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/', webhookRouter);

app.get('/', (req, res) => {
  res.send('DiningInsight Messenger Bot is running! 🍽️');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   Run ngrok to expose it: ngrok http ${PORT}`);
});
