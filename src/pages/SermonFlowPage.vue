<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { marked } from 'marked'
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  FileText,
  Italic,
  Layers,
  List,
  ListOrdered,
  Loader2,
  Save,
  Search,
  Sparkles,
  Type,
} from 'lucide-vue-next'
import { getConvexClient } from '@/lib/convex'
import { useConvexMutation } from '@/composables/useConvexMutation'
import SkillChat from '@/components/SkillChat.vue'
import posthog from 'posthog-js'

marked.setOptions({ breaks: true, gfm: true })

const route = useRoute()
const router = useRouter()
const isMacDesktop = computed(() => !!window.ipcRenderer && /mac/i.test(navigator.userAgent))

const action = computed(() => route.params.action as 'create' | 'edit')
const mode = computed(() => route.params.mode as 'series' | 'standalone' | 'sermon')
const routeId = computed(() => route.params.seriesId as string | undefined)
const routeSermonId = computed(() => mode.value === 'sermon' ? routeId.value : undefined)
const routeSeriesId = computed(() => mode.value === 'series' ? routeId.value : undefined)

const currentSermonId = ref<string | undefined>(routeSermonId.value)
const selectedSermon = ref<any>(null)
const selectedSermonLoading = ref(false)
let selectedSermonUnsub: (() => void) | null = null

const seriesDetail = ref<any>(null)
const seriesLoading = ref(false)
const brainstormBriefs = ref<any[]>([])
const researchNotes = ref<any[]>([])
const seriesSermons = ref<any[]>([])
let seriesUnsub: (() => void) | null = null
let brainstormUnsub: (() => void) | null = null
let researchUnsub: (() => void) | null = null
let seriesSermonsUnsub: (() => void) | null = null

const activeTab = ref<'series' | 'brainstorm' | 'research' | 'assist'>('series')
const selectedBrainstorm = ref<any>(null)
const selectedResearch = ref<any>(null)
const previewMode = ref(false)
const lastSavedAt = ref<number | null>(null)
const saveError = ref<string | null>(null)

const title = ref('')
const scriptureRef = ref('')
const contentHtml = ref('')

const { mutate: createSermon, isLoading: createSaving } = useConvexMutation('sermons/mutations:create' as any)
const { mutate: updateSermon, isLoading: updateSaving } = useConvexMutation('sermons/mutations:update' as any)
const isSaving = computed(() => createSaving.value || updateSaving.value)

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      bulletList: {
        HTMLAttributes: { class: '' },
      },
    }),
    Highlight.configure({ multicolor: true }),
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'sermon-editor prose prose-slate max-w-none min-h-[calc(100vh-250px)] px-5 py-4 focus:outline-none',
    },
    handleKeyDown: (_view, event) => {
      // Fix bullet-list Enter behaviour:
      // - Enter on non-empty bullet → create a new sibling bullet (not a paragraph inside the bullet)
      // - Enter on an empty bullet     → lift out of the list back to a paragraph
      if (event.key === 'Enter' && !event.shiftKey) {
        const editorInstance = editor?.value
        if (!editorInstance) return false

        const { state } = editorInstance
        const { selection } = state
        const { $from } = selection

        // Walk up from cursor to find a bulletList ancestor
        let bulletDepth = -1
        let listItemDepth = -1

        for (let d = $from.depth; d >= 0; d--) {
          const node = $from.node(d)
          if (node.type.name === 'bulletList') {
            bulletDepth = d
            break
          }
          if (node.type.name === 'listItem') {
            listItemDepth = d
          }
        }

        if (bulletDepth >= 0 && listItemDepth >= 0) {
          const listItemNode = $from.node(listItemDepth)

          // Empty bullet (only whitespace) → exit the list
          if (listItemNode.textContent.trim() === '') {
            editorInstance.commands.liftListItem('listItem')
            return true
          }

          // Non-empty bullet → split into new list-item (default behaviour, but we enforce it)
          editorInstance.chain().splitListItem('listItem').run()
          return true
        }

        // Not in a bullet list — keep default Enter handling
        return false
      }

      return false
    },
  },
  onUpdate: ({ editor }) => {
    contentHtml.value = editor.getHTML()
  },
})

const resourceSeriesId = computed(() => {
  if (routeSeriesId.value) return routeSeriesId.value
  return selectedSermon.value?.seriesId as string | undefined
})

const pageTitle = computed(() => {
  if (action.value === 'edit') return 'Edit Sermon'
  if (routeSeriesId.value) return 'Create Sermon from Series'
  return 'Create Standalone Sermon'
})

const saveStatusText = computed(() => {
  if (isSaving.value) return 'Saving...'
  if (lastSavedAt.value) return `Saved ${new Date(lastSavedAt.value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return 'Not saved yet'
})

function queryValue(name: string): string {
  const value = route.query[name]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ? String(value) : ''
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const lastAppliedNotebookPrefillKey = ref<string | null>(null)

function applyNotebookPrefillFromQuery() {
  if (action.value !== 'create') return
  if (currentSermonId.value) return
  if (queryValue('fromNotebook') !== '1') return

  const seriesTitle = queryValue('seriesTitle')
  const weekNumber = queryValue('weekNumber')
  const sermonTitleFromWeek = queryValue('sermonTitle')
  const scriptureFromWeek = queryValue('scriptureRef')
  const bigIdea = queryValue('bigIdea')
  const connectiveThread = queryValue('connectiveThread')

  const prefillKey = [
    routeSeriesId.value ?? '',
    weekNumber,
    sermonTitleFromWeek,
    scriptureFromWeek,
    bigIdea,
    connectiveThread,
    seriesTitle,
  ].join('|')

  if (lastAppliedNotebookPrefillKey.value === prefillKey) return
  lastAppliedNotebookPrefillKey.value = prefillKey

  const titleCandidate = sermonTitleFromWeek || (weekNumber ? `Week ${weekNumber} Sermon` : '')
  if (titleCandidate) title.value = titleCandidate
  if (scriptureFromWeek) scriptureRef.value = scriptureFromWeek

  const sections: string[] = []
  if (seriesTitle || weekNumber) {
    const meta: string[] = []
    if (seriesTitle) meta.push(`<strong>Series:</strong> ${escapeHtml(seriesTitle)}`)
    if (weekNumber) meta.push(`<strong>Week:</strong> ${escapeHtml(weekNumber)}`)
    sections.push(`<p>${meta.join(' &nbsp;•&nbsp; ')}</p>`)
  }
  if (bigIdea) sections.push(`<h2>Big Idea</h2><p>${escapeHtml(bigIdea)}</p>`)
  if (connectiveThread) sections.push(`<h2>Connective Thread</h2><p>${escapeHtml(connectiveThread)}</p>`)

  if (sections.length > 0) {
    sections.push('<h2>Outline</h2><ul><li></li><li></li><li></li></ul>')
    const prefillHtml = sections.join('')
    contentHtml.value = prefillHtml
    if (editor.value) {
      editor.value.commands.setContent(prefillHtml)
    }
  }
}

watch(
  () => [route.fullPath, action.value, currentSermonId.value ?? '', !!editor.value],
  () => {
    applyNotebookPrefillFromQuery()
  },
  { immediate: true }
)

watch(routeSermonId, (sermonId) => {
  selectedSermonUnsub?.()
  selectedSermonUnsub = null
  selectedSermon.value = null
  currentSermonId.value = sermonId

  if (!sermonId) return

  selectedSermonLoading.value = true
  const client = getConvexClient()
  selectedSermonUnsub = client.onUpdate('sermons/queries:getById' as any, { sermonId }, (data: any) => {
    selectedSermon.value = data
    selectedSermonLoading.value = false
  })
}, { immediate: true })

watch(selectedSermon, (sermon) => {
  if (!sermon) return
  title.value = sermon.title || ''
  scriptureRef.value = sermon.scriptureRef || ''
  contentHtml.value = sermon.content || ''
  if (editor.value && sermon.content !== editor.value.getHTML()) {
    editor.value.commands.setContent(sermon.content || '')
  }
})

watch(resourceSeriesId, (seriesId) => {
  seriesUnsub?.()
  brainstormUnsub?.()
  researchUnsub?.()
  seriesSermonsUnsub?.()
  seriesUnsub = null
  brainstormUnsub = null
  researchUnsub = null
  seriesSermonsUnsub = null
  seriesDetail.value = null
  brainstormBriefs.value = []
  researchNotes.value = []
  seriesSermons.value = []
  selectedBrainstorm.value = null
  selectedResearch.value = null

  const client = getConvexClient()

  if (!seriesId) {
    seriesLoading.value = false
    if (activeTab.value === 'series') activeTab.value = 'brainstorm'
    brainstormUnsub = client.onUpdate('brainstorm/queries:listMine' as any, {}, (data: any) => {
      brainstormBriefs.value = (data ?? []).slice(0, 5)
    })
    researchUnsub = client.onUpdate('research/queries:listMine' as any, {}, (data: any) => {
      researchNotes.value = (data ?? []).slice(0, 5)
    })
    return
  }

  seriesLoading.value = true
  seriesUnsub = client.onUpdate('series/queries:getWithWeeks' as any, { seriesId }, (data: any) => {
    seriesDetail.value = data
    seriesLoading.value = false
  })
  brainstormUnsub = client.onUpdate('brainstorm/queries:getBySeriesId' as any, { seriesId }, (data: any) => {
    brainstormBriefs.value = data ?? []
  })
  researchUnsub = client.onUpdate('research/queries:getBySeriesId' as any, { seriesId }, (data: any) => {
    researchNotes.value = data ?? []
  })
  seriesSermonsUnsub = client.onUpdate('sermons/queries:getBySeriesId' as any, { seriesId }, (data: any) => {
    seriesSermons.value = data ?? []
  })
}, { immediate: true })

onBeforeUnmount(() => {
  selectedSermonUnsub?.()
  seriesUnsub?.()
  brainstormUnsub?.()
  researchUnsub?.()
  seriesSermonsUnsub?.()
})

function renderMarkdown(content?: string): string {
  return marked.parse(content || '') as string
}

async function openExternalLink(url: string) {
  try {
    await window.appLinks?.openExternal?.(url)
  } catch (err) {
    console.warn('[sermon-flow] Failed to open external link', err)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function handleMarkdownClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const anchor = target?.closest('a') as HTMLAnchorElement | null
  if (!anchor?.href) return

  event.preventDefault()
  void openExternalLink(anchor.href)
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function setHeading(level: 1 | 2 | 3) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function toggleHighlight() {
  editor.value?.chain().focus().toggleHighlight({ color: '#fef08a' }).run()
}

function clearHighlight() {
  editor.value?.chain().focus().unsetHighlight().run()
}

function selectBrainstorm(brief: any) {
  selectedBrainstorm.value = brief
}

function selectResearch(note: any) {
  selectedResearch.value = note
}

function openSermon(sermon: any) {
  router.push(`/sermons/edit/sermon/${sermon._id}`)
}

async function handleSave() {
  saveError.value = null
  const payload = {
    title: title.value,
    scriptureRef: scriptureRef.value || undefined,
    content: editor.value?.getHTML() || contentHtml.value || '',
    seriesId: resourceSeriesId.value as any,
    status: 'draft' as const,
  }

  try {
    if (currentSermonId.value) {
      const result = await updateSermon({ sermonId: currentSermonId.value as any, ...payload } as any)
      if (!result) throw new Error('Save failed')
    } else {
      const result = await createSermon(payload as any)
      if (!result) throw new Error('Save failed')
      currentSermonId.value = result as string
    }
    lastSavedAt.value = Date.now()
    posthog.capture('sermon_saved', {
      action: action.value,
      has_series: !!resourceSeriesId.value,
      has_scripture: !!payload.scriptureRef,
    })
  } catch (err: any) {
    saveError.value = err?.message || 'Unable to save sermon.'
  }
}
</script>

<template>
  <div class="h-screen bg-background overflow-hidden">
    <!-- Clean sermon preview -->
    <div v-if="previewMode" class="h-full overflow-y-auto bg-background">
      <div class="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <button
          @click="previewMode = false"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft class="h-4 w-4" />
          Back to edit
        </button>

        <article class="space-y-6">
          <header class="space-y-2 border-b border-border pb-6">
            <h1 class="text-4xl font-semibold tracking-tight text-foreground">{{ title || 'Untitled sermon' }}</h1>
            <p v-if="scriptureRef" class="text-base text-muted-foreground">{{ scriptureRef }}</p>
          </header>

          <div
            class="prose prose-slate max-w-none prose-headings:scroll-m-20 prose-h2:text-2xl prose-p:leading-7 prose-li:my-1"
            v-html="contentHtml || editor?.getHTML() || '<p class=&quot;text-muted-foreground&quot;>No sermon content yet.</p>'"
          />
        </article>
      </div>
    </div>

    <!-- Editor workspace -->
    <div v-else class="h-full flex flex-col">
      <header :class="['shrink-0 border-b border-border bg-background px-5 py-3', isMacDesktop ? 'pl-20' : '']">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <button
              @click="router.push('/sermons')"
              class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft class="h-4 w-4" />
            </button>
            <div class="min-w-0">
              <h1 class="text-sm font-semibold text-foreground truncate">{{ pageTitle }}</h1>
              <p class="text-xs text-muted-foreground truncate">
                {{ resourceSeriesId && seriesDetail?.series ? `Linked to ${seriesDetail.series.title}` : 'Standalone message' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <span :class="['text-xs', saveError ? 'text-destructive' : 'text-muted-foreground']">
              {{ saveError || saveStatusText }}
            </span>
            <button
              @click="previewMode = true"
              class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Eye class="h-4 w-4" />
              Show Sermon
            </button>
            <button
              @click="handleSave"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 shadow-sm ring-1 ring-violet-700/20 transition-colors disabled:opacity-50"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </header>

      <main class="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <!-- 60% Editor -->
        <section class="min-h-0 flex flex-col border-r border-border bg-background">
          <div class="shrink-0 border-b border-border px-6 py-4 space-y-3">
            <input
              v-model="title"
              type="text"
              placeholder="Sermon title"
              class="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <input
              v-model="scriptureRef"
              type="text"
              placeholder="Scripture reference"
              class="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/60"
            />

            <div class="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
              <button @click="setHeading(1)" :class="['toolbar-btn', editor?.isActive('heading', { level: 1 }) ? 'toolbar-active' : '']"><Type class="h-4 w-4" /> H1</button>
              <button @click="setHeading(2)" :class="['toolbar-btn', editor?.isActive('heading', { level: 2 }) ? 'toolbar-active' : '']"><Type class="h-4 w-4" /> H2</button>
              <button @click="setHeading(3)" :class="['toolbar-btn', editor?.isActive('heading', { level: 3 }) ? 'toolbar-active' : '']"><Type class="h-4 w-4" /> H3</button>
              <div class="mx-1 h-5 w-px bg-border" />
              <button @click="editor?.chain().focus().toggleBold().run()" :class="['toolbar-btn', editor?.isActive('bold') ? 'toolbar-active' : '']"><strong>B</strong></button>
              <button @click="editor?.chain().focus().toggleItalic().run()" :class="['toolbar-btn', editor?.isActive('italic') ? 'toolbar-active' : '']"><Italic class="h-4 w-4" /></button>
              <button @click="toggleHighlight" :class="['toolbar-btn', editor?.isActive('highlight') ? 'toolbar-active' : '']"><span class="h-3.5 w-3.5 rounded-sm bg-yellow-200 border border-yellow-300" /> Highlight</button>
              <button @click="clearHighlight" class="toolbar-btn">Clear highlight</button>
              <div class="mx-1 h-5 w-px bg-border" />
              <button @click="editor?.chain().focus().toggleBulletList().run()" :class="['toolbar-btn', editor?.isActive('bulletList') ? 'toolbar-active' : '']"><List class="h-4 w-4" /></button>
              <button @click="editor?.chain().focus().toggleOrderedList().run()" :class="['toolbar-btn', editor?.isActive('orderedList') ? 'toolbar-active' : '']"><ListOrdered class="h-4 w-4" /></button>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <EditorContent :editor="editor" />
          </div>
        </section>

        <!-- 40% Resource panel -->
        <aside class="min-h-0 flex flex-col bg-muted/20">
          <div class="shrink-0 border-b border-border px-4 pt-4">
            <div class="flex rounded-lg bg-muted p-1">
              <button
                v-if="resourceSeriesId"
                @click="activeTab = 'series'"
                :class="['resource-tab', activeTab === 'series' ? 'resource-tab-active' : '']"
              >
                Series Details
              </button>
              <button
                @click="activeTab = 'brainstorm'"
                :class="['resource-tab', activeTab === 'brainstorm' ? 'resource-tab-active' : '']"
              >
                Brainstorm
              </button>
              <button
                @click="activeTab = 'research'"
                :class="['resource-tab', activeTab === 'research' ? 'resource-tab-active' : '']"
              >
                Research
              </button>
              <button
                @click="activeTab = 'assist'"
                :class="['resource-tab', activeTab === 'assist' ? 'resource-tab-active' : '']"
              >
                Sermon Assist
              </button>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <!-- Series Details -->
            <div v-show="activeTab === 'series'" class="space-y-4">
              <div v-if="!resourceSeriesId" class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                This is a standalone sermon. Link it to a series later if you want series details, brainstorms, and research to appear here.
              </div>

              <div v-else-if="seriesLoading" class="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                <Loader2 class="h-4 w-4 animate-spin" />
                Loading series details...
              </div>

              <div v-else-if="seriesDetail?.series" class="space-y-4">
                <div class="rounded-xl border border-border bg-card p-5 space-y-2">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Layers class="h-3.5 w-3.5" />
                    Series
                  </div>
                  <h2 class="text-xl font-semibold text-foreground">{{ seriesDetail.series.title }}</h2>
                  <p v-if="seriesDetail.series.tagline" class="text-sm text-muted-foreground">{{ seriesDetail.series.tagline }}</p>
                  <p v-if="seriesDetail.series.description" class="text-sm leading-relaxed text-muted-foreground">{{ seriesDetail.series.description }}</p>
                </div>

                <div v-if="seriesDetail.series.seriesArc" class="rounded-xl border border-border bg-card p-5 space-y-2">
                  <h3 class="text-sm font-semibold text-foreground">Series Arc</h3>
                  <p class="text-sm leading-relaxed text-muted-foreground">{{ seriesDetail.series.seriesArc }}</p>
                </div>

                <div class="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <FileText class="h-3.5 w-3.5" />
                    Sermons in this series
                  </div>

                  <div v-if="seriesSermons.length" class="space-y-2">
                    <button
                      v-for="sermon in seriesSermons"
                      :key="sermon._id"
                      @click="openSermon(sermon)"
                      class="group w-full rounded-lg bg-muted/50 p-3 text-left transition-colors hover:bg-muted"
                    >
                      <div class="flex items-start gap-3">
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-foreground truncate">{{ sermon.title || 'Untitled sermon' }}</div>
                          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span v-if="sermon.scriptureRef">{{ sermon.scriptureRef }}</span>
                            <span v-if="sermon.scriptureRef">•</span>
                            <span>{{ formatDate(sermon.createdAt) }}</span>
                          </div>
                        </div>
                        <ChevronRight class="mt-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </div>
                    </button>
                  </div>

                  <p v-else class="text-sm text-muted-foreground">
                    No sermons have been created under this series yet.
                  </p>
                </div>

                <div v-if="seriesDetail.weeks?.length" class="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 class="text-sm font-semibold text-foreground">Weekly Breakdown</h3>
                  <div class="space-y-2">
                    <div v-for="week in seriesDetail.weeks" :key="week._id" class="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{{ week.weekNumber }}</span>
                        <div class="text-sm font-medium text-foreground">{{ week.sermonTitle || 'Untitled week' }}</div>
                      </div>
                      <p v-if="week.scriptureRef" class="text-xs text-muted-foreground">{{ week.scriptureRef }}</p>
                      <p v-if="week.bigIdea" class="text-xs text-muted-foreground">{{ week.bigIdea }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Series details could not be found.
              </div>
            </div>

            <!-- Brainstorm -->
            <div v-show="activeTab === 'brainstorm'" class="space-y-3">
              <div v-if="selectedBrainstorm" class="space-y-3">
                <button @click="selectedBrainstorm = null" class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <ArrowLeft class="h-3.5 w-3.5" />
                  Back to brainstorms
                </button>
                <div class="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles class="h-3.5 w-3.5" />
                    Brainstorm Brief
                  </div>
                  <h3 class="text-lg font-semibold text-foreground">{{ selectedBrainstorm.passage }}</h3>
                  <p v-if="selectedBrainstorm.bigIdea" class="text-sm text-muted-foreground">{{ selectedBrainstorm.bigIdea }}</p>
                  <div class="prose prose-sm prose-slate max-w-none" @click="handleMarkdownClick" v-html="renderMarkdown(selectedBrainstorm.content)" />
                </div>
              </div>

              <template v-else>
                <div v-if="!resourceSeriesId" class="rounded-xl border border-border bg-card p-4 space-y-1">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles class="h-3.5 w-3.5" />
                    Latest brainstorms
                  </div>
                  <p class="text-sm text-muted-foreground">Showing the 5 most recent brainstorm briefs from your notebook.</p>
                </div>
                <div v-if="brainstormBriefs.length" class="space-y-2">
                  <button
                    v-for="brief in brainstormBriefs"
                    :key="brief._id"
                    @click="selectBrainstorm(brief)"
                    class="group w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-amber-300/60 hover:bg-amber-500/5"
                  >
                    <div class="flex items-start gap-3">
                      <Sparkles class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-foreground truncate">{{ brief.passage }}</div>
                        <p v-if="brief.bigIdea" class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ brief.bigIdea }}</p>
                        <p class="mt-1 text-[11px] text-muted-foreground">{{ formatDate(brief.createdAt) }}</p>
                      </div>
                      <ChevronRight class="mt-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </button>
                </div>
                <div v-else class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                  {{ resourceSeriesId ? 'No brainstorm briefs are linked to this series yet.' : 'No brainstorm briefs found yet.' }}
                </div>
              </template>
            </div>

            <!-- Sermon Assist -->
            <div v-show="activeTab === 'assist'" class="space-y-3">
              <div class="rounded-xl border border-border bg-card p-4 space-y-2">
                <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles class="h-3.5 w-3.5" />
                  Sermon Companion
                </div>
                <p class="text-sm text-muted-foreground">
                  Use this chat for in-writing sermon help: illustration options, tighter transitions, theological clarification, and quick verse support.
                </p>
              </div>

              <div class="h-[70vh] overflow-hidden rounded-xl border border-border bg-card">
                <SkillChat
                  skillSlug="sermon-companion"
                  title="Sermon Assist"
                  subtitle="Conversational help while you write"
                  initialMessage="I'm writing my sermon and want focused help as I go."
                  aiRole="generator"
                  :embedded="true"
                />
              </div>
            </div>

            <!-- Research -->
            <div v-show="activeTab === 'research'" class="space-y-3">
              <div v-if="selectedResearch" class="space-y-3">
                <button @click="selectedResearch = null" class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <ArrowLeft class="h-3.5 w-3.5" />
                  Back to research
                </button>
                <div class="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Search class="h-3.5 w-3.5" />
                    Research Note
                  </div>
                  <h3 class="text-lg font-semibold text-foreground">{{ selectedResearch.scriptureRef }}</h3>
                  <p v-if="selectedResearch.topicOrAngle" class="text-sm text-muted-foreground">{{ selectedResearch.topicOrAngle }}</p>
                  <div class="prose prose-sm prose-slate max-w-none" @click="handleMarkdownClick" v-html="renderMarkdown(selectedResearch.content)" />
                </div>
              </div>

              <template v-else>
                <div v-if="!resourceSeriesId" class="rounded-xl border border-border bg-card p-4 space-y-1">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Search class="h-3.5 w-3.5" />
                    Latest research
                  </div>
                  <p class="text-sm text-muted-foreground">Showing the 5 most recent research notes from your notebook.</p>
                </div>
                <div v-if="researchNotes.length" class="space-y-2">
                  <button
                    v-for="note in researchNotes"
                    :key="note._id"
                    @click="selectResearch(note)"
                    class="group w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-blue-300/60 hover:bg-blue-500/5"
                  >
                    <div class="flex items-start gap-3">
                      <Search class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-foreground truncate">{{ note.scriptureRef }}</div>
                        <p v-if="note.topicOrAngle" class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ note.topicOrAngle }}</p>
                        <p class="mt-1 text-[11px] text-muted-foreground">{{ formatDate(note.createdAt) }}</p>
                      </div>
                      <ChevronRight class="mt-1 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </button>
                </div>
                <div v-else class="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                  {{ resourceSeriesId ? 'No research notes are linked to this series yet.' : 'No research notes found yet.' }}
                </div>
              </template>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </div>
</template>

<style scoped>
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  transition: background-color 150ms ease, color 150ms ease;
}
.toolbar-btn:hover,
.toolbar-active {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
.resource-tab {
  flex: 1;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.resource-tab:hover {
  color: hsl(var(--foreground));
}
.resource-tab-active {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}
:deep(.sermon-editor p.is-editor-empty:first-child::before) {
  color: hsl(var(--muted-foreground));
  content: 'Start writing your sermon...';
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
