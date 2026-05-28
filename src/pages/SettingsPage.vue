<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Settings, Save } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConvexQuery } from '@/composables/useConvexQuery'
import { useConvexMutation } from '@/composables/useConvexMutation'

const router = useRouter()
const auth = useAuthStore()

const { result: balanceResult } = useConvexQuery('credits/queries:getMyBalance' as any)
const { result: profileResult } = useConvexQuery('profile/queries:getMine' as any)
const { result: additionsResult } = useConvexQuery('credits/queries:listMyCreditAdditions' as any)
const { mutate: saveProfile, isLoading: isSavingProfile } = useConvexMutation('profile/mutations:upsert' as any)

const creditBalance = computed(() => balanceResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)

const form = ref({
  pastorName: '',
  churchName: '',
  denomination: '',
  averageAttendance: '',
  location: '',
  bibleTranslation: 'NIV',
})

watch(profileResult, (profile: any) => {
  if (!profile) return
  form.value = {
    pastorName: profile.pastorName ?? '',
    churchName: profile.churchName ?? '',
    denomination: profile.denomination ?? '',
    averageAttendance: profile.averageAttendance ?? '',
    location: profile.location ?? '',
    bibleTranslation: profile.bibleTranslation ?? 'NIV',
  }
}, { immediate: true })

const saveMessage = ref<string | null>(null)

async function handleSaveProfile() {
  saveMessage.value = null
  const result = await saveProfile({
    pastorName: form.value.pastorName,
    churchName: form.value.churchName,
    denomination: form.value.denomination,
    averageAttendance: form.value.averageAttendance,
    location: form.value.location,
    bibleTranslation: form.value.bibleTranslation,
  } as any)

  if (result) {
    saveMessage.value = 'Profile updated.'
  } else {
    saveMessage.value = 'Unable to update profile.'
  }
}

function formatDate(ts?: number): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div class="flex items-center gap-3">
        <Settings class="h-6 w-6 text-muted-foreground" />
        <h2 class="text-xl font-semibold tracking-tight">Settings</h2>
      </div>

      <div class="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <p class="text-sm text-muted-foreground">Current Credits</p>
          <p class="mt-1 text-3xl font-semibold">{{ creditBalance }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            @click="router.push('/upgrade')"
            class="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Manage credits & upgrade
          </button>
          <button
            @click="router.push('/feedback')"
            class="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Send feedback
          </button>
        </div>
      </div>

      <div class="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-foreground">Account Details</h3>
          <p class="text-xs text-muted-foreground">These values are used across your skills and prompts.</p>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Pastor Name</label>
            <input v-model="form.pastorName" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Church Name</label>
            <input v-model="form.churchName" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Denomination</label>
            <input v-model="form.denomination" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Average Attendance</label>
            <input v-model="form.averageAttendance" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Location</label>
            <input v-model="form.location" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Bible Translation</label>
            <select v-model="form.bibleTranslation" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="NIV">NIV</option>
              <option value="ESV">ESV</option>
              <option value="NKJV">NKJV</option>
              <option value="NLT">NLT</option>
              <option value="CSB">CSB</option>
              <option value="NASB">NASB</option>
              <option value="KJV">KJV</option>
              <option value="MSG">MSG</option>
              <option value="AMP">AMP</option>
              <option value="NET">NET</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="handleSaveProfile"
            :disabled="isSavingProfile"
            class="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            <Save class="h-4 w-4" />
            {{ isSavingProfile ? 'Saving...' : 'Save details' }}
          </button>
          <p v-if="saveMessage" class="text-xs text-muted-foreground">{{ saveMessage }}</p>
        </div>
      </div>

      <div class="rounded-xl border bg-card p-5 space-y-3">
        <h3 class="text-sm font-semibold text-foreground">Credit Transactions</h3>
        <p class="text-xs text-muted-foreground">Shows purchases and gifted credits only.</p>

        <div v-if="!additionsResult?.length" class="text-sm text-muted-foreground">No credit additions yet.</div>

        <div v-else class="space-y-2">
          <div v-for="tx in additionsResult" :key="`${tx.source}-${tx._id}`" class="rounded-lg border border-border px-3 py-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-foreground">{{ tx.description }}</p>
              <p class="text-sm font-semibold text-emerald-600">+{{ tx.amount }}</p>
            </div>
            <div class="text-xs text-muted-foreground">{{ tx.type }} • {{ formatDate(tx.createdAt) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
