<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getConvexClient } from '@/lib/convex'
import { Church, User, BookOpen, Users, MapPin, BookMarked, ArrowRight, Loader2, Check } from 'lucide-vue-next'

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
    key: 'pastorName',
    label: 'Pastor Name',
    description: 'What should we call you?',
    placeholder: 'Pastor Mike',
    icon: User,
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
    description: 'What city and state is your church in?',
    placeholder: 'Tulsa, Oklahoma',
    icon: MapPin,
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
  pastorName: '',
  denomination: '',
  averageAttendance: '',
  location: '',
  bibleTranslation: 'NIV',
})

const currentStepData = computed(() => steps[currentStep.value])
const currentValue = computed({
  get: () => formValues.value[steps[currentStep.value].key],
  set: (val: string) => { formValues.value[steps[currentStep.value].key] = val },
})

const canProceed = computed(() => {
  const val = currentValue.value?.trim()
  if (!val) return false
  // For attendance, ensure it's a number
  if (steps[currentStep.value].key === 'averageAttendance') {
    return /^\d+$/.test(val)
  }
  return true
})

const progressPercent = computed(() => {
  return ((currentStep.value + 1) / steps.length) * 100
})

// Pre-fill pastorName from auth user name
watch(() => auth.user?.name, (name) => {
  if (name && !formValues.value.pastorName) {
    formValues.value.pastorName = name
  }
}, { immediate: true })

async function handleNext() {
  isSaving.value = true

  try {
    const client = getConvexClient()
    const fieldKey = steps[currentStep.value].key
    const fieldValue = formValues.value[fieldKey]

    // Save the current field to the database
    await client.mutation('profile/mutations:upsert' as any, {
      [fieldKey]: fieldValue,
    })
  } catch (err) {
    console.error('Failed to save onboarding step:', err)
  }

  isSaving.value = false

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