import { describe, it, expect } from 'vitest'

// --- functions under test (from young-bread-worker.js) ---

function normalize(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function titleCase(text = '') {
  return text
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function splitMessageParts(text = '') {
  return text
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

// --- normalize ---

describe('normalize', () => {
  it('TC-01: should lowercase and collapse whitespace', () => {
    expect(normalize('  HELLO   World  ')).toBe('hello world')
  })

  it('TC-02: should return empty string for empty input', () => {
    expect(normalize('')).toBe('')
  })

  it('TC-03: should return empty string for undefined input', () => {
    expect(normalize(undefined)).toBe('')
  })
})

// --- titleCase ---

describe('titleCase', () => {
  it('TC-04: should capitalize each word', () => {
    expect(titleCase('hnin aye')).toBe('Hnin Aye')
  })

  it('TC-05: should trim and capitalize mixed-case input', () => {
    expect(titleCase('  john DOE  ')).toBe('John Doe')
  })

  it('TC-06: should return empty string for empty input', () => {
    expect(titleCase('')).toBe('')
  })
})

// --- emptyOrder ---

function emptyOrder() {
  return {
    name: null,
    phone: null,
    address: null,
    payment_method: null,
    items: [],
  }
}

describe('emptyOrder', () => {
  it('TC-07: should return a blank order object with null fields and empty items', () => {
    const order = emptyOrder()
    expect(order).toEqual({
      name: null,
      phone: null,
      address: null,
      payment_method: null,
      items: [],
    })
  })
})

// --- totalPrice ---

function totalPrice(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

describe('totalPrice', () => {
  it('TC-08: should calculate total for one item', () => {
    const order = {
      items: [{ name: 'Burger', price: 150, quantity: 2 }],
    }
    expect(totalPrice(order)).toBe(300)
  })

  it('TC-09: should calculate total for multiple items', () => {
    const order = {
      items: [
        { price: 150, quantity: 2 },
        { price: 50, quantity: 3 },
      ],
    }
    expect(totalPrice(order)).toBe(450)
  })

  it('TC-10: should return 0 for an empty items list', () => {
    expect(totalPrice(emptyOrder())).toBe(0)
  })
})

// --- isReset ---

function isReset(text = '') {
  return ['cancel', 'restart', 'start over', 'new order'].some((word) =>
    normalize(text).includes(word)
  )
}

describe('isReset', () => {
  it('TC-11: should detect "cancel" keyword', () => {
    expect(isReset('cancel')).toBe(true)
  })

  it('TC-12: should detect "restart" inside a sentence', () => {
    expect(isReset('I want to restart my order')).toBe(true)
  })

  it('TC-13: should detect "new order"', () => {
    expect(isReset('new order please')).toBe(true)
  })

  it('TC-14: should return false for a normal message', () => {
    expect(isReset('hello')).toBe(false)
  })

  it('TC-15: should detect "start over"', () => {
    expect(isReset('can we start over')).toBe(true)
  })
})

// --- isAffirmation ---

function isAffirmation(text = '') {
  const lower = normalize(text).replace(/[.!?]+$/g, '')
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
  ].includes(lower)
}

describe('isAffirmation', () => {
  it('TC-16: should recognize "yes" as affirmation', () => {
    expect(isAffirmation('yes')).toBe(true)
  })

  it('TC-17: should recognize "confirm" as affirmation', () => {
    expect(isAffirmation('confirm')).toBe(true)
  })

  it('TC-18: should recognize "yes please." with trailing punctuation', () => {
    expect(isAffirmation('yes please.')).toBe(true)
  })

  it('TC-19: should not recognize "no" as affirmation', () => {
    expect(isAffirmation('no')).toBe(false)
  })

  it('TC-20: should recognize "place order" as affirmation', () => {
    expect(isAffirmation('place order')).toBe(true)
  })
})

// --- hasCorrectionIntent ---

function hasCorrectionIntent(text = '') {
  const lower = normalize(text)
  return (
    lower.includes('wrong') ||
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
    lower.includes('instead')
  )
}

function hasRemoveItemIntent(text = '') {
  const lower = normalize(text)
  return /\b(remove|delete)\b/.test(lower) ||
    /\b(no|without)\b/.test(lower) ||
    /\b(don't want|do not want|dont want|not want)\b/.test(lower)
}

function correctionField(text = '') {
  const lower = normalize(text)
  if (/\b(name|customer name)\b/.test(lower)) return 'name'
  if (/\b(phone|mobile|tel|telephone|number)\b/.test(lower)) return 'phone'
  if (/\b(address|delivery|deliver to|location)\b/.test(lower)) return 'address'
  if (/\b(payment|pay|cash|bank|transfer|card)\b/.test(lower)) return 'payment'
  if (/\b(item|food|order)\b/.test(lower)) return 'items'
  return null
}

describe('hasCorrectionIntent', () => {
  it('TC-21: should detect "wrong" as correction intent', () => {
    expect(hasCorrectionIntent('wrong address')).toBe(true)
  })

  it('TC-22: should detect "change" as correction intent', () => {
    expect(hasCorrectionIntent('change phone to 081234')).toBe(true)
  })

  it('TC-23: should detect "sorry" as correction intent', () => {
    expect(hasCorrectionIntent('sorry wrong item')).toBe(true)
  })

  it('TC-24: should return false for a normal order message', () => {
    expect(hasCorrectionIntent('Burger Combo x2')).toBe(false)
  })
})

// --- extractPayment ---

function extractPayment(text = '') {
  const lower = normalize(text)
  if (lower.includes('cash')) return 'Cash'
  if (lower.includes('bank')) return 'Bank Transfer'
  if (lower.includes('transfer')) return 'Bank Transfer'
  if (lower.includes('card')) return 'Card'
  return null
}

describe('extractPayment', () => {
  it('TC-25: should extract "Cash"', () => {
    expect(extractPayment('I pay cash')).toBe('Cash')
  })

  it('TC-26: should extract "Bank Transfer"', () => {
    expect(extractPayment('bank transfer please')).toBe('Bank Transfer')
  })

  it('TC-27: should extract "Card"', () => {
    expect(extractPayment('pay by card')).toBe('Card')
  })

  it('TC-28: should return null when no payment method is found', () => {
    expect(extractPayment('hello')).toBe(null)
  })
})

// --- isValidPhone ---

function isValidPhone(phone = '') {
  const compact = phone.replace(/[^\d+]/g, '')
  return /^0[689]\d{8}$/.test(compact) || /^\+66[689]\d{8}$/.test(compact) || /^66[689]\d{8}$/.test(compact)
}

// --- extractPhone ---

function extractPhone(text = '') {
  const match = text.match(
    /(?:phone|mobile|tel|telephone|number)?(?:\s*number)?\s*[-:]?\s*(\+?\d[\d\s-]{6,18}\d)/i
  )
  if (!match) return null
  const phone = match[1].replace(/[^\d+]/g, '')
  return isValidPhone(phone) ? phone : null
}

describe('extractPhone', () => {
  it('TC-29: should extract a 10-digit Thai mobile number', () => {
    expect(extractPhone('0812345678')).toBe('0812345678')
  })

  it('TC-30: should extract Thai international format with +66 prefix', () => {
    expect(extractPhone('+66812345678')).toBe('+66812345678')
  })

  it('TC-31: should extract phone with "phone:" label', () => {
    expect(extractPhone('phone: 0812345678')).toBe('0812345678')
  })

  it('TC-32: should return null for a too-short number', () => {
    expect(extractPhone('123')).toBe(null)
  })

  it('TC-33: should return null when no phone is present', () => {
    expect(extractPhone('hello')).toBe(null)
  })
})

describe('isValidPhone', () => {
  it('TC-34: should validate a 10-digit Thai phone', () => {
    expect(isValidPhone('0812345678')).toBe(true)
  })

  it('TC-35: should validate a Thai phone with +66 prefix', () => {
    expect(isValidPhone('+66812345678')).toBe(true)
  })

  it('TC-36: should reject a too-short 9-digit phone', () => {
    expect(isValidPhone('064797654')).toBe(false)
  })
})

// --- extractQuantity ---

function extractQuantity(text = '') {
  const lower = normalize(text)
  const patterns = [
    /\bx\s*(\d{1,2})\b/i,
    /\bqty\s*[:\-]?\s*(\d{1,2})\b/i,
    /\bquantity\s*[:\-]?\s*(\d{1,2})\b/i,
    /\b(\d{1,2})\s*(?:pcs?|pieces?|orders?)\b/i,
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match) return Number(match[1])
  }

  for (const line of text.split(/\n+/).map((part) => part.trim())) {
    if (/^\d{1,2}$/.test(line)) return Number(line)
  }

  return null
}

describe('extractQuantity', () => {
  it('TC-37: should extract quantity from "x 2" format', () => {
    expect(extractQuantity('Burger x 2')).toBe(2)
  })

  it('TC-38: should extract quantity from "qty: 3" format', () => {
    expect(extractQuantity('Coke qty: 3')).toBe(3)
  })

  it('TC-39: should extract quantity from "4 pcs" format', () => {
    expect(extractQuantity('4 pcs Fried Chicken')).toBe(4)
  })

  it('TC-40: should return null when no quantity is present', () => {
    expect(extractQuantity('hello')).toBe(null)
  })
})

// --- cleanAddress ---

function cleanAddress(text = '') {
  return titleCase(
    text
      .replace(
        /^(wrong\s*)?(address|delivery address|deliver to|delivery)\s*[:\-]?\s*/i,
        ''
      )
      .replace(/^(change|update|correct|replace)\s+(my\s+)?(address|delivery address|delivery|location)\s*(to|is)?\s*[:\-]?\s*/i, '')
      .replace(/\b(this is|that is|is)\s+(the\s+)?correct\s+address\b/gi, '')
      .replace(/\b(correct|please|pls|sry|sorry|wrong address|wrong)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+,/g, ',')
      .trim()
  )
}

describe('cleanAddress', () => {
  it('TC-41: should strip "address:" label and title-case', () => {
    expect(cleanAddress('address: 123 nimman road')).toBe('123 Nimman Road')
  })

  it('TC-42: should remove "wrong address" noise and keep the real address', () => {
    expect(cleanAddress('wrong address 55 sukhumvit')).toBe('55 Sukhumvit')
  })
})

// --- cleanName ---

function cleanName(line = '') {
  return line
    .replace(/^(wrong\s*)?(name|my name is|i am|i'm|customer name)\s*[:\-]?\s*/i, '')
    .replace(/^i\s+name\s+is\s+/i, '')
    .replace(/^(change|update|correct|replace)\s+(my\s+)?(name|customer name)\s*(to|is)?\s*[:\-]?\s*/i, '')
    .replace(/^(correct\s+)?name\s+is\s+/i, '')
    .replace(/\b(this is|that is|is)\s+(the\s+)?correct\s+name\b/gi, '')
    .replace(/\b(correct|please|pls|sry|sorry|wrong name|wrong)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('cleanName', () => {
  it('TC-43: should strip "my name is" prefix', () => {
    expect(cleanName('my name is hnin aye')).toBe('hnin aye')
  })

  it('TC-44: should strip "i am" prefix', () => {
    expect(cleanName('i am John')).toBe('John')
  })

  it('TC-44b: should clean a correction phrase', () => {
    expect(cleanName('correct name is james')).toBe('james')
  })

  it('TC-44c: should clean "I name is" typo phrasing', () => {
    expect(cleanName('I name is James')).toBe('James')
  })
})

// --- isMenuRequest ---

function isMenuRequest(text = '') {
  const lower = normalize(text)
  return (
    lower.includes('menu') ||
    lower.includes('food') ||
    lower.includes('what do you have') ||
    lower.includes('စားစရာ') ||
    lower.includes('ဘာရှိ')
  )
}

describe('isMenuRequest', () => {
  it('TC-45: should detect "menu" request', () => {
    expect(isMenuRequest('show me the menu')).toBe(true)
  })

  it('TC-46: should detect "food" request', () => {
    expect(isMenuRequest('I want food')).toBe(true)
  })

  it('TC-47: should detect "what do you have" request', () => {
    expect(isMenuRequest('what do you have')).toBe(true)
  })

  it('TC-48: should return false for a normal message', () => {
    expect(isMenuRequest('hello')).toBe(false)
  })

  it('TC-49: should detect Burmese "စားစရာ"', () => {
    expect(isMenuRequest('စားစရာ')).toBe(true)
  })
})

// --- formatMenu ---

function formatMenu(rows) {
  const grouped = {}
  for (const row of rows) {
    const category = row.category || 'Other'
    if (!grouped[category]) grouped[category] = []
    grouped[category].push(row)
  }

  let text = '🍽️ OUR MENU\n\n'
  for (const [category, items] of Object.entries(grouped)) {
    text += `${category.toUpperCase()}\n`
    items.forEach((item, index) => {
      const special = item.is_special ? ' 🔥 SPECIAL' : ''
      text += `${index + 1}. ${item.name}${special} - ${parseFloat(item.price).toLocaleString()} THB\n`
    })
    text += '\n'
  }

  text +=
    'You can send your order in one message, like: "2 Cheese Burger, cash, Hnin, 0812345678, Bangkok".'
  return text
}

describe('formatMenu', () => {
  it('TC-50: should format menu with one category showing item name, number, and price', () => {
    const rows = [{ name: 'Burger', category: 'Burger', price: 150, is_special: false }]
    const result = formatMenu(rows)
    expect(result).toContain('BURGER')
    expect(result).toContain('1. Burger - 150 THB')
  })

  it('TC-51: should badge a special item with 🔥 SPECIAL', () => {
    const rows = [{ name: 'Combo', category: 'Combo', price: 250, is_special: true }]
    const result = formatMenu(rows)
    expect(result).toContain('🔥 SPECIAL')
  })

  it('TC-52: should start with header for an empty menu (implementation appends the footer)', () => {
    expect(formatMenu([])).toContain('🍽️ OUR MENU')
  })
})

// --- looksLikeAddress ---

function looksLikeAddress(line = '') {
  const lower = normalize(line)
  return (
    lower.includes('street') ||
    lower.includes('road') ||
    lower.includes('soi') ||
    lower.includes('moo') ||
    lower.includes('tambon') ||
    lower.includes('district') ||
    lower.includes('province') ||
    lower.includes('bangkok') ||
    lower.includes('thailand') ||
    lower.includes('chiang') ||
    lower.includes('apartment') ||
    lower.includes('building') ||
    lower.includes('room') ||
    lower.includes('condo') ||
    lower.includes('village') ||
    lower.includes('floor') ||
    lower.includes('landmark') ||
    /\d/.test(line)
  )
}

describe('looksLikeAddress', () => {
  it('TC-53: should match "street" keyword as an address', () => {
    expect(looksLikeAddress('123 main street')).toBe(true)
  })

  it('TC-54: should match "bangkok" as an address', () => {
    expect(looksLikeAddress('bangkok thailand')).toBe(true)
  })

  it('TC-55: should reject a name as not an address', () => {
    expect(looksLikeAddress('James Smith')).toBe(false)
  })
})

function looksLikeOrderOrMenuText(text = '') {
  const lower = normalize(text)
  return /\b(i\s+want|i\s+need|i\s+would\s+like|i'd\s+like|i\s+will\s+have|i'll\s+have|can\s+i\s+(get|have|order)|give\s+me|get\s+me|order|menu|food|drink|drint|eat|burger|chicken|cola|juice|tea|water)\b/.test(lower) ||
    /\b(let\s+me\s+see|show\s+me|what\s+do\s+you\s+have)\b/.test(lower)
}

// --- missingFields ---

function missingFields(order) {
  const missing = []
  if (!order.items.length) missing.push('food item')
  if (order.items.some((item) => !item.quantity || item.quantity < 1)) missing.push('quantity')
  if (!order.name) missing.push('name')
  if (!order.phone || !isValidPhone(order.phone)) missing.push('phone number')
  if (!order.address) missing.push('delivery address')
  if (!order.payment_method) missing.push('payment method')
  return missing
}

describe('missingFields', () => {
  it('TC-56: should show all fields missing for an empty order', () => {
    expect(missingFields(emptyOrder())).toEqual([
      'food item',
      'name',
      'phone number',
      'delivery address',
      'payment method',
    ])
  })

  it('TC-57: should show personal fields missing when items exist', () => {
    const order = { ...emptyOrder(), items: [{ name: 'Burger', price: 150, quantity: 2 }] }
    expect(missingFields(order)).toEqual([
      'name',
      'phone number',
      'delivery address',
      'payment method',
    ])
  })

  it('TC-58: should return empty array when all fields are complete', () => {
    const order = {
      ...emptyOrder(),
      name: 'Hnin',
      phone: '0812345678',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [{ name: 'Burger', price: 150, quantity: 2 }],
    }
    expect(missingFields(order)).toEqual([])
  })

  it('TC-59: should flag an invalid phone as missing', () => {
    const order = {
      ...emptyOrder(),
      name: 'Hnin',
      phone: '123',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [{ name: 'Burger', price: 150, quantity: 1 }],
    }
    expect(missingFields(order)).toContain('phone number')
  })
})

// --- confirmationText ---

function confirmationText(order) {
  const lines = order.items.map((item) => {
    const special = item.is_special ? ' 🔥 SPECIAL' : ''
    return `- ${item.name}${special} x ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} THB`
  })

  return (
    `Thanks, ${order.name}. Here is what I have for your order:\n\n` +
    `${lines.join('\n')}\n` +
    `- Total: ${totalPrice(order).toLocaleString()} THB\n` +
    `- Phone: ${order.phone}\n` +
    `- Delivery: ${order.address}\n` +
    `- Payment: ${order.payment_method}\n\n` +
    `Does everything look right? Reply "yes" and I will place it, or send me any correction.`
  )
}

// --- nextQuestion ---

function nextQuestion(order) {
  const missing = missingFields(order)
  if (!missing.length) return confirmationText(order)

  if (missing.includes('food item')) {
    return 'Sure, what would you like to order? You can type it like "2 Cheese Burger".'
  }

  if (missing.includes('quantity')) {
    return `Got it. How many ${order.items[0].name} would you like?`
  }

  const labels = {
    name: 'your name',
    'phone number': 'phone number',
    'delivery address': 'your delivery address',
    'payment method': 'payment method, Cash / Bank Transfer / Card',
  }

  const friendly = missing.map((field) => labels[field] || field)
  return `Got it, thank you. I just need ${friendly.join(', ')} to finish the order. You can send everything in one message.`
}

describe('nextQuestion', () => {
  it('TC-60: should prompt for food when no items yet', () => {
    const result = nextQuestion(emptyOrder())
    expect(result).toContain('what would you like to order')
  })

  it('TC-61: should list missing fields in friendly language', () => {
    const order = {
      ...emptyOrder(),
      items: [{ name: 'Burger', price: 150, quantity: 2 }],
    }
    const result = nextQuestion(order)
    expect(result).toContain('your name')
    expect(result).toContain('phone number')
    expect(result).toContain('your delivery address')
    expect(result).toContain('payment method')
  })

  it('TC-62: should return full confirmation when order is complete', () => {
    const order = {
      name: 'Hnin',
      phone: '0812345678',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [{ name: 'Burger', price: 150, quantity: 2 }],
    }
    const result = nextQuestion(order)
    expect(result).toContain('Thanks, Hnin')
    expect(result).toContain('Burger x 2 = 300 THB')
    expect(result).toContain('Total: 300 THB')
    expect(result).toContain('Payment: Cash')
  })
})

describe('confirmationText', () => {
  it('TC-63: should list items, totals, and personal details in confirmation', () => {
    const order = {
      name: 'Hnin',
      phone: '0812345678',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [
        { name: 'Burger', price: 150, quantity: 2 },
        { name: 'Coke', price: 50, quantity: 1 },
      ],
    }
    const result = confirmationText(order)
    expect(result).toContain('Thanks, Hnin')
    expect(result).toContain('Burger x 2 = 300 THB')
    expect(result).toContain('Coke x 1 = 50 THB')
    expect(result).toContain('Total: 350 THB')
    expect(result).toContain('Phone: 0812345678')
    expect(result).toContain('Delivery: Bangkok')
    expect(result).toContain('Payment: Cash')
    expect(result).toContain('yes')
  })

  it('TC-64: should show 🔥 SPECIAL badge next to a special item', () => {
    const order = {
      name: 'Hnin',
      phone: '0812345678',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [{ name: 'Combo', price: 250, quantity: 1, is_special: true }],
    }
    const result = confirmationText(order)
    expect(result).toContain('🔥 SPECIAL')
  })
})

// --- formatTelegramOrder ---

function formatTelegramOrder(orderId, order, messengerId) {
  const orderedAt = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const itemLines = order.items.map((item, index) => {
    const subtotal = item.price * item.quantity
    return `${index + 1}. ${item.name} x ${item.quantity} = ${subtotal.toLocaleString()} THB`
  })

  return [
    'Facebook Order - Jasmine Restaurant',
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
    'New order received - Jasmine Restaurant',
  ].join('\n')
}

describe('formatTelegramOrder', () => {
  it('TC-65: should contain Order ID and restaurant name in header', () => {
    const order = {
      name: 'Hnin',
      phone: '0812345678',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [{ name: 'Burger', price: 150, quantity: 2 }],
    }
    const result = formatTelegramOrder(42, order, 'sender123')
    expect(result).toContain('Order ID: #42')
    expect(result).toContain('Jasmine Restaurant')
  })

  it('TC-66: should list each item on its own line with price×qty=subtotal', () => {
    const order = {
      name: 'Hnin',
      phone: '0812345678',
      address: 'Bangkok',
      payment_method: 'Cash',
      items: [
        { name: 'Burger', price: 150, quantity: 2 },
        { name: 'Fries', price: 80, quantity: 1 },
      ],
    }
    const result = formatTelegramOrder(1, order, 'sender123')
    expect(result).toContain('1. Burger x 2 = 300 THB')
    expect(result).toContain('2. Fries x 1 = 80 THB')
    expect(result).toContain('Total: 380 THB')
  })
})

// --- findMenuItem ---

function findMenuItem(text, menuRows) {
  const lower = normalize(text)
  const sorted = [...menuRows].sort((a, b) => b.name.length - a.name.length)

  for (const row of sorted) {
    if (lower.includes(normalize(row.name))) {
      return {
        menu_item_id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        is_special: Boolean(row.is_special),
      }
    }
  }

  return null
}

describe('findMenuItem', () => {
  const menuRows = [
    { id: 1, name: 'Burger', price: 100, is_special: false },
    { id: 2, name: 'Cheese Burger', price: 150, is_special: false },
    { id: 3, name: 'Fries', price: 80, is_special: false },
  ]

  it('TC-67: should match an exact item name', () => {
    const result = findMenuItem('I want Cheese Burger', menuRows)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Cheese Burger')
    expect(result.price).toBe(150)
  })

  it('TC-68: should return null when no item matches', () => {
    expect(findMenuItem('pizza', menuRows)).toBeNull()
  })

  it('TC-69: should prefer the longest matching name first', () => {
    const result = findMenuItem('Cheese Burger please', menuRows)
    expect(result.name).toBe('Cheese Burger')
  })
})

// --- quantityNearItem ---

function quantityNearItem(text, menuName, fallback = null) {
  const escaped = menuName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`\\b(\\d{1,2})\\s*(?:x|pcs?|pieces?|orders?)?\\s+${escaped}\\b`, 'i'),
    new RegExp(`\\b${escaped}\\b\\s*(?:-|x|:)?\\s*(\\d{1,2})\\b`, 'i'),
    new RegExp(`\\b${escaped}\\b.*?\\bqty\\s*[:\\-]?\\s*(\\d{1,2})\\b`, 'i'),
    new RegExp(`\\b${escaped}\\b.*?\\bquantity\\s*[:\\-]?\\s*(\\d{1,2})\\b`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return Number(match[1])
  }

  return fallback
}

// --- findMenuItems ---

function findMenuItems(text, menuRows) {
  const found = []
  const sorted = [...menuRows].sort((a, b) => b.name.length - a.name.length)
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const lowerText = normalize(text)
  const occupied = []

  const overlapsExistingMatch = (start, end) =>
    occupied.some((span) => start < span.end && end > span.start)

  for (const row of sorted) {
    const name = row.name
    const normalizedName = normalize(name)
    const start = lowerText.indexOf(normalizedName)
    if (start === -1) continue

    const end = start + normalizedName.length
    if (overlapsExistingMatch(start, end)) continue

    const line = lines.find((entry) => normalize(entry).includes(normalize(name)))
    const source = line || text

    found.push({
      menu_item_id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      is_special: Boolean(row.is_special),
      quantity: quantityNearItem(source, name, extractQuantity(source)) || 1,
    })
    occupied.push({ start, end })
  }

  return found
}

describe('findMenuItems', () => {
  const menuRows = [
    { id: 1, name: 'Cheese Burger', price: 150, is_special: false },
    { id: 2, name: 'Coke', price: 50, is_special: false },
    { id: 3, name: 'Fries', price: 80, is_special: false },
  ]

  it('TC-70: should extract two items with their quantities', () => {
    const result = findMenuItems('2 Cheese Burger, 1 Coke', menuRows)
    expect(result).toHaveLength(2)
    const burger = result.find((r) => r.name === 'Cheese Burger')
    const coke = result.find((r) => r.name === 'Coke')
    expect(burger.quantity).toBe(2)
    expect(coke.quantity).toBe(1)
  })

  it('TC-71: should return empty array when no items matched', () => {
    expect(findMenuItems('hello', menuRows)).toEqual([])
  })

  it('TC-72: should default items without a quantity to 1', () => {
    const result = findMenuItems('Cheese Burger and Fries', menuRows)
    const burger = result.find((r) => r.name === 'Cheese Burger')
    const fries = result.find((r) => r.name === 'Fries')
    expect(burger.quantity).toBe(1)
    expect(fries.quantity).toBe(1)
  })

  it('TC-72b: should not double-count a drink inside a combo item name', () => {
    const result = findMenuItems('Chicken + Cola 2', [
      { id: 1, name: 'Chicken + Cola', price: 99, is_special: false },
      { id: 2, name: 'Cola', price: 35, is_special: false },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Chicken + Cola')
    expect(result[0].quantity).toBe(2)
  })
})

// --- hasInvalidPhoneCandidate ---

function hasInvalidPhoneCandidate(text = '') {
  const candidates = text.match(/\+?\d[\d\s-]{4,18}\d/g) || []
  return candidates.some((candidate) => {
    const digits = candidate.replace(/[^\d+]/g, '')
    return digits.replace(/[^\d]/g, '').length >= 5 && !isValidPhone(digits)
  })
}

// --- extractAddressLine ---

function extractAddressLine(text = '', menuRows = []) {
  const lines = splitMessageParts(text)
  const addressKeyword = lines.find((line) => /address|delivery|deliver to/i.test(line))
  if (addressKeyword) {
    const cleaned = cleanAddress(addressKeyword)
    return cleaned || null
  }

  const field = hasCorrectionIntent(text) ? correctionField(text) : null
  if (field && field !== 'address') return null

  for (const line of lines) {
    const lower = normalize(line)
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
      continue
    }

    if (looksLikeAddress(line)) return cleanAddress(line)
  }

  return null
}

describe('extractAddressLine', () => {
  const menuRows = [{ id: 1, name: 'Burger', price: 150, is_special: false }]

  it('TC-78: should extract address with "address:" label', () => {
    const result = extractAddressLine(
      'Hnin\n0812345678\naddress: 123 Nimman\ncash',
      menuRows
    )
    expect(result).toBe('123 Nimman')
  })

  it('TC-79: should return null when no address is present', () => {
    const result = extractAddressLine('Hnin\ncash', menuRows)
    expect(result).toBeNull()
  })

  it('TC-79b: should not treat a name correction as an address', () => {
    const result = extractAddressLine('correct name is james', menuRows)
    expect(result).toBeNull()
  })
})

// --- extractNameLine ---

function extractNameLine(text = '', menuRows = []) {
  const lines = splitMessageParts(text)
  const nameKeyword = lines.find((line) =>
    /\b(name|my name is|i am|i'm|customer name)\b/i.test(line)
  )
  if (nameKeyword) {
    const cleaned = cleanName(nameKeyword)
    return isValidName(cleaned) ? titleCase(cleaned) : null
  }

  const field = hasCorrectionIntent(text) ? correctionField(text) : null
  if (field && field !== 'name') return null

  for (const line of lines) {
    const lower = normalize(line)
    const cleanedName = cleanName(line)

    if (
      extractPayment(line) ||
      extractPhone(line) ||
      hasInvalidPhoneCandidate(line) ||
      findMenuItem(line, menuRows) ||
      /^\d{1,2}$/.test(line) ||
      looksLikeAddress(line) ||
      looksLikeOrderOrMenuText(line) ||
      lower.includes('order') ||
      lower.includes('wrong') ||
      lower.includes('please')
    ) {
      continue
    }

    if (isValidName(cleanedName)) return titleCase(cleanedName)
  }

  return null
}

function isValidName(name = '') {
  const cleaned = name.trim()
  if (!/^[a-z .'-]{2,40}$/i.test(cleaned)) return false
  const letters = cleaned.replace(/[^a-z]/gi, '')
  if (letters.length < 2) return false
  if (letters.length >= 6 && !/[aeiou]/i.test(letters)) return false
  return true
}

describe('extractNameLine', () => {
  const menuRows = [{ id: 1, name: 'Burger', price: 150, is_special: false }]

  it('TC-80: should extract name when prefixed with "name:" label', () => {
    const result = extractNameLine('name: Hnin Aye\nBangkok\ncash', menuRows)
    expect(result).toBe('Hnin Aye')
  })

  it('TC-81: should extract standalone name without a label', () => {
    const result = extractNameLine('Hnin\nBangkok\ncash', menuRows)
    expect(result).toBe('Hnin')
  })

  it('TC-82: should return null when a phone number is the only candidate', () => {
    const result = extractNameLine('0812345678\nBangkok\ncash', menuRows)
    expect(result).toBeNull()
  })

  it('TC-82b: should extract corrected name from natural correction text', () => {
    const result = extractNameLine('correct name is james', menuRows)
    expect(result).toBe('James')
  })

  it('TC-82c: should not treat an unmatched order request as a customer name', () => {
    const result = extractNameLine('I want a burger', [
      { id: 1, name: 'Double Burger', price: 129, is_special: false },
      { id: 2, name: 'Ham Burger', price: 150, is_special: true },
    ])
    expect(result).toBeNull()
  })

  it('TC-82d: should clean "I name is" typo phrasing into a name', () => {
    const result = extractNameLine('I name is James', menuRows)
    expect(result).toBe('James')
  })
})

// --- applyMessageToOrder ---

function applyMessageToOrder(order, text, menuRows) {
  const updated = { ...emptyOrder(), ...order, items: [...(order.items || [])] }
  const items = findMenuItems(text, menuRows)
  const quantity = extractQuantity(text)
  const payment = extractPayment(text)
  const phone = extractPhone(text)
  const isCorrection = hasCorrectionIntent(text)
  const field = isCorrection ? correctionField(text) : null

  if (payment) updated.payment_method = payment
  if (phone && (!field || field === 'phone')) updated.phone = phone
  if (!phone && isCorrection && (field === 'phone' || hasInvalidPhoneCandidate(text))) updated.phone = null

  if (items.length) {
    if (hasRemoveItemIntent(text)) {
      const removeNames = new Set(items.map((item) => item.name.toLowerCase()))
      updated.items = updated.items.filter((item) => !removeNames.has(item.name.toLowerCase()))
    } else if (isCorrection) {
      const replaceAll = /\b(new order|replace order|wrong order|change order)\b/i.test(text)
      if (replaceAll || !updated.items.length) {
        updated.items = items
      } else {
        for (const item of items) {
          const existing = updated.items.find(
            (entry) => entry.name.toLowerCase() === item.name.toLowerCase()
          )
          if (existing) {
            existing.quantity = item.quantity || existing.quantity || 1
          } else {
            updated.items.push(item)
          }
        }
      }
    } else {
      for (const item of items) {
        const existing = updated.items.find(
          (entry) => entry.name.toLowerCase() === item.name.toLowerCase()
        )
        if (existing) {
          existing.quantity = item.quantity || existing.quantity || 1
        } else {
          updated.items.push(item)
        }
      }
    }
  } else if (quantity && updated.items.length) {
    updated.items[updated.items.length - 1].quantity = quantity
  }

  const name = extractNameLine(text, menuRows)
  const address = extractAddressLine(text, menuRows)

  if (
    name &&
    (!updated.name || field === 'name' || (!field && isCorrection) || /\b(name|my name|customer name)\b/i.test(text))
  )
    updated.name = name
  if (
    address &&
    (!updated.address || field === 'address' || (!field && isCorrection) || /\b(address|delivery|deliver to)\b/i.test(text))
  )
    updated.address = address

  return updated
}

describe('applyMessageToOrder', () => {
  const menuRows = [
    { id: 1, name: 'Cheese Burger', price: 150, is_special: false },
    { id: 2, name: 'Fried Chicken', price: 120, is_special: false },
    { id: 3, name: 'Burger', price: 100, is_special: false },
  ]

  it('TC-73: should parse items and payment from a single-message order', () => {
    const result = applyMessageToOrder(
      emptyOrder(),
      '2 Cheese Burger, cash, Hnin, 0812345678, Bangkok',
      menuRows
    )
    const cheeseBurger = result.items.find((i) => i.name === 'Cheese Burger')
    expect(cheeseBurger).toBeDefined()
    expect(cheeseBurger.quantity).toBe(2)
    expect(result.payment_method).toBe('Cash')
    expect(result.phone).toBe('0812345678')
    expect(result.name).toBe('Hnin')
    expect(result.address).toBe('Bangkok')
  })

  it('TC-74: should add payment to an existing order', () => {
    const order = {
      ...emptyOrder(),
      name: 'Hnin',
      items: [{ name: 'Cheese Burger', price: 150, quantity: 1 }],
    }
    const result = applyMessageToOrder(order, 'bank transfer', menuRows)
    expect(result.payment_method).toBe('Bank Transfer')
    expect(result.name).toBe('Hnin')
    expect(result.items).toHaveLength(1)
  })

  it('TC-75: should correct phone when user says "wrong phone"', () => {
    const order = {
      ...emptyOrder(),
      name: 'Hnin',
      phone: '0961234567',
      items: [{ name: 'Cheese Burger', price: 150, quantity: 1 }],
    }
    const result = applyMessageToOrder(order, 'wrong phone 0812345678', menuRows)
    expect(result.phone).toBe('0812345678')
    expect(result.name).toBe('Hnin')
    expect(result.items).toHaveLength(1)
  })

  it('TC-76: should add items on "new order" when correction intent is not triggered', () => {
    // hasCorrectionIntent does not include "new order", so items are merged, not replaced
    const order = {
      ...emptyOrder(),
      items: [{ name: 'Burger', price: 100, quantity: 1 }],
    }
    const result = applyMessageToOrder(order, 'new order Fried Chicken', menuRows)
    const friedChicken = result.items.find((i) => i.name === 'Fried Chicken')
    expect(friedChicken).toBeDefined()
    // original Burger is kept because isCorrection was not triggered by "new order"
    expect(result.items.find((i) => i.name === 'Burger')).toBeDefined()
  })

  it('TC-77: should merge quantity when the same item is sent again', () => {
    const order = {
      ...emptyOrder(),
      items: [{ name: 'Burger', price: 100, quantity: 2 }],
    }
    const result = applyMessageToOrder(order, 'Burger x3', menuRows)
    const burger = result.items.find((i) => i.name === 'Burger')
    expect(burger.quantity).toBe(3)
    expect(result.items).toHaveLength(1)
  })

  it('TC-77b: should correct name without changing the address', () => {
    const order = {
      ...emptyOrder(),
      name: 'Wrong Name',
      address: '123 Nimman',
      phone: '0812345678',
      payment_method: 'Cash',
      items: [{ name: 'Burger', price: 100, quantity: 1 }],
    }
    const result = applyMessageToOrder(order, 'correct name is james', menuRows)
    expect(result.name).toBe('James')
    expect(result.address).toBe('123 Nimman')
  })

  it('TC-77c: should remove an unwanted existing item', () => {
    const order = {
      ...emptyOrder(),
      items: [
        { name: 'Chicken + Cola', price: 99, quantity: 2 },
        { name: 'Orange Juice', price: 45, quantity: 1 },
      ],
    }
    const result = applyMessageToOrder(
      order,
      "I don't want orange juice",
      [
        { id: 1, name: 'Chicken + Cola', price: 99, is_special: false },
        { id: 2, name: 'Orange Juice', price: 45, is_special: false },
      ]
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Chicken + Cola')
  })

  it('TC-77d: should not save an order request as the customer name', () => {
    const result = applyMessageToOrder(emptyOrder(), 'I want a burger', [
      { id: 1, name: 'Double Burger', price: 129, is_special: false },
      { id: 2, name: 'Ham Burger', price: 150, is_special: true },
    ])
    expect(result.name).toBeNull()
    expect(result.items).toEqual([])
  })
})

// --- isPriceInquiry ---

function isPriceInquiry(text = '') {
  const lower = normalize(text)
  const hasPriceWord = /\b(how\s+much|price|cost|what\s+is\s+the\s+price)\b/i.test(lower)
  const hasItemName = lower.replace(
    /\b(how\s+much|what(\s+is)?|the\s+price\s+of|price\s+of|cost\s+of|is|are|a|an|one|for|please|tell\s+me|can\s+you|does|do|i\s+want\s+to\s+know|whats|what's)\b/gi, ''
  ).trim().length > 1

  return hasPriceWord && hasItemName && !/\b\d{1,2}\s*(x|pcs|pieces?)\b/i.test(lower)
}

function priceInquiryResponse(text, menuRows) {
  const lower = normalize(text)
  const sorted = [...menuRows].sort((a, b) => b.name.length - a.name.length)

  for (const row of sorted) {
    if (lower.includes(normalize(row.name))) {
      const special = row.is_special ? ' 🔥 SPECIAL' : ''
      const price = parseFloat(row.price).toLocaleString()
      return `${row.name}${special} is ${price} THB. Would you like to order it?`
    }
  }

  return `I couldn't find that item on our menu. You can view our full menu by typing "menu".`
}

describe('isPriceInquiry', () => {
  it('TC-83: should detect "how much is Cola?" as price inquiry', () => {
    expect(isPriceInquiry('how much is Cola?')).toBe(true)
  })

  it('TC-84: should detect "price of Burger?" as price inquiry', () => {
    expect(isPriceInquiry('price of Burger?')).toBe(true)
  })

  it('TC-85: should detect "what is the price of Cheese Burger" as price inquiry', () => {
    expect(isPriceInquiry('what is the price of Cheese Burger')).toBe(true)
  })

  it('TC-86: should detect "cost of Burger" as price inquiry', () => {
    expect(isPriceInquiry('cost of Burger')).toBe(true)
  })

  it('TC-87: should NOT detect "2 Burger" (an order) as price inquiry', () => {
    expect(isPriceInquiry('2 Burger')).toBe(false)
  })

  it('TC-88: should NOT detect "hello" as price inquiry', () => {
    expect(isPriceInquiry('hello')).toBe(false)
  })
})

describe('priceInquiryResponse', () => {
  const menuRows = [
    { id: 1, name: 'Cola', price: 25, is_special: false },
    { id: 2, name: 'Burger', price: 150, is_special: false },
    { id: 3, name: 'Cheese Burger', price: 200, is_special: true },
  ]

  it('TC-89: should return price for found item with "Would you like to order?"', () => {
    const result = priceInquiryResponse('how much is Cola?', menuRows)
    expect(result).toContain('Cola')
    expect(result).toContain('25 THB')
    expect(result).toContain('Would you like to order')
  })

  it('TC-90: should show 🔥 SPECIAL badge for special items', () => {
    const result = priceInquiryResponse('what is the price of Cheese Burger', menuRows)
    expect(result).toContain('Cheese Burger')
    expect(result).toContain('200 THB')
    expect(result).toContain('🔥 SPECIAL')
  })

  it('TC-91: should return not-found message for unknown item', () => {
    const result = priceInquiryResponse('how much is pizza?', menuRows)
    expect(result).toContain("couldn't find")
    expect(result).toContain('menu')
  })
})

// --- isUnmatchedFoodRequest ---

function isUnmatchedFoodRequest(text, menuRows) {
  const lower = normalize(text)
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
  ]

  const hasFoodIntent = foodPatterns.some(p => p.test(lower))
  if (!hasFoodIntent) return false

  const found = findMenuItems(text, menuRows)
  return found.length === 0
}

describe('isUnmatchedFoodRequest', () => {
  const menuRows = [
    { id: 1, name: 'Cola', price: 35, is_special: false },
    { id: 2, name: 'Spicy Chicken', price: 79, is_special: false },
    { id: 3, name: 'Cheese Burger', price: 109, is_special: true },
    { id: 4, name: 'Korean Chicken', price: 90, is_special: false },
  ]

  it('TC-92: should detect "I want pizza" as unmatched when pizza not on menu', () => {
    expect(isUnmatchedFoodRequest('I want pizza', menuRows)).toBe(true)
  })

  it('TC-93: should NOT flag "I want Spicy Chicken" as unmatched when item exists', () => {
    expect(isUnmatchedFoodRequest('I want Spicy Chicken', menuRows)).toBe(false)
  })

  it('TC-94: should detect "give me sushi" as unmatched', () => {
    expect(isUnmatchedFoodRequest('give me sushi', menuRows)).toBe(true)
  })

  it('TC-95: should NOT flag "hello" as unmatched food request', () => {
    expect(isUnmatchedFoodRequest('hello', menuRows)).toBe(false)
  })

  it('TC-96: should detect "do you have lasagna" as unmatched', () => {
    expect(isUnmatchedFoodRequest('do you have lasagna', menuRows)).toBe(true)
  })

  it('TC-97: should NOT flag "can I have Cola" when Cola exists on menu', () => {
    expect(isUnmatchedFoodRequest('can I have Cola', menuRows)).toBe(false)
  })
})
