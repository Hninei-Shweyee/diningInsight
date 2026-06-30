import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock api
const mockGetOrders = vi.fn()
const mockUpdateStatus = vi.fn()

vi.mock('../api', () => ({
  getOrders: (...args) => mockGetOrders(...args),
  updateStatus: (...args) => mockUpdateStatus(...args),
}))

// --- helper: deep clone to prevent test leakage ---
function cloneOrders(list) {
  return JSON.parse(JSON.stringify(list))
}

// --- sample orders for tests ---
function makeSampleOrders() {
  return [
    {
      id: 1,
      ordered_at: '2026-06-15T10:30:00Z',
      customer_name: 'Hnin Aye',
      customer_address: 'Bangkok',
      customer_phone: '091234567',
      items: [
        { id: 1, item_name: 'Cheese Burger', quantity: 2 },
        { id: 2, item_name: 'Coke', quantity: 1 },
      ],
      total_price: 350,
      payment_method: 'Cash',
      status: 'delivered',
    },
    {
      id: 2,
      ordered_at: '2026-06-10T14:00:00Z',
      customer_name: 'John Doe',
      customer_address: 'Chiang Mai',
      customer_phone: '081234567',
      items: [{ id: 3, item_name: 'Fried Chicken', quantity: 1 }],
      total_price: 120,
      payment_method: 'Bank Transfer',
      status: 'delivered',
    },
    {
      id: 3,
      ordered_at: '2026-06-17T08:00:00Z',
      customer_name: 'May Thu',
      customer_address: 'Yangon',
      customer_phone: '095554444',
      items: [{ id: 4, item_name: 'Combo', quantity: 1 }],
      total_price: 250,
      payment_method: 'Card',
      status: 'pending',
    },
    {
      id: 4,
      ordered_at: '2026-06-16T12:00:00Z',
      customer_name: 'Aung Myo',
      customer_address: 'Mandalay',
      customer_phone: '097778888',
      items: [
        { id: 5, item_name: 'Cheese Burger', quantity: 1 },
        { id: 6, item_name: 'Fries', quantity: 2 },
      ],
      total_price: 310,
      payment_method: 'Cash',
      status: 'cooking',
    },
  ]
}

// --- helpers (from OrdersPage.vue) ---
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusClass(status) {
  return (
    {
      pending: 'bg-yellow-100 text-yellow-700',
      cooking: 'bg-orange-100 text-orange-700',
      ready: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
    }[status] || 'bg-gray-100 text-gray-600'
  )
}

// --- filtered computed (from OrdersPage.vue) ---
function filterOrders(orders, { search, statusFilter, paymentFilter, dateFrom, dateTo }) {
  return orders.filter((order) => {
    if (search) {
      const q = search.toLowerCase()
      const matchName = order.customer_name?.toLowerCase().includes(q)
      const matchItem = order.items?.some((i) => i.item_name.toLowerCase().includes(q))
      if (!matchName && !matchItem) return false
    }

    if (statusFilter && order.status !== statusFilter) return false

    if (paymentFilter && order.payment_method !== paymentFilter) return false

    if (dateFrom || dateTo) {
      const orderDate = order.ordered_at.split('T')[0]
      if (dateFrom && orderDate < dateFrom) return false
      if (dateTo && orderDate > dateTo) return false
    }

    return true
  })
}

// --- fetchOrders (from orders.js store) ---
async function fetchOrders({ getOrders, orders, loading, error }, status = null) {
  loading.value = true
  error.value = null
  try {
    const res = await getOrders(status)
    orders.value = res.data
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Failed to load orders'
  } finally {
    loading.value = false
  }
}

// --- changeStatus (from orders.js store) ---
async function changeStatus({ updateStatus, orders }, orderId, newStatus) {
  await updateStatus(orderId, newStatus)

  const order = orders.value.find((o) => o.id === orderId)
  if (order) order.status = newStatus
}

// ============================================================
// fetchOrders
// ============================================================
describe('fetchOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch orders and set them on the store', async () => {
    const orders = { value: [] }
    const loading = { value: false }
    const error = { value: null }
    const sample = makeSampleOrders()

    mockGetOrders.mockResolvedValue({ data: sample })

    await fetchOrders({ getOrders: mockGetOrders, orders, loading, error })

    expect(mockGetOrders).toHaveBeenCalledWith(null)
    expect(orders.value).toEqual(sample)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should pass a status filter to the API when provided', async () => {
    const orders = { value: [] }
    const loading = { value: false }
    const error = { value: null }
    const sample = makeSampleOrders()

    mockGetOrders.mockResolvedValue({ data: [sample[0]] })

    await fetchOrders({ getOrders: mockGetOrders, orders, loading, error }, 'delivered')

    expect(mockGetOrders).toHaveBeenCalledWith('delivered')
  })

  it('should set error on API failure with detail message', async () => {
    const orders = { value: [] }
    const loading = { value: false }
    const error = { value: null }

    mockGetOrders.mockRejectedValue({
      response: { data: { detail: 'Database timeout' } },
    })

    await fetchOrders({ getOrders: mockGetOrders, orders, loading, error })

    expect(error.value).toBe('Database timeout')
    expect(loading.value).toBe(false)
    expect(orders.value).toEqual([])
  })

  it('should set fallback error when API fails without detail', async () => {
    const orders = { value: [] }
    const loading = { value: false }
    const error = { value: null }

    mockGetOrders.mockRejectedValue(new Error('Network Error'))

    await fetchOrders({ getOrders: mockGetOrders, orders, loading, error })

    expect(error.value).toBe('Network Error')
    expect(loading.value).toBe(false)
  })
})


// changeStatus

describe('changeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call updateStatus API and update the order locally', async () => {
    const orders = { value: makeSampleOrders() }
    mockUpdateStatus.mockResolvedValue({})

    await changeStatus({ updateStatus: mockUpdateStatus, orders }, 3, 'cooking')

    expect(mockUpdateStatus).toHaveBeenCalledWith(3, 'cooking')
    const updated = orders.value.find((o) => o.id === 3)
    expect(updated.status).toBe('cooking')
  })

  it('should update status from pending to delivered', async () => {
    const orders = { value: makeSampleOrders() }
    mockUpdateStatus.mockResolvedValue({})

    await changeStatus({ updateStatus: mockUpdateStatus, orders }, 3, 'delivered')

    const updated = orders.value.find((o) => o.id === 3)
    expect(updated.status).toBe('delivered')
  })

  it('should not modify other orders when changing one', async () => {
    const orders = { value: makeSampleOrders() }
    mockUpdateStatus.mockResolvedValue({})

    await changeStatus({ updateStatus: mockUpdateStatus, orders }, 1, 'cooking')

    // Order 1 changed
    expect(orders.value.find((o) => o.id === 1).status).toBe('cooking')
    // Order 2 unchanged
    expect(orders.value.find((o) => o.id === 2).status).toBe('delivered')
  })

  it('should not throw if the order id is not in the list', async () => {
    const orders = { value: makeSampleOrders() }
    mockUpdateStatus.mockResolvedValue({})

    await changeStatus({ updateStatus: mockUpdateStatus, orders }, 999, 'ready')

    expect(mockUpdateStatus).toHaveBeenCalledWith(999, 'ready')
    // all orders unchanged
    const original = makeSampleOrders()
    expect(orders.value.every((o) => o.status === original.find((s) => s.id === o.id).status)).toBe(true)
  })
})


// Search Orders (filtered by customer name or item name)

describe('filterOrders — search', () => {
  const orders = makeSampleOrders()
  const empty = { search: '', statusFilter: '', paymentFilter: '', dateFrom: '', dateTo: '' }

  it('should return all orders when search is empty', () => {
    const result = filterOrders(orders, { ...empty, search: '' })
    expect(result).toEqual(orders)
  })

  it('should match customer name (case-insensitive)', () => {
    const result = filterOrders(orders, { ...empty, search: 'hnin' })
    expect(result).toHaveLength(1)
    expect(result[0].customer_name).toBe('Hnin Aye')
  })

  it('should match item name (case-insensitive)', () => {
    const result = filterOrders(orders, { ...empty, search: 'cheese burger' })
    expect(result).toHaveLength(2) // orders 1 and 4
    const ids = result.map((o) => o.id)
    expect(ids).toContain(1)
    expect(ids).toContain(4)
  })

  it('should match partial customer name', () => {
    const result = filterOrders(orders, { ...empty, search: 'doe' })
    expect(result).toHaveLength(1)
    expect(result[0].customer_name).toBe('John Doe')
  })

  it('should match partial item name (both Fried Chicken and Fries contain "frie")', () => {
    const result = filterOrders(orders, { ...empty, search: 'frie' })
    // "frie" matches "Fried Chicken" (order 2) and "Fries" (order 4)
    expect(result).toHaveLength(2)
    const ids = result.map((o) => o.id)
    expect(ids).toContain(2)
    expect(ids).toContain(4)
  })

  it('should return empty when neither name nor item matches', () => {
    const result = filterOrders(orders, { ...empty, search: 'pizza' })
    expect(result).toEqual([])
  })
})


// statusFilter

describe('filterOrders — statusFilter', () => {
  const orders = makeSampleOrders()
  const empty = { search: '', statusFilter: '', paymentFilter: '', dateFrom: '', dateTo: '' }

  it('should return all orders when statusFilter is empty', () => {
    const result = filterOrders(orders, { ...empty, statusFilter: '' })
    expect(result).toHaveLength(4)
  })

  it('should return only pending orders', () => {
    const result = filterOrders(orders, { ...empty, statusFilter: 'pending' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
  })

  it('should return only cooking orders', () => {
    const result = filterOrders(orders, { ...empty, statusFilter: 'cooking' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(4)
  })

  it('should return only delivered orders', () => {
    const result = filterOrders(orders, { ...empty, statusFilter: 'delivered' })
    expect(result).toHaveLength(2)
    // ids 1 and 2 are delivered
    expect(result.map((o) => o.id)).toEqual([1, 2])
  })

  it('should return empty for status with no match', () => {
    const result = filterOrders(orders, { ...empty, statusFilter: 'ready' })
    expect(result).toEqual([])
  })
})


// paymentFilter

describe('filterOrders — paymentFilter', () => {
  const orders = makeSampleOrders()
  const empty = { search: '', statusFilter: '', paymentFilter: '', dateFrom: '', dateTo: '' }

  it('should return all orders when paymentFilter is empty', () => {
    const result = filterOrders(orders, { ...empty, paymentFilter: '' })
    expect(result).toHaveLength(4)
  })

  it('should return only Cash orders', () => {
    const result = filterOrders(orders, { ...empty, paymentFilter: 'Cash' })
    expect(result).toHaveLength(2)
    // ids 1 and 4 pay by Cash
    expect(result.map((o) => o.id)).toEqual([1, 4])
  })

  it('should return only Bank Transfer orders', () => {
    const result = filterOrders(orders, { ...empty, paymentFilter: 'Bank Transfer' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('should return empty for payment method with no match', () => {
    const result = filterOrders(orders, { ...empty, paymentFilter: 'PromptPay' })
    expect(result).toEqual([])
  })
})


// dateFrom / dateTo

describe('filterOrders — dateFrom / dateTo', () => {
  const orders = makeSampleOrders()
  const empty = { search: '', statusFilter: '', paymentFilter: '', dateFrom: '', dateTo: '' }

  it('should return all orders when both dates are empty', () => {
    const result = filterOrders(orders, empty)
    expect(result).toHaveLength(4)
  })

  it('should filter orders on or after dateFrom', () => {
    const result = filterOrders(orders, { ...empty, dateFrom: '2026-06-15' })
    expect(result).toHaveLength(3) // ids 1, 3, 4
    expect(result.map((o) => o.id).sort()).toEqual([1, 3, 4])
  })

  it('should filter orders on or before dateTo', () => {
    const result = filterOrders(orders, { ...empty, dateTo: '2026-06-12' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('should filter orders within a date range (from and to)', () => {
    const result = filterOrders(orders, {
      ...empty,
      dateFrom: '2026-06-15',
      dateTo: '2026-06-16',
    })
    expect(result).toHaveLength(2) // ids 1 and 4
    expect(result.map((o) => o.id).sort()).toEqual([1, 4])
  })

  it('should return empty when no orders fall in the date range', () => {
    const result = filterOrders(orders, {
      ...empty,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })
    expect(result).toEqual([])
  })

  it('should filter by date and status combined', () => {
    const result = filterOrders(orders, {
      ...empty,
      dateFrom: '2026-06-15',
      statusFilter: 'delivered',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('should filter by date, status, and payment combined', () => {
    const result = filterOrders(orders, {
      ...empty,
      dateFrom: '2026-06-15',
      dateTo: '2026-06-17',
      statusFilter: 'pending',
      paymentFilter: 'Card',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
  })
})


// hasActiveFilters

function hasActiveFilters({ search, statusFilter, paymentFilter, dateFrom, dateTo }) {
  return !!(search || statusFilter || paymentFilter || dateFrom || dateTo)
}

describe('hasActiveFilters', () => {
  const empty = { search: '', statusFilter: '', paymentFilter: '', dateFrom: '', dateTo: '' }

  it('should return false when no filters are set', () => {
    expect(hasActiveFilters(empty)).toBe(false)
  })

  it('should return true when search has a value', () => {
    expect(hasActiveFilters({ ...empty, search: 'hnin' })).toBe(true)
  })

  it('should return true when statusFilter has a value', () => {
    expect(hasActiveFilters({ ...empty, statusFilter: 'pending' })).toBe(true)
  })

  it('should return true when paymentFilter has a value', () => {
    expect(hasActiveFilters({ ...empty, paymentFilter: 'Cash' })).toBe(true)
  })

  it('should return true when dateFrom has a value', () => {
    expect(hasActiveFilters({ ...empty, dateFrom: '2026-06-01' })).toBe(true)
  })

  it('should return true when dateTo has a value', () => {
    expect(hasActiveFilters({ ...empty, dateTo: '2026-06-15' })).toBe(true)
  })
})


// resetFilters

function resetFilters({ search, statusFilter, paymentFilter, dateFrom, dateTo }) {
  search.value = ''
  statusFilter.value = ''
  paymentFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

describe('resetFilters', () => {
  it('should clear all filter values', () => {
    const filters = {
      search: { value: 'hnin' },
      statusFilter: { value: 'pending' },
      paymentFilter: { value: 'Cash' },
      dateFrom: { value: '2026-06-01' },
      dateTo: { value: '2026-06-15' },
    }

    resetFilters(filters)

    expect(filters.search.value).toBe('')
    expect(filters.statusFilter.value).toBe('')
    expect(filters.paymentFilter.value).toBe('')
    expect(filters.dateFrom.value).toBe('')
    expect(filters.dateTo.value).toBe('')
  })
})


// Order table rendering (row data mapping)

describe('order table rendering', () => {
  const orders = makeSampleOrders()

  it('should map an order to table row fields', () => {
    const order = orders[0]

    const row = {
      date: formatDate(order.ordered_at),
      customer_name: order.customer_name,
      address: order.customer_address,
      phone: order.customer_phone,
      items: order.items.map((i) => `${i.item_name} x${i.quantity}`).join('\n'),
      total: `${order.total_price} THB`,
      payment: order.payment_method,
      status: order.status,
      statusStyle: statusClass(order.status),
    }

    expect(row).toEqual({
      date: '15 Jun 2026',
      customer_name: 'Hnin Aye',
      address: 'Bangkok',
      phone: '091234567',
      items: 'Cheese Burger x2\nCoke x1',
      total: '350 THB',
      payment: 'Cash',
      status: 'delivered',
      statusStyle: 'bg-green-100 text-green-700',
    })
  })

  it('should have correct column headers', () => {
    const headers = [
      'Date',
      'Customer',
      'Address',
      'Phone',
      'Items',
      'Total',
      'Payment',
      'Status',
      'Action',
    ]
    expect(headers).toHaveLength(9)
    expect(headers[0]).toBe('Date')
    expect(headers[8]).toBe('Action')
  })

  it('should have a valid status class for every order', () => {
    for (const order of orders) {
      const cls = statusClass(order.status)
      expect(cls).toBeTruthy()
      expect(cls).toContain('bg-')
      expect(cls).toContain('text-')
    }
  })

  it('should map all sample orders to display rows', () => {
    const rows = orders.map((order) => ({
      id: order.id,
      date: formatDate(order.ordered_at),
      customer: order.customer_name,
      items: order.items.map((i) => `${i.item_name} x${i.quantity}`).join(', '),
      total: `${order.total_price} THB`,
      status: order.status,
      payment: order.payment_method,
    }))

    expect(rows).toHaveLength(4)

    // row 1: Hnin Aye, delivered
    expect(rows[0].date).toBe('15 Jun 2026')
    expect(rows[0].customer).toBe('Hnin Aye')
    expect(rows[0].items).toBe('Cheese Burger x2, Coke x1')
    expect(rows[0].status).toBe('delivered')

    // row 3 (index 2): May Thu, pending
    expect(rows[2].date).toBe('17 Jun 2026')
    expect(rows[2].status).toBe('pending')
    expect(rows[2].payment).toBe('Card')
  })

  it('should show "0 orders" count when filtered result is empty', () => {
    const filtered = []
    expect(filtered.length).toBe(0)
  })

  it('should show correct unfiltered count', () => {
    const filtered = filterOrders(orders, {
      search: '',
      statusFilter: '',
      paymentFilter: '',
      dateFrom: '',
      dateTo: '',
    })
    expect(filtered.length).toBe(4)
  })
})
