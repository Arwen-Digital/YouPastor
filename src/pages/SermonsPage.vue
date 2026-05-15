<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, Edit3, Layers, Loader2, Plus, FileText, ChevronRight } from 'lucide-vue-next'
import { useConvexQuery } from '@/composables/useConvexQuery'

const router = useRouter()
const { result: seriesList, isLoading: seriesLoading, error: seriesError } = useConvexQuery('series/queries:listMine' as any)
const { result: recentSermons, isLoading: recentSermonsLoading, error: recentSermonsError } = useConvexQuery(
  'sermons/queries:listRecent' as any,
  { limit: 5 }
)

const orderedSeries = computed(() => seriesList.value ?? [])

type SermonAction = 'create' | 'edit'

function goStandalone(action: SermonAction) {
  router.push(`/sermons/${action}/standalone`)
}

function goSeries(action: SermonAction, seriesId: string) {
  router.push(`/sermons/${action}/series/${seriesId}`)
}

function goEditSermon(sermonId: string) {
  router.push(`/sermons/edit/sermon/${sermonId}`)
}

function goToNotebookSermons() {
  router.push({ path: '/notebook', query: { tab: 'prep', filter: 'sermon' } })
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'No date'
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BookOpen class="h-3.5 w-3.5" />
          Sermons
        </div>
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">Sermons</h1>
        <p class="text-sm text-muted-foreground max-w-2xl">
          Create a new sermon or edit an existing one. Start by choosing whether this message belongs to a series or stands alone.
        </p>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Create sermon -->
        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plus class="h-5 w-5 text-primary" />
            </div>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-foreground">Create a sermon</h2>
              <p class="text-sm text-muted-foreground">Start a new sermon draft from a series or as a standalone message.</p>
            </div>
          </div>

          <button
            @click="goStandalone('create')"
            class="group w-full rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
          >
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText class="h-4 w-4 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-foreground">Standalone message</div>
                <div class="text-xs text-muted-foreground">Create a sermon that is not linked to a series.</div>
              </div>
              <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </button>

          <div class="space-y-2">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Layers class="h-3.5 w-3.5" />
              Choose a series
            </div>

            <div v-if="seriesLoading" class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 class="h-4 w-4 animate-spin" />
              Loading series...
            </div>

            <div v-else-if="seriesError" class="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-3 text-sm text-destructive">
              Could not load series. Please try again.
            </div>

            <div v-else-if="orderedSeries.length" class="space-y-2">
              <button
                v-for="series in orderedSeries"
                :key="series._id"
                @click="goSeries('create', series._id)"
                class="group w-full rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
              >
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-foreground truncate">{{ series.title }}</div>
                    <div class="text-xs text-muted-foreground truncate">
                      {{ series.tagline || series.description || `Created ${formatDate(series.createdAt)}` }}
                    </div>
                  </div>
                  <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </button>
            </div>

            <div v-else class="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              No sermon series found yet. Use standalone for now, or create a series from Series Planner.
            </div>
          </div>
        </section>

        <!-- Edit sermon -->
        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Edit3 class="h-5 w-5 text-amber-600" />
            </div>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-foreground">Edit a sermon</h2>
              <p class="text-sm text-muted-foreground">Open one of your latest sermon drafts.</p>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText class="h-3.5 w-3.5" />
              Latest sermons
            </div>

            <div v-if="recentSermonsLoading" class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 class="h-4 w-4 animate-spin" />
              Loading latest sermons...
            </div>

            <div v-else-if="recentSermonsError" class="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-3 text-sm text-destructive">
              Could not load sermons. Please try again.
            </div>

            <div v-else-if="recentSermons?.length" class="space-y-2">
              <button
                v-for="sermon in recentSermons"
                :key="sermon._id"
                @click="goEditSermon(sermon._id)"
                class="group w-full rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-amber-300/60 hover:bg-amber-500/5"
              >
                <div class="flex items-start gap-3">
                  <div class="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText class="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-foreground truncate">{{ sermon.title || 'Untitled sermon' }}</div>
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span v-if="sermon.scriptureRef">{{ sermon.scriptureRef }}</span>
                      <span v-if="sermon.scriptureRef">•</span>
                      <span>{{ formatDate(sermon.createdAt) }}</span>
                    </div>
                    <p v-if="sermon.content" class="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {{ sermon.content.slice(0, 140) }}{{ sermon.content.length > 140 ? '...' : '' }}
                    </p>
                  </div>
                  <ChevronRight class="mt-2 h-4 w-4 text-muted-foreground group-hover:text-amber-600" />
                </div>
              </button>
            </div>

            <div v-else class="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              No saved sermons found yet. Create your first sermon to begin building your sermon library.
            </div>
          </div>

          <button
            @click="goToNotebookSermons"
            class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            View all sermons in Notebook Prep
            <ChevronRight class="h-4 w-4" />
          </button>
        </section>
      </div>
    </div>
  </div>
</template>
