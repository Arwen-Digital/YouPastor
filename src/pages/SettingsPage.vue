<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useConvexQuery } from '@/composables/useConvexQuery'

const router = useRouter()
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

    <div class="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <p class="text-sm text-muted-foreground">Current Credits</p>
        <p class="mt-1 text-3xl font-semibold">{{ creditBalance }}</p>
      </div>
      <button
        @click="router.push('/upgrade')"
        class="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Manage credits & upgrade
      </button>
    </div>
  </div>
</template>
