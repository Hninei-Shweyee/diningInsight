// stores/orders.js — Order state + actions
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getOrders, updateStatus } from '../api'

export const useOrdersStore = defineStore('orders', () => {
  const orders  = ref([])
  const loading = ref(false)
  const error   = ref(null)

  async function fetchOrders(status = null) {
    loading.value = true
    error.value   = null
    try {
      const res = await getOrders(status)
      orders.value = res.data
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function changeStatus(orderId, newStatus) {
    await updateStatus(orderId, newStatus)
    // Update locally so UI refreshes without a full reload
    const order = orders.value.find(o => o.id === orderId)
    if (order) order.status = newStatus
  }

  return { orders, loading, error, fetchOrders, changeStatus }
})
