<template>
  <div class="p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Auto Messaging</h2>
      <p class="text-gray-500 text-sm mt-0.5">Send targeted promotions to customer segments via Messenger</p>
    </div>

    <!-- Coming soon banner -->
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
      <span class="text-2xl">🚧</span>
      <div>
        <p class="font-semibold text-amber-800 text-sm">Coming in Progress 2</p>
        <p class="text-amber-700 text-xs mt-0.5">
          Auto Messaging will be enabled after the Claude AI integration is complete.
          The UI below is a preview.
        </p>
      </div>
    </div>

    <!-- Preview UI (disabled) -->
    <div class="opacity-50 pointer-events-none space-y-5">
      <!-- Target segment selector -->
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="font-semibold text-gray-700 mb-4">1. Select Target Segment</h3>
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="segment in segments"
            :key="segment.key"
            class="border-2 rounded-xl p-4 text-center cursor-pointer"
            :class="segment.key === 'vip' ? 'border-brand bg-brand/5' : 'border-gray-200'"
          >
            <span class="text-2xl">{{ segment.icon }}</span>
            <p class="font-medium text-gray-800 text-sm mt-2">{{ segment.label }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ segment.desc }}</p>
          </div>
        </div>
      </div>

      <!-- Message type -->
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="font-semibold text-gray-700 mb-4">2. Choose Message Type</h3>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="type in messageTypes"
            :key="type.key"
            class="border border-gray-200 rounded-lg p-4 flex items-start gap-3"
          >
            <span class="text-xl mt-0.5">{{ type.icon }}</span>
            <div>
              <p class="font-medium text-gray-800 text-sm">{{ type.label }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ type.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Message preview -->
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="font-semibold text-gray-700 mb-4">3. Message Preview</h3>
        <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed border border-gray-200">
          🌟 Hi [Customer Name]! We miss you at Jasmine Restaurant.<br/>
          Today's Special: <strong>Classic Burger only 69 THB</strong> (save 20 THB)!<br/>
          Order now via Messenger. Limited time offer! 🍔
        </div>
        <button class="mt-4 w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium">
          Send to 12 customers
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const segments = [
  { key: 'vip',      icon: '⭐', label: 'VIP',      desc: 'Ordered 5+ times' },
  { key: 'frequent', icon: '🔄', label: 'Frequent',  desc: 'Active last 30 days' },
  { key: 'inactive', icon: '💤', label: 'Inactive',  desc: 'No order in 30+ days' },
]
const messageTypes = [
  { key: 'today_special', icon: '🍽️', label: "Today's Special", desc: 'Announce the daily special menu' },
  { key: 'discount',      icon: '🎁', label: 'Discount Offer',  desc: 'Send a discount promotion' },
  { key: 'new_menu',      icon: '✨', label: 'New Menu Launch', desc: 'Introduce new menu items' },
  { key: 'reactivate',    icon: '💌', label: 'Win Back',        desc: 'Re-engage inactive customers' },
]
</script>
