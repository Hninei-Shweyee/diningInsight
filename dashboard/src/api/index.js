// api/index.js — Axios client for FastAPI backend
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach a fresh Firebase token to every request
api.interceptors.request.use(async (config) => {
  try {
    const { getAuth } = await import('firebase/auth')
    const currentUser = getAuth().currentUser
    if (currentUser) {
      const idToken = await currentUser.getIdToken()
      config.headers.Authorization = `Bearer ${idToken}`
      localStorage.setItem('fb_token', idToken)
      return config
    }
  } catch (_) {}
  const token = localStorage.getItem('fb_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, refresh the Firebase token and retry the request once
api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { getAuth } = await import('firebase/auth')
        const user = getAuth().currentUser
        if (user) {
          const idToken = await user.getIdToken(true)
          localStorage.setItem('fb_token', idToken)
          original.headers.Authorization = `Bearer ${idToken}`
          return api(original)
        }
      } catch (_) {}
    }
    return Promise.reject(error)
  }
)

// ── Orders ──────────────────────────────────────────────
export const getOrders     = (status)        => api.get('/orders', { params: status ? { status } : {} })
export const updateStatus  = (id, status)    => api.patch(`/orders/${id}/status`, { status })

// ── Customers ───────────────────────────────────────────
export const getCustomers  = (params = {})   => api.get('/customers', { params })
export const getCustomer   = (id)            => api.get(`/customers/${id}`)

// ── Menu ────────────────────────────────────────────────
export const getMenu       = ()              => api.get('/menu')
export const createMenuItem = (data)         => api.post('/menu', data)
export const updateMenuItem = (id, data)     => api.put(`/menu/${id}`, data)
export const deleteMenuItem = (id)           => api.delete(`/menu/${id}`)

// ── Insights ────────────────────────────────────────────
export const getInsights   = ()              => api.get('/insights/summary')

// ── Auth ────────────────────────────────────────────────
export const getMe         = ()              => api.get('/auth/me')
