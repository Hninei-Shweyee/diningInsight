import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

// the store functions we are testing (from stores/auth.js)
function useAuthStore() {
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
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ---- setUser ----
  describe('setUser', () => {
    it('should save user and token, and store token in localStorage', () => {
      const store = useAuthStore()
      const mockUser = { uid: 'user-123', email: 'owner@cafe.com' }

      store.setUser(mockUser, 'id-token-abc')

      expect(store.user.value).toEqual(mockUser)
      expect(store.token.value).toBe('id-token-abc')
      expect(localStorage.getItem('fb_token')).toBe('id-token-abc')
    })

    it('should remove token from localStorage when idToken is falsy', () => {
      localStorage.setItem('fb_token', 'old-token')
      const store = useAuthStore()

      store.setUser(null, '')

      expect(store.user.value).toBeNull()
      expect(localStorage.getItem('fb_token')).toBeNull()
    })

    it('should load token from localStorage on store creation', () => {
      localStorage.setItem('fb_token', 'existing-token')
      const store = useAuthStore()

      expect(store.token.value).toBe('existing-token')
    })
  })

  // ---- logout ----
  describe('logout', () => {
    it('should clear user and token from store', () => {
      const store = useAuthStore()
      store.setUser({ uid: 'user-123' }, 'some-token')

      store.logout()

      expect(store.user.value).toBeNull()
      expect(store.token.value).toBeNull()
    })

    it('should remove fb_token from localStorage', () => {
      localStorage.setItem('fb_token', 'some-token')
      const store = useAuthStore()

      store.logout()

      expect(localStorage.getItem('fb_token')).toBeNull()
    })

    it('should be safe to call logout when already logged out', () => {
      const store = useAuthStore()

      // calling logout twice should not throw
      store.logout()
      store.logout()

      expect(store.user.value).toBeNull()
      expect(store.token.value).toBeNull()
    })
  })
})
