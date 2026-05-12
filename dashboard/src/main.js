import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()
const app   = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

// Keep Firebase token fresh so API calls don't fail with 401
;(async () => {
  const { initializeApp, getApps, getApp } = await import('firebase/app')
  const { getAuth, onIdTokenChanged }       = await import('firebase/auth')
  const { useAuthStore }                    = await import('./stores/auth')

  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  }

  const fbApp  = getApps().length ? getApp() : initializeApp(firebaseConfig)
  const fbAuth = getAuth(fbApp)
  const auth   = useAuthStore()

  // Fires on login, logout, and every time Firebase silently refreshes the token
  onIdTokenChanged(fbAuth, async (user) => {
    if (user) {
      const idToken = await user.getIdToken()
      auth.setUser(user, idToken)
    } else {
      auth.logout()
    }
    auth.ready = true
  })
})()
