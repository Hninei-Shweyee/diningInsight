import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock firebase
const mockSignIn = vi.fn(() => Promise.resolve({ user: { getIdToken: vi.fn(() => Promise.resolve('id-token-xyz')) } }))
const mockGetAuth = vi.fn(() => ({}))

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignIn,
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApp: vi.fn(() => ({ name: 'existing-app' })),
  getApps: vi.fn(() => [{ name: 'already-init' }]),
}))

// the function we are testing (from LoginPage.vue handleLogin() fun:)
async function handleLogin({ email, password, auth, router }) {
  let loading = true
  let error = null

  try {
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth')
    const { initializeApp, getApps, getApp } = await import('firebase/app')

    const firebaseConfig = {
      apiKey: 'fake-key',
      authDomain: 'fake.firebaseapp.com',
      projectId: 'fake-project',
      storageBucket: 'fake-bucket',
      messagingSenderId: '123',
      appId: '1:123',
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const fbAuth = getAuth(app)
    const result = await signInWithEmailAndPassword(fbAuth, email, password)
    const idToken = await result.user.getIdToken()
    auth.setUser(result.user, idToken)

    router.push('/orders')
    loading = false
    return { error, loading, success: true }
  } catch (e) {
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
      error = 'Invalid email or password.'
    } else {
      error = e.message || 'Login failed. Please try again.'
    }
    loading = false
    return { error, loading, success: false }
  }
}

describe('handleLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({
      user: { getIdToken: vi.fn(() => Promise.resolve('id-token-xyz')) }
    })
  })

  it('should login and redirect to /orders', async () => {
    const auth = {
      user: null,
      token: null,
      setUser: vi.fn(function (user, token) {
        this.user = user
        this.token = token
      }),
    }
    const router = { push: vi.fn() }

    const result = await handleLogin({
      email: 'owner@cafe.com',
      password: '123456',
      auth,
      router,
    })

    expect(result.success).toBe(true)
    expect(mockSignIn).toHaveBeenCalled()
    expect(auth.token).toBe('id-token-xyz')
    expect(router.push).toHaveBeenCalledWith('/orders')
  })

  it('should show error for wrong email or password', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/invalid-credential' })

    const auth = { setUser: vi.fn() }
    const router = { push: vi.fn() }

    const result = await handleLogin({
      email: 'wrong@cafe.com',
      password: 'wrongpassword',
      auth,
      router,
    })

    expect(result.error).toBe('Invalid email or password.')
    expect(result.success).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('should show error when user not found', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/user-not-found' })

    const auth = { setUser: vi.fn() }
    const router = { push: vi.fn() }

    const result = await handleLogin({
      email: 'nobody@cafe.com',
      password: '123456',
      auth,
      router,
    })

    expect(result.error).toBe('Invalid email or password.')
    expect(result.success).toBe(false)
  })

  it('should show generic error for other failures', async () => {
    mockSignIn.mockRejectedValueOnce({ message: 'Network error' })

    const auth = { setUser: vi.fn() }
    const router = { push: vi.fn() }

    const result = await handleLogin({
      email: 'owner@cafe.com',
      password: '123456',
      auth,
      router,
    })

    expect(result.error).toBe('Network error')
    expect(result.success).toBe(false)
  })
})
