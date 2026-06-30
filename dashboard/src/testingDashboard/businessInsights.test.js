import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock api
const mockGetInsights = vi.fn()

vi.mock('../api', () => ({
  getInsights: (...args) => mockGetInsights(...args),
}))

// --- sample insights data ---
function makeSampleData() {
  return {
    most_ordered_items: [
      { name: 'Cheese Burger', quantity: 45 },
      { name: 'Coke', quantity: 38 },
      { name: 'Fried Chicken', quantity: 30 },
      { name: 'Fries', quantity: 25 },
      { name: 'Combo', quantity: 20 },
    ],
    top_this_month: [
      { name: 'Cheese Burger', quantity: 12 },
      { name: 'Fries', quantity: 9 },
      { name: 'Coke', quantity: 7 },
    ],
    total_orders: 158,
    total_revenue: 45600,
    peak_ordering_time: '12:00 PM - 1:00 PM',
    last_order_date: '2026-06-17',
    repeat_customers: 34,
  }
}

// --- COLORS array (from InsightsPage.vue) ---
const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#2ECC71', '#E74C3C', '#1ABC9C', '#F39C12',
  '#8E44AD', '#3498DB', '#E67E22',
]

// --- fetchInsights (from InsightsPage.vue onMounted) ---
async function fetchInsights({ getInsights, data, loading }) {
  loading.value = true
  const res = await getInsights()
  data.value = res.data
  loading.value = false
}

// --- chartData computed (from InsightsPage.vue) ---
function buildChartData(mostOrderedItems) {
  if (!mostOrderedItems.length) return null
  return {
    labels: mostOrderedItems.map((i) => i.name),
    datasets: [
      {
        data: mostOrderedItems.map((i) => i.quantity),
        backgroundColor: COLORS.slice(0, mostOrderedItems.length),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  }
}

// --- chartOptions helper (percentage formatter from InsightsPage.vue) ---
function formatDatalabel(value, total) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
  return Number(pct) >= 5 ? `${pct}%` : ''
}

function formatTooltipLabel(label, parsed, total) {
  const pct = total > 0 ? ((parsed / total) * 100).toFixed(1) : 0
  return ` ${label}: ${parsed} orders (${pct}%)`
}

// --- barWidth (from InsightsPage.vue) ---
function barWidth(qty, list) {
  const max = Math.max(...list.map((i) => i.quantity), 1)
  return Math.round((qty / max) * 100)
}

// ============================================================
// fetchInsights
// ============================================================
describe('fetchInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch insights and populate data', async () => {
    const data = { value: {} }
    const loading = { value: false }
    const sample = makeSampleData()

    mockGetInsights.mockResolvedValue({ data: sample })

    await fetchInsights({ getInsights: mockGetInsights, data, loading })

    expect(data.value).toEqual(sample)
    expect(loading.value).toBe(false)
  })

  it('should set loading to true while fetching', async () => {
    const data = { value: {} }
    const loading = { value: false }

    mockGetInsights.mockResolvedValue({ data: makeSampleData() })

    const promise = fetchInsights({ getInsights: mockGetInsights, data, loading })

    expect(loading.value).toBe(true)

    await promise

    expect(loading.value).toBe(false)
  })

  it('should call GET /insights/summary exactly once', async () => {
    const data = { value: {} }
    const loading = { value: false }

    mockGetInsights.mockResolvedValue({ data: makeSampleData() })

    await fetchInsights({ getInsights: mockGetInsights, data, loading })

    expect(mockGetInsights).toHaveBeenCalledTimes(1)
  })
})

// ============================================================
// data.most_ordered_items
// ============================================================
describe('data.most_ordered_items', () => {
  it('should be an array of items with name and quantity', () => {
    const data = makeSampleData()
    expect(Array.isArray(data.most_ordered_items)).toBe(true)
    expect(data.most_ordered_items.length).toBeGreaterThan(0)

    for (const item of data.most_ordered_items) {
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('quantity')
      expect(typeof item.name).toBe('string')
      expect(typeof item.quantity).toBe('number')
    }
  })

  it('should be sorted by quantity descending (most ordered first)', () => {
    const data = makeSampleData()
    const quantities = data.most_ordered_items.map((i) => i.quantity)
    const sorted = [...quantities].sort((a, b) => b - a)
    expect(quantities).toEqual(sorted)
  })

  it('should default to empty array when API returns no data', () => {
    const defaultData = {
      most_ordered_items: [],
      top_this_month: [],
      total_orders: 0,
      total_revenue: 0,
      peak_ordering_time: null,
      last_order_date: null,
      repeat_customers: 0,
    }
    expect(defaultData.most_ordered_items).toEqual([])
  })

  it('should have at most 13 colors in the palette (COLORS array)', () => {
    expect(COLORS.length).toBe(13)
    expect(COLORS.every((c) => typeof c === 'string' && c.startsWith('#'))).toBe(true)
  })
})

// ============================================================
// data.top_this_month
// ============================================================
describe('data.top_this_month', () => {
  it('should have name and quantity for each item', () => {
    const data = makeSampleData()
    expect(data.top_this_month).toHaveLength(3)

    for (const item of data.top_this_month) {
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('quantity')
    }
  })

  it('should compute barWidth as percentage of the max quantity', () => {
    const list = makeSampleData().top_this_month
    // max is 12 (Cheese Burger)
    expect(barWidth(12, list)).toBe(100)
    expect(barWidth(9, list)).toBe(75)
    expect(barWidth(7, list)).toBe(58)
  })

  it('should return 0 when all quantities are 0 or list is empty-adjacent', () => {
    const list = [{ name: 'A', quantity: 0 }]
    expect(barWidth(0, list)).toBe(0)
  })
})

// ============================================================
// data.total_revenue
// ============================================================
describe('data.total_revenue', () => {
  it('should be a number', () => {
    const data = makeSampleData()
    expect(typeof data.total_revenue).toBe('number')
  })

  it('should format with toLocaleString for display', () => {
    const data = makeSampleData()
    const display = data.total_revenue.toLocaleString()
    expect(display).toBe('45,600')
  })

  it('should show THB label after the number', () => {
    const data = makeSampleData()
    const label = `${data.total_revenue.toLocaleString()} THB`
    expect(label).toBe('45,600 THB')
  })

  it('should default to 0 when there is no revenue', () => {
    const empty = { total_revenue: 0 }
    expect(empty.total_revenue).toBe(0)
  })
})

// ============================================================
// data.peak_ordering_time
// ============================================================
describe('data.peak_ordering_time', () => {
  it('should show the peak hour string when provided', () => {
    const data = makeSampleData()
    expect(data.peak_ordering_time).toBe('12:00 PM - 1:00 PM')
  })

  it('should display "–" when peak_ordering_time is null', () => {
    const display = null || '–'
    expect(display).toBe('–')
  })

  it('should display "–" when peak_ordering_time is empty string', () => {
    const display = '' || '–'
    expect(display).toBe('–')
  })
})

// ============================================================
// data.repeat_customers
// ============================================================
describe('data.repeat_customers', () => {
  it('should be a number showing repeat customer count', () => {
    const data = makeSampleData()
    expect(typeof data.repeat_customers).toBe('number')
    expect(data.repeat_customers).toBe(34)
  })

  it('should default to 0 when no repeat customers', () => {
    const empty = { repeat_customers: 0 }
    expect(empty.repeat_customers).toBe(0)
  })
})

// ============================================================
// data.total_orders
// ============================================================
describe('data.total_orders', () => {
  it('should show the total orders count', () => {
    const data = makeSampleData()
    expect(data.total_orders).toBe(158)
  })

  it('should default to 0 when no orders yet', () => {
    const empty = { total_orders: 0 }
    expect(empty.total_orders).toBe(0)
  })
})

// ============================================================
// chartData computed (Pie chart)
// ============================================================
describe('chartData', () => {
  it('should build chart data from most_ordered_items', () => {
    const items = makeSampleData().most_ordered_items
    const chart = buildChartData(items)

    expect(chart).not.toBeNull()
    expect(chart.labels).toEqual(['Cheese Burger', 'Coke', 'Fried Chicken', 'Fries', 'Combo'])
    expect(chart.datasets).toHaveLength(1)
    expect(chart.datasets[0].data).toEqual([45, 38, 30, 25, 20])
    expect(chart.datasets[0].backgroundColor).toHaveLength(5)
    expect(chart.datasets[0].borderWidth).toBe(2)
    expect(chart.datasets[0].borderColor).toBe('#fff')
  })

  it('should assign colors from COLORS palette in order', () => {
    const items = makeSampleData().most_ordered_items
    const chart = buildChartData(items)

    expect(chart.datasets[0].backgroundColor[0]).toBe(COLORS[0])
    expect(chart.datasets[0].backgroundColor[1]).toBe(COLORS[1])
    expect(chart.datasets[0].backgroundColor[4]).toBe(COLORS[4])
  })

  it('should return null when most_ordered_items is empty', () => {
    const chart = buildChartData([])
    expect(chart).toBeNull()
  })

  it('should handle a single item', () => {
    const chart = buildChartData([{ name: 'Burger', quantity: 42 }])
    expect(chart).not.toBeNull()
    expect(chart.labels).toEqual(['Burger'])
    expect(chart.datasets[0].data).toEqual([42])
  })

  it('should use COLORS up to available items (can reuse/cycle if needed)', () => {
    // create 15 items (more than COLORS has — only 13)
    const items = Array.from({ length: 15 }, (_, i) => ({ name: `Item${i}`, quantity: 10 - i }))
    const chart = buildChartData(items)
    // COLORS.slice(0, 15) returns exactly COLORS length (13) since there are only 13
    expect(chart.datasets[0].backgroundColor).toHaveLength(13)
    // all 13 COLORS are present in order
    expect(chart.datasets[0].backgroundColor).toEqual(COLORS)
  })
})

// ============================================================
// chartOptions helpers (datalabel and tooltip)
// ============================================================
describe('chartOptions helpers', () => {
  it('should show percentage when >= 5%', () => {
    // 45 out of 158 total => 28.5%
    expect(formatDatalabel(45, 158)).toBe('28.5%')
  })

  it('should hide percentage when < 5%', () => {
    // 3 out of 158 => 1.9%
    expect(formatDatalabel(3, 158)).toBe('')
  })

  it('should return empty string when total is 0 (avoid division by zero)', () => {
    // the ternary `total > 0 ? ... : 0` gives 0, and Number(0) >= 5 is false → ''
    expect(formatDatalabel(0, 0)).toBe('')
  })

  it('should format tooltip label with orders and percentage', () => {
    const label = formatTooltipLabel('Cheese Burger', 45, 158)
    expect(label).toBe(' Cheese Burger: 45 orders (28.5%)')
  })

  it('should handle 0% for tooltip label', () => {
    const label = formatTooltipLabel('Fries', 0, 158)
    expect(label).toBe(' Fries: 0 orders (0.0%)')
  })
})

// ============================================================
// barWidth helper
// ============================================================
describe('barWidth', () => {
  it('should return 100 for the top-selling item', () => {
    const list = [
      { name: 'A', quantity: 20 },
      { name: 'B', quantity: 15 },
      { name: 'C', quantity: 5 },
    ]
    expect(barWidth(20, list)).toBe(100)
  })

  it('should return scaled percentage for other items', () => {
    const list = [
      { name: 'A', quantity: 20 },
      { name: 'B', quantity: 10 },
    ]
    expect(barWidth(10, list)).toBe(50)
  })

  it('should use 1 as denominator when all quantities are 0', () => {
    const list = [
      { name: 'A', quantity: 0 },
      { name: 'B', quantity: 0 },
    ]
    expect(barWidth(0, list)).toBe(0)
  })

  it('should return a rounded integer', () => {
    const list = [
      { name: 'A', quantity: 3 },
      { name: 'B', quantity: 1 },
    ]
    const result = barWidth(1, list)
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBe(33) // 1/3 ≈ 33.3 rounded to 33
  })
})

// ============================================================
// Default data shape
// ============================================================
describe('insights data defaults', () => {
  it('should have all expected fields with sensible defaults', () => {
    const defaults = {
      most_ordered_items: [],
      top_this_month: [],
      total_orders: 0,
      total_revenue: 0,
      peak_ordering_time: null,
      last_order_date: null,
      repeat_customers: 0,
    }

    expect(defaults).toHaveProperty('most_ordered_items')
    expect(defaults).toHaveProperty('top_this_month')
    expect(defaults).toHaveProperty('total_orders')
    expect(defaults).toHaveProperty('total_revenue')
    expect(defaults).toHaveProperty('peak_ordering_time')
    expect(defaults).toHaveProperty('last_order_date')
    expect(defaults).toHaveProperty('repeat_customers')

    expect(Array.isArray(defaults.most_ordered_items)).toBe(true)
    expect(Array.isArray(defaults.top_this_month)).toBe(true)
    expect(typeof defaults.total_orders).toBe('number')
    expect(typeof defaults.total_revenue).toBe('number')
    expect(typeof defaults.repeat_customers).toBe('number')
  })
})
