// webhook.js — Express router that handles Facebook Messenger webhook events
// Two routes:
//   GET  /webhook  → Facebook verification handshake (done once when you set up the webhook)
//   POST /webhook  → Incoming messages and postbacks from Messenger

const express = require('express');
const { handleMessage } = require('./flow');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /webhook — Facebook webhook verification
// ---------------------------------------------------------------------------
// Facebook sends a GET request with three query params when you register your
// webhook URL in the developer console. We must respond with hub.challenge to
// prove we control the server.

router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('[Webhook] Verification successful');
    // Respond with the challenge to confirm ownership
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification failed — token mismatch or wrong mode');
    res.sendStatus(403);
  }
});

// ---------------------------------------------------------------------------
// POST /webhook — Receive Messenger events
// ---------------------------------------------------------------------------
// Facebook sends all events (messages, postbacks, etc.) here as JSON.
// We MUST respond 200 immediately, then process the events asynchronously.

router.post('/webhook', (req, res) => {
  // Acknowledge receipt right away — Facebook will retry if we take too long
  res.sendStatus(200);

  const body = req.body;

  // Confirm this is a page subscription event
  if (body.object !== 'page') return;

  // Iterate through all entries (Facebook can batch multiple events)
  for (const entry of body.entry) {
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
      const senderId = event.sender?.id;
      if (!senderId) continue;

      if (event.message) {
        // Ignore messages sent by the page itself (echoes)
        if (event.message.is_echo) continue;

        const text = event.message.text || null;
        handleMessage(senderId, text, null).catch((err) =>
          console.error('[Webhook] handleMessage error (text):', err),
        );

      } else if (event.postback) {
        const payload = event.postback.payload || null;
        handleMessage(senderId, null, payload).catch((err) =>
          console.error('[Webhook] handleMessage error (postback):', err),
        );
      }
      // Other event types (read receipts, delivery, etc.) are ignored
    }
  }
});

module.exports = router;
