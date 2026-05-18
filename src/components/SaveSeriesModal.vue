<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Loader2, BookOpen, Check, AlertCircle } from 'lucide-vue-next'
import type { SeriesPreview, SaveStatus } from '@/composables/useSaveSeries'

const props = defineProps<{
  saveStatus: SaveStatus
  preview: SeriesPreview | null
  saveError: string | null
  isSaving: boolean
  savedId: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: SeriesPreview): void
  (e: 'close'): void
  (e: 'retry'): void
}>()

// Local editable copy — only initialized when preview arrives
const form = ref<SeriesPreview | null>(null)

// When preview data arrives (extraction complete), initialize the form
watch(() => props.preview, (newPreview) => {
  if (newPreview) {
    form.value = JSON.parse(JSON.stringify(newPreview))
  }
}, { immediate: true })

const canSave = computed(() => form.value && form.value.title.trim().length > 0)

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
        <h3 class="text-xl font-semibold text-foreground">Series saved!</h3>
        <p class="text-sm text-muted-foreground text-center max-w-sm">
          Your series plan has been saved to the Notebook. You can view and edit it anytime from the Series Planner.
        </p>
        <button
          @click="$emit('close')"
          class="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>

      <!-- Extracting state — AI is reading the conversation -->
      <div v-else-if="saveStatus === 'extracting'" class="flex-1 flex flex-col items-center justify-center py-16 px-6 space-y-4">
        <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
        <div class="text-center space-y-1">
          <h3 class="text-lg font-semibold text-foreground">Reading your conversation...</h3>
          <p class="text-sm text-muted-foreground">Extracting your series plan details from the chat.</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="saveStatus === 'error' && !preview" class="flex-1 flex flex-col items-center justify-center py-12 px-6 space-y-4">
        <div class="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle class="h-6 w-6 text-destructive" />
        </div>
        <div class="text-center space-y-1">
          <h3 class="text-lg font-semibold text-foreground">Could not extract series data</h3>
          <p class="text-sm text-muted-foreground">{{ saveError || 'The AI could not parse a series plan from this conversation. Try adding more details and try again.' }}</p>
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
      <div v-else-if="form" class="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <p class="text-sm text-muted-foreground">
          Review and edit your series plan before saving. This was extracted from your conversation with the Series Planner.
        </p>

        <!-- Title -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Series Title *</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="e.g. Faith That Works"
            class="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- Tagline -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Tagline</label>
          <input
            v-model="form.tagline"
            type="text"
            placeholder="One-sentence tagline for the series"
            class="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Description</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Brief description of the series"
            class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <!-- Series Arc -->
        <div v-if="form.seriesArc" class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Series Arc</label>
          <textarea
            v-model="form.seriesArc"
            rows="2"
            class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <!-- Practical notes -->
        <div v-if="form.scopeAssessment || form.durationCheck || form.specialAttention || form.launchRecommendation" class="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <p class="text-sm font-medium text-foreground">Planning Notes</p>

          <div v-if="form.scopeAssessment" class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope Assessment</label>
            <textarea
              v-model="form.scopeAssessment"
              rows="2"
              class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div v-if="form.durationCheck" class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration Check</label>
            <textarea
              v-model="form.durationCheck"
              rows="2"
              class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div v-if="form.specialAttention" class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Special Attention</label>
            <textarea
              v-model="form.specialAttention"
              rows="2"
              class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div v-if="form.launchRecommendation" class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Launch Recommendation</label>
            <textarea
              v-model="form.launchRecommendation"
              rows="2"
              class="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <!-- Weeks table -->
        <div v-if="form.weeks.length > 0" class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            Weekly Breakdown
            <span class="text-muted-foreground font-normal">({{ form.weeks.length }} weeks)</span>
          </label>

          <div class="space-y-3">
            <div
              v-for="(week, idx) in form.weeks"
              :key="idx"
              class="rounded-lg border border-border bg-card p-3 space-y-2"
            >
              <div class="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Week {{ week.weekNumber }}
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Sermon Title</label>
                  <input
                    v-model="week.sermonTitle"
                    type="text"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Scripture</label>
                  <input
                    v-model="week.scriptureRef"
                    type="text"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">Big Idea</label>
                <input
                  v-model="week.bigIdea"
                  type="text"
                  class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">Connective Thread</label>
                <input
                  v-model="week.connectiveThread"
                  type="text"
                  class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer — only show when we have a form to save -->
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
          class="save-notebook-btn px-5 py-2 text-sm font-medium"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <span>{{ isSaving ? 'Saving...' : 'Save to Notebook' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>