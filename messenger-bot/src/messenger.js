
const axios = require('axios');
const { CATEGORIES, getItemsByCategory } = require('./menu');
const { fetchMenuFromAPI } = require('./api');

const FB_MESSAGES_URL = 'https://graph.facebook.com/v19.0/me/messages';

async function callSendAPI(body) {
  try {
    await axios.post(FB_MESSAGES_URL, body, {
      params: { access_token: process.env.PAGE_ACCESS_TOKEN },
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const fbError = error.response?.data?.error;
    if (fbError) {
      console.error('[Messenger] Facebook API error:', fbError);
    } else {
      console.error('[Messenger] Failed to send message:', error.message);
    }
  }
}

async function sendTextMessage(recipientId, text) {
  await callSendAPI({
    recipient: { id: recipientId },
    message: { text },
  });
}

async function sendQuickReply(recipientId, text, options) {
  const quick_replies = options.map((option) => ({
    content_type: 'text',
    title: option,
    payload: option.toUpperCase().replace(/ /g, '_'),
  }));

  await callSendAPI({
    recipient: { id: recipientId },
    message: { text, quick_replies },
  });
}

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

async function sendMenuCategories(recipientId) {
  const categoryLabels = ['🍔 Burger', '🍗 Fried Chicken', '🥤 Drinks', '🍱 Combo'];
  await sendQuickReply(
    recipientId,
    'Here is our menu! 🍔\nPlease select a category:',
    categoryLabels,
  );
}

async function sendMenuItems(recipientId, category) {
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
