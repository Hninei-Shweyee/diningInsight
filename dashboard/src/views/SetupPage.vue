<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span class="text-white text-2xl">🏪</span>
        </div>
        <h2 class="text-2xl font-bold text-gray-800">Restaurant Setup</h2>
        <p class="text-gray-500 text-sm mt-1">Tell us about your restaurant</p>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSetup" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
          <input
            v-model="restaurantName"
            type="text"
            required
            placeholder="e.g. DiningInsight Kitchen"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            v-model="phone"
            type="tel"
            required
            placeholder="e.g. 0812345678"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
          <input
            v-model="address"
            type="text"
            required
            placeholder="e.g. 123 Nimman Rd, Chiang Mai"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Facebook Page ID</label>
          <input
            v-model="fbPageId"
            type="text"
            required
            placeholder="e.g. 123456789012345"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <p class="text-xs text-gray-400 mt-1">Found in Facebook Page Settings → About → Page ID</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand hover:bg-brand-light text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {{ loading ? 'Saving...' : 'Save & Go to Dashboard' }}
        </button>
      </form>

      <p class="mt-4 text-center text-xs text-gray-400">
        You can update this information later in Settings.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router         = useRouter()
const restaurantName = ref('')
const phone          = ref('')
const address        = ref('')
const fbPageId       = ref('')
const loading        = ref(false)
const error          = ref(null)

async function handleSetup() {
  error.value = null
  loading.value = true
  try {
    const { getAuth, onAuthStateChanged } = await import('firebase/auth')
    const { initializeApp, getApps, getApp } = await import('firebase/app')

    const firebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    }

    const app    = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const fbAuth = getAuth(app)

    const currentUser = await new Promise((resolve) => {
      const unsub = onAuthStateChanged(fbAuth, (user) => { unsub(); resolve(user) })
    })

    if (!currentUser) {
      router.push('/login')
      return
    }

    // Mark setup as done so login knows to skip the setup page
    localStorage.setItem(`setup_done_${currentUser.uid}`, 'true')

    // Navigate immediately — don't block on Firestore
    router.push('/orders')

    // Save profile in background (non-blocking)
    import('firebase/firestore').then(({ getFirestore, doc, setDoc }) => {
      setDoc(doc(getFirestore(app), 'restaurants', currentUser.uid), {
        name:      restaurantName.value,
        phone:     phone.value,
        address:   address.value,
        fbPageId:  fbPageId.value,
        createdAt: new Date().toISOString(),
      }).catch(e => console.warn('Profile save failed (check Firestore rules):', e))
    })
  } catch (e) {
    console.error(e)
    error.value = e.message || 'Failed to save. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
