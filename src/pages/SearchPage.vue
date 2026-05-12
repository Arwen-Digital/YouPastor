<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search } from 'lucide-vue-next'

const route = useRoute()
const query = ref((route.query.q as string) || '')

watch(() => route.query.q, (newQuery) => {
  if (newQuery) query.value = newQuery as string
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 space-y-6">
    <h2 class="text-xl font-semibold tracking-tight">Search</h2>
    <div class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <Search class="h-5 w-5 text-muted-foreground" />
      <input
        v-model="query"
        type="text"
        placeholder="Search sermons, communications, and more..."
        class="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
      />
    </div>
    <div v-if="!query" class="text-center text-muted-foreground text-sm py-12">
      Type something above to search your content.
    </div>
    <div v-else class="text-center text-muted-foreground text-sm py-12">
      Searching for "{{ query }}"... <br />
      <span class="text-xs">(Search functionality coming soon)</span>
    </div>
  </div>
</template>
