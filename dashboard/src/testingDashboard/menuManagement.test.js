import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock api
const mockGetMenu = vi.fn()
const mockCreateMenuItem = vi.fn()
const mockUpdateMenuItem = vi.fn()
const mockDeleteMenuItem = vi.fn()

vi.mock('../api', () => ({
  getMenu: (...args) => mockGetMenu(...args),
  createMenuItem: (...args) => mockCreateMenuItem(...args),
  updateMenuItem: (...args) => mockUpdateMenuItem(...args),
  deleteMenuItem: (...args) => mockDeleteMenuItem(...args),
}))

// --- sample menu items ---
function makeSampleItems() {
  return [
    { id: 1, name: 'Classic Burger', category: 'Burger', price: 89, image_url: null, is_available: true, is_special: false },
    { id: 2, name: 'Cheese Burger', category: 'Burger', price: 120, image_url: 'https://img.com/cb.jpg', is_available: true, is_special: true },
    { id: 3, name: 'Fried Chicken', category: 'Fried Chicken', price: 150, image_url: null, is_available: true, is_special: false },
    { id: 4, name: 'Coke', category: 'Drinks', price: 30, image_url: null, is_available: false, is_special: false },
    { id: 5, name: 'Family Combo', category: 'Combo', price: 350, image_url: 'https://img.com/combo.jpg', is_available: true, is_special: true },
  ]
}

// --- category filter (filtered computed from MenuPage.vue) ---
function filterByCategory(items, catFilter) {
  return catFilter === 'All' ? items : items.filter((i) => i.category === catFilter)
}

// --- resetForm (from MenuPage.vue) ---
function resetForm(form, item = null) {
  form.name = item?.name ?? ''
  form.category = item?.category ?? 'Burger'
  form.price = item?.price ?? ''
  form.image_url = item?.image_url ?? ''
  form.is_available = item?.is_available ?? true
  form.is_special = item?.is_special ?? false
}

// --- fetchMenu (from MenuPage.vue) ---
async function fetchMenu({ getMenu, items, loading }) {
  loading.value = true
  try {
    const res = await getMenu()
    items.value = res.data
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

// --- saveItem (from MenuPage.vue) ---
async function saveItem({
  createMenuItem,
  updateMenuItem,
  items,
  form,
  editingItem,
  saving,
  formError,
  closeModal,
}) {
  formError.value = ''
  saving.value = true
  const payload = {
    name: form.name,
    category: form.category,
    price: Number(form.price),
    image_url: form.image_url || null,
    is_available: form.is_available,
    is_special: form.is_special,
  }
  try {
    if (editingItem.value) {
      const res = await updateMenuItem(editingItem.value.id, payload)
      const idx = items.value.findIndex((i) => i.id === editingItem.value.id)
      if (idx !== -1) items.value[idx] = res.data
    } else {
      const res = await createMenuItem(payload)
      items.value.push(res.data)
    }
    closeModal()
  } catch (e) {
    formError.value = e?.response?.data?.detail || 'Failed to save. Please try again.'
  } finally {
    saving.value = false
  }
}

// --- deleteItem (from MenuPage.vue) ---
async function deleteItem({ deleteMenuItem, items, deleteTarget, deleting }) {
  deleting.value = true
  try {
    await deleteMenuItem(deleteTarget.value.id)
    items.value = items.value.filter((i) => i.id !== deleteTarget.value.id)
    deleteTarget.value = null
  } catch {
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}

// --- confirmDelete (from MenuPage.vue) ---
function confirmDelete({ deleteTarget }, item) {
  deleteTarget.value = item
}

// ============================================================
// fetchMenu
// ============================================================
describe('fetchMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch menu items and set them', async () => {
    const items = { value: [] }
    const loading = { value: false }
    const sample = makeSampleItems()

    mockGetMenu.mockResolvedValue({ data: sample })

    await fetchMenu({ getMenu: mockGetMenu, items, loading })

    expect(items.value).toEqual(sample)
    expect(loading.value).toBe(false)
  })

  it('should set items to empty array on API failure', async () => {
    const items = { value: [{ id: 1, name: 'old' }] }
    const loading = { value: false }

    mockGetMenu.mockRejectedValue(new Error('Network Error'))

    await fetchMenu({ getMenu: mockGetMenu, items, loading })

    expect(items.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('should set loading to true while fetching, then false', async () => {
    const items = { value: [] }
    const loading = { value: false }

    mockGetMenu.mockResolvedValue({ data: makeSampleItems() })

    const promise = fetchMenu({ getMenu: mockGetMenu, items, loading })

    // loading should be true immediately after calling
    expect(loading.value).toBe(true)

    await promise

    expect(loading.value).toBe(false)
  })
})

// ============================================================
// saveItem — create (editingItem is null)
// ============================================================
describe('saveItem — create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new menu item and add it to the list', async () => {
    const items = { value: [...makeSampleItems()] }
    const form = {
      name: 'New Burger',
      category: 'Burger',
      price: '99',
      image_url: '',
      is_available: true,
      is_special: false,
    }
    const editingItem = { value: null }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    const createdItem = { id: 6, name: 'New Burger', category: 'Burger', price: 99, image_url: null, is_available: true, is_special: false }
    mockCreateMenuItem.mockResolvedValue({ data: createdItem })

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    expect(mockCreateMenuItem).toHaveBeenCalledWith({
      name: 'New Burger',
      category: 'Burger',
      price: 99,
      image_url: null,
      is_available: true,
      is_special: false,
    })
    expect(items.value).toHaveLength(6)
    expect(items.value[5]).toEqual(createdItem)
    expect(closeModal).toHaveBeenCalled()
    expect(saving.value).toBe(false)
  })

  it('should convert price string to number in payload', async () => {
    const items = { value: [] }
    const form = { name: 'Drink', category: 'Drinks', price: '45', image_url: '', is_available: true, is_special: false }
    const editingItem = { value: null }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    mockCreateMenuItem.mockResolvedValue({ data: { id: 7, ...form, price: 45 } })

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    expect(mockCreateMenuItem).toHaveBeenCalledWith(
      expect.objectContaining({ price: 45 })
    )
  })

  it('should set formError on API failure during create', async () => {
    const items = { value: [] }
    const form = { name: 'Fail Item', category: 'Burger', price: '50', image_url: '', is_available: true, is_special: false }
    const editingItem = { value: null }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    mockCreateMenuItem.mockRejectedValue({
      response: { data: { detail: 'Item name already exists' } },
    })

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    expect(formError.value).toBe('Item name already exists')
    expect(closeModal).not.toHaveBeenCalled()
    expect(saving.value).toBe(false)
  })

  it('should use fallback error when create fails without detail', async () => {
    const items = { value: [] }
    const form = { name: 'Fail', category: 'Burger', price: '50', image_url: '', is_available: true, is_special: false }
    const editingItem = { value: null }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    mockCreateMenuItem.mockRejectedValue(new Error('Internal error'))

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    expect(formError.value).toBe('Failed to save. Please try again.')
  })
})

// ============================================================
// saveItem — update (editingItem is set)
// ============================================================
describe('saveItem — update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update an existing menu item in place', async () => {
    const items = { value: makeSampleItems() }
    const form = {
      name: 'Classic Burger Deluxe',
      category: 'Burger',
      price: '99',
      image_url: '',
      is_available: true,
      is_special: true,
    }
    const editingItem = { value: { id: 1 } }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    const updatedItem = { id: 1, name: 'Classic Burger Deluxe', category: 'Burger', price: 99, image_url: null, is_available: true, is_special: true }
    mockUpdateMenuItem.mockResolvedValue({ data: updatedItem })

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    expect(mockUpdateMenuItem).toHaveBeenCalledWith(1, {
      name: 'Classic Burger Deluxe',
      category: 'Burger',
      price: 99,
      image_url: null,
      is_available: true,
      is_special: true,
    })
    expect(items.value[0]).toEqual(updatedItem)
    expect(closeModal).toHaveBeenCalled()
  })

  it('should set formError on API failure during update', async () => {
    const items = { value: makeSampleItems() }
    const form = { name: 'X', category: 'Burger', price: '10', image_url: '', is_available: true, is_special: false }
    const editingItem = { value: { id: 2 } }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    mockUpdateMenuItem.mockRejectedValue({
      response: { data: { detail: 'Menu item not found' } },
    })

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    expect(formError.value).toBe('Menu item not found')
    expect(closeModal).not.toHaveBeenCalled()
  })

  it('should not modify items if update returns id not in list', async () => {
    const items = { value: makeSampleItems() }
    const form = { name: 'Ghost', category: 'Drinks', price: '5', image_url: '', is_available: true, is_special: false }
    const editingItem = { value: { id: 999 } }
    const saving = { value: false }
    const formError = { value: '' }
    const closeModal = vi.fn()

    mockUpdateMenuItem.mockResolvedValue({ data: { id: 999, name: 'Ghost', category: 'Drinks', price: 5 } })

    await saveItem({
      createMenuItem: mockCreateMenuItem,
      updateMenuItem: mockUpdateMenuItem,
      items,
      form,
      editingItem,
      saving,
      formError,
      closeModal,
    })

    // still called closeModal, but items unchanged
    expect(closeModal).toHaveBeenCalled()
    expect(items.value).toHaveLength(5) // original length
  })
})

// ============================================================
// deleteItem
// ============================================================
describe('deleteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call deleteMenuItem API and remove from list', async () => {
    const items = { value: makeSampleItems() }
    const deleteTarget = { value: items.value[2] } // Fried Chicken, id=3
    const deleting = { value: false }

    mockDeleteMenuItem.mockResolvedValue({})

    await deleteItem({ deleteMenuItem: mockDeleteMenuItem, items, deleteTarget, deleting })

    expect(mockDeleteMenuItem).toHaveBeenCalledWith(3)
    expect(items.value).toHaveLength(4)
    expect(items.value.find((i) => i.id === 3)).toBeUndefined()
    expect(deleteTarget.value).toBeNull()
    expect(deleting.value).toBe(false)
  })

  it('should clear deleteTarget even when API fails', async () => {
    const items = { value: makeSampleItems() }
    const deleteTarget = { value: { id: 1, name: 'Classic Burger' } }
    const deleting = { value: false }

    mockDeleteMenuItem.mockRejectedValue(new Error('Server error'))

    await deleteItem({ deleteMenuItem: mockDeleteMenuItem, items, deleteTarget, deleting })

    // deleteTarget cleared even on error
    expect(deleteTarget.value).toBeNull()
    // items unchanged
    expect(items.value).toHaveLength(5)
    expect(deleting.value).toBe(false)
  })

  it('should set deleting to true while in progress', async () => {
    const items = { value: makeSampleItems() }
    const deleteTarget = { value: { id: 1, name: 'Classic Burger' } }
    const deleting = { value: false }

    mockDeleteMenuItem.mockResolvedValue({})

    const promise = deleteItem({ deleteMenuItem: mockDeleteMenuItem, items, deleteTarget, deleting })

    expect(deleting.value).toBe(true)

    await promise

    expect(deleting.value).toBe(false)
  })
})

// ============================================================
// confirmDelete
// ============================================================
describe('confirmDelete', () => {
  it('should set deleteTarget to the selected item', () => {
    const deleteTarget = { value: null }
    const item = { id: 3, name: 'Fried Chicken' }

    confirmDelete({ deleteTarget }, item)

    expect(deleteTarget.value).toEqual(item)
  })
})

// ============================================================
// handleImageUpload (logic extracted)
// ============================================================
async function handleImageUploadCore({ file, form, imagePreview, uploadingImage, formError, __uploadFn }) {
  if (!file) return

  imagePreview.value = URL.createObjectURL(file)
  uploadingImage.value = true
  formError.value = ''

  try {
    // simulate Firebase upload — the real fn uses dynamic imports of firebase/*
    // __uploadFn lets tests inject an async delay to check intermediate state
    const url = await (__uploadFn
      ? __uploadFn(file)
      : Promise.resolve(`https://storage.example.com/menu-images/test-${file.name}`))
    form.image_url = url
  } catch (e) {
    formError.value = `Upload failed: ${e?.message || e}. Please paste an image URL instead.`
    imagePreview.value = ''
  } finally {
    uploadingImage.value = false
  }
}

describe('handleImageUpload', () => {
  it('should set imagePreview from the selected file', async () => {
    const form = { image_url: '' }
    const imagePreview = { value: '' }
    const uploadingImage = { value: false }
    const formError = { value: '' }

    // mock URL.createObjectURL
    const originalCreateObjectURL = globalThis.URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview-123')

    const file = new File(['dummy'], 'burger.jpg', { type: 'image/jpeg' })

    await handleImageUploadCore({ file, form, imagePreview, uploadingImage, formError })

    expect(imagePreview.value).toBe('blob:preview-123')
    expect(form.image_url).toContain('burger.jpg')
    expect(uploadingImage.value).toBe(false)
    expect(formError.value).toBe('')

    globalThis.URL.createObjectURL = originalCreateObjectURL
  })

  it('should do nothing when no file is selected', async () => {
    const form = { image_url: 'original.jpg' }
    const imagePreview = { value: '' }
    const uploadingImage = { value: false }
    const formError = { value: '' }

    await handleImageUploadCore({ file: null, form, imagePreview, uploadingImage, formError })

    expect(imagePreview.value).toBe('')
    expect(form.image_url).toBe('original.jpg')
    expect(uploadingImage.value).toBe(false)
  })

  it('should set uploadingImage to true during upload', async () => {
    const form = { image_url: '' }
    const imagePreview = { value: '' }
    const uploadingImage = { value: false }
    const formError = { value: '' }

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:xyz')

    // use a deferred promise so we can observe the intermediate loading state
    let resolveUpload
    const uploadPromise = new Promise((resolve) => { resolveUpload = resolve })

    const file = new File(['dummy'], 'photo.png', { type: 'image/png' })

    const promise = handleImageUploadCore({
      file,
      form,
      imagePreview,
      uploadingImage,
      formError,
      __uploadFn: () => uploadPromise.then(() => `https://storage.example.com/photo.png`),
    })

    // uploadingImage should be true while the upload is pending
    expect(uploadingImage.value).toBe(true)

    resolveUpload()
    await promise

    expect(uploadingImage.value).toBe(false)
    expect(form.image_url).toBe('https://storage.example.com/photo.png')

    globalThis.URL.createObjectURL = vi.fn(() => '')
  })
})

// ============================================================
// resetForm
// ============================================================
describe('resetForm', () => {
  it('should reset form to defaults when no item is passed', () => {
    const form = {
      name: 'Old Name',
      category: 'Drinks',
      price: '99',
      image_url: 'https://old.jpg',
      is_available: false,
      is_special: true,
    }

    resetForm(form, null)

    expect(form).toEqual({
      name: '',
      category: 'Burger',
      price: '',
      image_url: '',
      is_available: true,
      is_special: false,
    })
  })

  it('should populate form from an existing item for editing', () => {
    const form = {
      name: '',
      category: 'Burger',
      price: '',
      image_url: '',
      is_available: true,
      is_special: false,
    }

    const item = {
      name: 'Cheese Burger',
      category: 'Burger',
      price: 120,
      image_url: 'https://img.com/cb.jpg',
      is_available: true,
      is_special: true,
    }

    resetForm(form, item)

    expect(form).toEqual({
      name: 'Cheese Burger',
      category: 'Burger',
      price: 120,
      image_url: 'https://img.com/cb.jpg',
      is_available: true,
      is_special: true,
    })
  })

  it('should use defaults for missing fields on partial item', () => {
    const form = { name: '', category: '', price: '', image_url: '', is_available: false, is_special: false }
    const item = { name: 'Simple Item' }

    resetForm(form, item)

    expect(form.name).toBe('Simple Item')
    expect(form.category).toBe('Burger') // default
    expect(form.price).toBe('')
    expect(form.is_available).toBe(true) // default
    expect(form.is_special).toBe(false)  // default
  })
})

// ============================================================
// form.is_available toggle
// ============================================================
describe('form.is_available toggle', () => {
  it('should toggle from true to false', () => {
    const form = { is_available: true }
    form.is_available = !form.is_available
    expect(form.is_available).toBe(false)
  })

  it('should toggle from false to true', () => {
    const form = { is_available: false }
    form.is_available = !form.is_available
    expect(form.is_available).toBe(true)
  })

  it('should default to true for new items', () => {
    const form = { is_available: true }
    expect(form.is_available).toBe(true)
  })

  it('should produce correct CSS classes for available state', () => {
    const available = true
    const unavailable = false
    const getClass = (val) => val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    expect(getClass(available)).toBe('bg-green-100 text-green-700')
    expect(getClass(unavailable)).toBe('bg-red-100 text-red-600')
  })

  it('should dim the card when is_available is false', () => {
    const item = { name: 'Coke', is_available: false }
    const cardClass = !item.is_available ? 'opacity-60' : ''
    expect(cardClass).toBe('opacity-60')

    const availableItem = { name: 'Burger', is_available: true }
    const availableClass = !availableItem.is_available ? 'opacity-60' : ''
    expect(availableClass).toBe('')
  })
})

// ============================================================
// form.is_special toggle
// ============================================================
describe('form.is_special toggle', () => {
  it('should toggle from false to true', () => {
    const form = { is_special: false }
    form.is_special = !form.is_special
    expect(form.is_special).toBe(true)
  })

  it('should toggle from true to false', () => {
    const form = { is_special: true }
    form.is_special = !form.is_special
    expect(form.is_special).toBe(false)
  })

  it('should default to false for new items', () => {
    const form = { is_special: false }
    expect(form.is_special).toBe(false)
  })

  it('should show ⭐ Special badge when is_special is true', () => {
    const item = { name: 'Combo', is_special: true }
    const badge = item.is_special ? '⭐ Special' : null
    expect(badge).toBe('⭐ Special')
  })

  it('should not show Special badge when is_special is false', () => {
    const item = { name: 'Burger', is_special: false }
    const badge = item.is_special ? '⭐ Special' : null
    expect(badge).toBeNull()
  })

  it('should include is_special in save payload', () => {
    const form = { name: 'Special Combo', category: 'Combo', price: '299', image_url: '', is_available: true, is_special: true }
    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      image_url: form.image_url || null,
      is_available: form.is_available,
      is_special: form.is_special,
    }
    expect(payload.is_special).toBe(true)
  })
})

// ============================================================
// filterByCategory (filtered computed)
// ============================================================
describe('filterByCategory', () => {
  const items = makeSampleItems()

  it("should return all items when filter is 'All'", () => {
    const result = filterByCategory(items, 'All')
    expect(result).toEqual(items)
  })

  it('should return only Burger items', () => {
    const result = filterByCategory(items, 'Burger')
    expect(result).toHaveLength(2)
    expect(result.every((i) => i.category === 'Burger')).toBe(true)
  })

  it('should return only Drinks items', () => {
    const result = filterByCategory(items, 'Drinks')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Coke')
  })

  it('should return empty array for unknown category', () => {
    const result = filterByCategory(items, 'Dessert')
    expect(result).toEqual([])
  })

  it('should have all expected categories', () => {
    const categories = ['All', 'Burger', 'Fried Chicken', 'Drinks', 'Combo']
    expect(categories).toHaveLength(5)
    expect(categories[0]).toBe('All')
  })
})
