<template>
  <div class="min-h-screen flex">
    <!-- Left panel — brand -->
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
         style="background: linear-gradient(135deg, #1a5c4a 0%, #0f3d31 60%, #0a2d24 100%)">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🍽️</div>
        <span class="text-xl font-bold">DiningInsight</span>
      </div>
      <div>
        <h2 class="text-4xl font-bold leading-tight mb-4">
          Manage your restaurant<br/>smarter with data
        </h2>
        <p class="text-green-200 text-lg">Orders, customers, and menu — all in one place.</p>
        <div class="mt-8 flex gap-6">
          <div class="text-center">
            <p class="text-3xl font-bold">📋</p>
            <p class="text-xs text-green-300 mt-1">Orders</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">👥</p>
            <p class="text-xs text-green-300 mt-1">Customers</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">📊</p>
            <p class="text-xs text-green-300 mt-1">Insights</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">🍽️</p>
            <p class="text-xs text-green-300 mt-1">Menu</p>
          </div>
        </div>
      </div>
      <p class="text-green-400 text-sm">© 2026 DiningInsight</p>
    </div>

    <!-- Right panel — form -->
    <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div class="w-full max-w-sm">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl"
               style="background:#1a5c4a">🍽️</div>
          <h2 class="text-2xl font-bold text-gray-800">DiningInsight</h2>
        </div>

        <h2 class="text-2xl font-bold text-gray-800 mb-1">Welcome back</h2>
        <p class="text-gray-500 text-sm mb-8">Sign in to your restaurant dashboard</p>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="owner@restaurant.com"
              class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style="--tw-ring-color: #1a5c4a"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              v-model="password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style="--tw-ring-color: #1a5c4a"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full text-white font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-60 mt-2"
            style="background: linear-gradient(135deg, #1a5c4a, #2d7a62)"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          Don't have an account?
          <router-link to="/register" class="font-semibold hover:underline" style="color:#1a5c4a">Register</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router   = useRouter()
const auth     = useAuthStore()
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref(null)

async function handleLogin() {
  loading.value = true
  error.value   = null
  try {
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth')
    const { initializeApp, getApps, getApp }      = await import('firebase/app')

    const firebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    }

    const app     = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const fbAuth  = getAuth(app)
    const result  = await signInWithEmailAndPassword(fbAuth, email.value, password.value)
    const idToken = await result.user.getIdToken()
    auth.setUser(result.user, idToken)

    router.push('/orders')
  } catch (e) {
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
      error.value = 'Invalid email or password.'
    } else {
      error.value = e.message || 'Login failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>
