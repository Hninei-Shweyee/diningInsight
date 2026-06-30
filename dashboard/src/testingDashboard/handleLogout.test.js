import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock firebase
const mockSignOut = vi.fn(() => Promise.resolve())
const mockGetAuth = vi.fn(() => ({}))

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signOut: mockSignOut,
  onAuthStateChanged: vi.fn(() => vi.fn()),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}))

// the function we are testing (from App.vue handleLogout() fun:)
async function handleLogout(auth, router) {
  try {
    const { getAuth, signOut } = await import('firebase/auth')
    await signOut(getAuth())
  } catch (e) {
    // ignore error
  }
  auth.logout()
  router.push('/login')
}

describe('handleLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign out from firebase and redirect to login', async () => {
    const auth = {
      user: { email: 'test@test.com' },
      logout: vi.fn(),
    }
    const router = {
      push: vi.fn(),
    }

    await handleLogout(auth, router)

    expect(mockSignOut).toHaveBeenCalled()
    expect(auth.logout).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('should still logout and redirect even if firebase signOut fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network error'))

    const auth = {
      user: { email: 'test@test.com' },
      logout: vi.fn(),
    }
    const router = {
      push: vi.fn(),
    }

    await handleLogout(auth, router)

    expect(auth.logout).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('should clear user data when logout is called', async () => {
    let user = { email: 'owner@cafe.com' }
    let token = 'abc123'

    const auth = {
      user,
      token,
      logout: vi.fn(() => {
        user = null
        token = null
      }),
    }
    const router = { push: vi.fn() }

    await handleLogout(auth, router)

    expect(user).toBeNull()
    expect(token).toBeNull()
  })
})
