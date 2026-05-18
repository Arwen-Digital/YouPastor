<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Loader2, BookOpen, Check, AlertCircle } from 'lucide-vue-next'
import { marked } from 'marked'
import type { ChurchSocialPreview, SaveStatus } from '@/composables/useSaveChurchSocial'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{
  saveStatus: SaveStatus
  preview: ChurchSocialPreview | null
  saveError: string | null
  isSaving: boolean
  savedId: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: ChurchSocialPreview): void
  (e: 'close'): void
  (e: 'retry'): void
}>()

const form = ref<ChurchSocialPreview | null>(null)

watch(() => props.preview, (newPreview) => {
  if (newPreview) form.value = { ...newPreview }
}, { immediate: true })

const canSave = computed(() =>
  form.value && form.value.title.trim().length > 0 && form.value.content.trim().length > 0
)

const contentPreview = computed(() => {
  if (!form.value?.content) return ''
  return marked.parse(form.value.content.slice(0, 3000)) as string
})

function handleSave() {
  if (!canSave.value || props.isSaving || !form.value) return
  emit('save', form.value)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="bg-background border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen class="h-4 w-4 text-primary" />
          </div>
          <h2 class="text-lg font-semibold text-foreground">Save Church Social Post</h2>
        </div>
        <button @click="$emit('close')" class="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div v-if="saveStatus === 'saved' && savedId" class="flex-1 flex flex-col items-center justify-center py-12 px-6 space-y-4">
        <div class="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
          <Check class="h-8 w-8 text-primary-foreground" />
        </div>
        <h3 class="text-xl font-semibold text-foreground">Saved!</h3>
        <p class="text-sm text-muted-foreground text-center max-w-sm">Your Church Social Post was saved to the Notebook.</p>
        <button @click="$emit('close')" class="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Done</button>
      </div>

      <div v-else-if="saveStatus === 'extracting'" class="flex-1 flex flex-col items-center justify-center py-16 px-6 space-y-4">
        <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Preparing save...</h3>
        <p class="text-sm text-muted-foreground">Extracting final social post output from your conversation.</p>
      </div>

      <div v-else-if="saveStatus === 'error' && !preview" class="flex-1 flex flex-col items-center justify-center py-12 px-6 space-y-4">
        <div class="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle class="h-6 w-6 text-destructive" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Could not find final output</h3>
        <p class="text-sm text-muted-foreground text-center">{{ saveError || 'Make sure the final Church Social Post output has been generated.' }}</p>
        <div class="flex items-center gap-3">
          <button @click="$emit('retry')" class="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Try Again</button>
          <button @click="$emit('close')" class="rounded-md px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        </div>
      </div>

      <div v-else-if="form" class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <p class="text-sm text-muted-foreground">Review your output before saving.</p>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Title *</label>
          <input v-model="form.title" type="text" class="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-foreground">Preview</label>
          <div class="rounded-lg border border-border bg-muted/30 p-4 max-h-80 overflow-y-auto prose prose-sm prose-slate max-w-none">
            <div v-if="contentPreview" v-html="contentPreview" />
          </div>
        </div>
      </div>

      <div v-if="form && saveStatus !== 'saved'" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
        <button @click="$emit('close')" class="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button @click="handleSave" :disabled="!canSave || isSaving" class="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <span>{{ isSaving ? 'Saving...' : 'Save to Notebook' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
