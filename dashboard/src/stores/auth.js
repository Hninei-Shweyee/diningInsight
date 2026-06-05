
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(null)
  const token = ref(localStorage.getItem('fb_token') || null)
  const ready = ref(false)

  function setUser(firebaseUser, idToken) {
    user.value  = firebaseUser
    token.value = idToken
    if (idToken) localStorage.setItem('fb_token', idToken)
    else         localStorage.removeItem('fb_token')
  }

  function logout() {
    user.value  = null
    token.value = null
    localStorage.removeItem('fb_token')
  }

  return { user, token, ready, setUser, logout }
})
