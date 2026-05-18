<script setup lang="ts">
import { computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useConvexQuery } from '@/composables/useConvexQuery'

const auth = useAuthStore()
const { result: balanceResult } = useConvexQuery('credits/queries:getMyBalance' as any)

const creditBalance = computed(() => balanceResult.value?.creditBalance ?? auth.user?.creditBalance ?? 0)
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
  </div>
</template>
