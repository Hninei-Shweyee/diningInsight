import { neon } from '@neondatabase/serverless';

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0/me/messages';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const RESTAURANT_ID = 'ttVU1DGA30aslTvyaf3g1Z6pwNh1';
const RESTAURANT_NAME = 'Jasmine Restaurant';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalize(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function titleCase(text = '') {
  return text
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function splitMessageParts(text = '') {
  return text
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function emptyOrder() {
  return {
    name: null,
    phone: null,
    address: null,
    payment_method: null,
    items: [],
  };
}

function totalPrice(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function ensureSessionTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS chatbot_sessions (
      messenger_id VARCHAR(80) PRIMARY KEY,
      restaurant_id VARCHAR(50) NOT NULL,
      state VARCHAR(40) NOT NULL DEFAULT 'collecting',
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getSession(sql, messengerId) {
  await ensureSessionTable(sql);
  const rows = await sql`
    SELECT state, data
    FROM chatbot_sessions
    WHERE messenger_id = ${messengerId}
    AND restaurant_id = ${RESTAURANT_ID}
  `;

  if (!rows.length) {
    return { state: 'collecting', data: { order: emptyOrder() } };
  }

  const data = rows[0].data || {};
  return {
    state: rows[0].state || 'collecting',
    data: { ...data, order: { ...emptyOrder(), ...(data.order || {}) } },
  };
}

async function saveSession(sql, messengerId, session) {
  await ensureSessionTable(sql);
  await sql`
    INSERT INTO chatbot_sessions (messenger_id, restaurant_id, state, data, updated_at)
    VALUES (${messengerId}, ${RESTAURANT_ID}, ${session.state}, ${JSON.stringify(session.data)}::jsonb, NOW())
    ON CONFLICT (messenger_id)
    DO UPDATE SET state = EXCLUDED.state, data = EXCLUDED.data, updated_at = NOW()
  `;
}

async function clearSession(sql, messengerId) {
  await ensureSessionTable(sql);
  await sql`
    DELETE FROM chatbot_sessions
    WHERE messenger_id = ${messengerId}
    AND restaurant_id = ${RESTAURANT_ID}
  `;
}

async function getMenuRows(sql) {
  return sql`
    SELECT id, name, category, price, is_special
    FROM menu_items
    WHERE restaurant_id = ${RESTAURANT_ID}
    AND is_available = true
    ORDER BY category, name
  `;
}

function formatMenu(rows) {
  const grouped = {};
  for (const row of rows) {
    const category = row.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(row);
  }

  let text = '🍽️ OUR MENU\n\n';
  for (const [category, items] of Object.entries(grouped)) {
    text += `${category.toUpperCase()}\n`;
    items.forEach((item, index) => {
      const special = item.is_special ? ' 🔥 SPECIAL' : '';
      text += `${index + 1}. ${item.name}${special} - ${parseFloat(item.price).toLocaleString()} THB\n`;
    });
    text += '\n';
  }

  text += 'You can send your order in one message, like: "2 Cheese Burger, cash, Hnin, 0812345678, Bangkok".';
  return text;
}

function isMenuRequest(text = '') {
  const lower = normalize(text);
  return lower.includes('menu') ||
    lower.includes('food') ||
    lower.includes('what do you have') ||
    lower.includes('စားစရာ') ||
    lower.includes('ဘာရှိ');
}

function greetingInfo(text = '') {
  const lower = normalize(text)
    .replace(/[^\w\s']/g, '')
    .replace(/\b(there|dear|sir|madam|everyone|all)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const greetings = [
    { pattern: /^(good\s+morning|morning)$/i, reply: 'Good morning' },
    { pattern: /^(good\s+afternoon|afternoon)$/i, reply: 'Good afternoon' },
    { pattern: /^(good\s+evening|evening)$/i, reply: 'Good evening' },
    { pattern: /^(good\s+night|night)$/i, reply: 'Good night' },
    { pattern: /^(hi|hello|hey|hiya|yo)$/i, reply: 'Hello' },
    { pattern: /^(what'?s\s+up|whats\s+up|sup)$/i, reply: 'Hello' },
  ];

  return greetings.find((entry) => entry.pattern.test(lower)) || null;
}

function isGreeting(text = '') {
  return Boolean(greetingInfo(text));
}

function greetingResponse(text = '') {
  const greeting = greetingInfo(text)?.reply || 'Hello';
  return `${greeting}! Welcome to Dining Insight. How can I help you today?`;
}

function isUnmatchedFoodRequest(text, menuRows) {
  const lower = normalize(text);
  const foodPatterns = [
    /\bi\s+want\s+/,
    /\bi\s+would\s+like\s+/,
    /\bi'd\s+like\s+/,
    /\bgive\s+me\s+/,
    /\bi\s+need\s+/,
    /\bi'll\s+have\s+/,
    /\bget\s+me\s+/,
    /\bcan\s+i\s+(get|have|order)\s+/,
    /\bdo\s+you\s+have\s+/,
    /\bhow\s+about\s+/,
  ];

  const hasFoodIntent = foodPatterns.some(p => p.test(lower));
  if (!hasFoodIntent) return false;

  const found = findMenuItems(text, menuRows);
  return found.length === 0;
}

function isPriceInquiry(text = '') {
  const lower = normalize(text);
  const hasPriceWord = /\b(how\s+much|price|cost|what\s+is\s+the\s+price)\b/i.test(lower);
  const hasItemName = lower.replace(
    /\b(how\s+much|what(\s+is)?|the\s+price\s+of|price\s+of|cost\s+of|is|are|a|an|one|for|please|tell\s+me|can\s+you|does|do|i\s+want\s+to\s+know|whats|what's)\b/gi, ''
  ).trim().length > 1;

  return hasPriceWord && hasItemName && !/\b\d{1,2}\s*(x|pcs|pieces?)\b/i.test(lower);
}

function priceInquiryResponse(text, menuRows) {
  const lower = normalize(text);
  const sorted = [...menuRows].sort((a, b) => b.name.length - a.name.length);

  for (const row of sorted) {
    if (lower.includes(normalize(row.name))) {
      const special = row.is_special ? ' 🔥 SPECIAL' : '';
      const price = parseFloat(row.price).toLocaleString();
      return `${row.name}${special} is ${price} THB. Would you like to order it?`;
    }
  }

  return `I couldn't find that item on our menu. You can view our full menu by typing "menu".`;
}

function isReset(text = '') {
  return ['cancel', 'restart', 'start over', 'new order'].some((word) => normalize(text).includes(word));
}

function isAffirmation(text = '') {
  const lower = normalize(text).replace(/[.!?]+$/g, '');
  return [
    'yes',
    'yes please',
    'confirm',
    'confirmed',
    'ok',
    'okay',
    'place order',
    'that is it',
    "that's it",
    'sure',
  ].includes(lower);
}

function hasCorrectionIntent(text = '') {
  const lower = normalize(text);
  return lower.includes('wrong') ||
    lower.includes('change') ||
    lower.includes('replace') ||
    lower.includes('update') ||
    lower.includes('correct ') ||
    lower.includes('correction') ||
    lower.includes('remove') ||
    lower.includes('delete') ||
    lower.includes('no ') ||
    lower.includes("don't want") ||
    lower.includes('do not want') ||
    lower.includes('sorry') ||
    lower.includes('sry') ||
    lower.includes('instead');
}

function hasRemoveItemIntent(text = '') {
  const lower = normalize(text);
  return /\b(remove|delete)\b/.test(lower) ||
    /\b(no|without)\b/.test(lower) ||
    /\b(don't want|do not want|dont want|not want)\b/.test(lower);
}

function correctionField(text = '') {
  const lower = normalize(text);
  if (/\b(name|customer name)\b/.test(lower)) return 'name';
  if (/\b(phone|mobile|tel|telephone|number)\b/.test(lower)) return 'phone';
  if (/\b(address|delivery|deliver to|location)\b/.test(lower)) return 'address';
  if (/\b(payment|pay|cash|bank|transfer|card)\b/.test(lower)) return 'payment';
  if (/\b(item|food|order)\b/.test(lower)) return 'items';
  return null;
}

function extractPayment(text = '') {
  const lower = normalize(text);
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('bank')) return 'Bank Transfer';
  if (lower.includes('transfer')) return 'Bank Transfer';
  if (lower.includes('card')) return 'Card';
  return null;
}

function extractPhone(text = '') {
  const match = text.match(/(?:phone|mobile|tel|telephone|number)?(?:\s*number)?\s*[-:]?\s*(\+?\d[\d\s-]{6,18}\d)/i);
  if (!match) return null;
  const phone = match[1].replace(/[^\d+]/g, '');
  return isValidPhone(phone) ? phone : null;
}

function cleanAddress(text = '') {
  return titleCase(text
    .replace(/^(wrong\s*)?(address|delivery address|deliver to|delivery)\s*[:\-]?\s*/i, '')
    .replace(/^(change|update|correct|replace)\s+(my\s+)?(address|delivery address|delivery|location)\s*(to|is)?\s*[:\-]?\s*/i, '')
    .replace(/\b(this is|that is|is)\s+(the\s+)?correct\s+address\b/ig, '')
    .replace(/\b(correct|please|pls|sry|sorry|wrong address|wrong)\b/ig, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim());
}

function hasInvalidPhoneCandidate(text = '') {
  const candidates = text.match(/\+?\d[\d\s-]{4,18}\d/g) || [];
  return candidates.some((candidate) => {
    const digits = candidate.replace(/[^\d+]/g, '');
    return digits.replace(/[^\d]/g, '').length >= 5 && !isValidPhone(digits);
  });
}

function isValidPhone(phone = '') {
  const compact = phone.replace(/[^\d+]/g, '');
  return /^0[689]\d{8}$/.test(compact) || /^\+66[689]\d{8}$/.test(compact) || /^66[689]\d{8}$/.test(compact);
}

function extractQuantity(text = '') {
  const lower = normalize(text);
  const patterns = [
    /\bx\s*(\d{1,2})\b/i,
    /\bqty\s*[:\-]?\s*(\d{1,2})\b/i,
    /\bquantity\s*[:\-]?\s*(\d{1,2})\b/i,
    /\b(\d{1,2})\s*(?:pcs?|pieces?|orders?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) return Number(match[1]);
  }

  for (const line of text.split(/\n+/).map((part) => part.trim())) {
    if (/^\d{1,2}$/.test(line)) return Number(line);
  }

  return null;
}

function findMenuItem(text, menuRows) {
  const lower = normalize(text);
  const sorted = [...menuRows].sort((a, b) => b.name.length - a.name.length);

  for (const row of sorted) {
    if (lower.includes(normalize(row.name))) {
      return {
        menu_item_id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        is_special: Boolean(row.is_special),
      };
    }
  }

  return null;
}

function quantityNearItem(text, menuName, fallback = null) {
  const escaped = menuName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`\\b(\\d{1,2})\\s*(?:x|pcs?|pieces?|orders?)?\\s+${escaped}\\b`, 'i'),
    new RegExp(`\\b${escaped}\\b\\s*(?:-|x|:)?\\s*(\\d{1,2})\\b`, 'i'),
    new RegExp(`\\b${escaped}\\b.*?\\bqty\\s*[:\\-]?\\s*(\\d{1,2})\\b`, 'i'),
    new RegExp(`\\b${escaped}\\b.*?\\bquantity\\s*[:\\-]?\\s*(\\d{1,2})\\b`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return fallback;
}

function findMenuItems(text, menuRows) {
  const found = [];
  const sorted = [...menuRows].sort((a, b) => b.name.length - a.name.length);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const lowerText = normalize(text);
  const occupied = [];

  const overlapsExistingMatch = (start, end) => occupied.some((span) => start < span.end && end > span.start);

  for (const row of sorted) {
    const name = row.name;
    const normalizedName = normalize(name);
    const start = lowerText.indexOf(normalizedName);
    if (start === -1) continue;

    const end = start + normalizedName.length;
    if (overlapsExistingMatch(start, end)) continue;

    const line = lines.find((entry) => normalize(entry).includes(normalize(name)));
    const source = line || text;

    found.push({
      menu_item_id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      is_special: Boolean(row.is_special),
      quantity: quantityNearItem(source, name, extractQuantity(source)) || 1,
    });
    occupied.push({ start, end });
  }

  return found;
}

function isLikelyGibberish(text = '', menuRows = []) {
  const lower = normalize(text);
  if (!lower) return true;
  if (
    isGreeting(text) ||
    isMenuRequest(text) ||
    hasCorrectionIntent(text) ||
    extractPayment(text) ||
    extractPhone(text) ||
    hasInvalidPhoneCandidate(text) ||
    findMenuItems(text, menuRows).length
  ) {
    return false;
  }

  const letters = lower.replace(/[^a-z]/g, '');
  const words = lower.split(/\s+/).filter(Boolean);
  if (!letters) return false;
  if (words.length === 1 && letters.length >= 6 && !/[aeiou]/.test(letters)) return true;
  if (words.length <= 2 && letters.length >= 8 && (letters.match(/[aeiou]/g) || []).length <= 1) return true;
  if (/^[a-z]{5,}$/.test(letters) && /(.)\1{3,}/.test(letters)) return true;
  return false;
}

function looksLikeAddress(line = '') {
  const lower = normalize(line);
  return lower.includes('street') ||
    lower.includes('road') ||
    lower.includes('soi') ||
    lower.includes('moo') ||
    lower.includes('tambon') ||
    lower.includes('district') ||
    lower.includes('province') ||
    lower.includes('bangkok') ||
    lower.includes('thailand') ||
    lower.includes('chiang') ||
    /\bcnx\b/.test(lower) ||
    lower.includes('apartment') ||
    lower.includes('building') ||
    lower.includes('room') ||
    lower.includes('condo') ||
    lower.includes('village') ||
    lower.includes('floor') ||
    lower.includes('landmark') ||
    /\d/.test(line);
}

function looksLikePlainLocation(line = '') {
  const lower = normalize(line);
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 8) return false;
  if (!/^[a-z0-9 .,'/-]+$/i.test(line.trim())) return false;
  if (looksLikeOrderOrMenuText(line)) return false;
  return true;
}

function looksLikeOrderOrMenuText(text = '') {
  const lower = normalize(text);
  return /\b(i\s+want|i\s+need|i\s+would\s+like|i'd\s+like|i\s+will\s+have|i'll\s+have|can\s+i\s+(get|have|order)|give\s+me|get\s+me|order|menu|food|drink|drint|eat|burger|chicken|cola|juice|tea|water)\b/.test(lower) ||
    /\b(let\s+me\s+see|show\s+me|what\s+do\s+you\s+have)\b/.test(lower);
}

function cleanName(line = '') {
  return line
    .replace(/^(wrong\s*)?(name|my name is|i am|i'm|customer name)\s*[:\-]?\s*/i, '')
    .replace(/^i\s+name\s+is\s+/i, '')
    .replace(/^(change|update|correct|replace)\s+(my\s+)?(name|customer name)\s*(to|is)?\s*[:\-]?\s*/i, '')
    .replace(/^(correct\s+)?name\s+is\s+/i, '')
    .replace(/\b(this is|that is|is)\s+(the\s+)?correct\s+name\b/ig, '')
    .replace(/\b(correct|please|pls|sry|sorry|wrong name|wrong)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAddressLine(text = '', menuRows = []) {
  const lines = splitMessageParts(text);
  const addressKeyword = lines.find((line) => /address|delivery|deliver to/i.test(line));
  if (addressKeyword) {
    const cleaned = cleanAddress(addressKeyword);
    return cleaned || null;
  }

  const field = hasCorrectionIntent(text) ? correctionField(text) : null;
  if (field && field !== 'address') return null;

  for (const line of lines) {
    const lower = normalize(line);
    if (
      extractPayment(line) ||
      extractPhone(line) ||
      hasInvalidPhoneCandidate(line) ||
      findMenuItem(line, menuRows) ||
      /^\d{1,2}$/.test(line) ||
      lower.includes('order') ||
      lower.includes('wrong') ||
      lower.includes('name') ||
      lower.includes('please')
    ) {
      continue;
    }

    if (looksLikeAddress(line)) return cleanAddress(line);
  }

  return null;
}

function extractNameLine(text = '', menuRows = []) {
  const lines = splitMessageParts(text);
  const nameKeyword = lines.find((line) => /\b(name|my name is|i am|i'm|customer name)\b/i.test(line));
  if (nameKeyword) {
    const cleaned = cleanName(nameKeyword);
    return isValidName(cleaned) ? titleCase(cleaned) : null;
  }

  const field = hasCorrectionIntent(text) ? correctionField(text) : null;
  if (field && field !== 'name') return null;

  for (const line of lines) {
    const lower = normalize(line);
    const cleanedName = cleanName(line);

    if (
      extractPayment(line) ||
      extractPhone(line) ||
      hasInvalidPhoneCandidate(line) ||
      findMenuItem(line, menuRows) ||
      /^\d{1,2}$/.test(line) ||
      isGreeting(line) ||
      looksLikeAddress(line) ||
      looksLikeOrderOrMenuText(line) ||
      lower.includes('order') ||
      lower.includes('wrong') ||
      lower.includes('please')
    ) {
      continue;
    }

    if (isValidName(cleanedName)) return titleCase(cleanedName);
  }

  return null;
}

function isValidName(name = '') {
  const cleaned = name.trim();
  if (!/^[a-z .'-]{2,40}$/i.test(cleaned)) return false;
  const letters = cleaned.replace(/[^a-z]/gi, '');
  if (letters.length < 2) return false;
  if (letters.length >= 6 && !/[aeiou]/i.test(letters)) return false;
  return true;
}

function applyMessageToOrder(order, text, menuRows) {
  const updated = { ...emptyOrder(), ...order, items: [...(order.items || [])] };
  const items = findMenuItems(text, menuRows);
  const quantity = extractQuantity(text);
  const payment = extractPayment(text);
  const phone = extractPhone(text);
  const isCorrection = hasCorrectionIntent(text);
  const field = isCorrection ? correctionField(text) : null;

  if (payment) updated.payment_method = payment;
  if (phone && (!field || field === 'phone')) updated.phone = phone;
  if (!phone && isCorrection && (field === 'phone' || hasInvalidPhoneCandidate(text))) updated.phone = null;

  if (items.length) {
    if (hasRemoveItemIntent(text)) {
      const removeNames = new Set(items.map((item) => item.name.toLowerCase()));
      updated.items = updated.items.filter((item) => !removeNames.has(item.name.toLowerCase()));
    } else if (isCorrection) {
      const replaceAll = /\b(new order|replace order|wrong order|change order)\b/i.test(text);
      if (replaceAll || !updated.items.length) {
        updated.items = items;
      } else {
        for (const item of items) {
          const existing = updated.items.find((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
          if (existing) {
            existing.quantity = item.quantity || existing.quantity || 1;
          } else {
            updated.items.push(item);
          }
        }
      }
    } else {
      for (const item of items) {
        const existing = updated.items.find((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          existing.quantity = item.quantity || existing.quantity || 1;
        } else {
          updated.items.push(item);
        }
      }
    }
  } else if (quantity && updated.items.length) {
    updated.items[updated.items.length - 1].quantity = quantity;
  }

  const name = extractNameLine(text, menuRows);
  const address = extractAddressLine(text, menuRows);
  const onlyAddressMissing = Boolean(
    updated.items.length &&
    updated.name &&
    updated.phone &&
    isValidPhone(updated.phone) &&
    updated.payment_method &&
    !updated.address
  );
  const fallbackAddress = !address && onlyAddressMissing
    ? splitMessageParts(text).find((line) => {
      const lower = normalize(line);
      return !extractPayment(line) &&
        !extractPhone(line) &&
        !hasInvalidPhoneCandidate(line) &&
        !findMenuItem(line, menuRows) &&
        !/^\d{1,2}$/.test(line) &&
        !lower.includes('order') &&
        !lower.includes('wrong') &&
        !lower.includes('name') &&
        !lower.includes('please') &&
        looksLikePlainLocation(line);
    })
    : null;
  const resolvedAddress = address || (fallbackAddress ? cleanAddress(fallbackAddress) : null);

  if (name && (!updated.name || field === 'name' || (!field && isCorrection) || /\b(name|my name|customer name)\b/i.test(text))) updated.name = name;
  if (resolvedAddress && (!updated.address || field === 'address' || (!field && isCorrection) || /\b(address|delivery|deliver to)\b/i.test(text) || onlyAddressMissing)) updated.address = resolvedAddress;

  return updated;
}

function missingFields(order) {
  const missing = [];
  if (!order.items.length) missing.push('food item');
  if (order.items.some((item) => !item.quantity || item.quantity < 1)) missing.push('quantity');
  if (!order.name) missing.push('name');
  if (!order.phone || !isValidPhone(order.phone)) missing.push('phone number');
  if (!order.address) missing.push('delivery address');
  if (!order.payment_method) missing.push('payment method');
  return missing;
}

function nextQuestion(order) {
  const missing = missingFields(order);
  if (!missing.length) return confirmationText(order);

  if (missing.includes('food item')) {
    return 'Sure, what would you like to order? You can type it like "2 Cheese Burger".';
  }

  if (missing.includes('quantity')) {
    return `Got it. How many ${order.items[0].name} would you like?`;
  }

  const labels = {
    name: 'your name',
    'phone number': 'phone number',
    'delivery address': 'your delivery address',
    'payment method': 'payment method, Cash / Bank Transfer / Card',
  };

  const friendly = missing.map((field) => labels[field] || field);
  return `Got it, thank you. I just need ${friendly.join(', ')} to finish the order. You can send everything in one message.`;
}

function confirmationText(order) {
  const lines = order.items.map((item) => {
    const special = item.is_special ? ' 🔥 SPECIAL' : '';
    return `- ${item.name}${special} x ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} THB`;
  });

  return `Thanks, ${order.name}. Here is what I have for your order:\n\n` +
    `${lines.join('\n')}\n` +
    `- Total: ${totalPrice(order).toLocaleString()} THB\n` +
    `- Phone: ${order.phone}\n` +
    `- Delivery: ${order.address}\n` +
    `- Payment: ${order.payment_method}\n\n` +
    `Does everything look right? Reply "yes" and I will place it, or send me any correction.`;
}

async function saveOrder(sql, messengerId, order) {
  const existing = await sql`
    SELECT id FROM customers
    WHERE messenger_id = ${messengerId}
    AND restaurant_id = ${RESTAURANT_ID}
  `;

  let customerId;
  if (existing.length) {
    customerId = existing[0].id;
    await sql`
      UPDATE customers
      SET name = ${order.name}, phone = ${order.phone}, address = ${order.address}
      WHERE id = ${customerId}
    `;
  } else {
    const rows = await sql`
      INSERT INTO customers (restaurant_id, messenger_id, name, phone, address, created_at)
      VALUES (${RESTAURANT_ID}, ${messengerId}, ${order.name}, ${order.phone}, ${order.address}, NOW())
      RETURNING id
    `;
    customerId = rows[0].id;
  }

  const orderRows = await sql`
    INSERT INTO orders (restaurant_id, customer_id, total_price, payment_method, status, ordered_at)
    VALUES (${RESTAURANT_ID}, ${customerId}, ${totalPrice(order)}, ${order.payment_method}, 'pending', NOW())
    RETURNING id
  `;
  const orderId = orderRows[0].id;

  for (const item of order.items) {
    const subtotal = item.price * item.quantity;
    await sql`
      INSERT INTO order_items (order_id, item_name, quantity, price, subtotal)
      VALUES (${orderId}, ${item.name}, ${item.quantity}, ${item.price}, ${subtotal})
    `;
  }

  return orderId;
}

function formatTelegramOrder(orderId, order, messengerId) {
  const orderedAt = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemLines = order.items.map((item, index) => {
    const subtotal = item.price * item.quantity;
    return `${index + 1}. ${item.name} x ${item.quantity} = ${subtotal.toLocaleString()} THB`;
  });

  return [
    `Facebook Order - ${RESTAURANT_NAME}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `Order ID: #${orderId}`,
    `Date: ${orderedAt}`,
    `Name: ${order.name}`,
    `Phone: ${order.phone}`,
    '',
    'Items:',
    ...itemLines,
    `Total: ${totalPrice(order).toLocaleString()} THB`,
    `Payment: ${order.payment_method}`,
    '━━━━━━━━━━━━━━━━━━━━',
    'Address:',
    order.address,
    '━━━━━━━━━━━━━━━━━━━━',
    `New order received - ${RESTAURANT_NAME}`,
  ].join('\n');
}

async function sendTelegramNotification(env, orderId, order, messengerId) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatTelegramOrder(orderId, order, messengerId),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram notification failed: ${response.status} ${body}`);
  }
}

async function sendMessengerText(env, recipientId, text) {
  const response = await fetch(`${GRAPH_API_URL}?access_token=${env.PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Messenger send failed: ${response.status} ${body}`);
  }
}

async function askDeepSeek(env, userText, menuText, order) {
  const apiKey = env.DEEPSEEK_API_KEY || env['DEEPSEEK_API_KEY '];
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY secret');

  const systemPrompt = `You are a warm restaurant assistant for Dining Insight.
Reply naturally and briefly, like a helpful human.
Do not invent menu items or prices.
If the customer is ordering, do not ask for details already known.

Live menu:
${menuText}

Known customer/order details:
${JSON.stringify(order, null, 2)}`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0.45,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Sure, I can help with that.';
}

async function buildReply(sql, env, senderId, text) {
  const menuRows = await getMenuRows(sql);
  const menuText = formatMenu(menuRows);
  const session = await getSession(sql, senderId);

  if (isReset(text)) {
    await clearSession(sql, senderId);
    return 'No problem, I cleared the current order. What would you like to order today?';
  }

  if (isMenuRequest(text)) {
    await saveSession(sql, senderId, session);
    return menuText;
  }

  if (isPriceInquiry(text)) {
    await saveSession(sql, senderId, session);
    return priceInquiryResponse(text, menuRows);
  }

  if (isGreeting(text)) {
    await saveSession(sql, senderId, session);
    return greetingResponse(text);
  }

  if (isLikelyGibberish(text, menuRows)) {
    await saveSession(sql, senderId, session);
    return 'Sorry, I could not understand that. Please send a real order or customer detail, or type "menu".';
  }

  const order = applyMessageToOrder(session.data.order, text, menuRows);

  if (isUnmatchedFoodRequest(text, menuRows)) {
    session.data.order = order;
    await saveSession(sql, senderId, session);
    return `Sorry, I couldn't find that on our menu. Type "menu" to browse what we have, or pick from our available items!`;
  }

  if (hasInvalidPhoneCandidate(text) && !extractPhone(text)) {
    session.state = 'collecting';
    session.data.order = order;
    await saveSession(sql, senderId, session);
    return 'That phone number looks invalid. Please send a correct phone number.';
  }

  if (session.state === 'awaiting_confirmation' && isAffirmation(text)) {
    if (missingFields(order).length) {
      session.state = 'collecting';
      session.data.order = order;
      await saveSession(sql, senderId, session);
      return nextQuestion(order);
    }

    const orderId = await saveOrder(sql, senderId, order);
    try {
      await sendTelegramNotification(env, orderId, order, senderId);
    } catch (error) {
      console.error(error);
    }
    await clearSession(sql, senderId);
    return `Perfect, ${order.name}. Your order is confirmed.\n\nOrder #${orderId}\nTotal: ${totalPrice(order).toLocaleString()} THB\n\nWe will start preparing it now. Thank you.`;
  }

  if (missingFields(order).length) {
    session.state = 'collecting';
    session.data.order = order;
    await saveSession(sql, senderId, session);

    const lower = normalize(text);
    if (!order.items.length && !lower.includes('order') && !extractPhone(text) && !extractPayment(text)) {
      return askDeepSeek(env, text, menuText, order);
    }

    return nextQuestion(order);
  }

  session.state = 'awaiting_confirmation';
  session.data.order = order;
  await saveSession(sql, senderId, session);
  return confirmationText(order);
}

async function handleWebhookPost(request, env) {
  const body = await request.json();
  if (body.object !== 'page') return json({ ignored: true });

  const sql = neon(env.DATABASE_URL);
  const tasks = [];

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      if (!senderId || event.message?.is_echo) continue;

      const text = event.message?.text || event.postback?.title || event.postback?.payload || '';
      if (!text) continue;

      tasks.push((async () => {
        try {
          const reply = await buildReply(sql, env, senderId, text);
          await sendMessengerText(env, senderId, reply);
        } catch (error) {
          console.error(error);
          await sendMessengerText(env, senderId, 'Sorry, something went wrong for a moment. Could you send that one more time?');
        }
      })());
    }
  }

  await Promise.all(tasks);
  return json({ success: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe') {
        if (token === env.VERIFY_TOKEN) {
          return new Response(challenge || '', { status: 200 });
        }
        return new Response('Verification failed - token mismatch', { status: 403 });
      }

      if (url.pathname === '/menu' || url.pathname === '/menu/text') {
        try {
          const sql = neon(env.DATABASE_URL);
          return new Response(formatMenu(await getMenuRows(sql)), {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        } catch (error) {
          return json({ error: error.message }, 500);
        }
      }

      return new Response('Dining Insight Messenger worker is running.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (request.method === 'POST') {
      return handleWebhookPost(request, env);
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
