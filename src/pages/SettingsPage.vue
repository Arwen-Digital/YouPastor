<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Settings, Save } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConvexQuery } from '@/composables/useConvexQuery'
import { useConvexMutation } from '@/composables/useConvexMutation'

const router = useRouter()
const auth = useAuthStore()

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

const { result: balanceResult } = useConvexQuery('credits/queries:getMyBalance' as any)
const { result: profileResult } = useConvexQuery('profile/queries:getMine' as any)
const { result: additionsResult } = useConvexQuery('credits/queries:listMyCreditAdditions' as any)
const { mutate: saveProfile, isLoading: isSavingProfile } = useConvexMutation('profile/mutations:upsert' as any)
const { mutate: deleteMyAccount, isLoading: isDeletingAccount, error: deleteAccountMutationError } = useConvexMutation('users/mutations:deleteMyAccount' as any)

const creditBalance = computed(() => balanceResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)

const form = ref({
  pastorName: '',
  churchName: '',
  denomination: '',
  averageAttendance: '',
  locationCity: '',
  locationCountry: '',
  bibleTranslation: 'NIV',
})

watch(profileResult, (profile: any) => {
  if (!profile) return
  const rawLocation = String(profile.location ?? '')
  const [cityPart, ...countryParts] = rawLocation.split(',')
  form.value = {
    pastorName: profile.pastorName ?? '',
    churchName: profile.churchName ?? '',
    denomination: profile.denomination ?? '',
    averageAttendance: profile.averageAttendance ?? '',
    locationCity: (cityPart ?? '').trim(),
    locationCountry: countryParts.join(',').trim(),
    bibleTranslation: profile.bibleTranslation ?? 'NIV',
  }
}, { immediate: true })

const saveMessage = ref<string | null>(null)
const deleteConfirmText = ref('')
const deleteError = ref<string | null>(null)

async function handleSaveProfile() {
  saveMessage.value = null
  const location = [form.value.locationCity.trim(), form.value.locationCountry.trim()]
    .filter(Boolean)
    .join(', ')

  const result = await saveProfile({
    pastorName: form.value.pastorName,
    churchName: form.value.churchName,
    denomination: form.value.denomination,
    averageAttendance: form.value.averageAttendance,
    location,
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

async function handleDeleteAccount() {
  deleteError.value = null
  if (deleteConfirmText.value !== 'DELETE') return

  const confirmed = window.confirm('This will permanently delete your account and data. Continue?')
  if (!confirmed) return

  try {
    const ok = await deleteMyAccount({} as any)
    if (!ok) {
      throw new Error(deleteAccountMutationError.value?.message || 'Delete failed')
    }
    await auth.signOut()
    router.push('/login')
  } catch (err: any) {
    deleteError.value = err?.message || 'Unable to delete account.'
  }
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
            <label class="text-xs text-muted-foreground">City / Town</label>
            <input v-model="form.locationCity" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Country</label>
            <select v-model="form.locationCountry" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="">Select country</option>
              <option v-for="country in countries" :key="country" :value="country">{{ country }}</option>
            </select>
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

      <div class="rounded-xl border border-destructive/30 bg-card p-5 space-y-3">
        <h3 class="text-sm font-semibold text-destructive">Danger Zone</h3>
        <p class="text-xs text-muted-foreground">Type <span class="font-semibold text-foreground">DELETE</span> to permanently remove your account and all associated data.</p>
        <div class="flex flex-col gap-2 max-w-sm">
          <input
            v-model="deleteConfirmText"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            placeholder="Type DELETE to confirm"
          />
          <button
            @click="handleDeleteAccount"
            :disabled="deleteConfirmText !== 'DELETE' || isDeletingAccount"
            class="inline-flex items-center justify-center rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {{ isDeletingAccount ? 'Deleting account...' : 'Delete my account' }}
          </button>
          <p v-if="deleteError" class="text-xs text-destructive">{{ deleteError }}</p>
        </div>
      </div>

      <div class="rounded-xl border bg-card p-5 space-y-2">
        <h3 class="text-sm font-semibold text-foreground">Acknowledgement</h3>
        <p class="text-xs text-muted-foreground">
          Some AI chat capabilities in YouPastor are inspired by a modified version of Thomas Costello’s Pastor AI Skills for Claude.
          <a
            href="https://github.com/tkcostello/pastor-ai-skills"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 text-foreground"
          >
            https://github.com/tkcostello/pastor-ai-skills
          </a>
          We’re grateful to Pastor Thomas for open-sourcing this work.
          Developed by
          <a
            href="https://arnold.gamboa.ph"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 text-foreground"
          >
            Arnold Gamboa
          </a>.
        </p>
      </div>
    </div>
  </div>
</template>
