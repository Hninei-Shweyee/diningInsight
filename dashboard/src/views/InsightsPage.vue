<template>
  <div class="p-4 sm:p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Insights</h2>
      <p class="text-gray-500 text-sm mt-0.5">Business analytics and sales trends</p>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Loading insights…</div>

    <div v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl p-5 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Total Orders</p>
          <p class="text-3xl font-bold text-brand">{{ data.total_orders }}</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p class="text-3xl font-bold text-brand">{{ data.total_revenue.toLocaleString() }}</p>
          <p class="text-xs text-gray-400">THB</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Peak Ordering Time</p>
          <p class="text-xl font-bold text-gray-800">{{ data.peak_ordering_time || '–' }}</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm">
          <p class="text-xs text-gray-500 mb-1">Repeat Customers</p>
          <p class="text-3xl font-bold text-brand">{{ data.repeat_customers }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Pie chart: most ordered items -->
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <h3 class="font-semibold text-gray-700 mb-4">Most Ordered Menu Items</h3>
          <div v-if="chartData" class="flex justify-center">
            <div class="w-full max-w-xs sm:max-w-sm">
              <Pie :data="chartData" :options="chartOptions" />
            </div>
          </div>
          <p v-else class="text-center text-gray-400 text-sm py-8">No order data yet.</p>
        </div>

        <!-- Top items this month -->
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <h3 class="font-semibold text-gray-700 mb-4">Top Items This Month</h3>
          <div class="space-y-3">
            <div
              v-for="(item, i) in data.top_this_month"
              :key="item.name"
              class="flex items-center gap-3"
            >
              <span class="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
                {{ i + 1 }}
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700 truncate">{{ item.name }}</span>
                  <span class="text-gray-500 flex-shrink-0 ml-2">{{ item.quantity }} sold</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    class="bg-brand h-1.5 rounded-full transition-all"
                    :style="{ width: barWidth(item.quantity, data.top_this_month) + '%' }"
                  />
                </div>
              </div>
            </div>
            <p v-if="data.top_this_month.length === 0" class="text-center text-gray-400 text-sm py-4">
              No orders this month yet.
            </p>
          </div>
        </div>

        <!-- All-time ranking -->
        <div class="bg-white rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 class="font-semibold text-gray-700 mb-4">All-Time Most Ordered</h3>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div
              v-for="item in data.most_ordered_items"
              :key="item.name"
              class="text-center bg-gray-50 rounded-lg p-3"
            >
              <p class="text-2xl font-bold text-brand">{{ item.quantity }}</p>
              <p class="text-xs text-gray-600 mt-1 truncate">{{ item.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { getInsights } from '../api'

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels)

const loading = ref(true)
const data    = ref({
  most_ordered_items: [],
  top_this_month:     [],
  total_orders:       0,
  total_revenue:      0,
  peak_ordering_time: null,
  last_order_date:    null,
  repeat_customers:   0,
})

onMounted(async () => {
  const res  = await getInsights()
  data.value = res.data
  loading.value = false
})

// 13 fully distinct colors — one per menu item, no duplicates
const COLORS = [
  '#FF6384', // pink-red
  '#36A2EB', // blue
  '#FFCE56', // yellow
  '#4BC0C0', // teal
  '#9966FF', // purple
  '#FF9F40', // orange
  '#2ECC71', // green
  '#E74C3C', // red
  '#1ABC9C', // emerald
  '#F39C12', // amber
  '#8E44AD', // violet
  '#3498DB', // sky blue
  '#E67E22', // dark orange
]

const chartData = computed(() => {
  const items = data.value.most_ordered_items
  if (!items.length) return null
  return {
    labels:   items.map(i => i.name),
    datasets: [{
      data:            items.map(i => i.quantity),
      backgroundColor: COLORS.slice(0, items.length),
      borderWidth:     2,
      borderColor:     '#fff',
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
        // Show "FoodName\n12%" on each slice
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
            return ` ${ctx.label}: ${ctx.parsed} orders (${pct}%)`
          },
        },
      },
    },
  }
})

function barWidth(qty, list) {
  const max = Math.max(...list.map(i => i.quantity), 1)
  return Math.round((qty / max) * 100)
}
</script>
