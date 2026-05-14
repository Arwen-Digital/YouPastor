<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getConvexClient } from '@/lib/convex'
import { marked } from 'marked'
import { BookOpen, ArrowLeft, ChevronRight, Trash2, Loader2, Search } from 'lucide-vue-next'

marked.setOptions({ breaks: true, gfm: true })

const router = useRouter()
const route = useRoute()

// Which view: 'list', 'series', 'research'
const view = computed(() => {
  if (!route.params.id && !route.params.researchId) return 'list'
  if (route.params.researchId) return 'research'
  if (route.params.id) return 'series'
  return 'list'
})

const selectedSeriesId = computed(() => route.params.id as string | undefined)
const selectedResearchId = computed(() => route.params.researchId as string | undefined)

// ── Series list ──
const seriesList = ref<any[]>([])
const listLoading = ref(true)
let listUnsub: (() => void) | null = null

// ── Research notes list ──
const researchList = ref<any[]>([])
let researchListUnsub: (() => void) | null = null

// ── Series detail ──
const seriesDetail = ref<any>(null)
const detailLoading = ref(false)
let detailUnsub: (() => void) | null = null

// ── Research detail ──
const researchDetail = ref<any>(null)
const researchDetailLoading = ref(false)
let researchDetailUnsub: (() => void) | null = null

// ── Active tab for list view ──
const activeTab = ref<'series' | 'research'>('series')

// ── Deleting ──
const deletingId = ref<string | null>(null)

onMounted(async () => {
  try {
    const client = getConvexClient()
    listUnsub = client.onUpdate('series/queries:listMine' as any, {}, (data: any) => {
      seriesList.value = data ?? []
      listLoading.value = false
    })
    researchListUnsub = client.onUpdate('research/queries:listMine' as any, {}, (data: any) => {
      researchList.value = data ?? []
    })
  } catch (err) {
    console.error('Failed to load notebook:', err)
    listLoading.value = false
  }
})

onUnmounted(() => {
  listUnsub?.()
  researchListUnsub?.()
  detailUnsub?.()
  researchDetailUnsub?.()
})

// Watch series ID
watch(selectedSeriesId, async (newId) => {
  if (detailUnsub) { detailUnsub(); detailUnsub = null }
  seriesDetail.value = null
  if (!newId) return
  detailLoading.value = true
  try {
    const client = getConvexClient()
    detailUnsub = client.onUpdate('series/queries:getWithWeeks' as any, { seriesId: newId }, (data: any) => {
      seriesDetail.value = data
      detailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load series:', err)
    detailLoading.value = false
  }
}, { immediate: true })

// Watch research ID
watch(selectedResearchId, async (newId) => {
  if (researchDetailUnsub) { researchDetailUnsub(); researchDetailUnsub = null }
  researchDetail.value = null
  if (!newId) return
  researchDetailLoading.value = true
  try {
    const client = getConvexClient()
    researchDetailUnsub = client.onUpdate('research/queries:getById' as any, { noteId: newId }, (data: any) => {
      researchDetail.value = data
      researchDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load research note:', err)
    researchDetailLoading.value = false
  }
}, { immediate: true })

async function handleDelete(type: 'series' | 'research', id: string) {
  if (!confirm('Delete this item? This cannot be undone.')) return
  deletingId.value = id
  try {
    const client = getConvexClient()
    if (type === 'series') {
      await client.mutation('series/mutations:remove' as any, { seriesId: id })
      if (selectedSeriesId.value === id) router.push('/notebook')
    } else {
      await client.mutation('research/mutations:remove' as any, { noteId: id })
      if (selectedResearchId.value === id) router.push('/notebook')
    }
  } catch (err) {
    console.error('Delete failed:', err)
  }
  deletingId.value = null
}

function formatDate(ts: number | undefined): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getStatusColor(status: string | undefined): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700'
    case 'completed': return 'bg-blue-100 text-blue-700'
    case 'planned': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'active': return 'Active'
    case 'completed': return 'Completed'
    case 'planned': return 'Planned'
    default: return 'Draft'
  }
}

// Combined list for ordering by date
const combinedList = computed(() => {
  const items = [
    ...seriesList.value.map(s => ({ type: 'series' as const, id: s._id, title: s.title, subtitle: s.tagline || '', date: s.createdAt || 0, status: s.status || 'draft' })),
    ...researchList.value.map(r => ({ type: 'research' as const, id: r._id, title: r.scriptureRef, subtitle: r.topicOrAngle || '', date: r.createdAt || 0, status: r.status || 'draft' })),
  ]
  return items.sort((a, b) => b.date - a.date)
})

const filteredList = computed(() => {
  if (activeTab.value === 'series') return combinedList.value.filter(i => i.type === 'series')
  return combinedList.value.filter(i => i.type === 'research')
})
</script>

<template>
  <div class="flex flex-col h-[calc(100vh)]">
    <!-- Header -->
    <div class="border-b px-6 py-4 bg-background shrink-0">
      <div class="max-w-4xl mx-auto flex items-center gap-3">
        <button
          v-if="view !== 'list'"
          @click="router.push('/notebook')"
          class="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ArrowLeft class="h-4 w-4" />
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-lg font-semibold text-foreground">Notebook</h1>
          <p class="text-xs text-muted-foreground">
            <template v-if="view === 'series'">Series details</template>
            <template v-else-if="view === 'research'">Research note</template>
            <template v-else>Your saved series plans &amp; research</template>
          </p>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-if="view === 'list'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <!-- Tabs -->
        <div class="flex items-center gap-1 rounded-lg bg-muted p-1 mb-6 w-fit">
          <button
            @click="activeTab = 'series'"
            :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-all', activeTab === 'series' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          >
            Series Plans
          </button>
          <button
            @click="activeTab = 'research'"
            :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-all', activeTab === 'research' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          >
            Research Notes
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="!listLoading && filteredList.length === 0" class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen v-if="activeTab === 'series'" class="h-8 w-8 text-muted-foreground" />
            <Search v-else class="h-8 w-8 text-muted-foreground" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">
              {{ activeTab === 'series' ? 'No series plans yet' : 'No research notes yet' }}
            </h3>
            <p class="text-sm text-muted-foreground max-w-sm">
              {{ activeTab === 'series' ? 'When you save a series plan from the Series Planner, it will appear here.' : 'When you save research from the Sermon Research tool, it will appear here.' }}
            </p>
          </div>
          <button
            @click="router.push(activeTab === 'series' ? '/series' : '/research')"
            class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {{ activeTab === 'series' ? 'Plan a Series' : 'Research a Passage' }}
          </button>
        </div>

        <!-- Items -->
        <div v-else class="space-y-3">
          <div v-if="listLoading && filteredList.length === 0" class="flex items-center justify-center py-12">
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>

          <button
            v-for="item in filteredList"
            :key="item.id"
            @click="router.push(item.type === 'series' ? `/notebook/${item.id}` : `/notebook/research/${item.id}`)"
            class="w-full group flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div class="mt-0.5 shrink-0">
              <div :class="['h-10 w-10 rounded-lg flex items-center justify-center', item.type === 'series' ? 'bg-primary/10' : 'bg-blue-500/10']">
                <BookOpen v-if="item.type === 'series'" class="h-5 w-5 text-primary" />
                <Search v-else class="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-foreground truncate">{{ item.title }}</h3>
                  <p v-if="item.subtitle" class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.subtitle }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(item.status)]">
                    {{ getStatusLabel(item.status) }}
                  </span>
                  <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
              <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span v-if="item.date" class="shrink-0">{{ formatDate(item.date) }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Series Detail View -->
    <div v-else-if="view === 'series'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="detailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="seriesDetail" class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ seriesDetail.series.title }}</h2>
                <span :class="['text-xs px-2 py-0.5 rounded-full font-medium shrink-0', getStatusColor(seriesDetail.series.status)]">
                  {{ getStatusLabel(seriesDetail.series.status) }}
                </span>
              </div>
              <p v-if="seriesDetail.series.tagline" class="text-sm text-muted-foreground">{{ seriesDetail.series.tagline }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('series', seriesDetail.series._id)"
                :disabled="deletingId === seriesDetail.series._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <div v-if="seriesDetail.series.description" class="space-y-1">
            <h3 class="text-sm font-medium text-foreground">Description</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ seriesDetail.series.description }}</p>
          </div>

          <div v-if="seriesDetail.series.seriesArc" class="space-y-1">
            <h3 class="text-sm font-medium text-foreground">Series Arc</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ seriesDetail.series.seriesArc }}</p>
          </div>

          <div v-if="seriesDetail.series.scopeAssessment || seriesDetail.series.durationCheck || seriesDetail.series.specialAttention || seriesDetail.series.launchRecommendation" class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <h3 class="text-sm font-medium text-foreground">Planning Notes</h3>
            <div v-if="seriesDetail.series.scopeAssessment" class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope Assessment</label>
              <p class="text-sm text-foreground">{{ seriesDetail.series.scopeAssessment }}</p>
            </div>
            <div v-if="seriesDetail.series.durationCheck" class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration Check</label>
              <p class="text-sm text-foreground">{{ seriesDetail.series.durationCheck }}</p>
            </div>
            <div v-if="seriesDetail.series.specialAttention" class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Special Attention</label>
              <p class="text-sm text-foreground">{{ seriesDetail.series.specialAttention }}</p>
            </div>
            <div v-if="seriesDetail.series.launchRecommendation" class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Launch Recommendation</label>
              <p class="text-sm text-foreground">{{ seriesDetail.series.launchRecommendation }}</p>
            </div>
          </div>

          <div v-if="seriesDetail.weeks && seriesDetail.weeks.length > 0" class="space-y-3">
            <h3 class="text-sm font-medium text-foreground">Weekly Breakdown <span class="text-muted-foreground font-normal">({{ seriesDetail.weeks.length }} weeks)</span></h3>
            <div class="space-y-2">
              <div v-for="week in seriesDetail.weeks" :key="week._id" class="rounded-lg border border-border bg-card p-4 space-y-2">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-semibold text-primary">{{ week.weekNumber }}</span>
                  <h4 class="text-sm font-semibold text-foreground">{{ week.sermonTitle || 'Untitled' }}</h4>
                </div>
                <div v-if="week.scriptureRef" class="text-sm text-muted-foreground"><span class="font-medium text-foreground/70">Scripture:</span> {{ week.scriptureRef }}</div>
                <div v-if="week.bigIdea" class="text-sm text-muted-foreground"><span class="font-medium text-foreground/70">Big Idea:</span> {{ week.bigIdea }}</div>
                <div v-if="week.connectiveThread" class="text-sm text-muted-foreground"><span class="font-medium text-foreground/70">Connective Thread:</span> {{ week.connectiveThread }}</div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="seriesDetail.series.createdAt">Created {{ formatDate(seriesDetail.series.createdAt) }}</span>
            <span v-if="seriesDetail.series.updatedAt && seriesDetail.series.updatedAt !== seriesDetail.series.createdAt">Updated {{ formatDate(seriesDetail.series.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><BookOpen class="h-8 w-8 text-muted-foreground" /></div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Series not found</h3>
            <p class="text-sm text-muted-foreground">This series may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>

    <!-- Research Detail View -->
    <div v-else-if="view === 'research'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="researchDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="researchDetail" class="space-y-6">
          <!-- Title + actions -->
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ researchDetail.scriptureRef }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Research</span>
              </div>
              <p v-if="researchDetail.topicOrAngle" class="text-sm text-muted-foreground">{{ researchDetail.topicOrAngle }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('research', researchDetail._id)"
                :disabled="deletingId === researchDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <!-- Markdown content -->
          <div v-if="researchDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground prose-table:my-3 prose-table:text-sm prose-th:px-3 prose-th:py-2 prose-th:bg-muted/50 prose-th:font-medium prose-td:px-3 prose-td:py-1.5 prose-td:border-t prose-td:border-border prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
            <div v-html="marked.parse(researchDetail.content)" />
          </div>

          <!-- Metadata -->
          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="researchDetail.createdAt">Created {{ formatDate(researchDetail.createdAt) }}</span>
            <span v-if="researchDetail.updatedAt && researchDetail.updatedAt !== researchDetail.createdAt">Updated {{ formatDate(researchDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><Search class="h-8 w-8 text-muted-foreground" /></div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Research note not found</h3>
            <p class="text-sm text-muted-foreground">This note may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>
  </div>
</template>