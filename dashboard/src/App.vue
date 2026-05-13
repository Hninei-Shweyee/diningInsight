<template>
  <!-- Auth pages — no sidebar -->
  <div v-if="isAuthPage" class="min-h-screen bg-gray-50">
    <RouterView />
  </div>

  <!-- Main layout -->
  <div v-else class="flex min-h-screen bg-gray-100">

    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/50 z-20 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-30 w-64 lg:w-56 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      style="background: #111827;"
    >
      <!-- Logo -->
      <div class="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <span class="text-xl">🍽️</span>
          </div>
          <div>
            <h1 class="text-white text-base font-bold leading-tight">DiningInsight</h1>
            <p class="text-white/50 text-xs">Restaurant CRM</p>
          </div>
        </div>
        <button
          class="lg:hidden text-white/60 hover:text-white text-xl leading-none"
          @click="sidebarOpen = false"
        >✕</button>
      </div>

      <!-- Nav links -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          :class="route.path === link.to
            ? 'bg-orange-500 text-white'
            : 'text-white/60 hover:bg-white/10 hover:text-white'"
          @click="sidebarOpen = false"
        >
          <!-- Dashboard -->
          <svg v-if="link.to === '/dashboard'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <!-- Orders -->
          <svg v-else-if="link.to === '/orders'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
          </svg>
          <!-- Customers -->
          <svg v-else-if="link.to === '/customers'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <!-- Menu -->
          <svg v-else-if="link.to === '/menu'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6h3.5"/><path d="M18 21v1"/><path d="M16.5 13H20"/>
          </svg>
          {{ link.label }}
        </RouterLink>
      </nav>

      <!-- User info + logout -->
      <div v-if="auth.token" class="px-4 py-4 border-t border-white/10 bg-black/10">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {{ (auth.user?.email || 'U')[0].toUpperCase() }}
          </div>
          <p class="text-xs text-white/70 truncate flex-1">{{ auth.user?.email || 'Loading...' }}</p>
        </div>
        <button
          @click="handleLogout"
          class="w-full text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 text-left transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>

    <!-- Content area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar (mobile only) -->
      <header class="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          @click="sidebarOpen = true"
          class="text-gray-600 hover:text-gray-800 text-xl leading-none"
        >☰</button>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:#f97316">
            <span class="text-white text-sm">🍽️</span>
          </div>
          <span class="font-bold text-gray-800 text-sm">DiningInsight</span>
        </div>
      </header>

      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const sidebarOpen = ref(false)

onMounted(async () => {
  if (!auth.token) return
  const { getAuth, onAuthStateChanged } = await import('firebase/auth')
  const { initializeApp, getApps } = await import('firebase/app')
  if (!getApps().length) {
    initializeApp({
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    })
  }
  onAuthStateChanged(getAuth(), (user) => {
    if (user) auth.setUser(user, auth.token)
    else auth.logout()
  })
})

const isAuthPage = computed(() =>
  ['/login', '/register', '/setup'].includes(route.path)
)

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders',    label: 'Orders'    },
  { to: '/customers', label: 'Customers' },
  { to: '/menu',      label: 'Menu'      },
]

async function handleLogout() {
  try {
    const { getAuth, signOut } = await import('firebase/auth')
    await signOut(getAuth())
  } catch {}
  auth.logout()
  router.push('/login')
}
</script>
