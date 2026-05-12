<script setup lang="ts">
import { ref, nextTick, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Send, ArrowLeft, Loader2 } from 'lucide-vue-next'
import { marked } from 'marked'
import { useAI } from '@/composables/useAI'
import { buildSystemPrompt } from '@/lib/skills'

const props = defineProps<{
  skillSlug: string
  title: string
  subtitle: string
  initialMessage: string
  aiRole?: 'orchestrator' | 'generator' | 'researcher'
}>()

const router = useRouter()
const role = props.aiRole ?? 'generator'
const { isLoading, streamingContent, error, streamMessage, sendMessage } = useAI(role)

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

marked.setOptions({ breaks: true, gfm: true })

const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const systemPrompt = buildSystemPrompt(props.skillSlug)

function renderMarkdown(content: string): string {
  return marked.parse(content) as string
}

const renderedStreaming = computed(() => {
  if (!streamingContent.value) return ''
  return marked.parse(streamingContent.value) as string
})

function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

watch(streamingContent, () => scrollToBottom())
watch(isLoading, (loading) => { if (loading) scrollToBottom() })

onMounted(async () => {
  messages.value.push({ role: 'user', content: props.initialMessage })
  scrollToBottom()

  const result = await sendMessage([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: props.initialMessage },
  ])

  if (result) {
    messages.value.push({ role: 'assistant', content: result.content })
  }

  scrollToBottom()
})

async function handleSend() {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return

  userInput.value = ''
  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  const chatHistory: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.value,
  ]

  await streamMessage(chatHistory as any)

  if (streamingContent.value) {
    messages.value.push({ role: 'assistant', content: streamingContent.value })
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh)]">
    <div class="flex items-center gap-3 border-b px-6 py-3 bg-background">
      <button
        @click="router.push('/')"
        class="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <div>
        <h2 class="text-sm font-semibold text-foreground">{{ title }}</h2>
        <p class="text-xs text-muted-foreground">{{ subtitle }}</p>
      </div>
    </div>

    <div ref="messagesContainer" class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
      >
        <div
          v-if="msg.role === 'user'"
          class="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-sm leading-relaxed"
        >{{ msg.content }}</div>
        <div
          v-else
          class="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm leading-relaxed prose prose-sm prose-slate max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-h2:text-base prose-h2:font-semibold prose-h3:text-sm prose-h3:font-semibold prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-hr:border-border prose-hr:my-3"
          v-html="renderMarkdown(msg.content)"
        />
      </div>

      <div v-if="isLoading && streamingContent" class="flex justify-start">
        <div
          class="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm leading-relaxed prose prose-sm prose-slate max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-h2:text-base prose-h2:font-semibold prose-h3:text-sm prose-h3:font-semibold prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground prose-hr:border-border prose-hr:my-3"
          v-html="renderedStreaming"
        /><span class="animate-pulse ml-0.5 text-muted-foreground">|</span>
      </div>

      <div v-if="isLoading && !streamingContent" class="flex justify-start">
        <div class="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" />
          Thinking...
        </div>
      </div>

      <div v-if="error" class="flex justify-center">
        <div class="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive max-w-[80%]">
          <p class="font-semibold mb-1">Something went wrong</p>
          <p>{{ error.message || String(error) }}</p>
        </div>
      </div>

      <div />
    </div>

    <div class="border-t px-6 py-4 bg-background">
      <div class="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          v-model="userInput"
          @keydown.enter.exact.prevent="handleSend"
          placeholder="Type your response..."
          rows="1"
          class="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring transition-colors"
          :disabled="isLoading"
        />
        <button
          @click="handleSend"
          :disabled="!userInput.trim() || isLoading"
          :class="[
            'rounded-xl p-3 transition-colors shrink-0',
            userInput.trim() && !isLoading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground',
          ]"
        >
          <Send class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
