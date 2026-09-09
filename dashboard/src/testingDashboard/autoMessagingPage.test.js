import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import AutoMessagingPage from '../views/AutoMessagingPage.vue'

const getMenu = vi.fn()
const getPromotionAudiences = vi.fn()
const getPromotionHistory = vi.fn()
const getPromotionRecipients = vi.fn()
const sendPromotion = vi.fn()
const route = reactive({ query: {} })

vi.mock('../api', () => ({
  getMenu: (...args) => getMenu(...args),
  getPromotionAudiences: (...args) => getPromotionAudiences(...args),
  getPromotionHistory: (...args) => getPromotionHistory(...args),
  getPromotionRecipients: (...args) => getPromotionRecipients(...args),
  sendPromotion: (...args) => sendPromotion(...args),
}))
vi.mock('vue-router', () => ({ useRoute: () => route }))

const audienceData = { all: 2, repeat: 1, new: 1, inactive: 0, order_item: 1, customers: [
  { id: 1, name: 'Aye', phone: '0812345678' }, { id: 2, name: 'Moe', phone: '0899999999' },
] }

async function page() {
  const wrapper = mount(AutoMessagingPage)
  await flushPromises()
  return wrapper
}

describe('AutoMessagingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    vi.stubGlobal('confirm', vi.fn(() => true))
    getPromotionAudiences.mockResolvedValue({ data: audienceData })
    getPromotionHistory.mockResolvedValue({ data: [] })
    getMenu.mockResolvedValue({ data: [{ id: 10, name: 'Burger' }] })
    getPromotionRecipients.mockResolvedValue({ data: [{ id: 1, customer_name: 'Aye', delivery_status: 'sent', delivery_error: null }] })
  })

  it('loads audiences, history, and menu items', async () => {
    const wrapper = await page()

    expect(getPromotionAudiences).toHaveBeenCalledWith({ menu_item_name: undefined })
    expect(getPromotionHistory).toHaveBeenCalledTimes(1)
    expect(getMenu).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('2 recipients')
    expect(wrapper.text()).toContain('Burger')
  })

  it('builds a discount template and previews it with a customer name', async () => {
    const wrapper = await page()
    const selects = wrapper.findAll('select')
    await selects[0].setValue('Burger')
    await flushPromises()

    expect(wrapper.find('textarea').element.value).toContain('Get 10% off Burger')
    expect(wrapper.text()).toContain('Hi Aye!')
  })

  it('uses the selected recipients and refreshes history after sending', async () => {
    const wrapper = await page()
    await wrapper.get('textarea').setValue('Hi [Customer Name], Burger is on offer!')
    const buttons = wrapper.findAll('button')
    await buttons.find(button => button.text().includes('Selected Customers')).trigger('click')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    sendPromotion.mockResolvedValue({ data: { sent_count: 1, failed_count: 0, skipped_count: 0 } })
    getPromotionHistory.mockResolvedValue({ data: [{ id: 9, audience: 'selected', recipient_count: 1, message: 'Hi Aye', sent_count: 1, failed_count: 0, created_at: null }] })

    await wrapper.findAll('button').find(button => button.text().includes('Send to 1 Customer')).trigger('click')
    await flushPromises()

    expect(sendPromotion).toHaveBeenCalledWith(expect.objectContaining({
      audience: 'selected', customer_ids: [1], menu_item_name: null,
      message_type: 'discount', promotion_value: '10%', message: 'Hi [Customer Name], Burger is on offer!',
    }))
    expect(getPromotionHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('1 sent; 0 failed; 0 skipped')
  })

  it('loads and hides recipient delivery status from campaign history', async () => {
    getPromotionHistory.mockResolvedValue({ data: [{ id: 9, audience: 'all', recipient_count: 1, message: 'Hello', sent_count: 1, failed_count: 0, created_at: null }] })
    const wrapper = await page()
    const statusButton = wrapper.findAll('button').find(button => button.text() === 'View status')
    await statusButton.trigger('click')
    await flushPromises()

    expect(getPromotionRecipients).toHaveBeenCalledWith(9)
    expect(wrapper.text()).toContain('Aye')
    await wrapper.findAll('button').find(button => button.text() === 'Hide details').trigger('click')
    expect(wrapper.text()).not.toContain('delivery_status')
  })
})
