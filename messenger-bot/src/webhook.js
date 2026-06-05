
const express = require('express');
const { handleMessage } = require('./flow');

const router = express.Router();


router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('[Webhook] Verification successful');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification failed — token mismatch or wrong mode');
    res.sendStatus(403);
  }
});


router.post('/webhook', (req, res) => {
  res.sendStatus(200);

  const body = req.body;

  if (body.object !== 'page') return;

  for (const entry of body.entry) {
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
      const senderId = event.sender?.id;
      if (!senderId) continue;

      if (event.message) {
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
    }
  }
});

module.exports = router;
