<template>
  <div class="relative min-h-[calc(100vh-4rem)] p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Auto Messaging</h2>
    </div>

    <div v-if="hasPromotionSuggestion" class="absolute inset-0 flex items-center justify-center p-6">
      <div class="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 font-semibold text-gray-700">Message Preview</h3>
        <textarea
          v-model="message"
          rows="7"
          class="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const message = ref('')

const promotionSuggestion = computed(() => String(route.query.suggestion || '').trim())
const hasPromotionSuggestion = computed(() => Boolean(promotionSuggestion.value))

watch(promotionSuggestion, () => {
  message.value = hasPromotionSuggestion.value
    ? promotionMessageFromSuggestion(promotionSuggestion.value)
    : ''
}, { immediate: true })

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
