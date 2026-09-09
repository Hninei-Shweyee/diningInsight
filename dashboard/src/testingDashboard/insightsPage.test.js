import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import InsightsPage from '../views/InsightsPage.vue'

const getInsights = vi.fn()
const push = vi.fn()

vi.mock('../api', () => ({ getInsights: (...args) => getInsights(...args) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const insightData = (overrides = {}) => ({
  most_ordered_items: [], least_ordered_items: [], top_this_month: [],
  total_orders: 4, total_revenue: 320, total_customers: 3,
  peak_ordering_time: '12pm - 1pm', peak_ordering_periods: [],
  last_order_date: null, repeat_customers: 1, repeat_purchase_rate: 33.33,
  most_popular_menu_item: null, menu_popularity: [], promotion_suggestions: [],
  ...overrides,
})

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getInsights.mockResolvedValue({ data: insightData() })
  })

  it('loads the all-time summary and renders API totals', async () => {
    const wrapper = mount(InsightsPage)
    await flushPromises()

    expect(getInsights).toHaveBeenCalledWith({ period: 'all' })
    expect(wrapper.text()).toContain('320')
    expect(wrapper.text()).toContain('33.33%')
    expect(wrapper.text()).not.toContain('Loading insights...')
  })

  it('sends custom date boundaries when the custom period changes', async () => {
    const wrapper = mount(InsightsPage)
    await flushPromises()

    const select = wrapper.find('select')
    await select.setValue('custom')
    await select.trigger('change')
    const dates = wrapper.findAll('input[type="date"]')
    await dates[0].setValue('2026-08-01')
    await dates[1].setValue('2026-08-31')
    await dates[1].trigger('change')
    await flushPromises()

    expect(getInsights).toHaveBeenLastCalledWith({
      period: 'custom', date_from: '2026-08-01', date_to: '2026-08-31',
    })
  })

  it('uses defaults for omitted fields and renders popularity and promotion data', async () => {
    getInsights.mockResolvedValue({ data: insightData({
      total_orders: undefined,
      menu_popularity: [{ rank: 1, name: 'Burger', quantity: 12, order_count: 8, revenue: 1200, popularity_level: 'High Demand' }],
      promotion_suggestions: ['Burger has low sales. Consider offering a 10% discount.'],
    }) })
    const wrapper = mount(InsightsPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Burger')
    expect(wrapper.text()).toContain('High Demand')
    expect(wrapper.text()).toContain('0')
    await wrapper.get('button').trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'AutoMessaging',
      query: { type: 'discount', suggestion: 'Burger has low sales. Consider offering a 10% discount.' },
    })
  })
})
