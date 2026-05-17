<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getConvexClient } from '@/lib/convex'
import { marked } from 'marked'
import { BookOpen, ArrowLeft, ChevronRight, Trash2, Loader2, Search, Heart, CalendarDays, Video } from 'lucide-vue-next'

marked.setOptions({ breaks: true, gfm: true })

const router = useRouter()
const route = useRoute()

// Which view: 'list', 'series', 'research', 'brainstorm', 'agenda', 'devotional', 'blog', 'youtube', 'smallGroup'
const view = computed(() => {
  if (!route.params.id && !route.params.researchId && !route.params.brainstormId && !route.params.agendaId && !route.params.devotionalId && !route.params.blogId && !route.params.youtubeId && !route.params.smallGroupId) return 'list'
  if (route.params.researchId) return 'research'
  if (route.params.brainstormId) return 'brainstorm'
  if (route.params.agendaId) return 'agenda'
  if (route.params.devotionalId) return 'devotional'
  if (route.params.blogId) return 'blog'
  if (route.params.youtubeId) return 'youtube'
  if (route.params.smallGroupId) return 'smallGroup'
  if (route.params.id) return 'series'
  return 'list'
})

const selectedSeriesId = computed(() => route.params.id as string | undefined)
const selectedResearchId = computed(() => route.params.researchId as string | undefined)
const selectedBrainstormId = computed(() => route.params.brainstormId as string | undefined)
const selectedAgendaId = computed(() => route.params.agendaId as string | undefined)
const selectedDevotionalId = computed(() => route.params.devotionalId as string | undefined)
const selectedBlogId = computed(() => route.params.blogId as string | undefined)
const selectedYoutubeId = computed(() => route.params.youtubeId as string | undefined)
const selectedSmallGroupId = computed(() => route.params.smallGroupId as string | undefined)

// ── Series list ──
const seriesList = ref<any[]>([])
const listLoading = ref(true)
let listUnsub: (() => void) | null = null

// ── Research notes list ──
const researchList = ref<any[]>([])
let researchListUnsub: (() => void) | null = null

// ── Brainstorm briefs list ──
const brainstormList = ref<any[]>([])
let brainstormListUnsub: (() => void) | null = null

// ── Sermons list ──
const sermonList = ref<any[]>([])
let sermonListUnsub: (() => void) | null = null

// ── Agendas list ──
const agendaList = ref<any[]>([])
let agendaListUnsub: (() => void) | null = null

// ── Devotionals list ──
const devotionalList = ref<any[]>([])
let devotionalListUnsub: (() => void) | null = null

// ── Blog posts list ──
const blogList = ref<any[]>([])
let blogListUnsub: (() => void) | null = null

// ── YouTube drafts list ──
const youtubeList = ref<any[]>([])
let youtubeListUnsub: (() => void) | null = null

// ── Small group guides list ──
const smallGroupList = ref<any[]>([])
let smallGroupListUnsub: (() => void) | null = null

// ── Series detail ──
const seriesDetail = ref<any>(null)
const detailLoading = ref(false)
let detailUnsub: (() => void) | null = null

// ── Research detail ──
const researchDetail = ref<any>(null)
const researchDetailLoading = ref(false)
let researchDetailUnsub: (() => void) | null = null

// ── Brainstorm detail ──
const brainstormDetail = ref<any>(null)
const brainstormDetailLoading = ref(false)
let brainstormDetailUnsub: (() => void) | null = null

// ── Agenda detail ──
const agendaDetail = ref<any>(null)
const agendaDetailLoading = ref(false)
let agendaDetailUnsub: (() => void) | null = null

// ── Devotional detail ──
const devotionalDetail = ref<any>(null)
const devotionalDetailLoading = ref(false)
let devotionalDetailUnsub: (() => void) | null = null

// ── Blog detail ──
const blogDetail = ref<any>(null)
const blogDetailLoading = ref(false)
let blogDetailUnsub: (() => void) | null = null

// ── YouTube detail ──
const youtubeDetail = ref<any>(null)
const youtubeDetailLoading = ref(false)
let youtubeDetailUnsub: (() => void) | null = null

// ── Small group detail ──
const smallGroupDetail = ref<any>(null)
const smallGroupDetailLoading = ref(false)
let smallGroupDetailUnsub: (() => void) | null = null

// ── Series-linked items ──
const seriesResearchNotes = ref<any[]>([])
let seriesResearchUnsub: (() => void) | null = null
const seriesBrainstormBriefs = ref<any[]>([])
let seriesBrainstormUnsub: (() => void) | null = null
const seriesSermons = ref<any[]>([])
let seriesSermonsUnsub: (() => void) | null = null

// ── Active tab for list view ──
const activeTab = ref<'prep' | 'content' | 'pastoral'>(
  route.query.tab === 'content' || route.query.tab === 'pastoral' ? route.query.tab : 'prep'
)
const prepFilter = ref<'all' | 'sermon' | 'series' | 'research' | 'brainstorm'>(
  route.query.filter === 'sermon' || route.query.filter === 'series' || route.query.filter === 'research' || route.query.filter === 'brainstorm'
    ? route.query.filter
    : 'all'
)
const contentFilter = ref<
  | 'all'
  | 'blog'
  | 'youtube'
  | 'smallGroupQuestions'
  | 'churchSocialPost'
  | 'socialMediaCalendar'
  | 'churchEmail'
  | 'announcementScript'
  | 'churchLetter'
>(
  route.query.filter === 'blog'
  || route.query.filter === 'youtube'
  || route.query.filter === 'smallGroupQuestions'
  || route.query.filter === 'churchSocialPost'
  || route.query.filter === 'socialMediaCalendar'
  || route.query.filter === 'churchEmail'
  || route.query.filter === 'announcementScript'
  || route.query.filter === 'churchLetter'
    ? route.query.filter
    : 'all'
)
const pastoralFilter = ref<'all' | 'devotional' | 'agenda'>('all')

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
    brainstormListUnsub = client.onUpdate('brainstorm/queries:listMine' as any, {}, (data: any) => {
      brainstormList.value = data ?? []
    })
    sermonListUnsub = client.onUpdate('sermons/queries:listMine' as any, {}, (data: any) => {
      sermonList.value = data ?? []
    })
    agendaListUnsub = client.onUpdate('agendas/queries:listMine' as any, {}, (data: any) => {
      agendaList.value = data ?? []
    })
    devotionalListUnsub = client.onUpdate('devotionals/queries:listMine' as any, {}, (data: any) => {
      devotionalList.value = data ?? []
    })
    blogListUnsub = client.onUpdate('blogs/queries:listMine' as any, {}, (data: any) => {
      blogList.value = data ?? []
    })
    youtubeListUnsub = client.onUpdate('youtube/queries:listMine' as any, {}, (data: any) => {
      youtubeList.value = data ?? []
    })
    smallGroupListUnsub = client.onUpdate('smallGroup/queries:listMine' as any, {}, (data: any) => {
      smallGroupList.value = data ?? []
    })
  } catch (err) {
    console.error('Failed to load notebook:', err)
    listLoading.value = false
  }
})

onUnmounted(() => {
  listUnsub?.()
  researchListUnsub?.()
  brainstormListUnsub?.()
  sermonListUnsub?.()
  agendaListUnsub?.()
  devotionalListUnsub?.()
  blogListUnsub?.()
  youtubeListUnsub?.()
  smallGroupListUnsub?.()
  detailUnsub?.()
  researchDetailUnsub?.()
  brainstormDetailUnsub?.()
  agendaDetailUnsub?.()
  devotionalDetailUnsub?.()
  blogDetailUnsub?.()
  youtubeDetailUnsub?.()
  smallGroupDetailUnsub?.()
  seriesResearchUnsub?.()
  seriesBrainstormUnsub?.()
  seriesSermonsUnsub?.()
})

// Watch series ID
watch(selectedSeriesId, async (newId) => {
  if (detailUnsub) { detailUnsub(); detailUnsub = null }
  if (seriesResearchUnsub) { seriesResearchUnsub(); seriesResearchUnsub = null }
  if (seriesBrainstormUnsub) { seriesBrainstormUnsub(); seriesBrainstormUnsub = null }
  if (seriesSermonsUnsub) { seriesSermonsUnsub(); seriesSermonsUnsub = null }
  seriesDetail.value = null
  seriesResearchNotes.value = []
  seriesBrainstormBriefs.value = []
  seriesSermons.value = []
  if (!newId) return
  detailLoading.value = true
  try {
    const client = getConvexClient()
    detailUnsub = client.onUpdate('series/queries:getWithWeeks' as any, { seriesId: newId }, (data: any) => {
      seriesDetail.value = data
      detailLoading.value = false
    })
    // Load research notes linked to this series
    seriesResearchUnsub = client.onUpdate('research/queries:getBySeriesId' as any, { seriesId: newId }, (data: any) => {
      seriesResearchNotes.value = data ?? []
    })
    // Load brainstorm briefs linked to this series
    seriesBrainstormUnsub = client.onUpdate('brainstorm/queries:getBySeriesId' as any, { seriesId: newId }, (data: any) => {
      seriesBrainstormBriefs.value = data ?? []
    })
    // Load sermons linked to this series
    seriesSermonsUnsub = client.onUpdate('sermons/queries:getBySeriesId' as any, { seriesId: newId }, (data: any) => {
      seriesSermons.value = data ?? []
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

// Watch brainstorm ID
watch(selectedBrainstormId, async (newId) => {
  if (brainstormDetailUnsub) { brainstormDetailUnsub(); brainstormDetailUnsub = null }
  brainstormDetail.value = null
  if (!newId) return
  brainstormDetailLoading.value = true
  try {
    const client = getConvexClient()
    brainstormDetailUnsub = client.onUpdate('brainstorm/queries:getById' as any, { briefId: newId }, (data: any) => {
      brainstormDetail.value = data
      brainstormDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load brainstorm brief:', err)
    brainstormDetailLoading.value = false
  }
}, { immediate: true })

// Watch agenda ID
watch(selectedAgendaId, async (newId) => {
  if (agendaDetailUnsub) { agendaDetailUnsub(); agendaDetailUnsub = null }
  agendaDetail.value = null
  if (!newId) return
  agendaDetailLoading.value = true
  try {
    const client = getConvexClient()
    agendaDetailUnsub = client.onUpdate('agendas/queries:getById' as any, { agendaId: newId }, (data: any) => {
      agendaDetail.value = data
      agendaDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load agenda:', err)
    agendaDetailLoading.value = false
  }
}, { immediate: true })

// Watch devotional ID
watch(selectedDevotionalId, async (newId) => {
  if (devotionalDetailUnsub) { devotionalDetailUnsub(); devotionalDetailUnsub = null }
  devotionalDetail.value = null
  if (!newId) return
  devotionalDetailLoading.value = true
  try {
    const client = getConvexClient()
    devotionalDetailUnsub = client.onUpdate('devotionals/queries:getById' as any, { devotionalId: newId }, (data: any) => {
      devotionalDetail.value = data
      devotionalDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load devotional:', err)
    devotionalDetailLoading.value = false
  }
}, { immediate: true })

// Watch blog ID
watch(selectedBlogId, async (newId) => {
  if (blogDetailUnsub) { blogDetailUnsub(); blogDetailUnsub = null }
  blogDetail.value = null
  if (!newId) return
  blogDetailLoading.value = true
  try {
    const client = getConvexClient()
    blogDetailUnsub = client.onUpdate('blogs/queries:getById' as any, { blogId: newId }, (data: any) => {
      blogDetail.value = data
      blogDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load blog post:', err)
    blogDetailLoading.value = false
  }
}, { immediate: true })

// Watch YouTube ID
watch(selectedYoutubeId, async (newId) => {
  if (youtubeDetailUnsub) { youtubeDetailUnsub(); youtubeDetailUnsub = null }
  youtubeDetail.value = null
  if (!newId) return
  youtubeDetailLoading.value = true
  try {
    const client = getConvexClient()
    youtubeDetailUnsub = client.onUpdate('youtube/queries:getById' as any, { youtubeId: newId }, (data: any) => {
      youtubeDetail.value = data
      youtubeDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load youtube draft:', err)
    youtubeDetailLoading.value = false
  }
}, { immediate: true })

watch(selectedSmallGroupId, async (newId) => {
  if (smallGroupDetailUnsub) { smallGroupDetailUnsub(); smallGroupDetailUnsub = null }
  smallGroupDetail.value = null
  if (!newId) return
  smallGroupDetailLoading.value = true
  try {
    const client = getConvexClient()
    smallGroupDetailUnsub = client.onUpdate('smallGroup/queries:getById' as any, { guideId: newId }, (data: any) => {
      smallGroupDetail.value = data
      smallGroupDetailLoading.value = false
    })
  } catch (err) {
    console.error('Failed to load small group guide:', err)
    smallGroupDetailLoading.value = false
  }
}, { immediate: true })

async function handleDelete(type: 'series' | 'research' | 'brainstorm' | 'agenda' | 'devotional' | 'blog' | 'youtube' | 'smallGroupQuestions', id: string) {
  if (!confirm('Delete this item? This cannot be undone.')) return
  deletingId.value = id
  try {
    const client = getConvexClient()
    if (type === 'series') {
      await client.mutation('series/mutations:remove' as any, { seriesId: id })
      if (selectedSeriesId.value === id) router.push('/notebook')
    } else if (type === 'brainstorm') {
      await client.mutation('brainstorm/mutations:remove' as any, { briefId: id })
      if (selectedBrainstormId.value === id) router.push('/notebook')
    } else if (type === 'agenda') {
      await client.mutation('agendas/mutations:remove' as any, { agendaId: id })
      if (selectedAgendaId.value === id) router.push('/notebook')
    } else if (type === 'devotional') {
      await client.mutation('devotionals/mutations:remove' as any, { devotionalId: id })
      if (selectedDevotionalId.value === id) router.push('/notebook')
    } else if (type === 'blog') {
      await client.mutation('blogs/mutations:remove' as any, { blogId: id })
      if (selectedBlogId.value === id) router.push('/notebook')
    } else if (type === 'youtube') {
      await client.mutation('youtube/mutations:remove' as any, { youtubeId: id })
      if (selectedYoutubeId.value === id) router.push('/notebook')
    } else if (type === 'smallGroupQuestions') {
      await client.mutation('smallGroup/mutations:remove' as any, { guideId: id })
      if (selectedSmallGroupId.value === id) router.push('/notebook')
    } else {
      await client.mutation('research/mutations:remove' as any, { noteId: id })
      if (selectedResearchId.value === id) router.push('/notebook')
    }
  } catch (err) {
    console.error('Delete failed:', err)
  }
  deletingId.value = null
}

async function assignSeriesToResearch(noteId: string, seriesId: string | null) {
  try {
    const client = getConvexClient()
    await client.mutation('research/mutations:update' as any, { noteId, seriesId })
    // The subscription will auto-update the detail view
  } catch (err) {
    console.error('Failed to assign series:', err)
  }
}

async function assignSeriesToBrainstorm(briefId: string, seriesId: string | null) {
  try {
    const client = getConvexClient()
    await client.mutation('brainstorm/mutations:update' as any, { briefId, seriesId })
  } catch (err) {
    console.error('Failed to assign series:', err)
  }
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

function getTypeBadge(type: string): { label: string; color: string } {
  switch (type) {
    case 'sermon': return { label: 'Sermon', color: 'bg-slate-500/10 text-slate-700' }
    case 'series': return { label: 'Series', color: 'bg-primary/10 text-primary' }
    case 'research': return { label: 'Research', color: 'bg-blue-500/10 text-blue-600' }
    case 'brainstorm': return { label: 'Brainstorm', color: 'bg-amber-500/10 text-amber-600' }
    case 'agenda': return { label: 'Agenda', color: 'bg-emerald-500/10 text-emerald-600' }
    case 'devotional': return { label: 'Devotional', color: 'bg-violet-500/10 text-violet-600' }
    case 'blog': return { label: 'Blog', color: 'bg-orange-500/10 text-orange-600' }
    case 'youtube': return { label: 'YouTube', color: 'bg-red-500/10 text-red-600' }
    case 'smallGroupQuestions': return { label: 'Small Group', color: 'bg-teal-500/10 text-teal-700' }
    default: return { label: type, color: 'bg-muted text-muted-foreground' }
  }
}

function getSeriesName(seriesId: string | undefined): string {
  if (!seriesId) return ''
  const s = seriesList.value.find((s: any) => s._id === seriesId)
  return s?.title ?? ''
}

// Combined list for ordering by date
const combinedList = computed(() => {
  const items: Array<{
    type: 'sermon' | 'series' | 'research' | 'brainstorm' | 'agenda' | 'devotional' | 'blog' | 'youtube' | 'smallGroupQuestions'
    id: string
    title: string
    subtitle: string
    date: number
    status: string
    tab: 'prep' | 'content' | 'pastoral'
  }> = [
    ...sermonList.value.map(s => ({ type: 'sermon' as const, id: s._id, title: s.title || 'Untitled sermon', subtitle: s.scriptureRef || '', date: s.createdAt || 0, status: s.status || 'draft', tab: 'prep' as const })),
    ...seriesList.value.map(s => ({ type: 'series' as const, id: s._id, title: s.title, subtitle: s.tagline || '', date: s.createdAt || 0, status: s.status || 'draft', tab: 'prep' as const })),
    ...researchList.value.map(r => ({ type: 'research' as const, id: r._id, title: r.scriptureRef, subtitle: r.topicOrAngle || '', date: r.createdAt || 0, status: r.status || 'draft', tab: 'prep' as const })),
    ...brainstormList.value.map(b => ({ type: 'brainstorm' as const, id: b._id, title: b.passage, subtitle: b.bigIdea || '', date: b.createdAt || 0, status: b.status || 'draft', tab: 'prep' as const })),
    ...agendaList.value.map(a => ({ type: 'agenda' as const, id: a._id, title: a.meetingType, subtitle: '', date: a.createdAt || 0, status: a.status || 'draft', tab: 'pastoral' as const })),
    ...devotionalList.value.map(d => ({ type: 'devotional' as const, id: d._id, title: d.scriptureRef, subtitle: '', date: d.createdAt || 0, status: d.status || 'draft', tab: 'pastoral' as const })),
    ...blogList.value.map(b => ({ type: 'blog' as const, id: b._id, title: b.title, subtitle: '', date: b.createdAt || 0, status: b.status || 'draft', tab: 'content' as const })),
    ...youtubeList.value.map(y => ({ type: 'youtube' as const, id: y._id, title: y.title, subtitle: '', date: y.createdAt || 0, status: y.status || 'draft', tab: 'content' as const })),
    ...smallGroupList.value.map(g => ({ type: 'smallGroupQuestions' as const, id: g._id, title: g.title || 'Small Group Questions', subtitle: '', date: g.createdAt || 0, status: g.status || 'draft', tab: 'content' as const })),
  ]
  return items.sort((a, b) => b.date - a.date)
})

const filteredList = computed(() => {
  if (activeTab.value === 'prep') {
    let items = combinedList.value.filter(i => i.tab === 'prep')
    if (prepFilter.value !== 'all') {
      items = items.filter(i => i.type === prepFilter.value)
    }
    return items
  }
  if (activeTab.value === 'content') {
    let items = combinedList.value.filter(i => i.tab === 'content')
    if (contentFilter.value !== 'all') {
      items = items.filter(i => i.type === contentFilter.value)
    }
    return items
  }
  
  // Pastoral tab
  let pastoralItems = combinedList.value.filter(i => i.tab === 'pastoral')
  if (pastoralFilter.value !== 'all') {
    pastoralItems = pastoralItems.filter(i => i.type === pastoralFilter.value)
  }
  return pastoralItems
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
            <template v-else-if="view === 'brainstorm'">Brainstorm brief</template>
            <template v-else-if="view === 'agenda'">Meeting agenda</template>
            <template v-else-if="view === 'devotional'">Midweek devotional</template>
            <template v-else-if="view === 'blog'">Blog post</template>
            <template v-else-if="view === 'youtube'">YouTube package</template>
            <template v-else-if="view === 'smallGroup'">Small Group Questions</template>
            <template v-else>Your saved work, organized by purpose</template>
          </p>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-if="view === 'list'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <!-- Tabs -->
        <div class="flex flex-col gap-3 mb-6">
          <div class="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
            <button
              @click="activeTab = 'prep'"
              :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-all', activeTab === 'prep' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']"
            >
              Prep
            </button>
            <button
              @click="activeTab = 'content'"
              :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-all', activeTab === 'content' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']"
            >
              Content
            </button>
            <button
              @click="activeTab = 'pastoral'"
              :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-all', activeTab === 'pastoral' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']"
            >
              Pastoral
            </button>
          </div>

          <!-- Sub-filters for Prep -->
          <div v-if="activeTab === 'prep'" class="flex items-center gap-4 px-2">
            <button 
              @click="prepFilter = 'all'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', prepFilter === 'all' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              All
            </button>
            <button 
              @click="prepFilter = 'sermon'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', prepFilter === 'sermon' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Sermons
            </button>
            <button 
              @click="prepFilter = 'series'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', prepFilter === 'series' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Series
            </button>
            <button 
              @click="prepFilter = 'research'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', prepFilter === 'research' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Research
            </button>
            <button 
              @click="prepFilter = 'brainstorm'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', prepFilter === 'brainstorm' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Brainstorm
            </button>
          </div>

          <!-- Sub-filters for Content -->
          <div v-if="activeTab === 'content'" class="flex items-center gap-4 px-2 flex-wrap">
            <button
              @click="contentFilter = 'all'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'all' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              All
            </button>
            <button
              @click="contentFilter = 'blog'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'blog' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Blog
            </button>
            <button
              @click="contentFilter = 'youtube'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'youtube' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              YouTube
            </button>
            <button
              @click="contentFilter = 'smallGroupQuestions'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'smallGroupQuestions' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Small Group Questions
            </button>
            <button
              @click="contentFilter = 'churchSocialPost'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'churchSocialPost' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Church Social Post
            </button>
            <button
              @click="contentFilter = 'socialMediaCalendar'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'socialMediaCalendar' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Social Media Calendar
            </button>
            <button
              @click="contentFilter = 'churchEmail'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'churchEmail' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Church Email
            </button>
            <button
              @click="contentFilter = 'announcementScript'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'announcementScript' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Announcement Script
            </button>
            <button
              @click="contentFilter = 'churchLetter'"
              :class="['text-xs font-medium transition-colors hover:text-foreground', contentFilter === 'churchLetter' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Church Letter
            </button>
          </div>

          <!-- Sub-filters for Pastoral -->
          <div v-if="activeTab === 'pastoral'" class="flex items-center gap-4 px-2">
            <button 
              @click="pastoralFilter = 'all'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', pastoralFilter === 'all' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              All
            </button>
            <button 
              @click="pastoralFilter = 'devotional'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', pastoralFilter === 'devotional' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Devotionals
            </button>
            <button 
              @click="pastoralFilter = 'agenda'" 
              :class="['text-xs font-medium transition-colors hover:text-foreground', pastoralFilter === 'agenda' ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground']"
            >
              Agendas
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!listLoading && filteredList.length === 0" class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen v-if="activeTab === 'prep'" class="h-8 w-8 text-muted-foreground" />
            <svg v-else-if="activeTab === 'content'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <Heart v-else class="h-8 w-8 text-muted-foreground" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">
              {{ activeTab === 'prep' ? 'No saved items yet' : activeTab === 'content' ? 'No content yet' : 'No pastoral items yet' }}
            </h3>
            <p class="text-sm text-muted-foreground max-w-sm">
              {{
                activeTab === 'prep'
                  ? 'When you save a sermon, brainstorm, research, or series plan, it will appear here.'
                  : activeTab === 'content'
                  ? 'Content from Blog, YouTube, Social, and Email tools will appear here.'
                  : 'Pastoral items like agendas and devotionals will appear here.'
              }}
            </p>
          </div>
          <button
            v-if="activeTab === 'prep'"
            @click="router.push('/')"
            class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get started
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
            @click="router.push(
              item.type === 'sermon' ? `/sermons/edit/sermon/${item.id}`
              : item.type === 'series' ? `/notebook/${item.id}`
              : item.type === 'research' ? `/notebook/research/${item.id}`
              : item.type === 'brainstorm' ? `/notebook/brainstorm/${item.id}`
              : item.type === 'agenda' ? `/notebook/agenda/${item.id}`
              : item.type === 'devotional' ? `/notebook/devotional/${item.id}`
              : item.type === 'blog' ? `/notebook/blog/${item.id}`
              : item.type === 'youtube' ? `/notebook/youtube/${item.id}`
              : `/notebook/small-group/${item.id}`
            )"
            class="w-full group flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div class="mt-0.5 shrink-0">
              <div :class="['h-10 w-10 rounded-lg flex items-center justify-center', getTypeBadge(item.type).color]">
                <BookOpen v-if="item.type === 'sermon' || item.type === 'series'" class="h-5 w-5" />
                <Search v-else-if="item.type === 'research'" class="h-5 w-5" />
                <CalendarDays v-else-if="item.type === 'agenda'" class="h-5 w-5" />
                <Heart v-else-if="item.type === 'devotional'" class="h-5 w-5" />
                <svg v-else-if="item.type === 'blog'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                <Video v-else-if="item.type === 'youtube'" class="h-5 w-5" />
                <BookOpen v-else-if="item.type === 'smallGroupQuestions'" class="h-5 w-5" />
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-foreground truncate">{{ item.title }}</h3>
                  <p v-if="item.subtitle" class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.subtitle }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', getTypeBadge(item.type).color]">
                    {{ getTypeBadge(item.type).label }}
                  </span>
                  <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
              <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span v-if="item.date" class="shrink-0">{{ formatDate(item.date) }}</span>
                <span :class="['text-xs px-1.5 py-0.5 rounded font-medium', getStatusColor(item.status)]">{{ getStatusLabel(item.status) }}</span>
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

          <!-- Linked Sermons -->
          <div v-if="seriesSermons.length > 0" class="space-y-3">
            <h3 class="text-sm font-medium text-foreground">Sermons <span class="text-muted-foreground font-normal">({{ seriesSermons.length }})</span></h3>
            <div class="space-y-2">
              <button
                v-for="sermon in seriesSermons" :key="sermon._id"
                @click="router.push(`/sermons/edit/sermon/${sermon._id}`)"
                class="w-full group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div class="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen class="h-4 w-4 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-foreground truncate">{{ sermon.title || 'Untitled sermon' }}</div>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span v-if="sermon.scriptureRef">{{ sermon.scriptureRef }}</span>
                    <span v-if="sermon.scriptureRef">•</span>
                    <span>{{ formatDate(sermon.createdAt) }}</span>
                  </div>
                </div>
                <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>
          </div>

          <!-- Linked Research Notes -->
          <div v-if="seriesResearchNotes.length > 0" class="space-y-3">
            <h3 class="text-sm font-medium text-foreground">Research Notes <span class="text-muted-foreground font-normal">({{ seriesResearchNotes.length }})</span></h3>
            <div class="space-y-2">
              <button
                v-for="note in seriesResearchNotes" :key="note._id"
                @click="router.push(`/notebook/research/${note._id}`)"
                class="w-full group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-blue-300/50 hover:shadow-sm"
              >
                <div class="shrink-0 h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Search class="h-4 w-4 text-blue-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-foreground truncate">{{ note.scriptureRef }}</div>
                  <div v-if="note.topicOrAngle" class="text-xs text-muted-foreground truncate">{{ note.topicOrAngle }}</div>
                </div>
                <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>
          </div>

          <!-- Linked Brainstorm Briefs -->
          <div v-if="seriesBrainstormBriefs.length > 0" class="space-y-3">
            <h3 class="text-sm font-medium text-foreground">Brainstorm Briefs <span class="text-muted-foreground font-normal">({{ seriesBrainstormBriefs.length }})</span></h3>
            <div class="space-y-2">
              <button
                v-for="brief in seriesBrainstormBriefs" :key="brief._id"
                @click="router.push(`/notebook/brainstorm/${brief._id}`)"
                class="w-full group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-amber-300/50 hover:shadow-sm"
              >
                <div class="shrink-0 h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-foreground truncate">{{ brief.passage }}</div>
                  <div v-if="brief.bigIdea" class="text-xs text-muted-foreground truncate">{{ brief.bigIdea }}</div>
                </div>
                <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>
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

          <!-- Series assignment -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Linked Series</label>
            <select
              :value="researchDetail.seriesId ?? null"
              @change="assignSeriesToResearch(researchDetail._id, ($event.target as HTMLSelectElement).value || null)"
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option :value="null">Standalone Research (no series)</option>
              <option v-for="s in seriesList" :key="s._id" :value="s._id">{{ s.title }}</option>
            </select>
            <p v-if="researchDetail.seriesId" class="text-xs text-muted-foreground">Linked to <span class="font-medium">{{ getSeriesName(researchDetail.seriesId) }}</span></p>
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

    <!-- Brainstorm Detail View -->
    <div v-else-if="view === 'brainstorm'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="brainstormDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="brainstormDetail" class="space-y-6">
          <!-- Title + actions -->
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ brainstormDetail.passage }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Brainstorm</span>
              </div>
              <p v-if="brainstormDetail.bigIdea" class="text-sm text-muted-foreground">{{ brainstormDetail.bigIdea }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('brainstorm', brainstormDetail._id)"
                :disabled="deletingId === brainstormDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <!-- Series assignment -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Linked Series</label>
            <select
              :value="brainstormDetail.seriesId ?? null"
              @change="assignSeriesToBrainstorm(brainstormDetail._id, ($event.target as HTMLSelectElement).value || null)"
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option :value="null">Standalone Message (no series)</option>
              <option v-for="s in seriesList" :key="s._id" :value="s._id">{{ s.title }}</option>
            </select>
            <p v-if="brainstormDetail.seriesId" class="text-xs text-muted-foreground">Linked to <span class="font-medium">{{ getSeriesName(brainstormDetail.seriesId) }}</span></p>
          </div>

          <!-- Markdown content -->
          <div v-if="brainstormDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground prose-table:my-3 prose-table:text-sm prose-th:px-3 prose-th:py-2 prose-th:bg-muted/50 prose-th:font-medium prose-td:px-3 prose-td:py-1.5 prose-td:border-t prose-td:border-border">
            <div v-html="marked.parse(brainstormDetail.content)" />
          </div>

          <!-- Metadata -->
          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="brainstormDetail.createdAt">Created {{ formatDate(brainstormDetail.createdAt) }}</span>
            <span v-if="brainstormDetail.updatedAt && brainstormDetail.updatedAt !== brainstormDetail.createdAt">Updated {{ formatDate(brainstormDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Brief not found</h3>
            <p class="text-sm text-muted-foreground">This brief may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>

    <!-- Agenda Detail View -->
    <div v-else-if="view === 'agenda'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="agendaDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="agendaDetail" class="space-y-6">
          <!-- Title + actions -->
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ agendaDetail.meetingType }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">Agenda</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('agenda', agendaDetail._id)"
                :disabled="deletingId === agendaDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <!-- Markdown content -->
          <div v-if="agendaDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground">
            <div v-html="marked.parse(agendaDetail.content)" />
          </div>

          <!-- Metadata -->
          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="agendaDetail.createdAt">Created {{ formatDate(agendaDetail.createdAt) }}</span>
            <span v-if="agendaDetail.updatedAt && agendaDetail.updatedAt !== agendaDetail.createdAt">Updated {{ formatDate(agendaDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <CalendarDays class="h-8 w-8 text-muted-foreground" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Agenda not found</h3>
            <p class="text-sm text-muted-foreground">This agenda may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>

    <!-- Blog Detail View -->
    <div v-else-if="view === 'blog'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="blogDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="blogDetail" class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ blogDetail.title }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">Blog</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('blog', blogDetail._id)"
                :disabled="deletingId === blogDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <div v-if="blogDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground">
            <div v-html="marked.parse(blogDetail.content)" />
          </div>

          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="blogDetail.createdAt">Created {{ formatDate(blogDetail.createdAt) }}</span>
            <span v-if="blogDetail.updatedAt && blogDetail.updatedAt !== blogDetail.createdAt">Updated {{ formatDate(blogDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><BookOpen class="h-8 w-8 text-muted-foreground" /></div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Blog post not found</h3>
            <p class="text-sm text-muted-foreground">This blog post may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>

    <!-- YouTube Detail View -->
    <div v-else-if="view === 'youtube'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="youtubeDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="youtubeDetail" class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ youtubeDetail.title }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">YouTube</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('youtube', youtubeDetail._id)"
                :disabled="deletingId === youtubeDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <div v-if="youtubeDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground">
            <div v-html="marked.parse(youtubeDetail.content)" />
          </div>

          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="youtubeDetail.createdAt">Created {{ formatDate(youtubeDetail.createdAt) }}</span>
            <span v-if="youtubeDetail.updatedAt && youtubeDetail.updatedAt !== youtubeDetail.createdAt">Updated {{ formatDate(youtubeDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><Video class="h-8 w-8 text-muted-foreground" /></div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">YouTube package not found</h3>
            <p class="text-sm text-muted-foreground">This YouTube package may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>

    <!-- Small Group Detail View -->
    <div v-else-if="view === 'smallGroup'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="smallGroupDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="smallGroupDetail" class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ smallGroupDetail.title }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">Small Group</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('smallGroupQuestions', smallGroupDetail._id)"
                :disabled="deletingId === smallGroupDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <div v-if="smallGroupDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground">
            <div v-html="marked.parse(smallGroupDetail.content)" />
          </div>

          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="smallGroupDetail.createdAt">Created {{ formatDate(smallGroupDetail.createdAt) }}</span>
            <span v-if="smallGroupDetail.updatedAt && smallGroupDetail.updatedAt !== smallGroupDetail.createdAt">Updated {{ formatDate(smallGroupDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><BookOpen class="h-8 w-8 text-muted-foreground" /></div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Small Group Questions not found</h3>
            <p class="text-sm text-muted-foreground">This guide may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>

    <!-- Devotional Detail View -->
    <div v-else-if="view === 'devotional'" class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="devotionalDetailLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="devotionalDetail" class="space-y-6">
          <!-- Title + actions -->
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ devotionalDetail.scriptureRef }}</h2>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">Devotional</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click="handleDelete('devotional', devotionalDetail._id)"
                :disabled="deletingId === devotionalDetail._id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <!-- Markdown content -->
          <div v-if="devotionalDetail.content" class="rounded-lg border border-border bg-card p-6 prose prose-sm prose-slate max-w-none prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-sm prose-strong:text-foreground prose-blockquote:border-l-4 prose-blockquote:border-violet-300 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:not-italic">
            <div v-html="marked.parse(devotionalDetail.content)" />
          </div>

          <!-- Metadata -->
          <div class="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span v-if="devotionalDetail.createdAt">Created {{ formatDate(devotionalDetail.createdAt) }}</span>
            <span v-if="devotionalDetail.updatedAt && devotionalDetail.updatedAt !== devotionalDetail.createdAt">Updated {{ formatDate(devotionalDetail.updatedAt) }}</span>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Heart class="h-8 w-8 text-muted-foreground" />
          </div>
          <div class="text-center space-y-1">
            <h3 class="text-lg font-semibold text-foreground">Devotional not found</h3>
            <p class="text-sm text-muted-foreground">This devotional may have been deleted.</p>
          </div>
          <button @click="router.push('/notebook')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Back to Notebook</button>
        </div>
      </div>
    </div>
  </div>
</template>