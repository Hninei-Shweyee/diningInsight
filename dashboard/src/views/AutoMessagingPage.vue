<template>
  <div class="p-4 sm:p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Auto Messaging</h2>
      <p class="mt-1 text-sm text-gray-500">Create, preview, and send Messenger promotions to your customers.</p>
    </div>

    <div v-if="loading" class="py-16 text-center text-gray-400">Loading customers and promotion history...</div>
    <div v-else class="space-y-6">
      <div class="grid gap-6 xl:grid-cols-2">
        <section class="rounded-xl bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h3 class="font-semibold text-gray-800">Select Customer Group</h3>
            <span class="text-xs text-gray-400">{{ recipientCount }} recipients</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button v-for="group in audienceGroups" :key="group.id" type="button" @click="audience = group.id"
              class="rounded-lg border p-3 text-left transition"
              :class="audience === group.id ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-gray-200 hover:border-gray-300'">
              <p class="text-sm font-semibold text-gray-700">{{ group.label }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ group.description }}</p>
              <p class="mt-2 text-lg font-bold text-brand">{{ group.id === 'selected' ? selectedCustomerIds.length : audienceCount(group.id) }}</p>
            </button>
          </div>
          <div v-if="audience === 'selected'" class="mt-4 max-h-48 overflow-auto rounded-lg border border-gray-200">
            <label v-for="customer in audienceData.customers" :key="customer.id" class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-50">
              <input v-model="selectedCustomerIds" :value="customer.id" type="checkbox" class="h-4 w-4 accent-orange-500">
              <span class="flex-1 text-sm font-medium text-gray-700">{{ customer.name }}</span>
              <span class="text-xs text-gray-400">{{ customer.phone }}</span>
            </label>
          </div>
          <div v-if="audience === 'order_item'" class="mt-4">
            <label class="mb-1 block text-xs font-medium text-gray-600">Previously ordered menu item</label>
            <select v-model="menuItemName" class="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-700 outline-none focus:border-brand">
              <option value="">Select a menu item</option>
              <option v-for="item in menuItems" :key="item.id" :value="item.name">{{ item.name }}</option>
            </select>
          </div>
        </section>

        <section class="rounded-xl bg-white p-5 shadow-sm">
          <h3 class="mb-4 font-semibold text-gray-800">Create Promotional Message</h3>
          <label class="mb-2 block text-xs font-medium text-gray-600">Message type</label>
          <div class="mb-4 grid grid-cols-3 gap-2">
            <button v-for="type in messageTypes" :key="type.id" type="button" @click="selectMessageType(type.id)" class="rounded-lg border px-2 py-2 text-xs font-semibold" :class="messageType === type.id ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 text-gray-600'">{{ type.label }}</button>
          </div>
          <div class="mb-4 grid gap-3 sm:grid-cols-2">
            <label class="text-xs font-medium text-gray-600">{{ messageType === 'new_menu' ? 'New menu item' : 'Menu item' }}
              <select v-model="menuItemName" class="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm font-normal text-gray-700 outline-none focus:border-brand"><option value="">Select a menu item</option><option v-for="item in menuItems" :key="item.id" :value="item.name">{{ item.name }}</option></select>
            </label>
            <label class="text-xs font-medium text-gray-600">{{ promotionFieldLabel }}
              <input v-model="promotionValue" type="text" class="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm font-normal text-gray-700 outline-none focus:border-brand" :placeholder="promotionFieldPlaceholder">
            </label>
          </div>
          <p class="mb-2 text-xs text-gray-500">Use <code class="rounded bg-gray-100 px-1">[Customer Name]</code> to personalize every message.</p>
          <textarea v-model="message" @input="messageEdited = true" rows="7" maxlength="2000" class="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Write your promotion message..." />
          <p class="mt-2 text-right text-xs text-gray-400">{{ message.length }}/2000</p>
        </section>
      </div>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="font-semibold text-gray-800">Preview Promotional Message</h3>
          <span class="text-xs text-gray-400">Messenger preview</span>
        </div>
        <div class="max-w-xl rounded-2xl rounded-tl-sm bg-blue-100 px-4 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{{ previewMessage || 'Your message preview will appear here.' }}</div>
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" :disabled="sending || !canSend" @click="handleSend" class="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
            {{ sending ? 'Sending...' : `Send to ${recipientCount} Customer${recipientCount === 1 ? '' : 's'}` }}
          </button>
          <p v-if="feedback" class="text-sm" :class="feedbackError ? 'text-red-600' : 'text-emerald-600'">{{ feedback }}</p>
        </div>
        <p class="mt-3 text-xs text-gray-400">Messages are sent through the configured Facebook Messenger Page. Failed deliveries are retained below with the reason.</p>
      </section>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <h3 class="mb-4 font-semibold text-gray-800">Promotion History & Delivery Status</h3>
        <div v-if="history.length" class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="border-b text-xs uppercase text-gray-400"><tr><th class="pb-3 pr-3">Sent</th><th class="pb-3 pr-3">Audience</th><th class="pb-3 pr-3">Message</th><th class="pb-3 pr-3">Delivery</th><th class="pb-3">Status</th></tr></thead>
            <tbody>
              <template v-for="campaign in history" :key="campaign.id">
                <tr class="border-b border-gray-100 align-top"><td class="py-3 pr-3 text-gray-500">{{ formatDate(campaign.created_at) }}</td><td class="py-3 pr-3 font-medium text-gray-700">{{ audienceLabel(campaign.audience) }}<br><span class="text-xs text-gray-400">{{ campaign.recipient_count }} recipients</span></td><td class="max-w-xs py-3 pr-3 text-gray-600"><p class="line-clamp-2">{{ campaign.message }}</p></td><td class="py-3 pr-3 text-gray-600">{{ campaign.sent_count }} sent · {{ campaign.failed_count }} failed</td><td class="py-3"><button type="button" @click="toggleRecipients(campaign.id)" class="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">{{ expandedCampaign === campaign.id ? 'Hide details' : 'View status' }}</button></td></tr>
                <tr v-if="expandedCampaign === campaign.id"><td colspan="5" class="bg-gray-50 p-4"><p v-if="recipientLoading" class="text-sm text-gray-400">Loading delivery details...</p><div v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><div v-for="recipient in recipients" :key="recipient.id" class="rounded border border-gray-200 bg-white p-3"><div class="flex justify-between gap-2"><span class="font-medium text-gray-700">{{ recipient.customer_name }}</span><span class="text-xs font-semibold" :class="recipient.delivery_status === 'sent' ? 'text-emerald-600' : 'text-red-600'">{{ recipient.delivery_status }}</span></div><p v-if="recipient.delivery_error" class="mt-1 text-xs text-red-500">{{ recipient.delivery_error }}</p></div></div></td></tr>
              </template>
            </tbody>
          </table>
        </div>
        <p v-else class="py-5 text-center text-sm text-gray-400">No promotions have been sent yet.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMenu, getPromotionAudiences, getPromotionHistory, getPromotionRecipients, sendPromotion } from '../api'

const route = useRoute()
const loading = ref(true)
const sending = ref(false)
const audience = ref('all')
const selectedCustomerIds = ref([])
const menuItems = ref([])
const menuItemName = ref('')
const messageType = ref('discount')
const promotionValue = ref('10%')
const messageEdited = ref(false)
const message = ref('')
const feedback = ref('')
const feedbackError = ref(false)
const audienceData = ref({ all: 0, repeat: 0, new: 0, inactive: 0, order_item: 0, customers: [] })
const history = ref([])
const expandedCampaign = ref(null)
const recipients = ref([])
const recipientLoading = ref(false)

const audienceGroups = [
  { id: 'all', label: 'All Customers', description: 'Everyone who has ordered' },
  { id: 'repeat', label: 'Repeat Customers', description: 'Customers with 2+ orders' },
  { id: 'new', label: 'New Customers', description: 'Joined within 30 days' },
  { id: 'inactive', label: 'Inactive Customers', description: 'No order for 30+ days' },
  { id: 'selected', label: 'Selected Customers', description: 'Choose individual customers' },
]
const messageTypes = [
  { id: 'today_special', label: 'Today Special' },
  { id: 'discount', label: 'Discount' },
  { id: 'new_menu', label: 'New Menu' },
]

const recipientCount = computed(() => audience.value === 'selected' ? selectedCustomerIds.value.length : audienceCount(audience.value))
const previewMessage = computed(() => message.value.replaceAll('[Customer Name]', audienceData.value.customers[0]?.name || 'Customer'))
const canSend = computed(() => Boolean(message.value.trim()) && recipientCount.value > 0)
const promotionFieldLabel = computed(() => messageType.value === 'discount' ? 'Discount' : messageType.value === 'new_menu' ? 'Price' : 'Special price or offer')
const promotionFieldPlaceholder = computed(() => messageType.value === 'discount' ? 'Example: 10%' : messageType.value === 'new_menu' ? 'Example: 159 THB' : 'Example: 99 THB')

watch(() => route.query.suggestion, suggestion => {
  if (!suggestion) return
  const text = String(suggestion)
  const item = text.match(/^(.+?)\s+(?:has low sales|is frequently ordered|is the current top seller)/i)?.[1]
  if (item) menuItemName.value = item
  if (/low sales|discount/i.test(text)) { messageType.value = 'discount'; promotionValue.value = text.match(/(\d+%)/)?.[1] || '10%' }
  else if (/top seller|combo/i.test(text)) { messageType.value = 'today_special'; promotionValue.value = '' }
  messageEdited.value = false
  message.value = promotionMessageFromSuggestion(text)
}, { immediate: true })

watch(menuItemName, async () => {
  if (audience.value === 'order_item') await loadAudiences()
  if (!messageEdited.value) applyTemplate()
})
watch(promotionValue, () => { if (!messageEdited.value) applyTemplate() })

onMounted(loadPage)

async function loadPage() {
  loading.value = true
  try {
    const [audiences, campaigns, menu] = await Promise.all([getPromotionAudiences({ menu_item_name: menuItemName.value || undefined }), getPromotionHistory(), getMenu()])
    audienceData.value = audiences.data
    history.value = campaigns.data
    menuItems.value = menu.data
  } catch (error) {
    feedback.value = error.response?.data?.detail || 'Could not load auto messaging data.'
    feedbackError.value = true
  } finally { loading.value = false }
}
function audienceCount(id) { return Number(audienceData.value[id] || 0) }
function audienceLabel(id) { return audienceGroups.find(group => group.id === id)?.label || id }
function messageTypeLabel(id) { return messageTypes.find(type => type.id === id)?.label || id }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '-' }

async function handleSend() {
  if (!canSend.value || !confirm(`Send this promotion to ${recipientCount.value} customer(s)?`)) return
  sending.value = true; feedback.value = ''
  try {
    const response = await sendPromotion({ audience: audience.value, customer_ids: selectedCustomerIds.value, menu_item_name: menuItemName.value || null, message_type: messageType.value, promotion_value: promotionValue.value || null, message: message.value.trim() })
    const result = response.data
    feedback.value = `${result.sent_count} sent; ${result.failed_count} failed; ${result.skipped_count} skipped. View status below.`
    feedbackError.value = Boolean(result.failed_count || result.skipped_count)
    const campaigns = await getPromotionHistory(); history.value = campaigns.data
  } catch (error) { feedback.value = error.response?.data?.detail || 'Promotion could not be sent.'; feedbackError.value = true }
  finally { sending.value = false }
}
async function toggleRecipients(campaignId) {
  if (expandedCampaign.value === campaignId) { expandedCampaign.value = null; return }
  expandedCampaign.value = campaignId; recipientLoading.value = true; recipients.value = []
  try { recipients.value = (await getPromotionRecipients(campaignId)).data } finally { recipientLoading.value = false }
}
function selectMessageType(type) { messageType.value = type; messageEdited.value = false; if (type === 'discount' && !promotionValue.value) promotionValue.value = '10%'; applyTemplate() }
function applyTemplate() {
  const item = menuItemName.value || '[Menu Item]'
  if (messageType.value === 'today_special') message.value = `Hi [Customer Name]!\n\nToday's Special! Enjoy ${item}${promotionValue.value ? ` for ${promotionValue.value}` : ''} today. Order now via Messenger!`
  else if (messageType.value === 'new_menu') message.value = `Hi [Customer Name]!\n\nNew Menu! Try our new ${item}${promotionValue.value ? ` for ${promotionValue.value}` : ''}. Order now via Messenger!`
  else message.value = `Hi [Customer Name]!\n\nSpecial Offer! Get ${promotionValue.value || '[Discount]'} off ${item} today. Order now via Messenger!`
}
function promotionMessageFromSuggestion(suggestion) {
  const itemName = suggestion.match(/^(.+?)\s+(?:has low sales|is frequently ordered|is the current top seller)/i)?.[1]
  const groupedLowSalesItems = suggestion.match(/menu items have low sales:\s+(.+?)\.\s+Consider/i)?.[1]
  const timeRange = suggestion.match(/between\s+(.+?)\.\s+Consider/i)?.[1]

  if (groupedLowSalesItems) {
    return `Hi [Customer Name]!

Special offer today: enjoy 10% off selected items including ${groupedLowSalesItems}.
Order now via Messenger before the offer ends!`
  }

  if (/low sales|discount/i.test(suggestion) && itemName) {
    return `Hi [Customer Name]!

Special offer just for you: enjoy 10% off ${itemName} today.
Order now via Messenger before the offer ends!`
  }

  if (/combo/i.test(suggestion) && itemName) {
    return `Hi [Customer Name]!

Great news: ${itemName} pairs perfectly with Cola, so we are preparing a tasty combo deal for you.
Order now via Messenger and enjoy it today!`
  }

  if (/time-based|between/i.test(suggestion)) {
    return `Hi [Customer Name]!

Hungry during ${timeRange || 'our quieter hours'}? Order during this time and enjoy a special promotion from us.
Message us now to place your order!`
  }

  if (/top seller|promoting/i.test(suggestion) && itemName) {
    return `Hi [Customer Name]!

Customer favorite alert: ${itemName} is one of our most-loved items today.
Order now via Messenger and enjoy it while it is fresh!`
  }

  return `Hi [Customer Name]!

We have a special promotion ready for you today.
Order now via Messenger. Limited time offer!`
}
</script>
