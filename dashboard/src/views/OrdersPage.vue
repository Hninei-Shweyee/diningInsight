<template>
  <div class="p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Orders</h2>
      </div>
      <span class="text-sm text-gray-500">{{ filtered.length }} orders</span>
    </div>

    <!-- ── Filter bar ── -->
    <div class="bg-white rounded-xl shadow-sm p-4 mb-5 space-y-3">

      <!-- Row 1: Search + Payment -->
      <div class="flex flex-wrap gap-3">
        <!-- Search by customer name / item -->
        <div class="relative flex-1 min-w-[180px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            v-model="search"
            type="text"
            placeholder="Search customer name or item..."
            class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <!-- Payment method filter -->
        <select
          v-model="paymentFilter"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All Payments</option>
          <option value="Cash">💵 Cash</option>
          <option value="Bank Transfer">🏦 Bank Transfer</option>
        </select>

        <!-- Reset button -->
        <button
          v-if="hasActiveFilters"
          @click="resetFilters"
          class="text-sm text-red-500 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          ✕ Clear filters
        </button>
      </div>

      <!-- Row 2: Status + Date range -->
      <div class="flex flex-wrap gap-3">
        <select
          v-model="statusFilter"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="cooking">Cooking</option>
          <option value="ready">Ready</option>
          <option value="delivered">Delivered</option>
        </select>

        <input
          v-model="dateFrom"
          type="date"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <span class="self-center text-gray-400 text-sm">→</span>
        <input
          v-model="dateTo"
          type="date"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-16 text-gray-400">Loading orders…</div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="text-center py-16 text-gray-400">
      No orders match your filters.
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl shadow-sm overflow-x-auto">
      <table class="w-full text-sm min-w-[700px]">
        <thead>
          <tr class="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3 font-medium">Customer</th>
            <th class="px-4 py-3 font-medium">Address</th>
            <th class="px-4 py-3 font-medium">Phone</th>
            <th class="px-4 py-3 font-medium">Items</th>
            <th class="px-4 py-3 font-medium">Total</th>
            <th class="px-4 py-3 font-medium">Payment</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in filtered"
            :key="order.id"
            class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ formatDate(order.ordered_at) }}</td>
            <td class="px-4 py-3 font-medium text-gray-800">{{ order.customer_name }}</td>
            <td class="px-4 py-3 text-gray-600 max-w-[140px] truncate">{{ order.customer_address }}</td>
            <td class="px-4 py-3 text-gray-600">{{ order.customer_phone }}</td>
            <td class="px-4 py-3 text-gray-600">
              <span v-for="item in order.items" :key="item.id" class="block">
                {{ item.item_name }} x{{ item.quantity }}
              </span>
            </td>
            <td class="px-4 py-3 font-medium text-gray-800">{{ order.total_price }} THB</td>
            <td class="px-4 py-3 text-gray-600">{{ order.payment_method }}</td>
            <td class="px-4 py-3">
              <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="statusClass(order.status)">
                {{ order.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <select
                :value="order.status"
                @change="store.changeStatus(order.id, $event.target.value)"
                class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="pending">pending</option>
                <option value="cooking">cooking</option>
                <option value="ready">ready</option>
                <option value="delivered">delivered</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useOrdersStore } from '../stores/orders'

const store         = useOrdersStore()
const search        = ref('')
const statusFilter  = ref('')
const paymentFilter = ref('')
const dateFrom      = ref('')
const dateTo        = ref('')

onMounted(() => store.fetchOrders())

const hasActiveFilters = computed(() =>
  search.value || statusFilter.value || paymentFilter.value || dateFrom.value || dateTo.value
)

function resetFilters() {
  search.value        = ''
  statusFilter.value  = ''
  paymentFilter.value = ''
  dateFrom.value      = ''
  dateTo.value        = ''
}

// Client-side filtering
const filtered = computed(() => {
  return store.orders.filter(order => {
    // Search: customer name or item name
    if (search.value) {
      const q = search.value.toLowerCase()
      const matchName  = order.customer_name?.toLowerCase().includes(q)
      const matchItem  = order.items?.some(i => i.item_name.toLowerCase().includes(q))
      if (!matchName && !matchItem) return false
    }

    // Status
    if (statusFilter.value && order.status !== statusFilter.value) return false

    // Payment
    if (paymentFilter.value && order.payment_method !== paymentFilter.value) return false

    // Date range
    if (dateFrom.value || dateTo.value) {
      const orderDate = order.ordered_at.split('T')[0]
      if (dateFrom.value && orderDate < dateFrom.value) return false
      if (dateTo.value   && orderDate > dateTo.value)   return false
    }

    return true
  })
})

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
</script>
