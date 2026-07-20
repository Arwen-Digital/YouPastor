<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, KeyRound, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const step = ref<'email' | 'code' | 'success'>('email')
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const touched = ref(false)
const localError = ref('')

const normalizedEmail = computed(() => email.value.trim().toLowerCase())
const displayError = computed(() => localError.value)

const emailError = computed(() => {
  if (!touched.value) return ''
  if (!email.value) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return 'Enter a valid email address'
  return ''
})

const passwordError = computed(() => {
  if (!touched.value || step.value !== 'code') return ''
  if (!newPassword.value) return 'New password is required'
  if (newPassword.value.length < 8) return 'Password must be at least 8 characters'
  return ''
})

const confirmError = computed(() => {
  if (!touched.value || step.value !== 'code') return ''
  if (confirmPassword.value !== newPassword.value) return 'Passwords do not match'
  return ''
})

onMounted(() => {
  auth.clearError()
})

async function sendCode() {
  touched.value = true
  localError.value = ''
  auth.clearError()

  if (emailError.value) return

  const success = await auth.requestPasswordReset(normalizedEmail.value)
  if (success) {
    auth.clearError()
    localError.value = ''
    step.value = 'code'
    touched.value = false
    return
  }

  localError.value = auth.error || 'Could not send the reset email. Please try again.'
}

async function resetPassword() {
  touched.value = true
  localError.value = ''
  auth.clearError()

  if (!code.value.trim()) {
    localError.value = 'Reset code is required.'
    return
  }
  if (passwordError.value || confirmError.value) return

  const success = await auth.resetPasswordWithCode(
    normalizedEmail.value,
    code.value.trim(),
    newPassword.value
  )

  if (success) {
    step.value = 'success'
  }
}

function backToLogin() {
  router.push('/login')
}

function continueToApp() {
  router.push(auth.user?.needsOnboarding ? '/onboarding' : '/')
}
</script>

<template>
  <div class="relative flex min-h-screen bg-background">
    <div class="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-muted/40 border-r border-border p-10">
      <div class="flex items-center gap-2.5">
        <img src="/icon.png" alt="YouPastor" class="h-9 w-9 rounded-lg object-cover" />
        <span class="text-xl font-semibold tracking-tight text-foreground">YouPastor</span>
      </div>

      <blockquote class="text-lg font-medium leading-relaxed text-foreground/90">
        "Reset your password securely and get back to your pastoral workspace."
      </blockquote>

      <p class="text-xs text-muted-foreground">
        For email and password accounts only. Google accounts should continue with Google sign in.
      </p>
    </div>

    <div class="flex-1 flex flex-col justify-center items-center p-6 sm:p-10">
      <div class="w-full max-w-sm space-y-6">
        <div class="lg:hidden flex items-center justify-center gap-2.5 mb-2">
          <img src="/icon.png" alt="YouPastor" class="h-9 w-9 rounded-lg object-cover" />
          <span class="text-xl font-semibold tracking-tight text-foreground">YouPastor</span>
        </div>

        <div class="text-center space-y-1.5">
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">
            {{ step === 'success' ? 'Password reset' : 'Reset your password' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            <template v-if="step === 'email'">Enter your email and we’ll send you a reset code.</template>
            <template v-else-if="step === 'code'">Enter the code we sent and choose a new password.</template>
            <template v-else>Your password has been updated.</template>
          </p>
        </div>

        <div
          v-if="displayError"
          class="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm"
        >
          <AlertCircle class="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p class="text-destructive">{{ displayError }}</p>
        </div>

        <form v-if="step === 'email'" @submit.prevent="sendCode" class="space-y-4">
          <div class="space-y-1.5">
            <label for="email" class="text-sm font-medium leading-none text-foreground">Email</label>
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

          <button
            type="submit"
            :disabled="auth.isLoading"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="auth.isLoading" class="h-4 w-4 animate-spin" />
            <span v-else>Send reset code</span>
          </button>
        </form>

        <form v-else-if="step === 'code'" @submit.prevent="resetPassword" class="space-y-4">
          <div class="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            If <span class="font-medium text-foreground">{{ normalizedEmail }}</span> has a password account, a reset code was sent.
          </div>

          <div class="space-y-1.5">
            <label for="code" class="text-sm font-medium leading-none text-foreground">Reset Code</label>
            <div class="relative">
              <KeyRound class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="code"
                v-model="code"
                type="text"
                required
                placeholder="Enter the code"
                class="flex h-10 w-full rounded-md border border-input bg-card px-3 pl-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="newPassword" class="text-sm font-medium leading-none text-foreground">New Password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="newPassword"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                placeholder="At least 8 characters"
                :class="[
                  'flex h-10 w-full rounded-md border bg-card px-3 pl-10 pr-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  passwordError ? 'border-destructive' : 'border-input',
                ]"
              />
              <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <Eye v-if="showPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="passwordError" class="text-xs text-destructive">{{ passwordError }}</p>
          </div>

          <div class="space-y-1.5">
            <label for="confirmPassword" class="text-sm font-medium leading-none text-foreground">Confirm Password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                minlength="8"
                placeholder="Repeat your new password"
                :class="[
                  'flex h-10 w-full rounded-md border bg-card px-3 pl-10 pr-10 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  confirmError ? 'border-destructive' : 'border-input',
                ]"
              />
              <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <Eye v-if="showConfirmPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="confirmError" class="text-xs text-destructive">{{ confirmError }}</p>
          </div>

          <button
            type="submit"
            :disabled="auth.isLoading"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="auth.isLoading" class="h-4 w-4 animate-spin" />
            <span v-else>Reset password</span>
          </button>
        </form>

        <div v-else class="space-y-4">
          <div class="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm">
            <CheckCircle2 class="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p class="text-foreground">Your password has been reset successfully.</p>
          </div>
          <button
            type="button"
            class="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            @click="continueToApp"
          >
            Continue to YouPastor
          </button>
        </div>

        <button type="button" class="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors" @click="backToLogin">
          Back to sign in
        </button>
      </div>
    </div>
  </div>
</template>
