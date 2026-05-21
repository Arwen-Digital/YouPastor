<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, CreditCard, Home, Zap } from 'lucide-vue-next'
import { useConvexQuery } from '@/composables/useConvexQuery'

const router = useRouter()
const { result: billingResult } = useConvexQuery('billing/queries:getMyPlanAndCredits' as any)

const planLabel = computed(() => {
  const plan = billingResult.value?.planTier ?? 'free'
  if (plan === 'pro') return 'Plus'
  if (plan === 'starter') return 'Starter'
  return 'Free'
})

const creditBalance = computed(() => billingResult.value?.creditBalance ?? 0)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 md:px-6 py-12">
    <div class="rounded-2xl border bg-card p-7 md:p-9 text-center space-y-6">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 class="h-8 w-8" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Thank you for subscribing
        </h1>
        <p class="text-sm md:text-base text-muted-foreground">
          Your payment was successful. Your YouPastor subscription is being synced and your credits are ready to use.
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 text-left">
        <div class="rounded-xl border bg-background p-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard class="h-4 w-4" />
            Current plan
          </div>
          <p class="mt-2 text-lg font-semibold text-foreground">{{ planLabel }}</p>
        </div>

        <div class="rounded-xl border bg-background p-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap class="h-4 w-4" />
            Current credits
          </div>
          <p class="mt-2 text-lg font-semibold text-foreground">{{ creditBalance }}</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-center gap-3">
        <button
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          @click="router.push('/')"
        >
          <Home class="h-4 w-4" />
          Go to Dashboard
        </button>
        <button
          class="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          @click="router.push('/upgrade')"
        >
          View Subscription
        </button>
      </div>
    </div>
  </div>
</template>
