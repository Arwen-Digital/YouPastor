<script setup lang="ts">
import { onMounted } from 'vue'
import { CheckCircle, ArrowLeft, Home } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import posthog from 'posthog-js'

const router = useRouter()

onMounted(() => {
  posthog.capture('credit_pack_order_placed')
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 md:px-6 py-12">
    <div class="rounded-2xl border bg-card p-6 md:p-8 text-center shadow-sm">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle class="h-7 w-7 text-emerald-600" />
      </div>

      <h1 class="mt-5 text-2xl font-semibold tracking-tight text-foreground">We’re confirming your payment</h1>
      <p class="mt-3 text-sm leading-6 text-muted-foreground">
        Thanks for your purchase. PayRex is processing the payment confirmation, and your credits will be added manually very soon.
      </p>
      <p class="mt-3 text-sm leading-6 text-muted-foreground">
        If your credits do not appear after confirmation, please contact support and include the email address on your YouPastor account.
      </p>

      <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          @click="router.push('/upgrade')"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to Subscription
        </button>
        <button
          @click="router.push('/')"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Home class="h-4 w-4" />
          Go to Dashboard
        </button>
      </div>
    </div>
  </div>
</template>
