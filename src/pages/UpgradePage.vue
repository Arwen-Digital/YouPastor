<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Check, Zap } from 'lucide-vue-next'
import { useConvexQuery } from '@/composables/useConvexQuery'
import { useConvexAction } from '@/composables/useConvexAction'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const { result: billingResult } = useConvexQuery('billing/queries:getMyPlanAndCredits' as any)
const { run: createCheckout, isLoading: checkoutLoading, error: checkoutActionError } = useConvexAction('billing/actions:createCheckout' as any)

const creditBalance = computed(() => billingResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)
const currentPlan = computed(() => billingResult.value?.planTier ?? 'free')
const loadingPlan = ref<'starter' | 'pro' | null>(null)
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

function isElectronRuntime(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)
}

async function openCheckoutUrl(url: string) {
  if (window.appLinks?.openExternal) {
    const ok = await window.appLinks.openExternal(url)
    if (ok) return
    throw new Error('Could not open your browser from the desktop app.')
  }

  if (isElectronRuntime()) {
    throw new Error('Desktop bridge unavailable. Please restart the app and try again.')
  }

  window.open(url, '_blank', 'noopener,noreferrer')
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

    await openCheckoutUrl(result.checkoutUrl)
  } catch (err: any) {
    checkoutError.value = err?.message || checkoutActionError.value?.message || 'Unable to start checkout.'
  } finally {
    loadingPlan.value = null
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
      <p class="mt-2 text-sm text-muted-foreground">Pick a plan that fits your weekly sermon workflow. Credits refill every billing cycle.</p>
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

    <div class="grid gap-4 md:grid-cols-3">
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
          :disabled="plan.key === 'free' || checkoutLoading || loadingPlan === plan.key"
          :class="[
            'w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            plan.featured
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border text-foreground hover:bg-muted',
          ]"
        >
          {{ loadingPlan === plan.key ? 'Opening checkout...' : plan.cta }}
        </button>
      </div>
    </div>

    <p class="text-xs text-muted-foreground text-center">
      Secure checkout powered by LemonSqueezy.
    </p>
  </div>
</template>
