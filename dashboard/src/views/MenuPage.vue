<template>
  <div class="p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Menu Management</h2>
      </div>
      <button
        @click="openModal(null)"
        class="text-white text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style="background:#f97316"
      >
        + Add Item
      </button>
    </div>

    <!-- Category filter tabs -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="cat in categories"
        :key="cat"
        @click="catFilter = cat"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="catFilter === cat
          ? 'text-white'
          : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'"
        :style="catFilter === cat ? 'background:#f97316' : ''"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-400">Loading menu…</div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="text-center py-16 text-gray-400">
      No menu items found.
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col"
        :class="!item.is_available ? 'opacity-60' : ''"
      >
        <!-- Image -->
        <div class="h-36 bg-gray-100 flex items-center justify-center overflow-hidden relative">
          <img
            v-if="item.image_url"
            :src="item.image_url"
            :alt="item.name"
            class="w-full h-full object-cover"
            @error="$event.target.style.display='none'"
          />
          <span v-else class="text-5xl">🍽️</span>

          <!-- Special badge -->
          <span
            v-if="item.is_special"
            class="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full"
          >
            ⭐ Special
          </span>
        </div>

        <!-- Info -->
        <div class="p-3 flex flex-col flex-1">
          <p class="font-semibold text-gray-800 text-sm truncate">{{ item.name }}</p>
          <p class="text-xs text-gray-400 mb-2">{{ item.category }}</p>

          <div class="flex items-center justify-between mt-auto">
            <p class="font-bold text-brand text-sm">{{ item.price }} THB</p>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="item.is_available
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'"
            >
              {{ item.is_available ? 'Available' : 'Out of Stock' }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 mt-3">
            <button
              @click="openModal(item)"
              class="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              @click="confirmDelete(item)"
              class="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Add / Edit Modal ── -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-5">
          {{ editingItem ? 'Edit Menu Item' : 'Add New Menu Item' }}
        </h3>

        <form @submit.prevent="saveItem" class="space-y-4">

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
            <input
              v-model="form.name"
              required
              type="text"
              placeholder="e.g. Classic Burger"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              v-model="form.category"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="Burger">Burger</option>
              <option value="Fried Chicken">Fried Chicken</option>
              <option value="Drinks">Drinks</option>
              <option value="Combo">Combo</option>
            </select>
          </div>

          <!-- Price -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Price (THB) *</label>
            <input
              v-model.number="form.price"
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 89"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <!-- Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Food Image</label>

            <!-- Preview -->
            <div v-if="imagePreview || form.image_url" class="mb-2 h-32 bg-gray-100 rounded-lg overflow-hidden">
              <img
                :src="imagePreview || form.image_url"
                class="w-full h-full object-cover"
                @error="imagePreview = ''"
              />
            </div>

            <!-- File upload -->
            <div class="flex gap-2">
              <label class="flex-1 cursor-pointer">
                <div class="border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 text-center hover:bg-gray-50 transition-colors">
                  {{ uploadingImage ? 'Uploading…' : 'Upload image' }}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  :disabled="uploadingImage"
                  @change="handleImageUpload"
                />
              </label>
            </div>

            <!-- Or URL -->
            <p class="text-xs text-gray-400 text-center my-1">or paste URL below</p>
            <input
              v-model="form.image_url"
              type="url"
              placeholder="https://..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <!-- Availability -->
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-gray-700">Availability</p>
            </div>
            <button
              type="button"
              @click="form.is_available = !form.is_available"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :style="form.is_available ? 'background:#f97316' : ''"
              :class="form.is_available ? '' : 'bg-gray-300'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="form.is_available ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- Today Special / Promotional -->
          <div class="flex items-center justify-between py-1 border-t border-gray-100 pt-3">
            <div>
              <p class="text-sm font-medium text-gray-700">⭐ Today Special / Promotional</p>
            </div>
            <button
              type="button"
              @click="form.is_special = !form.is_special"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :style="form.is_special ? 'background:#f97316' : ''"
              :class="form.is_special ? '' : 'bg-gray-300'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="form.is_special ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- Error -->
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {{ formError }}
          </p>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving || uploadingImage"
              class="flex-1 text-white text-sm font-medium py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
              style="background:#f97316"
            >
              {{ saving ? 'Saving…' : (editingItem ? 'Save Changes' : 'Add Item') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Delete Confirmation ── -->
    <div
      v-if="deleteTarget"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <p class="text-4xl mb-3">🗑️</p>
        <h3 class="text-lg font-bold text-gray-800 mb-1">Delete Item?</h3>
        <p class="text-gray-500 text-sm mb-5">
          "<span class="font-medium">{{ deleteTarget.name }}</span>" will be permanently removed.
        </p>
        <div class="flex gap-3">
          <button
            @click="deleteTarget = null"
            class="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="deleteItem"
            :disabled="deleting"
            class="flex-1 bg-red-500 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-60"
          >
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { getMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../api'

const items    = ref([])
const loading  = ref(true)
const saving   = ref(false)
const deleting = ref(false)

const showModal    = ref(false)
const editingItem  = ref(null)
const deleteTarget = ref(null)
const formError    = ref('')

const imagePreview   = ref('')
const uploadingImage = ref(false)

const catFilter  = ref('All')
const categories = ['All', 'Burger', 'Fried Chicken', 'Drinks', 'Combo']

// reactive keeps individual property bindings stable across resets
const form = reactive({
  name:         '',
  category:     'Burger',
  price:        '',
  image_url:    '',
  is_available: true,
  is_special:   false,
})

function resetForm(item = null) {
  form.name         = item?.name         ?? ''
  form.category     = item?.category     ?? 'Burger'
  form.price        = item?.price        ?? ''
  form.image_url    = item?.image_url    ?? ''
  form.is_available = item?.is_available ?? true
  form.is_special   = item?.is_special   ?? false
}

const filtered = computed(() =>
  catFilter.value === 'All'
    ? items.value
    : items.value.filter(i => i.category === catFilter.value)
)

async function fetchMenu() {
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

function openModal(item) {
  editingItem.value  = item
  imagePreview.value = ''
  formError.value    = ''
  resetForm(item)
  showModal.value    = true
}

function closeModal() {
  showModal.value   = false
  editingItem.value = null
  imagePreview.value = ''
  formError.value   = ''
}

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  imagePreview.value   = URL.createObjectURL(file)
  uploadingImage.value = true
  formError.value      = ''

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 10000)
  )

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app')
    const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')

    const firebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    }
    const app     = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const storage = getStorage(app)
    const imgRef  = storageRef(storage, `menu-images/${Date.now()}-${file.name}`)

    await Promise.race([
      uploadBytes(imgRef, file),
      timeout,
    ])
    form.image_url = await getDownloadURL(imgRef)
  } catch (e) {
    console.error('Upload error:', e)
    formError.value = `Upload failed: ${e?.message || e}. Please paste an image URL instead.`
    imagePreview.value = ''
  } finally {
    uploadingImage.value = false
  }
}

async function saveItem() {
  formError.value = ''
  saving.value    = true
  // build a plain object so axios serialises it cleanly
  const payload = {
    name:         form.name,
    category:     form.category,
    price:        Number(form.price),
    image_url:    form.image_url || null,
    is_available: form.is_available,
    is_special:   form.is_special,
  }
  try {
    if (editingItem.value) {
      const res = await updateMenuItem(editingItem.value.id, payload)
      const idx = items.value.findIndex(i => i.id === editingItem.value.id)
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

function confirmDelete(item) {
  deleteTarget.value = item
}

async function deleteItem() {
  deleting.value = true
  try {
    await deleteMenuItem(deleteTarget.value.id)
    items.value = items.value.filter(i => i.id !== deleteTarget.value.id)
    deleteTarget.value = null
  } catch {
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(fetchMenu)
</script>
