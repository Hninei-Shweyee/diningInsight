<template>
  <div class="p-4 sm:p-6">
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Business Insights</h2>
      </div>

      <div class="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div class="relative">
          <select
            v-model="period"
            class="h-10 min-w-48 appearance-none rounded-md border border-gray-200 bg-white px-3 pr-9 text-sm font-semibold text-gray-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            @change="fetchInsights"
          >
            <option v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <svg
            class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <div v-if="period === 'custom'" class="flex items-center gap-2">
          <input
            v-model="customFrom"
            type="date"
            class="h-9 rounded-md border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-brand"
            @change="fetchInsights"
          >
          <input
            v-model="customTo"
            type="date"
            class="h-9 rounded-md border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-brand"
            @change="fetchInsights"
          >
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-gray-400">Loading insights...</div>

    <div v-else class="space-y-5">
      <div class="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <p class="mb-1 text-xs text-gray-500">Total Orders</p>
          <p class="text-3xl font-bold text-brand">{{ data.total_orders }}</p>
        </div>
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <p class="mb-1 text-xs text-gray-500">Total Revenue</p>
          <p class="text-3xl font-bold text-brand">{{ formatMoney(data.total_revenue) }}</p>
          <p class="text-xs text-gray-400">THB</p>
        </div>
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <p class="mb-1 text-xs text-gray-500">Total Customers</p>
          <p class="text-3xl font-bold text-brand">{{ data.total_customers }}</p>
        </div>
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <p class="mb-1 text-xs text-gray-500">Repeat Customers</p>
          <p class="text-3xl font-bold text-brand">{{ data.repeat_customers }}</p>
        </div>
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <p class="mb-1 text-xs text-gray-500">Repeat Purchase Rate</p>
          <p class="text-3xl font-bold text-brand">{{ data.repeat_purchase_rate }}%</p>
        </div>
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <p class="mb-1 text-xs text-gray-500">Most Popular Item</p>
          <p class="truncate text-xl font-bold text-gray-800">{{ data.most_popular_menu_item?.name || '-' }}</p>
          <p class="text-xs text-gray-400">{{ data.most_popular_menu_item?.quantity || 0 }} sold</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h3 class="mb-4 font-semibold text-gray-700">Peak Ordering Time</h3>
          <div class="mb-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
            <p>Business hours: <span class="font-semibold text-gray-800">9am - 5pm</span></p>
            <p>Peak hour: <span class="font-semibold text-gray-800">{{ data.peak_ordering_time || '-' }}</span></p>
          </div>
          <div class="flex h-40 items-end gap-3 border-b border-gray-100 pb-2">
            <div
              v-for="bucket in businessHourPeriods"
              :key="bucket.period"
              class="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span class="text-xs font-semibold text-gray-600">{{ bucket.orders }}</span>
              <div class="flex h-24 w-full items-end justify-center rounded-t bg-gray-50">
                <div
                  class="w-7 rounded-t bg-teal-500 transition-all"
                  :class="bucket.period === data.peak_ordering_time ? 'bg-brand' : 'bg-teal-500'"
                  :style="{ height: verticalBarHeight(bucket.orders, businessHourPeriods) + '%' }"
                />
              </div>
              <span class="w-full truncate text-center text-[11px] font-medium text-gray-500">{{ compactPeriod(bucket.period) }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h3 class="mb-4 font-semibold text-gray-700">Least Ordered Analysis</h3>
          <InsightBars :items="data.least_ordered_items" :limit="3" :max-value="10" empty-text="No low-demand items found." />
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="font-semibold text-gray-700">Menu Popularity Analysis</h3>
          <span class="text-xs text-gray-400">{{ data.menu_popularity.length }} items</span>
        </div>
        <div class="max-h-56 overflow-auto pr-1">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="sticky top-0 z-10 border-b border-gray-100 bg-white text-xs uppercase text-gray-400">
              <tr>
                <th class="py-3 pr-4">Rank</th>
                <th class="py-3 pr-4">Menu Item</th>
                <th class="py-3 pr-4">Quantity Sold</th>
                <th class="py-3 pr-4">Orders</th>
                <th class="py-3 pr-4">Revenue</th>
                <th class="py-3">Popularity Level</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in data.menu_popularity"
                :key="item.name"
                class="border-b border-gray-50 last:border-0"
              >
                <td class="py-3 pr-4 font-semibold text-gray-700">#{{ item.rank }}</td>
                <td class="py-3 pr-4 font-medium text-gray-800">{{ item.name }}</td>
                <td class="py-3 pr-4 text-gray-600">{{ item.quantity }}</td>
                <td class="py-3 pr-4 text-gray-600">{{ item.order_count }}</td>
                <td class="py-3 pr-4 text-gray-600">{{ formatMoney(item.revenue) }} THB</td>
                <td class="py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="levelClass(item.popularity_level)">
                    {{ item.popularity_level }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="data.menu_popularity.length === 0" class="py-8 text-center text-sm text-gray-400">
            No menu popularity data yet.
          </p>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <h3 class="mb-4 font-semibold text-gray-700">Promotion Suggestions</h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="suggestion in data.promotion_suggestions"
            :key="suggestion"
            class="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-gray-700"
          >
            <p>{{ suggestion }}</p>
            <button
              type="button"
              class="mt-3 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
              @click="createPromotion(suggestion)"
            >
              Create Promotion
            </button>
          </div>
        </div>
        <p v-if="data.promotion_suggestions.length === 0" class="py-4 text-sm text-gray-400">
          No promotion suggestions yet.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getInsights } from '../api'

const router = useRouter()
const loading = ref(true)
const period = ref('all')
const customFrom = ref('')
const customTo = ref('')
const data = ref(defaultInsights())

const periodOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
]

const InsightBars = defineComponent({
  props: {
    items: { type: Array, required: true },
    limit: { type: Number, default: null },
    maxValue: { type: Number, default: null },
    emptyText: { type: String, required: true },
  },
  setup(props) {
    return () => props.items.length
      ? h('div', { class: 'space-y-3' }, props.items.slice(0, props.limit ?? props.items.length).map((item, index) => h('div', {
        key: item.name,
        class: 'flex items-center gap-3',
      }, [
        h('span', {
          class: 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand',
        }, index + 1),
        h('div', { class: 'min-w-0 flex-1' }, [
          h('div', { class: 'mb-1 flex justify-between gap-3 text-sm' }, [
            h('span', { class: 'truncate font-medium text-gray-700' }, item.name),
            h('span', { class: 'flex-shrink-0 text-gray-500' }, `${item.quantity} sold`),
          ]),
          h('div', { class: 'h-1.5 rounded-full bg-gray-100' }, [
            h('div', {
              class: 'h-1.5 rounded-full bg-brand',
              style: { width: `${props.maxValue ? thresholdBarWidth(item.quantity, props.maxValue) : barWidth(item.quantity, props.items)}%` },
            }),
          ]),
        ]),
      ])))
      : h('p', { class: 'py-4 text-center text-sm text-gray-400' }, props.emptyText)
  },
})

onMounted(fetchInsights)

const businessHourPeriods = computed(() => {
  return data.value.peak_ordering_periods
})

async function fetchInsights() {
  loading.value = true
  const res = await getInsights(buildInsightParams())
  data.value = { ...defaultInsights(), ...res.data }
  loading.value = false
}

function buildInsightParams() {
  const params = { period: period.value }
  if (period.value === 'custom') {
    if (customFrom.value) params.date_from = customFrom.value
    if (customTo.value) params.date_to = customTo.value
  }
  return params
}

function defaultInsights() {
  return {
    most_ordered_items: [],
    least_ordered_items: [],
    top_this_month: [],
    total_orders: 0,
    total_revenue: 0,
    total_customers: 0,
    peak_ordering_time: null,
    peak_ordering_periods: [],
    last_order_date: null,
    repeat_customers: 0,
    repeat_purchase_rate: 0,
    most_popular_menu_item: null,
    menu_popularity: [],
    promotion_suggestions: [],
  }
}

function barWidth(value, list, key = 'quantity') {
  const max = Math.max(...list.map(item => Number(item[key] ?? item.quantity ?? 0)), 1)
  return Math.round((Number(value || 0) / max) * 100)
}

function thresholdBarWidth(value, maxValue) {
  return Math.min(Math.round((Number(value || 0) / maxValue) * 100), 100)
}

function verticalBarHeight(value, list) {
  const max = Math.max(...list.map(item => Number(item.orders || 0)), 1)
  const percent = Math.round((Number(value || 0) / max) * 100)
  return Math.max(percent, value > 0 ? 8 : 0)
}

function compactPeriod(period) {
  return period.replace(/\s/g, '')
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString()
}

function levelClass(level) {
  if (level === 'High Demand') return 'bg-emerald-100 text-emerald-700'
  if (level === 'Moderate Demand') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function createPromotion(suggestion) {
  router.push({
    name: 'AutoMessaging',
    query: {
      type: inferPromotionType(suggestion),
      suggestion,
    },
  })
}

function inferPromotionType(suggestion) {
  const text = suggestion.toLowerCase()
  if (text.includes('low') || text.includes('discount')) return 'discount'
  if (text.includes('combo')) return 'today_special'
  if (text.includes('top seller') || text.includes('promoting')) return 'today_special'
  return 'discount'
}
</script>
