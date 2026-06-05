
const { getState, setState, clearState } = require('./state');
const {
  sendTextMessage,
  sendQuickReply,
  sendMenuCategories,
  sendMenuItems,
} = require('./messenger');
const { sendOrderToAPI } = require('./api');

const RESET_KEYWORDS = ['restart', 'cancel', 'order'];


async function handleMessage(senderId, messageText, postbackPayload) {
  try {
    const text = messageText ? messageText.trim() : null;
    const lowerText = text ? text.toLowerCase() : '';

    if (text && RESET_KEYWORDS.includes(lowerText)) {
      clearState(senderId);
      await sendWelcome(senderId);
      return;
    }

    const state = getState(senderId);

    switch (state.step) {
      case 'waiting_name':
        await handleWaitingName(senderId, text);
        break;

      case 'waiting_phone':
        await handleWaitingPhone(senderId, text);
        break;

      case 'waiting_address':
        await handleWaitingAddress(senderId, text);
        break;

      case 'waiting_category':
        await handleWaitingCategory(senderId, text, postbackPayload);
        break;

      case 'waiting_item':
        await handleWaitingItem(senderId, postbackPayload);
        break;

      case 'waiting_quantity':
        await handleWaitingQuantity(senderId, text);
        break;

      case 'waiting_payment':
        await handleWaitingPayment(senderId, text, postbackPayload);
        break;

      default:
        clearState(senderId);
        await sendWelcome(senderId);
    }
  } catch (err) {
    console.error('[Flow] Unhandled error for user', senderId, err);
    clearState(senderId);
    await sendTextMessage(senderId, 'Sorry, something went wrong. Let\'s start over!');
    await sendWelcome(senderId);
  }
}


async function sendWelcome(senderId) {
  setState(senderId, { step: 'waiting_name' });
  await sendTextMessage(
    senderId,
    'Welcome to DiningInsight Restaurant! 🍽️\nI am your ordering assistant.\nLet\'s start! What is your name?',
  );
}

async function handleWaitingName(senderId, text) {
  if (!text) {
    await sendTextMessage(senderId, 'Please tell me your name to get started.');
    return;
  }

  setState(senderId, { name: text, step: 'waiting_phone' });
  await sendTextMessage(
    senderId,
    `Nice to meet you, ${text}! 😊\nPlease send your phone number. (e.g. 0812345678)`,
  );
}

async function handleWaitingPhone(senderId, text) {
  if (!text) {
    await sendTextMessage(senderId, 'Please send your phone number. (e.g. 0812345678)');
    return;
  }

  const phoneRegex = /^\d{9,10}$/;
  if (!phoneRegex.test(text)) {
    await sendTextMessage(
      senderId,
      '❌ Invalid phone number.\nPlease enter a valid phone number (9-10 digits).',
    );
    return;
  }

  setState(senderId, { phone: text, step: 'waiting_address' });
  await sendTextMessage(senderId, 'Got it! 📍\nPlease send your delivery address.');
}

async function handleWaitingAddress(senderId, text) {
  if (!text) {
    await sendTextMessage(senderId, 'Please send your delivery address.');
    return;
  }

  setState(senderId, { address: text, step: 'waiting_category' });
  await sendMenuCategories(senderId);
}

async function handleWaitingCategory(senderId, text, postbackPayload) {
  const rawInput = text || '';
  const categoryName = extractCategoryName(rawInput);

  if (!categoryName) {
    await sendTextMessage(
      senderId,
      'Please tap one of the category buttons to see the menu.',
    );
    await sendMenuCategories(senderId);
    return;
  }

  setState(senderId, { selectedCategory: categoryName, step: 'waiting_item' });
  await sendMenuItems(senderId, categoryName);
}

function extractCategoryName(input) {
  const VALID_CATEGORIES = ['Burger', 'Fried Chicken', 'Drinks', 'Combo'];
  for (const cat of VALID_CATEGORIES) {
    if (input.endsWith(cat)) return cat;
    if (input.trim() === cat) return cat;
  }
  return null;
}

async function handleWaitingItem(senderId, postbackPayload) {
  if (!postbackPayload || !postbackPayload.startsWith('ORDER_ITEM::')) {
    await sendTextMessage(
      senderId,
      'Please tap the "Order This" button on one of the menu cards.',
    );
    return;
  }

  const parts = postbackPayload.split('::');
  const itemName = parts[1];
  const itemPrice = parseInt(parts[2], 10);

  setState(senderId, {
    selectedItem: itemName,
    itemPrice: itemPrice,
    step: 'waiting_quantity',
  });

  await sendTextMessage(
    senderId,
    `You selected: ${itemName} - ${itemPrice} THB\nHow many would you like? (enter a number)`,
  );
}

async function handleWaitingQuantity(senderId, text) {
  const quantity = parseInt(text, 10);

  if (!text || isNaN(quantity) || quantity < 1 || quantity > 10) {
    await sendTextMessage(
      senderId,
      '❌ Please enter a valid quantity between 1 and 10.',
    );
    return;
  }

  const state = getState(senderId);
  const subtotal = state.itemPrice * quantity;

  setState(senderId, { quantity, step: 'waiting_payment' });

  const summary =
    `📋 Order Summary:\n` +
    `─────────────────\n` +
    `👤 Name: ${state.name}\n` +
    `📞 Phone: ${state.phone}\n` +
    `📍 Address: ${state.address}\n` +
    `🍔 Item: ${state.selectedItem}\n` +
    `🔢 Quantity: ${quantity}\n` +
    `💰 Price: ${state.itemPrice} THB x ${quantity} = ${subtotal} THB\n` +
    `─────────────────\n` +
    `How would you like to pay?`;

  await sendQuickReply(senderId, summary, ['💵 Cash', '🏦 Bank Transfer']);
}

async function handleWaitingPayment(senderId, text, postbackPayload) {
  const input = text || '';
  let paymentMethod = null;

  if (input.includes('Cash')) paymentMethod = 'Cash';
  else if (input.includes('Bank Transfer')) paymentMethod = 'Bank Transfer';

  if (!paymentMethod) {
    await sendTextMessage(senderId, 'Please tap either "💵 Cash" or "🏦 Bank Transfer".');
    return;
  }

  const state = getState(senderId);
  const quantity = state.quantity;
  const subtotal = state.itemPrice * quantity;

  const orderData = {
    restaurant_id: process.env.RESTAURANT_ID,
    messenger_id: senderId,
    name: state.name,
    phone: state.phone,
    address: state.address,
    items: [
      {
        name: state.selectedItem,
        quantity,
        price: state.itemPrice,
        subtotal,
      },
    ],
    total_price: subtotal,
    payment_method: paymentMethod,
    status: 'pending',
    ordered_at: new Date().toISOString(),
  };

  await sendOrderToAPI(orderData);

  clearState(senderId);

  await sendTextMessage(
    senderId,
    `✅ Order Confirmed!\n` +
    `Thank you ${state.name}! Your order has been placed.\n` +
    `We will deliver to: ${state.address}\n` +
    `Payment: ${paymentMethod}\n` +
    `We will notify you when your order is ready! 🚀\n\n` +
    `Type 'order' to place another order.`,
  );
}

module.exports = { handleMessage };
