<template>
  <div class="p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Customers</h2>
      <p class="text-gray-500 text-sm mt-0.5">View customer profiles and order history</p>
    </div>

    <!-- ── Filter bar ── -->
    <div class="bg-white rounded-xl shadow-sm p-4 mb-5 space-y-3">
      <!-- Row 1: Search + Clear -->
      <div class="flex flex-wrap gap-3">
        <div class="relative flex-1 min-w-[180px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            v-model="search"
            type="text"
            placeholder="Search by name or phone…"
            class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          v-if="hasActiveFilters"
          @click="resetFilters"
          class="text-sm text-red-500 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          ✕ Clear filters
        </button>
      </div>

      <!-- Row 2: Dropdowns -->
      <div class="flex flex-wrap gap-3">
        <!-- Preferred Menu / Frequency -->
        <select
          v-model="sortBy"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">🍽️ All Menus</option>
          <option value="most_frequent">Most Frequent</option>
          <option value="least_frequent">Least Frequent</option>
        </select>

        <!-- Duration -->
        <select
          v-model="duration"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">📅 All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="custom">Custom Range</option>
        </select>

        <!-- Custom date range inputs -->
        <template v-if="duration === 'custom'">
          <input
            v-model="customFrom"
            type="date"
            class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <span class="self-center text-gray-400 text-sm">→</span>
          <input
            v-model="customTo"
            type="date"
            class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </template>
      </div>
    </div>

    <div v-if="fetchError" class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
      {{ fetchError }}
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Loading customers…</div>

    <div v-else class="flex flex-col lg:flex-row gap-5">
      <!-- Customer list -->
      <div class="w-full lg:w-72 lg:flex-shrink-0 space-y-2">
        <p class="text-xs text-gray-400 mb-2">{{ filtered.length }} customers</p>
        <div
          v-for="c in filtered"
          :key="c.id"
          @click="selectCustomer(c.id)"
          class="bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all"
          :class="selected?.id === c.id ? 'ring-2 ring-brand' : 'hover:shadow-md'"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {{ c.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-gray-800 truncate">{{ c.name }}</p>
              <p class="text-xs text-gray-500">{{ c.phone }}</p>
              <p v-if="c.preferred_menu" class="text-xs text-brand mt-0.5 truncate">⭐ {{ c.preferred_menu }}</p>
            </div>
            <span class="ml-auto text-xs bg-brand/10 text-brand font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              {{ c.total_orders }} orders
            </span>
          </div>
        </div>

        <p v-if="filtered.length === 0" class="text-center text-gray-400 py-8 text-sm">No customers found.</p>
      </div>

      <!-- Customer profile drawer -->
      <div class="flex-1">
        <div v-if="!selected" class="bg-white rounded-xl shadow-sm h-64 flex items-center justify-center text-gray-400">
          Select a customer to view their profile
        </div>

        <div v-else class="bg-white rounded-xl shadow-sm p-6">
          <!-- Profile header -->
          <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div class="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-white text-2xl font-bold">
              {{ selected.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-800">{{ selected.name }}</h3>
              <p class="text-gray-500 text-sm">Customer since {{ formatDate(selected.created_at) }}</p>
              <p v-if="selected.preferred_menu" class="text-sm text-brand mt-1">⭐ Favourite: {{ selected.preferred_menu }}</p>
            </div>
            <div class="ml-auto text-right">
              <p class="text-2xl font-bold text-brand">{{ selected.total_orders }}</p>
              <p class="text-xs text-gray-500">Total Orders</p>
            </div>
          </div>

          <!-- Contact info -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-500 mb-1">📞 Phone</p>
              <p class="font-medium text-gray-800 text-sm">{{ selected.phone }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-500 mb-1">📍 Address</p>
              <p class="font-medium text-gray-800 text-sm">{{ selected.address }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-500 mb-1">🕐 Last Order</p>
              <p class="font-medium text-gray-800 text-sm">
                {{ selected.orders.length ? formatDate(selected.orders[0].ordered_at) : '–' }}
              </p>
            </div>
          </div>

          <!-- Order history -->
          <div>
            <h4 class="font-semibold text-gray-700 mb-3 text-sm">Order History</h4>
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div
                v-for="order in selected.orders"
                :key="order.id"
                class="border border-gray-100 rounded-lg p-3 text-sm"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-gray-500 text-xs">{{ formatDate(order.ordered_at) }}</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(order.status)">
                    {{ order.status }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-700">
                    {{ order.items.map(i => `${i.item_name} x${i.quantity}`).join(', ') }}
                  </span>
                  <span class="font-medium text-gray-800">{{ order.total_price }} THB</span>
                </div>
                <p class="text-xs text-gray-400 mt-1">{{ order.payment_method }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getCustomers, getCustomer } from '../api'

const customers = ref([])
const selected  = ref(null)
const loading   = ref(true)
const fetchError = ref(null)

// Filters
const search     = ref('')
const sortBy     = ref('')
const duration   = ref('all')
const customFrom = ref('')
const customTo   = ref('')

const hasActiveFilters = computed(() =>
  search.value || sortBy.value || duration.value !== 'all'
)

// Client-side filter by search
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return customers.value.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false
    return true
  })
})

// Build date_from / date_to from the selected duration
function getDateRange() {
  const now   = new Date()
  const today = now.toISOString().split('T')[0]

  if (duration.value === 'all')   return {}
  if (duration.value === 'today') return { date_from: today, date_to: today }

  if (duration.value === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    return { date_from: start.toISOString().split('T')[0], date_to: today }
  }

  if (duration.value === 'month') {
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0')
    return { date_from: `${y}-${m}-01`, date_to: today }
  }

  if (duration.value === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last  = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      date_from: first.toISOString().split('T')[0],
      date_to:   last.toISOString().split('T')[0],
    }
  }

  if (duration.value === 'custom' && customFrom.value && customTo.value) {
    return { date_from: customFrom.value, date_to: customTo.value }
  }

  return {}
}

async function fetchCustomers() {
  loading.value    = true
  fetchError.value = null
  try {
    const params = { ...getDateRange() }
    if (sortBy.value) params.sort_by = sortBy.value
    const res = await getCustomers(params)
    customers.value = res.data
  } catch (e) {
    fetchError.value = e.response?.data?.detail || 'Failed to load customers. Please try again.'
  } finally {
    loading.value = false
  }
}

// Re-fetch when sortBy or duration changes (skip custom until both dates filled)
watch([sortBy, duration], () => {
  if (duration.value !== 'custom') fetchCustomers()
})

// Re-fetch when custom range is fully filled
watch([customFrom, customTo], () => {
  if (duration.value === 'custom' && customFrom.value && customTo.value) fetchCustomers()
})

function resetFilters() {
  search.value   = ''
  sortBy.value   = ''
  duration.value = 'all'
  customFrom.value = ''
  customTo.value   = ''
  fetchCustomers()
}

async function selectCustomer(id) {
  const res = await getCustomer(id)
  selected.value = res.data
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusClass(status) {
  return {
    pending:   'bg-yellow-100 text-yellow-700',
    cooking:   'bg-orange-100 text-orange-700',
    ready:     'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
  }[status] || 'bg-gray-100 text-gray-600'
}

onMounted(fetchCustomers)
</script>
