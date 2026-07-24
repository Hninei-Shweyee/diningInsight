import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock firebase
const mockCreateUser = vi.fn(() => Promise.resolve({ user: { getIdToken: vi.fn(() => Promise.resolve('id-token-123')) } }))
const mockGetAuth = vi.fn(() => ({}))

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  createUserWithEmailAndPassword: mockCreateUser,
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => [{ name: 'already-init' }]),
}))

async function handleRegister({ email, password, confirm, auth, router }) {
  let error = null
  let loading = false

  error = null
  if (password !== confirm) {
    error = 'Passwords do not match.'
    return { error, loading, success: false }
  }

  loading = true
  try {
    const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth')
    const { initializeApp, getApps } = await import('firebase/app')

    if (!getApps().length) {
      initializeApp({
        apiKey: 'fake-key',
        authDomain: 'fake.firebaseapp.com',
        projectId: 'fake-project',
        storageBucket: 'fake-bucket',
        messagingSenderId: '123',
        appId: '1:123',
      })
    }

    const fbAuth = getAuth()
    const result = await createUserWithEmailAndPassword(fbAuth, email, password)
    const idToken = await result.user.getIdToken()
    auth.setUser(result.user, idToken)
    router.push('/setup')
    return { error, loading: false, success: true }
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      error = 'This email is already registered. Please sign in.'
    } else {
      error = 'Registration failed. Please try again.'
    }
    return { error, loading: false, success: false }
  }
}

describe('handleRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateUser.mockResolvedValue({
      user: { getIdToken: vi.fn(() => Promise.resolve('id-token-123')) }
    })
  })

  it('should register a new user and redirect to /setup', async () => {
    const auth = {
      user: null,
      token: null,
      setUser: vi.fn(function (user, token) {
        this.user = user
        this.token = token
      }),
    }
    const router = { push: vi.fn() }

    const result = await handleRegister({
      email: 'owner@cafe.com',
      password: '123456',
      confirm: '123456',
      auth,
      router,
    })

    expect(result.success).toBe(true)
    expect(mockCreateUser).toHaveBeenCalled()
    expect(auth.token).toBe('id-token-123')
    expect(router.push).toHaveBeenCalledWith('/setup')
  })

  it('should show error when passwords do not match', async () => {
    const auth = { setUser: vi.fn() }
    const router = { push: vi.fn() }

    const result = await handleRegister({
      email: 'owner@cafe.com',
      password: '123456',
      confirm: '654321',
      auth,
      router,
    })

    expect(result.error).toBe('Passwords do not match.')
    expect(result.success).toBe(false)
    // should not call firebase or router
    expect(mockCreateUser).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('should show error when email already exists', async () => {
    mockCreateUser.mockRejectedValueOnce({ code: 'auth/email-already-in-use' })

    const auth = { setUser: vi.fn() }
    const router = { push: vi.fn() }

    const result = await handleRegister({
      email: 'owner@cafe.com',
      password: '123456',
      confirm: '123456',
      auth,
      router,
    })

    expect(result.error).toBe('This email is already registered. Please sign in.')
    expect(result.success).toBe(false)
  })

  it('should show generic error for other firebase errors', async () => {
    mockCreateUser.mockRejectedValueOnce({ code: 'auth/weak-password' })

    const auth = { setUser: vi.fn() }
    const router = { push: vi.fn() }

    const result = await handleRegister({
      email: 'owner@cafe.com',
      password: '12',
      confirm: '12',
      auth,
      router,
    })

    expect(result.error).toBe('Registration failed. Please try again.')
    expect(result.success).toBe(false)
  })
})
