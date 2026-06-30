import { describe, it, expect, vi, beforeEach } from 'vitest'

// the function we are testing (from SetupPage.vue handleSetup())
async function handleSetup({ restaurantName, phone, address, fbPageId, router, currentUser }) {
  let error = null

  error = null
  try {
    if (!currentUser) {
      router.push('/login')
      return { error, success: false }
    }

    localStorage.setItem(`setup_done_${currentUser.uid}`, 'true')
    router.push('/orders')

    return { error, success: true }
  } catch (e) {
    error = e.message || 'Failed to save. Please try again.'
    return { error, success: false }
  }
}

describe('handleSetup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save setup and redirect to /orders', async () => {
    const router = { push: vi.fn() }

    const result = await handleSetup({
      restaurantName: 'Test Kitchen',
      phone: '0812345678',
      address: '123 Test Road',
      fbPageId: '111222333',
      router,
      currentUser: { uid: 'user-123' },
    })

    expect(result.success).toBe(true)
    expect(localStorage.getItem('setup_done_user-123')).toBe('true')
    expect(router.push).toHaveBeenCalledWith('/orders')
  })

  it('should redirect to /login when user is not logged in', async () => {
    const router = { push: vi.fn() }

    const result = await handleSetup({
      restaurantName: 'Test Kitchen',
      phone: '0812345678',
      address: '123 Test Road',
      fbPageId: '111222333',
      router,
      currentUser: null,
    })

    expect(result.success).toBe(false)
    expect(router.push).toHaveBeenCalledWith('/login')
    expect(localStorage.getItem('setup_done_user-123')).toBeNull()
  })

  it('should handle errors during setup', async () => {
    const router = {
      push: vi.fn(() => { throw new Error('Firebase auth error') }),
    }

    const result = await handleSetup({
      restaurantName: 'Test Kitchen',
      phone: '0812345678',
      address: '123 Test Road',
      fbPageId: '111222333',
      router,
      currentUser: { uid: 'user-123' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Firebase auth error')
  })

  it('should save setup_done to localStorage for correct user', async () => {
    const router = { push: vi.fn() }

    await handleSetup({
      router,
      currentUser: { uid: 'user-999' },
    })

    expect(localStorage.getItem('setup_done_user-999')).toBe('true')
    expect(localStorage.getItem('setup_done_user-123')).toBeNull()
  })
})
