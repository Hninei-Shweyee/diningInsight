<template>
  <div class="p-4 sm:p-6">
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Business Insights</h2>
        <p class="text-sm text-gray-500">Sales, customers, menu performance, and promotion ideas.</p>
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
          <h3 class="mb-4 font-semibold text-gray-700">Most Ordered Menu Items</h3>
          <div v-if="chartData" class="flex justify-center">
            <div class="w-full max-w-xs sm:max-w-sm">
              <Pie :data="chartData" :options="chartOptions" />
            </div>
          </div>
          <p v-else class="py-8 text-center text-sm text-gray-400">No order data yet.</p>
        </div>

        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h3 class="mb-4 font-semibold text-gray-700">Peak Ordering Time</h3>
          <p class="mb-4 text-sm text-gray-500">
            Busiest hour: <span class="font-semibold text-gray-800">{{ data.peak_ordering_time || '-' }}</span>
          </p>
          <div class="space-y-3">
            <div
              v-for="bucket in data.peak_ordering_periods"
              :key="bucket.period"
              class="flex items-center gap-3"
            >
              <span class="w-24 text-xs font-medium text-gray-600">{{ bucket.period }}</span>
              <div class="h-2 flex-1 rounded-full bg-gray-100">
                <div
                  class="h-2 rounded-full bg-teal-500 transition-all"
                  :style="{ width: barWidth(bucket.orders, data.peak_ordering_periods, 'orders') + '%' }"
                />
              </div>
              <span class="w-12 text-right text-xs text-gray-500">{{ bucket.orders }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h3 class="mb-4 font-semibold text-gray-700">Most Ordered Analysis</h3>
          <InsightBars :items="data.most_ordered_items" empty-text="No ordered items found." />
        </div>

        <div class="rounded-lg bg-white p-6 shadow-sm">
          <h3 class="mb-4 font-semibold text-gray-700">Least Ordered Analysis</h3>
          <InsightBars :items="data.least_ordered_items" empty-text="No ordered items found." />
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="font-semibold text-gray-700">Menu Popularity Analysis</h3>
          <span class="text-xs text-gray-400">{{ data.menu_popularity.length }} items</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="border-b border-gray-100 text-xs uppercase text-gray-400">
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
            {{ suggestion }}
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
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { getInsights } from '../api'

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels)

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

const COLORS = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#2ECC71',
  '#E74C3C',
  '#1ABC9C',
  '#F39C12',
  '#8E44AD',
  '#3498DB',
  '#E67E22',
]

const InsightBars = defineComponent({
  props: {
    items: { type: Array, required: true },
    emptyText: { type: String, required: true },
  },
  setup(props) {
    return () => props.items.length
      ? h('div', { class: 'space-y-3' }, props.items.map((item, index) => h('div', {
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
              style: { width: `${barWidth(item.quantity, props.items)}%` },
            }),
          ]),
        ]),
      ])))
      : h('p', { class: 'py-4 text-center text-sm text-gray-400' }, props.emptyText)
  },
})

onMounted(fetchInsights)

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

const chartData = computed(() => {
  const items = data.value.most_ordered_items
  if (!items.length) return null
  return {
    labels: items.map(i => i.name),
    datasets: [{
      data: items.map(i => i.quantity),
      backgroundColor: COLORS.slice(0, items.length),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }
})

const chartOptions = computed(() => {
  const items = data.value.most_ordered_items
  const total = items.reduce((sum, i) => sum + i.quantity, 0)
  return {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { size: 11 }, padding: 16 },
      },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 14 },
        formatter: (value) => {
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
          return pct >= 5 ? `${pct}%` : ''
        },
        textAlign: 'center',
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0
            return ` ${ctx.label}: ${ctx.parsed} sold (${pct}%)`
          },
        },
      },
    },
  }
})

function barWidth(value, list, key = 'quantity') {
  const max = Math.max(...list.map(item => Number(item[key] ?? item.quantity ?? 0)), 1)
  return Math.round((Number(value || 0) / max) * 100)
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString()
}

function levelClass(level) {
  if (level === 'Highly Popular') return 'bg-emerald-100 text-emerald-700'
  if (level === 'Popular') return 'bg-blue-100 text-blue-700'
  if (level === 'Moderate') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}
</script>
