<template>
  <div class="min-h-screen flex">
    <!-- Left panel -->
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-center items-center text-white p-12"
         style="background: linear-gradient(135deg, #1a5c4a 0%, #0f3d31 60%, #0a2d24 100%)">
      <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-6">🍽️</div>
      <h2 class="text-3xl font-bold text-center mb-3">Join DiningInsight</h2>
      <p class="text-green-200 text-center">Start managing your restaurant smarter today.</p>
    </div>
    <!-- Right panel -->
    <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
      <!-- Logo mobile -->
      <div class="lg:hidden text-center mb-6">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl" style="background:#1a5c4a">🍽️</div>
      </div>
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Create Account</h2>
        <p class="text-gray-500 text-sm mt-1">Register to access DiningInsight</p>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="owner@restaurant.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="At least 6 characters"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            v-model="confirm"
            type="password"
            required
            placeholder="Re-enter password"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand hover:bg-brand-light text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-gray-500">
        Already have an account?
        <router-link to="/login" class="font-semibold hover:underline" style="color:#1a5c4a">Sign In</router-link>
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
const confirm  = ref('')
const loading  = ref(false)
const error    = ref(null)

async function handleRegister() {
  error.value = null
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth')
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

    const fbAuth  = getAuth()
    const result  = await createUserWithEmailAndPassword(fbAuth, email.value, password.value)
    const idToken = await result.user.getIdToken()
    auth.setUser(result.user, idToken)
    router.push('/setup')
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      error.value = 'This email is already registered. Please sign in.'
    } else {
      error.value = 'Registration failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>
