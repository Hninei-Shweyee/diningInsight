// messenger.js — Wrappers for the Facebook Messenger Send API
// All functions are async and swallow errors internally so one failed send
// never crashes the whole server.

const axios = require('axios');
const { CATEGORIES, getItemsByCategory } = require('./menu');
const { fetchMenuFromAPI } = require('./api');

// Facebook Graph API endpoint for sending messages
const FB_MESSAGES_URL = 'https://graph.facebook.com/v19.0/me/messages';

/**
 * Low-level helper that POSTs a message body to the Facebook Send API.
 * @param {object} body - Full request body to send to Facebook
 */
async function callSendAPI(body) {
  try {
    await axios.post(FB_MESSAGES_URL, body, {
      params: { access_token: process.env.PAGE_ACCESS_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log the detailed Facebook error if available, otherwise the generic message
    const fbError = error.response?.data?.error;
    if (fbError) {
      console.error('[Messenger] Facebook API error:', fbError);
    } else {
      console.error('[Messenger] Failed to send message:', error.message);
    }
  }
}

/**
 * Sends a plain text message to a user.
 * @param {string} recipientId - Messenger user ID
 * @param {string} text - Message text (max 2000 characters)
 */
async function sendTextMessage(recipientId, text) {
  await callSendAPI({
    recipient: { id: recipientId },
    message: { text },
  });
}

/**
 * Sends a text message with quick reply buttons.
 * @param {string} recipientId - Messenger user ID
 * @param {string} text - Prompt text shown above the buttons
 * @param {string[]} options - Array of button label strings
 */
async function sendQuickReply(recipientId, text, options) {
  const quick_replies = options.map((option) => ({
    content_type: 'text',
    title: option,
    // Payload is the option text uppercased with spaces replaced by underscores
    // e.g. "🍔 Burger" → "🍔_BURGER"  (Facebook requires payload ≤ 1000 chars)
    payload: option.toUpperCase().replace(/ /g, '_'),
  }));

  await callSendAPI({
    recipient: { id: recipientId },
    message: { text, quick_replies },
  });
}

/**
 * Sends a horizontal scrollable Generic Template (carousel of cards).
 * Each element can have a title, subtitle, and buttons.
 * @param {string} recipientId - Messenger user ID
 * @param {{ title: string, subtitle: string, buttons: object[] }[]} elements
 */
async function sendGenericTemplate(recipientId, elements) {
  await callSendAPI({
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements,
        },
      },
    },
  });
}

/**
 * Shows the main category selection as quick reply buttons.
 * Categories use emoji labels so they look nice in Messenger.
 * @param {string} recipientId - Messenger user ID
 */
async function sendMenuCategories(recipientId) {
  const categoryLabels = ['🍔 Burger', '🍗 Fried Chicken', '🥤 Drinks', '🍱 Combo'];
  await sendQuickReply(
    recipientId,
    'Here is our menu! 🍔\nPlease select a category:',
    categoryLabels,
  );
}

/**
 * Shows all items in a category as a Generic Template carousel.
 * Tries to fetch live menu from FastAPI first; falls back to static menu.js.
 * Each card has an "Order This" button that sends a postback with the item info.
 * Postback payload format:  ORDER_ITEM::{item name}::{price}
 * @param {string} recipientId - Messenger user ID
 * @param {string} category - e.g. 'Burger'
 */
async function sendMenuItems(recipientId, category) {
  // Try live menu from FastAPI first
  const liveMenu = await fetchMenuFromAPI();
  const items = (liveMenu && liveMenu[category]) ? liveMenu[category] : getItemsByCategory(category);

  if (items.length === 0) {
    await sendTextMessage(recipientId, 'Sorry, no items found in that category.');
    return;
  }

  const elements = items.map((item) => {
    const el = {
      title: item.name,
      subtitle: `${item.price} THB`,
      buttons: [
        {
          type: 'postback',
          title: 'Order This',
          payload: `ORDER_ITEM::${item.name}::${item.price}`,
        },
      ],
    };
    if (item.image_url) el.image_url = item.image_url;
    return el;
  });

  await sendGenericTemplate(recipientId, elements);
}

module.exports = {
  sendTextMessage,
  sendQuickReply,
  sendGenericTemplate,
  sendMenuCategories,
  sendMenuItems,
};
