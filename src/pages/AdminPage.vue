<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Shield, Search, Gift, Ticket } from 'lucide-vue-next'
import { getConvexClient } from '@/lib/convex'

const searchTerm = ref('')
const isSearching = ref(false)
const searchError = ref<string | null>(null)
const users = ref<any[]>([])

const selectedUserId = ref<string | null>(null)
const selectedUser = ref<any | null>(null)
const transactions = ref<any[]>([])
const loadingDetail = ref(false)

const giftAmount = ref<number>(50)
const giftNote = ref('')
const gifting = ref(false)
const giftMessage = ref<string | null>(null)
const showGiftConfirm = ref(false)

const hasSelectedUser = computed(() => !!selectedUserId.value)
const txPage = ref(1)
const txPageSize = 15
const totalTxPages = computed(() => Math.max(1, Math.ceil(transactions.value.length / txPageSize)))
const pagedTransactions = computed(() => {
  const start = (txPage.value - 1) * txPageSize
  return transactions.value.slice(start, start + txPageSize)
})

async function runSearch() {
  const term = searchTerm.value.trim()
  if (!term) {
    users.value = []
    return
  }

  isSearching.value = true
  searchError.value = null
  try {
    const client = getConvexClient()
    const result = await client.query('admin/queries:searchUsers' as any, { term })
    users.value = result ?? []
  } catch (err: any) {
    searchError.value = err?.message || 'Search failed.'
  } finally {
    isSearching.value = false
  }
}

async function selectUser(userId: string) {
  selectedUserId.value = userId
  loadingDetail.value = true
  giftMessage.value = null

  try {
    const client = getConvexClient()
    const [detail, txns] = await Promise.all([
      client.query('admin/queries:getUserDetail' as any, { userId }),
      client.query('admin/queries:getUserTransactions' as any, { userId }),
    ])
    selectedUser.value = detail
    transactions.value = txns ?? []
    txPage.value = 1
  } catch (err: any) {
    searchError.value = err?.message || 'Failed to load user details.'
  } finally {
    loadingDetail.value = false
  }
}

function openGiftConfirm() {
  giftMessage.value = null
  showGiftConfirm.value = true
}

function closeGiftConfirm() {
  if (gifting.value) return
  showGiftConfirm.value = false
}

async function giftCredits() {
  if (!selectedUserId.value) return
  gifting.value = true
  giftMessage.value = null

  try {
    const client = getConvexClient()
    const result = await client.mutation('admin/mutations:giftCredits' as any, {
      userId: selectedUserId.value,
      amount: giftAmount.value,
      note: giftNote.value,
    })
    giftMessage.value = `Gifted ${giftAmount.value} credits. New balance: ${result?.creditBalance ?? 'updated'}.`
    await selectUser(selectedUserId.value)
    giftNote.value = ''
    showGiftConfirm.value = false
  } catch (err: any) {
    giftMessage.value = err?.message || 'Unable to gift credits.'
  } finally {
    gifting.value = false
  }
}

function formatDate(ts?: number) {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}

// Voucher management state & functions
const activeTab = ref<'users' | 'vouchers'>('users')
const vouchers = ref<any[]>([])
const isLoadingVouchers = ref(false)
const voucherError = ref<string | null>(null)
const newVoucherCode = ref('')
const newVoucherCredits = ref<number>(100)
const isCreatingVoucher = ref(false)
const isDeletingVoucher = ref<string | null>(null)

async function loadVouchers() {
  isLoadingVouchers.value = true
  voucherError.value = null
  try {
    const client = getConvexClient()
    vouchers.value = await client.query('admin/queries:listVouchers' as any, {})
  } catch (err: any) {
    voucherError.value = err?.message || 'Failed to load vouchers.'
  } finally {
    isLoadingVouchers.value = false
  }
}

async function handleCreateVoucher() {
  const code = newVoucherCode.value.trim().toUpperCase()
  if (!code) {
    voucherError.value = "Voucher code is required"
    return
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    voucherError.value = "Voucher code must contain only letters, numbers, dashes, or underscores"
    return
  }
  if (newVoucherCredits.value <= 0) {
    voucherError.value = "Credits must be greater than 0"
    return
  }
  isCreatingVoucher.value = true
  voucherError.value = null
  try {
    const client = getConvexClient()
    await client.mutation('admin/mutations:createVoucher' as any, {
      code,
      credits: newVoucherCredits.value
    })
    newVoucherCode.value = ''
    newVoucherCredits.value = 100
    await loadVouchers()
  } catch (err: any) {
    voucherError.value = err?.message || 'Failed to create voucher.'
  } finally {
    isCreatingVoucher.value = false
  }
}

async function handleDeleteVoucher(voucherId: string) {
  if (!confirm('Are you sure you want to delete this voucher? This cannot be undone.')) return
  isDeletingVoucher.value = voucherId
  voucherError.value = null
  try {
    const client = getConvexClient()
    await client.mutation('admin/mutations:deleteVoucher' as any, { voucherId })
    await loadVouchers()
  } catch (err: any) {
    voucherError.value = err?.message || 'Failed to delete voucher.'
  } finally {
    isDeletingVoucher.value = null
  }
}

watch(activeTab, (tab) => {
  if (tab === 'vouchers') {
    loadVouchers()
  }
})
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-6xl mx-auto py-8 space-y-6">
    <div class="flex items-center justify-between border-b pb-4">
      <div class="flex items-center gap-3">
        <Shield class="h-6 w-6 text-muted-foreground" />
        <h2 class="text-xl font-semibold tracking-tight">Admin Dashboard</h2>
      </div>
      <div class="flex bg-muted rounded-lg p-0.5 text-xs font-medium">
        <button 
          @click="activeTab = 'users'" 
          :class="['px-3 py-1.5 rounded-md transition-colors', activeTab === 'users' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >
          Users
        </button>
        <button 
          @click="activeTab = 'vouchers'" 
          :class="['px-3 py-1.5 rounded-md transition-colors', activeTab === 'vouchers' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground']"
        >
          Vouchers
        </button>
      </div>
    </div>

    <!-- Users Management Tab -->
    <div v-if="activeTab === 'users'" class="space-y-6">
      <div class="rounded-xl border bg-card p-4 space-y-3">
        <label class="text-sm font-medium text-foreground">Search user by email or name</label>
        <div class="flex gap-2">
          <input
            v-model="searchTerm"
            @keydown.enter.prevent="runSearch"
            type="text"
            placeholder="name@church.org or Pastor Name"
            class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <button
            @click="runSearch"
            :disabled="isSearching"
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Search class="h-4 w-4" /> Search
          </button>
        </div>
        <p v-if="searchError" class="text-sm text-destructive">{{ searchError }}</p>

        <div v-if="users.length" class="grid gap-2">
          <button
            v-for="u in users"
            :key="u._id"
            @click="selectUser(u._id)"
            class="w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-muted"
          >
            <div class="text-sm font-medium text-foreground">{{ u.name || 'Unnamed user' }}</div>
            <div class="text-xs text-muted-foreground">{{ u.email }} • {{ u.creditBalance }} credits</div>
          </button>
        </div>
      </div>

      <div v-if="hasSelectedUser" class="grid gap-4 lg:grid-cols-[1fr,1fr]">
        <div class="rounded-xl border bg-card p-4 space-y-3">
          <h3 class="text-sm font-semibold text-foreground">User Details</h3>
          <div v-if="loadingDetail" class="text-sm text-muted-foreground">Loading...</div>
          <div v-else-if="selectedUser" class="space-y-1 text-sm">
            <p><span class="text-muted-foreground">Name:</span> {{ selectedUser.name || '—' }}</p>
            <p><span class="text-muted-foreground">Email:</span> {{ selectedUser.email || '—' }}</p>
            <p><span class="text-muted-foreground">Church:</span> {{ selectedUser.churchName || '—' }}</p>
            <p><span class="text-muted-foreground">Denomination:</span> {{ selectedUser.denomination || '—' }}</p>
            <p><span class="text-muted-foreground">Current credits:</span> <strong>{{ selectedUser.creditBalance }}</strong></p>
            <p><span class="text-muted-foreground">Created:</span> {{ formatDate(selectedUser.createdAt) }}</p>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-4 space-y-3">
          <h3 class="text-sm font-semibold text-foreground">Gift Credits</h3>
          <div class="space-y-2">
            <input v-model.number="giftAmount" type="number" min="1" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" placeholder="Amount" />
            <input v-model="giftNote" type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" placeholder="Reason (required)" />
            <button
              @click="openGiftConfirm"
              :disabled="gifting || !giftAmount || !giftNote.trim()"
              class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Gift class="h-4 w-4" /> Gift credits
            </button>
            <p v-if="giftMessage" class="text-sm text-muted-foreground">{{ giftMessage }}</p>
          </div>
        </div>
      </div>

      <div v-if="hasSelectedUser" class="rounded-xl border bg-card p-4 space-y-3">
        <h3 class="text-sm font-semibold text-foreground">Transaction History</h3>
        <div v-if="!transactions.length" class="text-sm text-muted-foreground">No transactions yet.</div>
        <div v-else class="space-y-2">
          <div v-for="tx in pagedTransactions" :key="`${tx.source}-${tx._id}`" class="rounded-lg border border-border px-3 py-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-foreground">{{ tx.description }}</p>
              <p :class="['text-sm font-semibold', tx.amount >= 0 ? 'text-emerald-600' : 'text-foreground']">{{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount }}</p>
            </div>
            <div class="text-xs text-muted-foreground">{{ tx.type }} • {{ formatDate(tx.createdAt) }}</div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-muted-foreground">Page {{ txPage }} of {{ totalTxPages }}</p>
            <div class="flex items-center gap-2">
              <button
                @click="txPage = Math.max(1, txPage - 1)"
                :disabled="txPage === 1"
                class="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              <button
                @click="txPage = Math.min(totalTxPages, txPage + 1)"
                :disabled="txPage === totalTxPages"
                class="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showGiftConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 class="text-base font-semibold text-foreground">Confirm credit gift</h3>
          <p class="text-sm text-muted-foreground">
            Gift <strong>{{ giftAmount }}</strong> credits to
            <strong>{{ selectedUser?.email || 'this user' }}</strong>?
          </p>
          <p class="text-xs text-muted-foreground">Reason: {{ giftNote }}</p>
          <div class="flex items-center justify-end gap-2">
            <button
              @click="closeGiftConfirm"
              :disabled="gifting"
              class="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              @click="giftCredits"
              :disabled="gifting"
              class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {{ gifting ? 'Gifting...' : 'Confirm gift' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vouchers Management Tab -->
    <div v-else-if="activeTab === 'vouchers'" class="space-y-6">
      <div class="grid gap-6 md:grid-cols-[2fr,3fr]">
        <!-- Create Voucher Form -->
        <div class="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <div>
            <h3 class="text-base font-semibold text-foreground flex items-center gap-2">
              <Ticket class="h-4 w-4 text-muted-foreground" />
              Create Voucher
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5">Voucher codes must be unique and are automatically converted to uppercase.</p>
          </div>
          
          <div class="space-y-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground">Voucher Code</label>
              <input
                v-model="newVoucherCode"
                type="text"
                placeholder="e.g. PASTOR2024"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring uppercase"
              />
            </div>
            
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground">Credits to Add</label>
              <input
                v-model.number="newVoucherCredits"
                type="number"
                min="1"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
            
            <button
              @click="handleCreateVoucher"
              :disabled="isCreatingVoucher || !newVoucherCode.trim()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {{ isCreatingVoucher ? 'Creating...' : 'Create Voucher' }}
            </button>
          </div>
          
          <p v-if="voucherError" class="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {{ voucherError }}
          </p>
        </div>

        <!-- Active Vouchers List -->
        <div class="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <div>
            <h3 class="text-base font-semibold text-foreground">Active Vouchers</h3>
            <p class="text-xs text-muted-foreground mt-0.5">Manage existing promotional voucher codes.</p>
          </div>

          <div v-if="isLoadingVouchers" class="text-sm text-muted-foreground py-8 text-center">
            Loading vouchers...
          </div>
          
          <div v-else-if="!vouchers.length" class="text-sm text-muted-foreground py-8 text-center">
            No active vouchers found.
          </div>
          
          <div v-else class="overflow-hidden border border-border rounded-lg">
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-sm text-left">
                <thead>
                  <tr class="bg-muted/40 border-b border-border">
                    <th class="p-3 font-semibold text-muted-foreground">Voucher Code</th>
                    <th class="p-3 font-semibold text-muted-foreground text-center">Credits</th>
                    <th class="p-3 font-semibold text-muted-foreground">Created At</th>
                    <th class="p-3 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="v in vouchers" :key="v._id" class="hover:bg-muted/30 transition-colors">
                    <td class="p-3 font-semibold font-mono text-foreground tracking-wide uppercase">{{ v.code }}</td>
                    <td class="p-3 text-center font-medium text-emerald-600">+{{ v.credits }}</td>
                    <td class="p-3 text-muted-foreground text-xs">{{ formatDate(v.createdAt) }}</td>
                    <td class="p-3 text-right">
                      <button
                        @click="handleDeleteVoucher(v._id)"
                        :disabled="isDeletingVoucher === v._id"
                        class="inline-flex items-center justify-center rounded px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    </div>
  </div>
</template>
