<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BookOpen, FileText, Layers, Loader2 } from 'lucide-vue-next'
import { useConvexQuery } from '@/composables/useConvexQuery'

const route = useRoute()
const router = useRouter()

const action = computed(() => route.params.action as 'create' | 'edit')
const mode = computed(() => route.params.mode as 'series' | 'standalone' | 'sermon')
const seriesId = computed(() => route.params.seriesId as string | undefined)
const sermonId = computed(() => mode.value === 'sermon' ? seriesId.value : undefined)

const { result: seriesList, isLoading: seriesLoading } = useConvexQuery('series/queries:listMine' as any)
const { result: selectedSermon, isLoading: sermonLoading } = useConvexQuery(
  'sermons/queries:getById' as any,
  { sermonId: sermonId.value }
)
const selectedSeries = computed(() => {
  if (mode.value !== 'series' || !seriesId.value) return null
  return (seriesList.value ?? []).find((series: any) => series._id === seriesId.value) ?? null
})

const actionLabel = computed(() => action.value === 'edit' ? 'Edit Sermon' : 'Create Sermon')
const modeLabel = computed(() => {
  if (mode.value === 'series') return 'Series Message'
  if (mode.value === 'sermon') return 'Saved Sermon'
  return 'Standalone Message'
})
const pageTitle = computed(() => `${actionLabel.value} — ${modeLabel.value}`)
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <button
        @click="router.push('/sermons')"
        class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to Sermons
      </button>

      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div class="flex items-start gap-4">
          <div class="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen class="h-6 w-6 text-primary" />
          </div>
          <div class="space-y-1 min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ pageTitle }}</h1>
            <p class="text-sm text-muted-foreground">
              This is the next step placeholder. The next instruction can define the sermon creation/editing workflow from here.
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText class="h-3.5 w-3.5" />
              Action
            </div>
            <div class="text-sm font-medium text-foreground capitalize">{{ action }}</div>
          </div>

          <div class="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Layers class="h-3.5 w-3.5" />
              Message Type
            </div>
            <div class="text-sm font-medium text-foreground">{{ modeLabel }}</div>
          </div>
        </div>

        <div v-if="mode === 'series'" class="rounded-xl border border-border bg-background p-4 space-y-2">
          <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Layers class="h-3.5 w-3.5" />
            Selected Series
          </div>

          <div v-if="seriesLoading" class="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            Loading selected series...
          </div>

          <div v-else-if="selectedSeries" class="space-y-1">
            <div class="text-base font-semibold text-foreground">{{ selectedSeries.title }}</div>
            <p v-if="selectedSeries.tagline" class="text-sm text-muted-foreground">{{ selectedSeries.tagline }}</p>
            <p v-if="selectedSeries.description" class="text-xs text-muted-foreground">{{ selectedSeries.description }}</p>
          </div>

          <div v-else class="text-sm text-muted-foreground">
            Selected series could not be found.
          </div>
        </div>

        <div v-else-if="mode === 'sermon'" class="rounded-xl border border-border bg-background p-4 space-y-2">
          <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileText class="h-3.5 w-3.5" />
            Selected Sermon
          </div>

          <div v-if="sermonLoading" class="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            Loading selected sermon...
          </div>

          <div v-else-if="selectedSermon" class="space-y-1">
            <div class="text-base font-semibold text-foreground">{{ selectedSermon.title || 'Untitled sermon' }}</div>
            <p v-if="selectedSermon.scriptureRef" class="text-sm text-muted-foreground">{{ selectedSermon.scriptureRef }}</p>
            <p v-if="selectedSermon.content" class="text-xs text-muted-foreground line-clamp-3">{{ selectedSermon.content }}</p>
          </div>

          <div v-else class="text-sm text-muted-foreground">
            Selected sermon could not be found.
          </div>
        </div>

        <div v-else class="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
          This sermon will be treated as a standalone message, not linked to a sermon series.
        </div>
      </div>
    </div>
  </div>
</template>
