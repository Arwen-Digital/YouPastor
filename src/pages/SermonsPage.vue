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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-muted/10">
    <div class="max-w-5xl mx-auto px-6 py-10 space-y-10">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-2">
            <BookOpen class="h-3.5 w-3.5" />
            Create Sermons
          </div>
          <h1 class="text-3xl font-semibold tracking-tight text-foreground">Sermons</h1>
          <p class="text-sm text-muted-foreground">
            Start a new message or continue working on a recent one.
          </p>
        </div>
        <button
          @click="goStandalone('create')"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus class="h-4 w-4" />
          New Standalone Sermon
        </button>
      </div>

      <div class="grid gap-8 md:grid-cols-12">
        <!-- Left Column: Series -->
        <div class="md:col-span-7 space-y-4">
          <h2 class="text-lg font-medium text-foreground flex items-center gap-2">
            <Layers class="h-5 w-5 text-muted-foreground" />
            Create from Series
          </h2>

          <div class="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div v-if="seriesLoading" class="p-8 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 class="h-6 w-6 animate-spin" />
              <span class="text-sm">Loading series...</span>
            </div>

            <div v-else-if="seriesError" class="p-6 text-sm text-destructive bg-destructive/5 text-center">
              Could not load series. Please try again.
            </div>

            <div v-else-if="orderedSeries.length" class="divide-y divide-border/50">
              <button
                v-for="series in orderedSeries"
                :key="series._id"
                @click="goSeries('create', series._id)"
                class="w-full group flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div class="flex-1 min-w-0 pr-4">
                  <div class="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {{ series.title }}
                  </div>
                  <div class="text-xs text-muted-foreground truncate mt-0.5">
                    {{ series.tagline || series.description || `Created ${formatDate(series.createdAt)}` }}
                  </div>
                </div>
                <div class="shrink-0 h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChevronRight class="h-4 w-4 text-primary" />
                </div>
              </button>
            </div>

            <div v-else class="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
              <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Layers class="h-5 w-5 text-muted-foreground/60" />
              </div>
              No sermon series found yet.<br/>Create a series from the Series Planner first.
            </div>
          </div>
        </div>

        <!-- Right Column: Recent Sermons -->
        <div class="md:col-span-5 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-foreground flex items-center gap-2">
              <FileText class="h-5 w-5 text-muted-foreground" />
              Recent Sermons
            </h2>
            <button
              @click="goToNotebookSermons"
              class="text-xs font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>

          <div class="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div v-if="recentSermonsLoading" class="p-8 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 class="h-6 w-6 animate-spin" />
              <span class="text-sm">Loading sermons...</span>
            </div>

            <div v-else-if="recentSermonsError" class="p-6 text-sm text-destructive bg-destructive/5 text-center">
              Could not load sermons. Please try again.
            </div>

            <div v-else-if="recentSermons?.length" class="divide-y divide-border/50">
              <button
                v-for="sermon in recentSermons"
                :key="sermon._id"
                @click="goEditSermon(sermon._id)"
                class="w-full group flex items-start p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div class="mt-0.5 h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mr-3">
                  <Edit3 class="h-4 w-4 text-amber-600" />
                </div>
                <div class="flex-1 min-w-0 pr-2">
                  <div class="text-sm font-medium text-foreground truncate group-hover:text-amber-600 transition-colors">
                    {{ sermon.title || 'Untitled sermon' }}
                  </div>
                  <p v-if="sermon.content" class="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {{ stripHtml(sermon.content).slice(0, 100) }}
                  </p>
                  <div class="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-muted-foreground">
                    <span>{{ formatDate(sermon.createdAt) }}</span>
                    <span v-if="sermon.scriptureRef" class="w-1 h-1 rounded-full bg-border"></span>
                    <span v-if="sermon.scriptureRef" class="truncate">{{ sermon.scriptureRef }}</span>
                  </div>
                </div>
              </button>
            </div>

            <div v-else class="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
               <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText class="h-5 w-5 text-muted-foreground/60" />
              </div>
              No saved sermons yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
