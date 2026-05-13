<template>
  <div class="min-h-screen flex">
    <!-- Left panel — brand -->
    <div class="hidden lg:flex lg:w-1/2 flex-col p-10 text-white relative overflow-hidden"
         style="background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80') center/cover no-repeat">

      <!-- Logo -->
      <div class="flex items-center gap-3 mb-6 z-10">
        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl">🍽️</div>
        <span class="text-lg font-bold">DiningInsight</span>
      </div>

      <!-- Headline + cards — all centered together -->
      <div class="flex-1 z-10 flex items-center justify-center">
        <div class="flex flex-col items-center gap-6 w-96">

          <!-- Headline -->
          <div class="text-center">
            <h2 class="text-4xl font-bold leading-tight mb-2">Start Managing Your<br/>Restaurant Smarter</h2>
            <p class="text-white/70 text-sm">Manage orders, customers, promotions, and business insights in one platform.</p>
          </div>

          <div class="relative w-96" style="height:300px">

            <!-- Total Orders card — top left -->
            <div class="absolute rounded-2xl px-4 py-3 shadow-lg w-44" style="top:0;left:0;background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2)">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style="background:rgba(255,255,255,0.2)">🍽️</div>
                <span class="text-xs text-white/70 font-medium">Total Orders</span>
              </div>
              <p class="text-xl font-bold text-white">1,248</p>
              <p class="text-xs text-green-400 mt-0.5">↑ 12.9% vs last week</p>
            </div>

            <!-- Revenue card — top right -->
            <div class="absolute rounded-2xl px-4 py-3 shadow-lg w-44" style="top:0;right:0;background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2)">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style="background:rgba(255,255,255,0.2)">💰</div>
                <span class="text-xs text-white/70 font-medium">Revenue</span>
              </div>
              <p class="text-xl font-bold text-white">฿24,500</p>
              <p class="text-xs text-green-400 mt-0.5">↑ 8.3% vs last week</p>
            </div>

            <!-- Weekly Sales chart card — middle left -->
            <div class="absolute rounded-2xl p-3 shadow-lg w-52" style="top:105px;left:0;background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2)">
              <p class="text-xs font-semibold text-white/90 mb-1.5">Weekly Sales Overview</p>
              <svg viewBox="0 0 160 40" class="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="0,30 25,20 50,26 75,10 100,16 130,6 160,12"
                  stroke="#f97316" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
              </svg>
              <div class="flex justify-between text-[9px] text-white/50 mt-1">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
            </div>

            <!-- New Order notification — middle right -->
            <div class="absolute rounded-2xl px-3 py-2.5 shadow-lg w-40" style="top:115px;right:0;background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2)">
              <div class="flex items-start gap-2">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style="background:rgba(255,255,255,0.2)">🔔</div>
                <div>
                  <p class="text-xs font-semibold text-white">New Order Received</p>
                  <p class="text-xs text-white/60">Burger Combo x2</p>
                  <p class="text-[10px] text-orange-400 mt-0.5">2 mins ago</p>
                </div>
              </div>
            </div>

            <!-- Curved arrow -->
            <svg class="absolute" style="top:195px;right:155px;width:45px;height:45px" viewBox="0 0 50 50" fill="none">
              <path d="M10 5 Q40 5 40 35 Q40 45 30 45" stroke="white" stroke-width="1.5" stroke-dasharray="3 3" fill="none" stroke-linecap="round"/>
              <polyline points="25,40 30,45 35,40" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

            <!-- Bottom cards row -->
            <div class="absolute left-0 right-0 flex gap-3" style="bottom:0">
              <div class="flex-1 rounded-2xl px-3 py-2.5 shadow-lg flex items-center gap-2" style="background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2)">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style="background:rgba(255,255,255,0.2)">💬</div>
                <div>
                  <p class="text-xs font-semibold text-white">Messenger Automation</p>
                  <p class="text-[10px] text-white/60">Auto order &amp; reply</p>
                </div>
              </div>
              <div class="flex-1 rounded-2xl px-3 py-2.5 shadow-lg flex items-center gap-2" style="background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2)">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style="background:rgba(255,255,255,0.2)">⭐</div>
                <div>
                  <p class="text-xs font-semibold text-white">Today Special</p>
                  <p class="text-[10px] text-white/60">Burger Combo</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Right panel — form -->
    <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div class="w-full max-w-sm">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl"
               style="background:#f97316">🍽️</div>
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
              style="--tw-ring-color: #f97316"
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
              style="--tw-ring-color: #f97316"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full text-white font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-60 mt-2"
            style="background: #f97316"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          Don't have an account?
          <router-link to="/register" class="font-semibold hover:underline" style="color:#f97316">Register</router-link>
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

    router.push('/dashboard')
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
