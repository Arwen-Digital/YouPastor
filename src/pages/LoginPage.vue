<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Mail, Lock, User, Eye, EyeOff, Church, Loader2, AlertCircle, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const name = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const localError = ref('')
const touched = ref(false)

const emailError = computed(() => {
  if (!touched.value) return ''
  if (!email.value) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return 'Enter a valid email address'
  return ''
})

const passwordError = computed(() => {
  if (!touched.value) return ''
  if (!password.value) return 'Password is required'
  if (password.value.length < 8) return 'Password must be at least 8 characters'
  return ''
})

const confirmError = computed(() => {
  if (!touched.value || mode.value === 'signin') return ''
  if (confirmPassword.value !== password.value) return 'Passwords do not match'
  return ''
})

const nameError = computed(() => {
  if (!touched.value || mode.value === 'signin') return ''
  if (!name.value.trim()) return 'Your name is required'
  return ''
})

const isFormValid = computed(() => {
  if (!email.value || !password.value) return false
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return false
  if (password.value.length < 8) return false
  if (mode.value === 'signup') {
    if (!name.value.trim()) return false
    if (confirmPassword.value !== password.value) return false
  }
  return true
})

const displayError = computed(() => localError.value || auth.error || '')

watch(() => auth.error, (val) => {
  if (val) localError.value = ''
})

watch(mode, () => {
  touched.value = false
  localError.value = ''
  auth.clearError()
})

async function handleSubmit() {
  touched.value = true
  localError.value = ''
  auth.clearError()

  if (!isFormValid.value) return

  let success: boolean

  if (mode.value === 'signup') {
    success = await auth.signUpWithPassword(
      email.value.trim().toLowerCase(),
      password.value,
      name.value.trim()
    )
  } else {
    success = await auth.signInWithPassword(
      email.value.trim().toLowerCase(),
      password.value
    )
  }

  if (success) {
    if (mode.value === 'signup') {
      router.push('/onboarding')
    } else {
      router.push('/')
    }
  }
}

function switchMode(newMode: 'signin' | 'signup') {
  mode.value = newMode
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
          "The AI workspace that helps pastors prepare, communicate, and serve with more depth and less burnout."
        </blockquote>

        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles class="h-3 w-3 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">Guided sermon prep</p>
              <p class="text-xs text-muted-foreground">Research, brainstorm, and plan series with AI that thinks like a theologian.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="mt-0.5 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles class="h-3 w-3 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">Repurpose with ease</p>
              <p class="text-xs text-muted-foreground">Turn one sermon into blog posts, social content, small group guides, and more.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="mt-0.5 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles class="h-3 w-3 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">Context that follows you</p>
              <p class="text-xs text-muted-foreground">Your sermon data carries across every workspace — never start from scratch again.</p>
            </div>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted-foreground">
        Desktop-first AI workspace for pastors. Built with care for the local church.
      </p>
    </div>

    <!-- Right panel — auth form -->
    <div class="flex-1 flex flex-col justify-center items-center p-6 sm:p-10">
      <div class="w-full max-w-sm space-y-6">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center justify-center gap-2.5 mb-2">
          <div class="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Church class="h-5 w-5 text-primary-foreground" />
          </div>
          <span class="text-xl font-semibold tracking-tight text-foreground">YouPastor</span>
        </div>

        <!-- Header -->
        <div class="text-center space-y-1.5">
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">
            {{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ mode === 'signin'
              ? 'Sign in to continue your work'
              : 'Start your free trial — 100 credits included'
            }}
          </p>
        </div>

        <!-- Mode tabs -->
        <div class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            @click="switchMode('signin')"
            :class="[
              'rounded-md px-3 py-2 text-sm font-medium transition-all',
              mode === 'signin'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            Sign In
          </button>
          <button
            @click="switchMode('signup')"
            :class="[
              'rounded-md px-3 py-2 text-sm font-medium transition-all',
              mode === 'signup'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            Create Account
          </button>
        </div>

        <!-- Error banner -->
        <div
          v-if="displayError"
          class="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm"
        >
          <AlertCircle class="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p class="text-destructive">{{ displayError }}</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name (signup only) -->
          <div v-if="mode === 'signup'" class="space-y-1.5">
            <label for="name" class="text-sm font-medium leading-none text-foreground">
              Your Name
            </label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="name"
                v-model="name"
                type="text"
                required
                placeholder="Pastor John"
                :class="[
                  'flex h-10 w-full rounded-md border bg-card px-3 pl-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  nameError ? 'border-destructive' : 'border-input',
                ]"
              />
            </div>
            <p v-if="nameError" class="text-xs text-destructive">{{ nameError }}</p>
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <label for="email" class="text-sm font-medium leading-none text-foreground">
              Email
            </label>
            <div class="relative">
              <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                v-model="email"
                type="email"
                required
                placeholder="pastor@church.org"
                :class="[
                  'flex h-10 w-full rounded-md border bg-card px-3 pl-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  emailError ? 'border-destructive' : 'border-input',
                ]"
              />
            </div>
            <p v-if="emailError" class="text-xs text-destructive">{{ emailError }}</p>
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label for="password" class="text-sm font-medium leading-none text-foreground">
              Password
            </label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                placeholder="At least 8 characters"
                :class="[
                  'flex h-10 w-full rounded-md border bg-card px-3 pl-10 pr-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  passwordError ? 'border-destructive' : 'border-input',
                ]"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye v-if="showPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="passwordError" class="text-xs text-destructive">{{ passwordError }}</p>
          </div>

          <!-- Confirm Password (signup only) -->
          <div v-if="mode === 'signup'" class="space-y-1.5">
            <label for="confirmPassword" class="text-sm font-medium leading-none text-foreground">
              Confirm Password
            </label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                minlength="8"
                placeholder="Repeat your password"
                :class="[
                  'flex h-10 w-full rounded-md border bg-card px-3 pl-10 pr-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  confirmError ? 'border-destructive' : 'border-input',
                ]"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye v-if="showConfirmPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="confirmError" class="text-xs text-destructive">{{ confirmError }}</p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="auth.isLoading"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="auth.isLoading" class="h-4 w-4 animate-spin" />
            <span v-else>
              {{ mode === 'signin' ? 'Sign In' : 'Create Account' }}
            </span>
          </button>
        </form>

        <!-- Footer -->
        <p class="text-center text-xs text-muted-foreground leading-relaxed">
          By continuing, you agree to YouPastor's
          <a href="#" class="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</a>
          and
          <a href="#" class="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  </div>
</template>
