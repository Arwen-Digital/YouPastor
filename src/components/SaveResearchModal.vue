<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { X, Loader2, BookOpen, Check, AlertCircle } from 'lucide-vue-next'
import { marked } from 'marked'
import { getConvexClient } from '@/lib/convex'
import type { ResearchPreview, SaveStatus } from '@/composables/useSaveResearch'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{
  saveStatus: SaveStatus
  preview: ResearchPreview | null
  saveError: string | null
  isSaving: boolean
  savedId: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: ResearchPreview): void
  (e: 'close'): void
  (e: 'retry'): void
}>()

// Series list for dropdown
const seriesList = ref<any[]>([])
let seriesUnsub: (() => void) | null = null

onMounted(() => {
  try {
    const client = getConvexClient()
    seriesUnsub = client.onUpdate('series/queries:listMine' as any, {}, (data: any) => {
      seriesList.value = data ?? []
    })
  } catch (err) {
    console.error('[SaveResearchModal] Failed to load series:', err)
  }
})

onUnmounted(() => {
  seriesUnsub?.()
})

const form = ref<ResearchPreview | null>(null)

watch(() => props.preview, (newPreview) => {
  if (newPreview) {
    form.value = { ...newPreview }
  }
}, { immediate: true })

const canSave = computed(() =>
  form.value && form.value.scriptureRef.trim().length > 0 && form.value.content.trim().length > 0
)

const contentPreview = computed(() => {
  if (!form.value?.content) return ''
  return marked.parse(form.value.content.slice(0, 2000)) as string
})

function handleSave() {
  if (!canSave.value || props.isSaving || !form.value) return
  emit('save', form.value)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="bg-background border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen class="h-4 w-4 text-primary" />
          </div>
          <h2 class="text-lg font-semibold text-foreground">Save to Notebook</h2>
        </div>
        <button
          @click="$emit('close')"
          class="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Saved state -->
      <div v-if="saveStatus === 'saved' && savedId" class="flex-1 flex flex-col items-center justify-center py-12 px-6 space-y-4">
        <div class="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
          <Check class="h-8 w-8 text-primary-foreground" />
        </div>
        <h3 class="text-xl font-semibold text-foreground">Research saved!</h3>
        <p class="text-sm text-muted-foreground text-center max-w-sm">
          Your research note has been saved to the Notebook. You can view it anytime.
        </p>
        <button
          @click="$emit('close')"
          class="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>

      <!-- Extracting state -->
      <div v-else-if="saveStatus === 'extracting'" class="flex-1 flex flex-col items-center justify-center py-16 px-6 space-y-4">
        <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
        <div class="text-center space-y-1">
          <h3 class="text-lg font-semibold text-foreground">Preparing your research...</h3>
          <p class="text-sm text-muted-foreground">Pulling the research output from your conversation.</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="saveStatus === 'error' && !preview" class="flex-1 flex flex-col items-center justify-center py-12 px-6 space-y-4">
        <div class="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle class="h-6 w-6 text-destructive" />
        </div>
        <div class="text-center space-y-1">
          <h3 class="text-lg font-semibold text-foreground">Could not find research output</h3>
          <p class="text-sm text-muted-foreground">{{ saveError || 'Make sure the conversation includes the full research results.' }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="$emit('retry')"
            class="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            @click="$emit('close')"
            class="rounded-md px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Preview & edit form -->
      <div v-else-if="form" class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <p class="text-sm text-muted-foreground">
          Review your research before saving. This was extracted from your conversation with the AI.
        </p>

        <!-- Series selector -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Linked Series (optional)</label>
          <select
            v-model="form.seriesId"
            class="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option :value="null">Standalone Research (no series)</option>
            <option v-for="s in seriesList" :key="s._id" :value="s._id">{{ s.title }}</option>
          </select>
          <p class="text-xs text-muted-foreground">Link this research to a sermon series, or keep it standalone.</p>
        </div>

        <!-- Scripture Reference -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Scripture Reference *</label>
          <input
            v-model="form.scriptureRef"
            type="text"
            placeholder="e.g. Romans 8:1-11"
            class="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- Topic/Angle -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Topic or Angle</label>
          <input
            v-model="form.topicOrAngle"
            type="text"
            placeholder="The lens you're preaching through, if any"
            class="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- Content Preview (markdown, truncated) -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">
            Research Content
            <span class="text-muted-foreground font-normal">({{ Math.round(form.content.length / 1000) }}k characters)</span>
          </label>
          <div class="rounded-lg border border-border bg-muted/30 p-4 max-h-64 overflow-y-auto prose prose-sm prose-slate max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-h2:text-sm prose-h2:font-semibold prose-h3:text-xs prose-h3:font-semibold prose-p:my-1 prose-p:text-xs prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-table:text-xs prose-strong:text-foreground">
            <div v-if="contentPreview" v-html="contentPreview" />
            <p v-else class="text-xs text-muted-foreground italic">No research content found.</p>
          </div>
          <p class="text-xs text-muted-foreground">The full research output will be saved as formatted markdown.</p>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="form && saveStatus !== 'saved'" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
        <button
          @click="$emit('close')"
          class="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleSave"
          :disabled="!canSave || isSaving"
          class="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <span>{{ isSaving ? 'Saving...' : 'Save to Notebook' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>