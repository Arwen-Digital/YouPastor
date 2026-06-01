<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Layers, Loader2 } from 'lucide-vue-next'
import { useConvexMutation } from '@/composables/useConvexMutation'

const router = useRouter()
const title = ref('')
const tagline = ref('')
const error = ref('')

const { mutate: createSeries, isLoading } = useConvexMutation('series/mutations:create' as any)

async function handleCreateSeries() {
  error.value = ''
  const cleanTitle = title.value.trim()
  const cleanTagline = tagline.value.trim()

  if (!cleanTitle) {
    error.value = 'Series title is required.'
    return
  }

  const seriesId = await createSeries({
    title: cleanTitle,
    tagline: cleanTagline || undefined,
    status: 'draft',
  } as any)

  if (!seriesId) {
    error.value = 'Could not create series. Please try again.'
    return
  }

  router.push(`/sermons/create/series/${seriesId}`)
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-muted/10">
    <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <button
        @click="router.push('/sermons')"
        class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to Create Sermons
      </button>

      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Layers class="h-3.5 w-3.5" />
            Quick Series Creator
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Create a new series</h1>
          <p class="text-sm text-muted-foreground">Create a basic series record using just title and tagline.</p>
        </div>

        <div class="space-y-3">
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Series title</label>
            <input
              v-model="title"
              type="text"
              placeholder="e.g. Hope in Hard Times"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">Tagline</label>
            <input
              v-model="tagline"
              type="text"
              placeholder="e.g. Finding God’s faithfulness in every season"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <button
          @click="handleCreateSeries"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
          {{ isLoading ? 'Creating...' : 'Create Series' }}
        </button>
      </div>
    </div>
  </div>
</template>
