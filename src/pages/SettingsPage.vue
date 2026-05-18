<script setup lang="ts">
import { computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useConvexQuery } from '@/composables/useConvexQuery'

const auth = useAuthStore()
const { result: balanceResult } = useConvexQuery('credits/queries:getMyBalance' as any)
const { result: ledger } = useConvexQuery('credits/queries:listMyLedger' as any)
const { result: usage } = useConvexQuery('credits/queries:listMyAiUsage' as any)

const creditBalance = computed(() => balanceResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)

function formatDate(ts?: number) {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 space-y-6">
    <div class="flex items-center gap-3">
      <Settings class="h-6 w-6 text-muted-foreground" />
      <h2 class="text-xl font-semibold tracking-tight">Settings</h2>
    </div>

    <div class="rounded-xl border bg-card p-5">
      <p class="text-sm text-muted-foreground">Current Credits</p>
      <p class="mt-1 text-3xl font-semibold">{{ creditBalance }}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border bg-card p-5">
        <h3 class="text-sm font-semibold mb-3">Recent Credit Ledger</h3>
        <div v-if="ledger?.length" class="space-y-2 text-sm">
          <div v-for="entry in ledger" :key="entry._id" class="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
            <div>
              <p class="font-medium">{{ entry.reason }}</p>
              <p class="text-xs text-muted-foreground">{{ formatDate(entry.createdAt) }}</p>
            </div>
            <p :class="entry.amount < 0 ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'">{{ entry.amount }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">No ledger entries yet.</p>
      </div>

      <div class="rounded-xl border bg-card p-5">
        <h3 class="text-sm font-semibold mb-3">Recent AI Usage (Cost)</h3>
        <div v-if="usage?.length" class="space-y-2 text-sm">
          <div v-for="entry in usage" :key="entry._id" class="border-b border-border/50 pb-2">
            <p class="font-medium">{{ entry.operation }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDate(entry.createdAt) }} • {{ entry.model }}</p>
            <p class="text-xs mt-1">Cost: ${{ (entry.providerCostUsdMicros / 1_000_000).toFixed(6) }} • Credits: {{ entry.creditsCharged }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">No AI usage yet.</p>
      </div>
    </div>
  </div>
</template>
