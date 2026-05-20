<script setup lang="ts">
import { computed } from 'vue'
import { Check, Zap } from 'lucide-vue-next'
import { useConvexQuery } from '@/composables/useConvexQuery'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { result: balanceResult } = useConvexQuery('credits/queries:getMyBalance' as any)

const creditBalance = computed(() => balanceResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)

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
    name: 'Pro',
    price: '$19',
    period: '/month',
    credits: '1000 credits',
    description: 'Best for heavy weekly workflows across multiple skills.',
    cta: 'Choose Pro',
    featured: true,
  },
] as const

function handleChoosePlan(planKey: string) {
  // LemonSqueezy checkout wiring will be added next.
  console.log('[Upgrade] choose plan:', planKey)
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-8 space-y-6">
    <div class="rounded-2xl border bg-card p-6 md:p-7">
      <div class="flex items-center gap-3">
        <Zap class="h-6 w-6 text-primary" />
        <h2 class="text-2xl font-semibold tracking-tight">Subscription</h2>
      </div>
      <p class="mt-2 text-sm text-muted-foreground">Pick a plan that fits your weekly sermon workflow. Credits refill every billing cycle.</p>
      <div class="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <span class="text-xs text-muted-foreground">Current credits</span>
        <span class="text-sm font-semibold text-foreground">{{ creditBalance }}</span>
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
          :class="[
            'w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            plan.featured
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border text-foreground hover:bg-muted',
          ]"
        >
          {{ plan.cta }}
        </button>
      </div>
    </div>

    <p class="text-xs text-muted-foreground text-center">
      Secure checkout powered by LemonSqueezy (integration wiring next).
    </p>
  </div>
</template>
