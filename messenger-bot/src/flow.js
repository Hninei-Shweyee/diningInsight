// flow.js — Conversation flow logic for DiningInsight ordering bot
// This file is the brain of the bot. It reads the current state for a user,
// decides what to do with their message, and sends the appropriate reply.

const { getState, setState, clearState } = require('./state');
const {
  sendTextMessage,
  sendQuickReply,
  sendMenuCategories,
  sendMenuItems,
} = require('./messenger');
const { sendOrderToAPI } = require('./api');

// Special keywords that reset the conversation from any step
const RESET_KEYWORDS = ['restart', 'cancel', 'order'];

// ---------------------------------------------------------------------------
// Main entry point — called by webhook.js for every incoming event
// ---------------------------------------------------------------------------

/**
 * Routes an incoming event to the correct step handler.
 * @param {string} senderId - Messenger user ID
 * @param {string|null} messageText - Text sent by the user (null for postbacks)
 * @param {string|null} postbackPayload - Postback payload (null for text messages)
 */
async function handleMessage(senderId, messageText, postbackPayload) {
  try {
    // Normalize text: trim whitespace and lowercase for keyword checks
    const text = messageText ? messageText.trim() : null;
    const lowerText = text ? text.toLowerCase() : '';

    // --- Special reset commands (work at any step) ---
    if (text && RESET_KEYWORDS.includes(lowerText)) {
      clearState(senderId);
      await sendWelcome(senderId);
      return;
    }

    const state = getState(senderId);

    // --- Route to the correct step handler ---
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
        // Category arrives as a quick reply — payload is the uppercased label
        // e.g. payload "🍔_BURGER" or text "🍔 Burger"
        await handleWaitingCategory(senderId, text, postbackPayload);
        break;

      case 'waiting_item':
        // Item selection arrives as a postback: ORDER_ITEM::name::price
        await handleWaitingItem(senderId, postbackPayload);
        break;

      case 'waiting_quantity':
        await handleWaitingQuantity(senderId, text);
        break;

      case 'waiting_payment':
        // Payment arrives as a quick reply payload: "💵_CASH" or "🏦_BANK_TRANSFER"
        await handleWaitingPayment(senderId, text, postbackPayload);
        break;

      default:
        // Unknown/corrupt state — reset and start fresh
        clearState(senderId);
        await sendWelcome(senderId);
    }
  } catch (err) {
    console.error('[Flow] Unhandled error for user', senderId, err);
    // Reset state to prevent the user getting permanently stuck
    clearState(senderId);
    await sendTextMessage(senderId, 'Sorry, something went wrong. Let\'s start over!');
    await sendWelcome(senderId);
  }
}

// ---------------------------------------------------------------------------
// Step handlers
// ---------------------------------------------------------------------------

/** Sends the welcome message and sets state to waiting_name. */
async function sendWelcome(senderId) {
  setState(senderId, { step: 'waiting_name' });
  await sendTextMessage(
    senderId,
    'Welcome to DiningInsight Restaurant! 🍽️\nI am your ordering assistant.\nLet\'s start! What is your name?',
  );
}

/** STEP 1 — Receive the customer's name. */
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

/** STEP 2 — Receive and validate the customer's phone number. */
async function handleWaitingPhone(senderId, text) {
  if (!text) {
    await sendTextMessage(senderId, 'Please send your phone number. (e.g. 0812345678)');
    return;
  }

  // Phone must be 9–10 digits only
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

/** STEP 3 — Receive the customer's delivery address. */
async function handleWaitingAddress(senderId, text) {
  if (!text) {
    await sendTextMessage(senderId, 'Please send your delivery address.');
    return;
  }

  setState(senderId, { address: text, step: 'waiting_category' });
  await sendMenuCategories(senderId);
}

/** STEP 4 — Handle category selection (arrives as a quick reply). */
async function handleWaitingCategory(senderId, text, postbackPayload) {
  // Quick reply text arrives as e.g. "🍔 Burger" — extract the category name
  // by stripping the leading emoji and space (everything after the first space)
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

/**
 * Strips the emoji prefix from a category quick reply label.
 * "🍔 Burger" → "Burger", "🍗 Fried Chicken" → "Fried Chicken"
 * Returns null if the input doesn't match any known category.
 */
function extractCategoryName(input) {
  const VALID_CATEGORIES = ['Burger', 'Fried Chicken', 'Drinks', 'Combo'];
  // Try matching by checking if the input ends with a known category name
  for (const cat of VALID_CATEGORIES) {
    if (input.endsWith(cat)) return cat;
    // Also accept the bare category name typed directly
    if (input.trim() === cat) return cat;
  }
  return null;
}

/** STEP 5 — Handle "Order This" postback and ask for quantity. */
async function handleWaitingItem(senderId, postbackPayload) {
  if (!postbackPayload || !postbackPayload.startsWith('ORDER_ITEM::')) {
    await sendTextMessage(
      senderId,
      'Please tap the "Order This" button on one of the menu cards.',
    );
    return;
  }

  // Payload format: ORDER_ITEM::{item name}::{price}
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

/** STEP 6 — Receive and validate quantity, then show the order summary. */
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

/** STEP 7 — Receive payment method, submit order, confirm to customer. */
async function handleWaitingPayment(senderId, text, postbackPayload) {
  // Payment arrives as quick reply text: "💵 Cash" or "🏦 Bank Transfer"
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

  // Build the order object to send to the backend
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

  // Submit order (mock for now — see api.js)
  await sendOrderToAPI(orderData);

  // Clear session before sending the final message
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
