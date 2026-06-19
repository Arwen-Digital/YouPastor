<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getConvexClient } from '@/lib/convex'
import { Church, User, BookOpen, Users, MapPin, BookMarked, ArrowRight, Loader2, Check } from 'lucide-vue-next'
import posthog from 'posthog-js'

const router = useRouter()
const auth = useAuthStore()

const currentStep = ref(0)
const isSaving = ref(false)
const isComplete = ref(false)

const steps = [
  {
    key: 'churchName',
    label: 'Church Name',
    description: 'What is the name of your church?',
    placeholder: 'Grace Community Church',
    icon: Church,
  },
  {
    key: 'pastorFirstName',
    label: 'Pastor Name',
    description: 'What should we call you?',
    placeholder: 'First Name',
    icon: User,
    isPastorName: true,
  },
  {
    key: 'denomination',
    label: 'Denomination',
    description: 'What denomination or tradition is your church?',
    placeholder: 'Southern Baptist',
    icon: BookOpen,
  },
  {
    key: 'averageAttendance',
    label: 'Average Attendance',
    description: 'What is your average weekly attendance?',
    placeholder: '175',
    icon: Users,
  },
  {
    key: 'location',
    label: 'Location',
    description: 'What city/town and country is your church in?',
    placeholder: 'City / Town',
    icon: MapPin,
    isLocation: true,
  },
  {
    key: 'bibleTranslation',
    label: 'Bible Translation',
    description: 'Which Bible translation do you prefer for preaching?',
    placeholder: 'NIV',
    icon: BookMarked,
    isSelect: true,
  },
]

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

const bibleTranslations = [
  { value: 'NIV', label: 'NIV — New International Version', description: 'Balance of accuracy and readability' },
  { value: 'ESV', label: 'ESV — English Standard Version', description: 'Word-for-word with modern English' },
  { value: 'NKJV', label: 'NKJV — New King James Version', description: 'Updated KJV with formal style' },
  { value: 'NLT', label: 'NLT — New Living Translation', description: 'Thought-for-thought, natural English' },
  { value: 'CSB', label: 'CSB — Christian Standard Bible', description: 'Balances word-for-word and thought-for-thought' },
  { value: 'NASB', label: 'NASB — New American Standard Bible', description: 'Most literal major translation' },
  { value: 'KJV', label: 'KJV — King James Version', description: 'Traditional, 1611 English' },
  { value: 'MSG', label: 'MSG — The Message', description: 'Paraphrase, conversational English' },
  { value: 'AMP', label: 'AMP — Amplified Bible', description: 'Word-for-word with expanded definitions' },
  { value: 'NET', label: 'NET — New English Translation', description: 'Balanced with extensive translator footnotes' },
]

const formValues = ref<Record<string, string>>({
  churchName: '',
  pastorFirstName: '',
  pastorLastName: '',
  pastorName: '',
  denomination: '',
  averageAttendance: '',
  location: '',
  locationCity: '',
  locationCountry: 'Philippines',
  bibleTranslation: 'NIV',
})

const currentStepData = computed(() => steps[currentStep.value])
const currentValue = computed({
  get: () => formValues.value[steps[currentStep.value].key],
  set: (val: string) => { formValues.value[steps[currentStep.value].key] = val },
})

const canProceed = computed(() => {
  const stepKey = steps[currentStep.value].key

  if (stepKey === 'pastorFirstName') {
    return !!formValues.value.pastorFirstName.trim()
  }

  if (stepKey === 'location') {
    return !!formValues.value.locationCity.trim() && !!formValues.value.locationCountry.trim()
  }

  const val = currentValue.value?.trim()
  if (!val) return false

  // For attendance, ensure it's a number
  if (stepKey === 'averageAttendance') {
    return /^\d+$/.test(val)
  }

  return true
})

const progressPercent = computed(() => {
  return ((currentStep.value + 1) / steps.length) * 100
})

// Pre-fill pastor first/last name from auth user name
watch(() => auth.user?.name, (name) => {
  if (!name || formValues.value.pastorFirstName) return
  const parts = name.trim().split(/\s+/)
  formValues.value.pastorFirstName = parts[0] ?? ''
  formValues.value.pastorLastName = parts.slice(1).join(' ')
  formValues.value.pastorName = [formValues.value.pastorFirstName, formValues.value.pastorLastName].filter(Boolean).join(' ')
}, { immediate: true })

async function handleNext() {
  isSaving.value = true

  try {
    const client = getConvexClient()
    const fieldKey = steps[currentStep.value].key

    if (fieldKey === 'pastorFirstName') {
      const pastorFirstName = formValues.value.pastorFirstName.trim()
      const pastorLastName = formValues.value.pastorLastName.trim()
      const pastorName = [pastorFirstName, pastorLastName].filter(Boolean).join(' ')
      formValues.value.pastorName = pastorName
      await client.mutation('profile/mutations:upsert' as any, {
        pastorFirstName,
        pastorLastName,
        pastorName,
      })
    } else {
      const fieldValue = fieldKey === 'location'
        ? `${formValues.value.locationCity.trim()}, ${formValues.value.locationCountry.trim()}`
        : formValues.value[fieldKey]

      if (fieldKey === 'location') {
        formValues.value.location = fieldValue
      }

      await client.mutation('profile/mutations:upsert' as any, {
        [fieldKey]: fieldValue,
      })
    }
  } catch (err) {
    console.error('Failed to save onboarding step:', err)
  }

  isSaving.value = false

  posthog.capture('onboarding_step_completed', {
    step: steps[currentStep.value].key,
    step_number: currentStep.value + 1,
  })

  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    // Final step — mark onboarding complete
    await markOnboardingDone()
  }
}

async function markOnboardingDone() {
  try {
    const client = getConvexClient()
    await client.mutation('profile/mutations:upsert' as any, {
      onboardingComplete: true,
    })
  } catch (err) {
    console.error('Failed to mark onboarding complete:', err)
  }
  isComplete.value = true
  posthog.capture('onboarding_completed')
  await auth.fetchUser()
  auth.markOnboardingComplete()
  setTimeout(() => {
    router.push('/')
  }, 1200)
}

async function handleSkip() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    // Skipping the last step — still mark onboarding as complete
    await markOnboardingDone()
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <!-- Left panel — branding -->
    <div class="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-muted/40 border-r border-border p-10">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Church class="h-5 w-5 text-primary-foreground" />
          </div>
          <span class="text-xl font-semibold tracking-tight text-foreground">YouPastor</span>
        </div>
      </div>

      <div class="space-y-6">
        <blockquote class="text-lg font-medium leading-relaxed text-foreground/90">
          "Let's set up your workspace. A few details about your church helps every tool personalize content for your context."
        </blockquote>

        <div class="space-y-3">
          <div
            v-for="(step, idx) in steps"
            :key="step.key"
            :class="[
              'flex items-center gap-3 text-sm transition-all duration-300',
              idx < currentStep ? 'text-foreground' : idx === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground/50',
            ]"
          >
            <div
              :class="[
                'h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs transition-all duration-300',
                idx < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : idx === currentStep
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground/50 border border-border',
              ]"
            >
              <Check v-if="idx < currentStep" class="h-3 w-3" />
              <span v-else>{{ idx + 1 }}</span>
            </div>
            {{ step.label }}
          </div>
        </div>
      </div>

      <p class="text-xs text-muted-foreground">
        Desktop-first AI workspace for pastors. Built with care for the local church.
      </p>
    </div>

    <!-- Right panel — form -->
    <div class="flex-1 flex flex-col justify-center items-center p-6 sm:p-10">
      <div class="w-full max-w-md space-y-8">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center justify-center gap-2.5 mb-2">
          <div class="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Church class="h-5 w-5 text-primary-foreground" />
          </div>
          <span class="text-xl font-semibold tracking-tight text-foreground">YouPastor</span>
        </div>

        <!-- Progress bar -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {{ currentStep + 1 }} of {{ steps.length }}</span>
            <span>{{ Math.round(progressPercent) }}%</span>
          </div>
          <div class="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <!-- Step content with transition -->
        <Transition name="step" mode="out-in">
          <div :key="currentStep" class="space-y-6">
            <!-- Icon and title -->
            <div class="space-y-3">
              <div class="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <component :is="currentStepData.icon" class="h-6 w-6 text-primary" />
              </div>
              <h1 class="text-2xl font-semibold tracking-tight text-foreground">
                {{ currentStepData.label }}
              </h1>
              <p class="text-sm text-muted-foreground">
                {{ currentStepData.description }}
              </p>
            </div>

            <!-- Input field -->
            <div v-if="!isComplete">
              <!-- Select for Bible Translation -->
              <div v-if="currentStepData.isSelect" class="space-y-2">
                <div
                  v-for="translation in bibleTranslations"
                  :key="translation.value"
                  @click="currentValue = translation.value"
                  :class="[
                    'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                    currentValue === translation.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-input bg-card hover:border-primary/30 hover:bg-accent/30',
                  ]"
                >
                  <div class="mt-0.5 h-4 w-4 rounded-full border shrink-0 flex items-center justify-center transition-colors"
                    :class="currentValue === translation.value ? 'border-primary' : 'border-muted-foreground/30'">
                    <div
                      v-if="currentValue === translation.value"
                      class="h-2 w-2 rounded-full bg-primary"
                    />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-foreground">{{ translation.label }}</div>
                    <div class="text-xs text-muted-foreground">{{ translation.description }}</div>
                  </div>
                </div>
              </div>

              <!-- Pastor name step: first + last -->
              <div v-else-if="currentStepData.isPastorName" class="space-y-3">
                <div class="space-y-1.5">
                  <label class="text-xs text-muted-foreground">First Name</label>
                  <input
                    v-model="formValues.pastorFirstName"
                    type="text"
                    placeholder="First Name"
                    maxlength="80"
                    class="flex h-12 w-full rounded-md border border-input bg-card px-4 py-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    @keydown.enter="canProceed && handleNext()"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs text-muted-foreground">Last Name (optional)</label>
                  <input
                    v-model="formValues.pastorLastName"
                    type="text"
                    placeholder="Last Name"
                    maxlength="80"
                    class="flex h-12 w-full rounded-md border border-input bg-card px-4 py-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    @keydown.enter="canProceed && handleNext()"
                  />
                </div>

                <p class="text-xs text-muted-foreground">You can change this later in Settings</p>
              </div>

              <!-- Location step: City/Town + Country -->
              <div v-else-if="currentStepData.isLocation" class="space-y-3">
                <div class="space-y-1.5">
                  <label class="text-xs text-muted-foreground">City / Town</label>
                  <input
                    v-model="formValues.locationCity"
                    type="text"
                    placeholder="City / Town"
                    maxlength="100"
                    class="flex h-12 w-full rounded-md border border-input bg-card px-4 py-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    @keydown.enter="canProceed && handleNext()"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs text-muted-foreground">Country</label>
                  <select
                    v-model="formValues.locationCountry"
                    class="flex h-12 w-full rounded-md border border-input bg-card px-4 py-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option v-for="country in countries" :key="country" :value="country">{{ country }}</option>
                  </select>
                </div>

                <p class="text-xs text-muted-foreground">You can change this later in Settings</p>
              </div>

              <!-- Text input for other fields -->
              <div v-else class="space-y-1.5">
                <input
                  v-model="currentValue"
                  type="text"
                  :placeholder="currentStepData.placeholder"
                  :maxlength="steps[currentStep].key === 'averageAttendance' ? 6 : 100"
                  class="flex h-12 w-full rounded-md border border-input bg-card px-4 py-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  @keydown.enter="canProceed && handleNext()"
                />
                <p v-if="steps[currentStep].key === 'averageAttendance'" class="text-xs text-muted-foreground">
                  Enter a number (e.g., 175)
                </p>
                <p v-else class="text-xs text-muted-foreground">
                  You can change this later in Settings
                </p>
              </div>
            </div>

            <!-- Completion state -->
            <div v-if="isComplete" class="flex flex-col items-center py-8 space-y-3">
              <div class="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <Check class="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 class="text-xl font-semibold text-foreground">All set!</h2>
              <p class="text-sm text-muted-foreground">Taking you to your workspace...</p>
            </div>
          </div>
        </Transition>

        <!-- Action buttons -->
        <div v-if="!isComplete" class="flex items-center gap-3">
          <button
            @click="handleNext"
            :disabled="!canProceed || isSaving"
            class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
            <span v-else>{{ currentStep === steps.length - 1 ? 'Finish' : 'Continue' }}</span>
            <ArrowRight v-if="!isSaving" class="h-4 w-4" />
          </button>

          <button
            v-if="currentStep < steps.length - 1"
            @click="handleSkip"
            class="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5"
          >
            Skip for now
          </button>
        </div>

        <!-- Mobile step indicators -->
        <div class="lg:hidden flex items-center justify-center gap-1.5 pt-4">
          <div
            v-for="(_, idx) in steps"
            :key="idx"
            :class="[
              'h-1.5 rounded-full transition-all duration-300',
              idx === currentStep
                ? 'w-6 bg-primary'
                : idx < currentStep
                  ? 'w-1.5 bg-primary/50'
                  : 'w-1.5 bg-muted-foreground/20',
            ]"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-enter-active {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.step-leave-active {
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
.step-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.step-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>