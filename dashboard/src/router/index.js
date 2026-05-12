// router/index.js — Vue Router with auth guard
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login',          name: 'Login',         component: () => import('../views/LoginPage.vue') },
  { path: '/register',       name: 'Register',      component: () => import('../views/RegisterPage.vue') },
  { path: '/setup',          name: 'Setup',         component: () => import('../views/SetupPage.vue'),         meta: { requiresAuth: true } },
  { path: '/orders',         name: 'Orders',        component: () => import('../views/OrdersPage.vue'),        meta: { requiresAuth: true } },
  { path: '/customers',      name: 'Customers',     component: () => import('../views/CustomerPage.vue'),      meta: { requiresAuth: true } },
  { path: '/menu',           name: 'Menu',          component: () => import('../views/MenuPage.vue'),          meta: { requiresAuth: true } },
  { path: '/insights',       name: 'Insights',      component: () => import('../views/InsightsPage.vue'),      meta: { requiresAuth: true } },
  { path: '/auto-messaging', name: 'AutoMessaging', component: () => import('../views/AutoMessagingPage.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/orders' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard — redirect to login if not authenticated
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) return '/login'
  if (to.path === '/login'  &&  auth.token) return '/orders'
})

export default router
