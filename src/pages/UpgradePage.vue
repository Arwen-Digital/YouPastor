<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Check, Zap, Ticket } from 'lucide-vue-next'
import { useConvexQuery } from '@/composables/useConvexQuery'
import { useConvexAction } from '@/composables/useConvexAction'
import { useConvexMutation } from '@/composables/useConvexMutation'
import { useAuthStore } from '@/stores/auth'
import posthog from 'posthog-js'

const route = useRoute()
const auth = useAuthStore()

const { result: billingResult } = useConvexQuery('billing/queries:getMyPlanAndCredits' as any)
const { result: profileResult, isLoading: profileLoading } = useConvexQuery('profile/queries:getMine' as any)
const { run: createCheckout, isLoading: checkoutLoading, error: checkoutActionError } = useConvexAction('billing/actions:createCheckout' as any)
const { run: createPayrexCheckout, isLoading: payrexCheckoutLoading, error: payrexCheckoutActionError } = useConvexAction('billing/payrexActions:createCheckout' as any)

const creditBalance = computed(() => billingResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)
const lastKnownPlan = ref<'free' | 'starter' | 'pro'>('free')
watch(
  () => billingResult.value?.planTier,
  (plan) => {
    if (plan === 'free' || plan === 'starter' || plan === 'pro') {
      lastKnownPlan.value = plan
    }
  },
  { immediate: true }
)
const currentPlan = computed<'free' | 'starter' | 'pro'>(() => lastKnownPlan.value)
const normalizedCurrentPlan = computed<'free' | 'starter' | 'pro'>(() => currentPlan.value)
const loadingPlan = ref<'starter' | 'pro' | null>(null)
const loadingCreditPack = ref<'php_400' | 'php_800' | null>(null)
const checkoutError = ref<string | null>(null)

const checkoutStatus = computed(() => {
  const value = route.query.checkout
  return Array.isArray(value) ? value[0] : value
})

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    credits: '100 credits',
    description: 'Good for trying YouPastor and occasional use.',
    cta: 'Current default',
    featured: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$9',
    period: '/month',
    credits: '400 credits',
    description: 'Great for weekly sermon prep with regular AI support.',
    cta: 'Choose Starter',
    featured: false,
  },
  {
    key: 'pro',
    name: 'Plus',
    price: '$19',
    period: '/month',
    credits: '1000 credits',
    description: 'Built for heavy weekly workflows across multiple skills.',
    cta: 'Choose Plus',
    featured: true,
  },
] as const

const payrexCreditPacks = [
  {
    key: 'php_400',
    name: '400 Credits',
    price: '₱400',
    credits: '400 credits',
    description: 'A simple one-time credit top-up for sermon prep and writing workflows.',
    featured: false,
  },
  {
    key: 'php_800',
    name: '1000 Credits',
    price: '₱800',
    credits: '1000 credits',
    description: 'Best value for regular weekly use across YouPastor skills.',
    featured: true,
  },
] as const

function extractCountry(location?: string): string {
  if (!location) return ''
  const parts = location.split(',')
  return (parts[parts.length - 1] ?? '').trim()
}

const profileCountry = computed(() => extractCountry(profileResult.value?.location))
const isPhilippinesUser = computed(() => profileCountry.value.toLowerCase() === 'philippines')

function isElectronRuntime(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)
}

async function openCheckoutUrl(url: string) {
  if (window.appLinks?.openExternal) {
    const ok = await window.appLinks.openExternal(url)
    if (ok) return
  }

  const legacyIpc = (window as any).ipcRenderer
  if (legacyIpc?.invoke) {
    const ok = await legacyIpc.invoke('external:open', url)
    if (ok) return
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer')
  if (popup) {
    popup.opener = null
    return
  }

  if (isElectronRuntime()) {
    return
  }

  throw new Error('Your browser blocked the checkout popup. Please allow popups and try again.')
}

function getPlanCta(planKey: string): string {
  if (planKey === normalizedCurrentPlan.value) return 'Current'
  if (planKey === 'free') return 'Downgrade to Free'
  if (planKey === 'starter') return 'Choose Starter'
  return 'Choose Plus'
}

function isPlanActionDisabled(planKey: string): boolean {
  if (checkoutLoading.value || payrexCheckoutLoading.value || loadingPlan.value === planKey) return true
  if (planKey === normalizedCurrentPlan.value) return true
  if (planKey === 'free') return true
  return false
}

async function handleChoosePlan(planKey: string) {
  if (planKey !== 'starter' && planKey !== 'pro') return

  checkoutError.value = null
  loadingPlan.value = planKey

  try {
    const result: any = await createCheckout({ tier: planKey })
    if (!result?.checkoutUrl) {
      throw new Error('Checkout URL was not returned.')
    }

    posthog.capture('subscription_checkout_started', { plan: planKey })
    await openCheckoutUrl(result.checkoutUrl)
  } catch (err: any) {
    checkoutError.value = err?.message || checkoutActionError.value?.message || 'Unable to start checkout.'
  } finally {
    loadingPlan.value = null
  }
}

function isCreditPackActionDisabled(packKey: string): boolean {
  return payrexCheckoutLoading.value || checkoutLoading.value || loadingCreditPack.value === packKey
}

async function handleBuyCreditPack(packKey: 'php_400' | 'php_800') {
  checkoutError.value = null
  loadingCreditPack.value = packKey

  try {
    const result: any = await createPayrexCheckout({ pack: packKey })
    if (!result?.checkoutUrl) {
      throw new Error('Checkout URL was not returned.')
    }

    posthog.capture('credit_pack_checkout_started', { pack: packKey })
    await openCheckoutUrl(result.checkoutUrl)
  } catch (err: any) {
    checkoutError.value = err?.message || payrexCheckoutActionError.value?.message || 'Unable to start PayRex checkout.'
  } finally {
    loadingCreditPack.value = null
  }
}

// Voucher redemption
const voucherCode = ref('')
const redeemSuccess = ref<string | null>(null)
const redeemError = ref<string | null>(null)
const { mutate: redeem, isLoading: isRedeeming, error: redeemErrorRef } = useConvexMutation('billing/mutations:redeemVoucher' as any)

async function handleRedeemVoucher() {
  const code = voucherCode.value.trim().toUpperCase()
  if (!code) {
    redeemError.value = 'Voucher code is required'
    return
  }

  redeemSuccess.value = null
  redeemError.value = null

  const res: any = await redeem({ code })
  if (res?.success) {
    redeemSuccess.value = `Successfully redeemed voucher. +${res.creditsAdded} credits have been added to your balance!`
    posthog.capture('voucher_redeemed', { credits_added: res.creditsAdded })
    voucherCode.value = ''
  } else {
    redeemError.value = res?.message || redeemErrorRef.value?.message || 'Invalid voucher code or already redeemed.'
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
    <div class="rounded-2xl border bg-card p-6 md:p-7">
      <div class="flex items-center gap-3">
        <Zap class="h-6 w-6 text-primary" />
        <h2 class="text-2xl font-semibold tracking-tight">Subscription</h2>
      </div>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ isPhilippinesUser ? 'Buy credits as a one-time purchase for your sermon workflow.' : 'Pick a plan that fits your weekly sermon workflow. Credits refill every billing cycle.' }}
      </p>
      <div class="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <span class="text-xs text-muted-foreground">Current credits</span>
        <span class="text-sm font-semibold text-foreground">{{ creditBalance }}</span>
        <span class="text-xs text-muted-foreground">• {{ currentPlan }}</span>
      </div>

      <div v-if="checkoutStatus === 'success'" class="mt-4 rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        Checkout successful. Your subscription update is being synced.
      </div>
      <div v-else-if="checkoutStatus === 'cancel'" class="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        Checkout was canceled. You can upgrade anytime.
      </div>
      <div v-else-if="checkoutError" class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ checkoutError }}
      </div>
    </div>

    <div v-if="profileLoading" class="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
      Loading payment options...
    </div>

    <div v-else-if="isPhilippinesUser" class="grid gap-4 md:grid-cols-2">
      <div
        v-for="pack in payrexCreditPacks"
        :key="pack.key"
        :class="[
          'rounded-xl border bg-card p-5 space-y-4',
          pack.featured ? 'border-primary shadow-sm ring-1 ring-primary/20' : 'border-border',
        ]"
      >
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-foreground">{{ pack.name }}</p>
            <span v-if="pack.featured" class="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Best Value</span>
          </div>
          <p class="text-2xl font-semibold text-foreground">{{ pack.price }}</p>
          <p class="text-sm text-muted-foreground">{{ pack.credits }}</p>
        </div>

        <p class="text-sm text-muted-foreground">{{ pack.description }}</p>

        <ul class="space-y-2 text-sm text-foreground">
          <li class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald-600" />
            One-time credit purchase
          </li>
          <li class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald-600" />
            Credits are added after manual payment confirmation
          </li>
        </ul>

        <button
          @click="handleBuyCreditPack(pack.key)"
          :disabled="isCreditPackActionDisabled(pack.key)"
          :class="[
            'w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            pack.featured
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border text-foreground hover:bg-muted',
          ]"
        >
          {{ loadingCreditPack === pack.key ? 'Opening checkout...' : 'Buy credits' }}
        </button>
      </div>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-3">
      <div
        v-for="plan in plans"
        :key="plan.key"
        :class="[
          'rounded-xl border bg-card p-5 space-y-4',
          plan.featured ? 'border-primary shadow-sm ring-1 ring-primary/20' : 'border-border',
        ]"
      >
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-foreground">{{ plan.name }}</p>
            <span v-if="plan.featured" class="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Most Popular</span>
          </div>
          <p class="text-2xl font-semibold text-foreground">
            {{ plan.price }}
            <span class="text-sm font-normal text-muted-foreground">{{ plan.period }}</span>
          </p>
          <p class="text-sm text-muted-foreground">{{ plan.credits }}</p>
        </div>

        <p class="text-sm text-muted-foreground">{{ plan.description }}</p>

        <ul class="space-y-2 text-sm text-foreground">
          <li class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald-600" />
            Monthly recurring subscription
          </li>
          <li class="flex items-center gap-2">
            <Check class="h-4 w-4 text-emerald-600" />
            Credits refill every billing cycle
          </li>
        </ul>

        <button
          @click="handleChoosePlan(plan.key)"
          :disabled="isPlanActionDisabled(plan.key)"
          :class="[
            'w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            plan.featured
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border text-foreground hover:bg-muted',
          ]"
        >
          {{ loadingPlan === plan.key ? 'Opening checkout...' : getPlanCta(plan.key) }}
        </button>
      </div>
    </div>

    <!-- Redeem Voucher Section -->
    <div class="rounded-2xl border bg-card p-6 md:p-7 shadow-sm">
      <div class="flex items-center gap-3">
        <Ticket class="h-6 w-6 text-primary" />
        <h3 class="text-lg font-semibold tracking-tight text-foreground">Redeem Voucher</h3>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">Have a promotional voucher code? Enter it below to add credits to your account immediately.</p>
      
      <div class="mt-4 max-w-md space-y-3">
        <div class="flex gap-2">
          <input
            v-model="voucherCode"
            @keydown.enter.prevent="handleRedeemVoucher"
            type="text"
            placeholder="e.g. PASTOR24"
            class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring uppercase font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal"
          />
          <button
            @click="handleRedeemVoucher"
            :disabled="isRedeeming || !voucherCode.trim()"
            class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {{ isRedeeming ? 'Applying...' : 'Apply' }}
          </button>
        </div>

        <p v-if="redeemSuccess" class="text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 font-medium">
          {{ redeemSuccess }}
        </p>
        <p v-if="redeemError" class="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 font-medium">
          {{ redeemError }}
        </p>
      </div>
    </div>

    <p class="text-xs text-muted-foreground text-center">
      Secure checkout powered by {{ isPhilippinesUser ? 'PayRex' : 'LemonSqueezy' }}.
    </p>
  </div>
</template>
