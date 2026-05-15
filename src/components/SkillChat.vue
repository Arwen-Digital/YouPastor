<script setup lang="ts">
import { ref, nextTick, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Send, ArrowLeft, Loader2, BookOpen } from 'lucide-vue-next'
import { marked } from 'marked'
import { useAI } from '@/composables/useAI'
import { buildSystemPrompt, buildContextBlock, type ChurchContext } from '@/lib/skills'
import { useConvexQuery } from '@/composables/useConvexQuery'
import { useSaveSeries } from '@/composables/useSaveSeries'
import { useSaveResearch } from '@/composables/useSaveResearch'
import { useSaveBrainstorm } from '@/composables/useSaveBrainstorm'
import { useSaveAgenda } from '@/composables/useSaveAgenda'
import { useSaveDevotional } from '@/composables/useSaveDevotional'
import { useSaveBlog } from '@/composables/useSaveBlog'
import { useSaveYoutube } from '@/composables/useSaveYoutube'
import SaveSeriesModal from '@/components/SaveSeriesModal.vue'
import SaveResearchModal from '@/components/SaveResearchModal.vue'
import SaveBrainstormModal from '@/components/SaveBrainstormModal.vue'
import SaveAgendaModal from '@/components/SaveAgendaModal.vue'
import SaveDevotionalModal from '@/components/SaveDevotionalModal.vue'
import SaveBlogModal from '@/components/SaveBlogModal.vue'
import SaveYoutubeModal from '@/components/SaveYoutubeModal.vue'

const INTAKE_PROMPT_BASE = `You are a conversational intake assistant for the Sermon Research skill.

Your goal is to gather 2-3 pieces of information from the pastor before research begins:

1. Scripture passage (e.g., "Romans 8:1-11") — REQUIRED
2. Topic or angle (e.g., "freedom from condemnation") — optional
3. Interpretive questions or tensions they're wrestling with — optional

Instructions:
- Ask ONE question at a time. Wait for the pastor's response before asking the next.
- If the pastor already provided the passage in their message, skip asking for it.
- If the pastor already provided topic/angle or questions, acknowledge them and don't ask again.
- The pastor's church context (church name, pastor name, denomination, attendance, location, Bible translation) is already provided in the system. Do NOT ask for it.
- Keep your messages brief and friendly (1-2 sentences max).
- Once you have the passage and any additional context, respond with a message that starts exactly with "RESEARCH_READY:" followed by a brief summary.

Example RESEARCH_READY messages:
"RESEARCH_READY: Passage: Romans 8:1-11. Topic: Freedom from condemnation. Wrestling questions: none."
"RESEARCH_READY: Passage: John 3:1-21. Topic: Exploring. Wrestling: How to explain being 'born again' without sounding cliché."

NEVER produce research output, commentary, word studies, or sermon content yourself. Your only job is intake.`

const BRAINSTORM_INTAKE_PROMPT = `You are a conversational intake assistant for the Sermon Brainstorm skill.

Your goal is to help the pastor think through their sermon by asking questions one at a time. Draw from this question sequence, adapting based on what the pastor says:

1. What passage or topic are you working with?
2. What's the one thing that jumped out at you when you first read this text?
3. What's your congregation wrestling with right now that this passage speaks to?
4. When you imagine the person in the third row who needs this sermon most, who are they and what are they carrying?
5. If people only remember one sentence from this sermon on Monday morning, what do you want it to be?
6. What's the tension in this text? Where does it push back against what people assume?
7. How does this passage point to the gospel? Where's the good news?
8. Is there something in this text that makes you uncomfortable or that you'd rather skip?
9. What do you want people to DO differently after hearing this?

Instructions:
- Ask ONE question at a time. Wait for the pastor's response before asking the next.
- Skip questions the pastor has already answered.
- If an answer is thin, ask a brief follow-up before moving on.
- After 5-7 exchanges or when the picture is clear, respond with a message that starts exactly with "BRIEF_READY:" followed by a short summary.

Example BRIEF_READY: "BRIEF_READY: Passage: John 11:1-44. Big idea: Jesus weeps with us before He delivers us."

The pastor's church context is already provided in the system. Do NOT ask for it.
NEVER produce the sermon brief yourself. Your only job is intake.`

const RESEARCHER_HANDOFF_NOTE = `\n\nIMPORTANT: The conversation below already contains the pastor's passage and context (marked by RESEARCH_READY). Do not ask follow-up questions. Produce the full 7-section research output immediately based on the information shared.`

const YOUTUBE_INTAKE_PROMPT = `You are a conversational intake assistant for the Sermon to YouTube skill.

Your goal is to gather only the minimum details needed before full YouTube package generation.

Collect these inputs one at a time:
1. Source material confirmation (blog content or sermon notes/transcript)
2. Sermon/video length (optional if unknown)
3. Key moment that landed strongest
4. Primary search query / discovery angle
5. Optional channel/about text

Rules:
- Ask EXACTLY ONE question per message.
- Never ask multiple questions in one turn.
- Keep each intake message brief (1-2 sentences).
- Wait for the pastor's reply before asking the next question.
- Skip any inputs already clearly provided.
- Do not generate titles/descriptions/tags/thumbnails during intake.

When enough info is collected, respond with a message that starts exactly with:
"YOUTUBE_READY:"
Then provide a short one-paragraph summary of collected inputs.

Example:
"YOUTUBE_READY: Source: selected blog post. Length: ~42 minutes. Key moment: the wilderness trust story. Search angle: how to trust God when life falls apart. About text: not provided."`

const props = defineProps<{
  skillSlug: string
  title: string
  subtitle: string
  initialMessage: string
  aiRole?: 'orchestrator' | 'generator' | 'researcher'
}>()

const router = useRouter()
const { isLoading, streamingContent, error, streamMessage, sendMessage, citations, role, setRole } = useAI(
  (props.aiRole ?? 'orchestrator') as any
)

// Determine which save flow to use based on skill
const isSeriesPlanner = props.skillSlug === 'sermon-series'
const isSermonResearch = props.skillSlug === 'sermon-research'
const isSermonBrainstorm = props.skillSlug === 'sermon-brainstorm'
const isMeetingAgenda = props.skillSlug === 'meeting-agenda'
const isMidweekDevotional = props.skillSlug === 'midweek-devotional'
const isSermonToBlog = props.skillSlug === 'sermon-to-blog'
const isSermonToYoutube = props.skillSlug === 'sermon-to-youtube'
const isYoutubeInIntake = ref(isSermonToYoutube)
const canShowSave = isSeriesPlanner || isSermonResearch || isSermonBrainstorm || isMeetingAgenda || isMidweekDevotional || isSermonToBlog || isSermonToYoutube

// Series save flow
const {
  status: seriesSaveStatus,
  preview: seriesPreview,
  error: seriesSaveError,
  savedSeriesId,
  extract: extractSeries,
  save: confirmSaveSeries,
  reset: resetSeriesSave,
} = useSaveSeries()

// Research save flow
const {
  status: researchSaveStatus,
  preview: researchPreview,
  error: researchSaveError,
  savedNoteId,
  extract: extractResearch,
  save: confirmSaveResearch,
  reset: resetResearchSave,
} = useSaveResearch()

// Brainstorm save flow
const {
  status: brainstormSaveStatus,
  preview: brainstormPreview,
  error: brainstormSaveError,
  savedBriefId,
  extract: extractBrainstorm,
  save: confirmSaveBrainstorm,
  reset: resetBrainstormSave,
} = useSaveBrainstorm()

// Agenda save flow
const {
  status: agendaSaveStatus,
  preview: agendaPreview,
  error: agendaSaveError,
  savedAgendaId,
  extract: extractAgenda,
  save: confirmSaveAgenda,
  reset: resetAgendaSave,
} = useSaveAgenda()

// Devotional save flow
const {
  status: devotionalSaveStatus,
  preview: devotionalPreview,
  error: devotionalSaveError,
  savedDevotionalId,
  extract: extractDevotional,
  save: confirmSaveDevotional,
  reset: resetDevotionalSave,
} = useSaveDevotional()

// Blog save flow
const {
  status: blogSaveStatus,
  preview: blogPreview,
  error: blogSaveError,
  savedBlogId,
  extract: extractBlog,
  save: confirmSaveBlog,
  reset: resetBlogSave,
} = useSaveBlog()

// YouTube save flow
const {
  status: youtubeSaveStatus,
  preview: youtubePreview,
  error: youtubeSaveError,
  savedYoutubeId,
  extract: extractYoutube,
  save: confirmSaveYoutube,
  reset: resetYoutubeSave,
} = useSaveYoutube()

const showSaveModal = ref(false)

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

marked.setOptions({ breaks: true, gfm: true })

const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const selectedSermonContext = ref('')
const selectedSermonId = ref<string | null>(null)
const selectedBlogContext = ref('')
const selectedBlogId = ref<string | null>(null)
const hasStartedConversation = ref(false)

// Load church profile from Convex
const { result: churchProfile } = useConvexQuery('profile/queries:getMine' as any)

// Recent saved sermons for sermon-to-blog intake
const { result: recentSermons, isLoading: recentSermonsLoading } = useConvexQuery(
  'sermons/queries:listRecent' as any,
  { limit: 4 }
)

// Recent blog posts for sermon-to-youtube intake
const { result: recentBlogs, isLoading: recentBlogsLoading } = useConvexQuery(
  'blogs/queries:listRecent' as any,
  { limit: 4 }
)

// Derive church context from profile
const churchContext = computed<ChurchContext>(() => ({
  churchName: churchProfile.value?.churchName,
  pastorName: churchProfile.value?.pastorName,
  denomination: churchProfile.value?.denomination,
  averageAttendance: churchProfile.value?.averageAttendance,
  location: churchProfile.value?.location,
  bibleTranslation: churchProfile.value?.bibleTranslation,
}))

// Dynamic system prompt: intake → full skill (reactive to church profile)
const baseSystemPrompt = computed(() => buildSystemPrompt(props.skillSlug, churchContext.value))
const intakePrompt = computed(() => {
  const ctx = churchContext.value
  const ctxBlock = (ctx.churchName || ctx.pastorName)
    ? buildContextBlock(ctx)
    : ''
  return ctxBlock ? `${INTAKE_PROMPT_BASE}\n\n---\n\n${ctxBlock}` : INTAKE_PROMPT_BASE
})
const brainstormIntakePrompt = computed(() => {
  const ctx = churchContext.value
  const ctxBlock = (ctx.churchName || ctx.pastorName)
    ? buildContextBlock(ctx)
    : ''
  return ctxBlock ? `${BRAINSTORM_INTAKE_PROMPT}\n\n---\n\n${ctxBlock}` : BRAINSTORM_INTAKE_PROMPT
})
const youtubeIntakePrompt = computed(() => {
  const ctx = churchContext.value
  const ctxBlock = (ctx.churchName || ctx.pastorName)
    ? buildContextBlock(ctx)
    : ''
  return ctxBlock ? `${YOUTUBE_INTAKE_PROMPT}\n\n---\n\n${ctxBlock}` : YOUTUBE_INTAKE_PROMPT
})
const currentSystemPrompt = ref(
  isSermonResearch ? intakePrompt.value
  : isSermonBrainstorm ? brainstormIntakePrompt.value
  : isSermonToYoutube ? youtubeIntakePrompt.value
  : baseSystemPrompt.value
)

// Update system prompt when church profile loads or changes
watch(baseSystemPrompt, (newPrompt) => {
  // Only update if we're past intake phases
  if (isSermonToYoutube && isYoutubeInIntake.value) return
  if (role.value !== 'orchestrator' || (!isSermonResearch && !isSermonBrainstorm)) {
    currentSystemPrompt.value = newPrompt
  }
})

// Update intake prompt when church profile loads
watch(intakePrompt, (newPrompt) => {
  // Only update if we're still in research intake phase
  if (role.value === 'orchestrator' && isSermonResearch) {
    currentSystemPrompt.value = newPrompt
  }
})

// Update brainstorm intake prompt when church profile loads
watch(brainstormIntakePrompt, (newPrompt) => {
  if (role.value === 'orchestrator' && isSermonBrainstorm) {
    currentSystemPrompt.value = newPrompt
  }
})

watch(youtubeIntakePrompt, (newPrompt) => {
  if (isSermonToYoutube && isYoutubeInIntake.value) {
    currentSystemPrompt.value = newPrompt
  }
})

// Show the save button after enough exchanges
const canSave = computed(() => {
  if (!canShowSave) return false
  if (isLoading.value) return false
  const status = isSeriesPlanner ? seriesSaveStatus.value
    : isSermonBrainstorm ? brainstormSaveStatus.value
    : isMeetingAgenda ? agendaSaveStatus.value
    : isMidweekDevotional ? devotionalSaveStatus.value
    : isSermonToBlog ? blogSaveStatus.value
    : isSermonToYoutube ? youtubeSaveStatus.value
    : researchSaveStatus.value
  if (status !== 'idle' && status !== 'error') return false
  const assistantMsgs = messages.value.filter(m => m.role === 'assistant').length
  // Series planner needs more back-and-forth (6 msgs)
  // Meeting agenda needs at least 3 (assessment + agenda + tips)
  // Devotional needs at least 3 (direction + devotional + polish)
  // Blog/YouTube should generally appear near the end of staged output.
  const threshold = isSeriesPlanner ? 6 : (isSermonToBlog || isSermonToYoutube) ? 4 : (isMeetingAgenda || isMidweekDevotional) ? 3 : 2
  return assistantMsgs >= threshold
})

function renderMarkdown(content: string): string {
  return marked.parse(content) as string
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
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

const showSourceChooser = computed(() => (isSermonToBlog || isSermonToYoutube) && !hasStartedConversation.value)

function getFullSystemPrompt(): string {
  const contextBlocks = [selectedSermonContext.value, selectedBlogContext.value].filter(Boolean)
  return contextBlocks.length
    ? `${currentSystemPrompt.value}\n\n---\n\n${contextBlocks.join('\n\n---\n\n')}`
    : currentSystemPrompt.value
}

function buildChatHistory(): ChatMessage[] {
  return [
    { role: 'system', content: getFullSystemPrompt() },
    ...messages.value,
  ]
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unknown date'
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildSermonContext(sermon: any): string {
  const content = sermon.content?.trim()
  const maxContentChars = 20000
  const sermonContent = content
    ? content.slice(0, maxContentChars) + (content.length > maxContentChars ? '\n\n[Content truncated for prompt length.]' : '')
    : 'No sermon content is saved for this sermon. Use the metadata below and ask the pastor for the outline, transcript, or notes.'

  return `## Selected Sermon From Database

The pastor selected this saved sermon for the Sermon to Blog skill. Use it as the sermon source material. Do NOT ask what they preached on Sunday unless the saved content is missing. Move to the next most useful blog-building question, such as the one sentence they want readers to remember, the strongest illustration, the concrete application, or the SEO/search angle.

Title: ${sermon.title || 'Untitled sermon'}
Scripture: ${sermon.scriptureRef || 'Not provided'}
Status: ${sermon.status || 'Not provided'}
Created: ${formatDate(sermon.createdAt)}

Sermon content:
${sermonContent}`
}

function buildBlogContext(blog: any): string {
  const content = blog.content?.trim()
  const maxContentChars = 20000
  const blogContent = content
    ? content.slice(0, maxContentChars) + (content.length > maxContentChars ? '\n\n[Content truncated for prompt length.]' : '')
    : 'No blog content is saved for this blog post. Use the metadata below and ask the pastor for the core blog output if needed.'

  return `## Selected Blog Post From Database

The pastor selected this saved blog post for the Sermon to YouTube skill. Use it as the source material. Do NOT ask for sermon or blog source content again unless the saved content is missing. Move directly into YouTube optimization questions and staged output.

Title: ${blog.title || 'Untitled blog post'}
Status: ${blog.status || 'Not provided'}
Created: ${formatDate(blog.createdAt)}

Blog content:
${blogContent}`
}

async function handleAssistantResponse(responseContent: string) {
  messages.value.push({ role: 'assistant', content: responseContent })

  // Detect intake handoff and automatically switch to researcher
  if (isSermonResearch && role.value === 'orchestrator' && responseContent.includes('RESEARCH_READY:')) {
    await handoffToResearcher()
  }

  // Detect brainstorm handoff and generate the brief
  if (isSermonBrainstorm && role.value === 'orchestrator' && responseContent.includes('BRIEF_READY:')) {
    await handoffToBriefGenerator()
  }

  // Detect youtube intake handoff and generate package
  if (isSermonToYoutube && isYoutubeInIntake.value && responseContent.includes('YOUTUBE_READY:')) {
    await handoffToYoutubePackager()
  }
}

async function startConversation(userMessage: string) {
  if (hasStartedConversation.value || isLoading.value) return

  hasStartedConversation.value = true
  messages.value.push({ role: 'user', content: userMessage })
  scrollToBottom()

  const result = await sendMessage(buildChatHistory() as any)

  if (result) {
    await handleAssistantResponse(result.content)
  }

  scrollToBottom()
}

async function handleSermonSelect(sermon: any) {
  selectedSermonId.value = sermon._id
  selectedSermonContext.value = buildSermonContext(sermon)
  await startConversation(`I'd like to turn my saved sermon "${sermon.title || 'Untitled sermon'}" into a blog post.`)
}

async function handleBlogSelect(blog: any) {
  selectedBlogId.value = blog._id
  selectedBlogContext.value = buildBlogContext(blog)
  await startConversation(`I'd like to turn my saved blog post "${blog.title || 'Untitled blog post'}" into a YouTube package.`)
}

async function handleStartWithoutSavedSource() {
  await startConversation(props.initialMessage)
}

onMounted(async () => {
  if (isSermonToBlog || isSermonToYoutube) return
  await startConversation(props.initialMessage)
})

/** Switch from orchestrator intake to researcher model and trigger research generation */
async function handoffToResearcher() {
  setRole('researcher')
  currentSystemPrompt.value = baseSystemPrompt.value + RESEARCHER_HANDOFF_NOTE

  // Add a user message to trigger the researcher response
  const triggerMsg = 'Please pull together the full research output for me.'
  messages.value.push({ role: 'user', content: triggerMsg })
  scrollToBottom()

  await streamMessage(buildChatHistory() as any)

  if (streamingContent.value) {
    messages.value.push({ role: 'assistant', content: streamingContent.value })
  }

  scrollToBottom()
}

/** Switch from orchestrator intake to brief generation for sermon brainstorm */
async function handoffToBriefGenerator() {
  // Brainstorm doesn't need a model switch — orchestrator handles both phases.
  // Just swap the system prompt to the full skill prompt.
  currentSystemPrompt.value = baseSystemPrompt.value

  // Add a user message to trigger the brief generation
  const triggerMsg = 'Please generate the Expanded Sermon Brief now.'
  messages.value.push({ role: 'user', content: triggerMsg })
  scrollToBottom()

  await streamMessage(buildChatHistory() as any)

  if (streamingContent.value) {
    messages.value.push({ role: 'assistant', content: streamingContent.value })
  }

  scrollToBottom()
}

/** Switch from youtube intake to full youtube package generation */
async function handoffToYoutubePackager() {
  isYoutubeInIntake.value = false
  currentSystemPrompt.value = baseSystemPrompt.value

  const triggerMsg = 'Please generate the complete YouTube package now.'
  messages.value.push({ role: 'user', content: triggerMsg })
  scrollToBottom()

  await streamMessage(buildChatHistory() as any)

  if (streamingContent.value) {
    messages.value.push({ role: 'assistant', content: streamingContent.value })
  }

  scrollToBottom()
}

async function handleSend() {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return

  userInput.value = ''
  hasStartedConversation.value = true
  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  await streamMessage(buildChatHistory() as any)

  if (streamingContent.value) {
    await handleAssistantResponse(streamingContent.value)
  }
}

async function handleSaveClick() {
  if (isLoading.value) return

  // Reset any previous error state
  if (isSeriesPlanner) resetSeriesSave()
  if (isSermonResearch) resetResearchSave()
  if (isSermonBrainstorm) resetBrainstormSave()
  if (isMeetingAgenda) resetAgendaSave()
  if (isMidweekDevotional) resetDevotionalSave()
  if (isSermonToBlog) resetBlogSave()
  if (isSermonToYoutube) resetYoutubeSave()

  const extractionMessages: ChatMessage[] = messages.value
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  showSaveModal.value = true

  if (isSeriesPlanner) {
    await extractSeries(extractionMessages as any, role.value)
  } else if (isSermonResearch) {
    await extractResearch(extractionMessages as any, role.value)
  } else if (isSermonBrainstorm) {
    await extractBrainstorm(extractionMessages as any)
  } else if (isMeetingAgenda) {
    await extractAgenda(extractionMessages as any)
  } else if (isMidweekDevotional) {
    await extractDevotional(extractionMessages as any)
  } else if (isSermonToBlog) {
    await extractBlog(extractionMessages as any, selectedSermonId.value)
  } else if (isSermonToYoutube) {
    await extractYoutube(extractionMessages as any, selectedBlogId.value)
  }
}

function handleSaveConfirmSeries(data: any) {
  confirmSaveSeries(data)
}

function handleSaveConfirmResearch(data: any) {
  confirmSaveResearch(data)
}

function handleSaveConfirmBrainstorm(data: any) {
  confirmSaveBrainstorm(data)
}

function handleSaveConfirmAgenda(data: any) {
  confirmSaveAgenda(data)
}

function handleSaveConfirmDevotional(data: any) {
  confirmSaveDevotional(data)
}

function handleSaveConfirmBlog(data: any) {
  confirmSaveBlog(data)
}

function handleSaveConfirmYoutube(data: any) {
  confirmSaveYoutube(data)
}

function handleSaveModalClose() {
  showSaveModal.value = false
  if (isSeriesPlanner && seriesSaveStatus.value === 'saved' && savedSeriesId.value) {
    const seriesId = savedSeriesId.value
    resetSeriesSave()
    router.push(`/notebook/${seriesId}`)
  } else if (isSermonResearch && researchSaveStatus.value === 'saved' && savedNoteId.value) {
    const noteId = savedNoteId.value
    resetResearchSave()
    router.push(`/notebook/research/${noteId}`)
  } else if (isSermonBrainstorm && brainstormSaveStatus.value === 'saved' && savedBriefId.value) {
    const briefId = savedBriefId.value
    resetBrainstormSave()
    router.push(`/notebook/brainstorm/${briefId}`)
  } else if (isMeetingAgenda && agendaSaveStatus.value === 'saved' && savedAgendaId.value) {
    const agendaId = savedAgendaId.value
    resetAgendaSave()
    router.push(`/notebook/agenda/${agendaId}`)
  } else if (isMidweekDevotional && devotionalSaveStatus.value === 'saved' && savedDevotionalId.value) {
    const devotionalId = savedDevotionalId.value
    resetDevotionalSave()
    router.push(`/notebook/devotional/${devotionalId}`)
  } else if (isSermonToBlog && blogSaveStatus.value === 'saved' && savedBlogId.value) {
    const blogId = savedBlogId.value
    resetBlogSave()
    router.push(`/notebook/blog/${blogId}`)
  } else if (isSermonToYoutube && youtubeSaveStatus.value === 'saved' && savedYoutubeId.value) {
    const youtubeId = savedYoutubeId.value
    resetYoutubeSave()
    router.push(`/notebook/youtube/${youtubeId}`)
  } else if (seriesSaveStatus.value === 'saved') {
    resetSeriesSave()
    router.push('/notebook')
  } else if (researchSaveStatus.value === 'saved') {
    resetResearchSave()
    router.push('/notebook')
  } else if (brainstormSaveStatus.value === 'saved') {
    resetBrainstormSave()
    router.push('/notebook')
  } else if (agendaSaveStatus.value === 'saved') {
    resetAgendaSave()
    router.push('/notebook')
  } else if (devotionalSaveStatus.value === 'saved') {
    resetDevotionalSave()
    router.push('/notebook')
  } else if (blogSaveStatus.value === 'saved') {
    resetBlogSave()
    router.push('/notebook')
  } else if (youtubeSaveStatus.value === 'saved') {
    resetYoutubeSave()
    router.push('/notebook')
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh)]">
    <div class="flex items-center gap-3 border-b px-4 py-3 bg-background shrink-0">
      <button
        @click="router.push('/')"
        class="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-semibold text-foreground truncate">{{ title }}</h2>
        <p class="text-xs text-muted-foreground truncate">{{ subtitle }}</p>
      </div>

      <!-- Save to Notebook button -->
      <button
        v-if="canShowSave"
        @click="handleSaveClick"
        :disabled="!canSave"
        :class="[
          'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all shrink-0 whitespace-nowrap',
          canSave
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
        ]"
      >
        <BookOpen class="h-4 w-4" />
        <span>Save to Notebook</span>
      </button>
    </div>

    <div ref="messagesContainer" class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div v-if="showSourceChooser" class="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <template v-if="isSermonToBlog">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-foreground">Choose a sermon to turn into a blog post</h3>
            <p class="text-xs text-muted-foreground">Select one of your 4 most recent saved sermons, or start without a saved sermon.</p>
          </div>

          <div v-if="recentSermonsLoading" class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            Loading recent sermons...
          </div>

          <div v-else-if="recentSermons?.length" class="grid gap-2">
            <button
              v-for="sermon in recentSermons"
              :key="sermon._id"
              @click="handleSermonSelect(sermon)"
              :disabled="isLoading"
              class="group w-full rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <div class="text-sm font-medium text-foreground truncate">{{ sermon.title || 'Untitled sermon' }}</div>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span v-if="sermon.scriptureRef">{{ sermon.scriptureRef }}</span>
                    <span v-if="sermon.scriptureRef">•</span>
                    <span>{{ formatDate(sermon.createdAt) }}</span>
                  </div>
                  <p v-if="sermon.content" class="text-xs text-muted-foreground line-clamp-2 pt-1">
                    {{ stripHtml(sermon.content).slice(0, 180) }}{{ stripHtml(sermon.content).length > 180 ? '...' : '' }}
                  </p>
                </div>
                <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize group-hover:bg-primary/10 group-hover:text-primary">
                  {{ sermon.status }}
                </span>
              </div>
            </button>
          </div>

          <div v-else class="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            No saved sermons found yet. You can still paste sermon notes, an outline, or a transcript.
          </div>

          <button
            @click="handleStartWithoutSavedSource"
            :disabled="isLoading"
            class="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Start without a saved sermon
          </button>
        </template>

        <template v-else-if="isSermonToYoutube">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-foreground">Choose a blog post to turn into a YouTube package</h3>
            <p class="text-xs text-muted-foreground">Select one of your 4 most recent saved blog posts, or start without a saved blog post.</p>
          </div>

          <div v-if="recentBlogsLoading" class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 class="h-4 w-4 animate-spin" />
            Loading recent blog posts...
          </div>

          <div v-else-if="recentBlogs?.length" class="grid gap-2">
            <button
              v-for="blog in recentBlogs"
              :key="blog._id"
              @click="handleBlogSelect(blog)"
              :disabled="isLoading"
              class="group w-full rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <div class="text-sm font-medium text-foreground truncate">{{ blog.title || 'Untitled blog post' }}</div>
                  <div class="text-xs text-muted-foreground">{{ formatDate(blog.createdAt) }}</div>
                  <p v-if="blog.content" class="text-xs text-muted-foreground line-clamp-2 pt-1">
                    {{ stripHtml(blog.content).slice(0, 180) }}{{ stripHtml(blog.content).length > 180 ? '...' : '' }}
                  </p>
                </div>
                <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize group-hover:bg-primary/10 group-hover:text-primary">
                  {{ blog.status }}
                </span>
              </div>
            </button>
          </div>

          <div v-else class="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            No saved blog posts found yet. You can still paste your current blog draft content.
          </div>

          <button
            @click="handleStartWithoutSavedSource"
            :disabled="isLoading"
            class="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Start without a saved blog post
          </button>
        </template>
      </div>

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

    <!-- Citations bar (Perplexity/Sonar sources) -->
    <div v-if="isSermonResearch && citations.length > 0" class="border-t px-6 py-3 bg-muted/30 shrink-0">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span class="text-xs font-medium text-muted-foreground">Sources</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="(url, idx) in citations"
            :key="idx"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 rounded-md bg-background border border-border px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            <span class="font-medium">{{ idx + 1 }}</span>
            <span class="truncate max-w-[200px]">{{ getHostname(url) }}</span>
          </a>
        </div>
      </div>
    </div>

    <div class="border-t px-6 py-4 bg-background shrink-0">
      <div class="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          v-model="userInput"
          @keydown.enter.exact.prevent="handleSend"
          placeholder="Type your response..."
          rows="1"
          class="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring transition-colors"
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

    <!-- Save modals -->
    <SaveSeriesModal
      v-if="showSaveModal && isSeriesPlanner"
      :save-status="seriesSaveStatus"
      :preview="seriesPreview"
      :save-error="seriesSaveError"
      :is-saving="seriesSaveStatus === 'saving'"
      :saved-id="savedSeriesId"
      @save="handleSaveConfirmSeries"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />

    <SaveResearchModal
      v-if="showSaveModal && isSermonResearch"
      :save-status="researchSaveStatus"
      :preview="researchPreview"
      :save-error="researchSaveError"
      :is-saving="researchSaveStatus === 'saving'"
      :saved-id="savedNoteId"
      @save="handleSaveConfirmResearch"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />

    <SaveBrainstormModal
      v-if="showSaveModal && isSermonBrainstorm"
      :save-status="brainstormSaveStatus"
      :preview="brainstormPreview"
      :save-error="brainstormSaveError"
      :is-saving="brainstormSaveStatus === 'saving'"
      :saved-id="savedBriefId"
      @save="handleSaveConfirmBrainstorm"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />

    <SaveAgendaModal
      v-if="showSaveModal && isMeetingAgenda"
      :save-status="agendaSaveStatus"
      :preview="agendaPreview"
      :save-error="agendaSaveError"
      :is-saving="agendaSaveStatus === 'saving'"
      :saved-id="savedAgendaId"
      @save="handleSaveConfirmAgenda"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />

    <SaveDevotionalModal
      v-if="showSaveModal && isMidweekDevotional"
      :save-status="devotionalSaveStatus"
      :preview="devotionalPreview"
      :save-error="devotionalSaveError"
      :is-saving="devotionalSaveStatus === 'saving'"
      :saved-id="savedDevotionalId"
      @save="handleSaveConfirmDevotional"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />

    <SaveBlogModal
      v-if="showSaveModal && isSermonToBlog"
      :save-status="blogSaveStatus"
      :preview="blogPreview"
      :save-error="blogSaveError"
      :is-saving="blogSaveStatus === 'saving'"
      :saved-id="savedBlogId"
      @save="handleSaveConfirmBlog"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />

    <SaveYoutubeModal
      v-if="showSaveModal && isSermonToYoutube"
      :save-status="youtubeSaveStatus"
      :preview="youtubePreview"
      :save-error="youtubeSaveError"
      :is-saving="youtubeSaveStatus === 'saving'"
      :saved-id="savedYoutubeId"
      @save="handleSaveConfirmYoutube"
      @close="handleSaveModalClose"
      @retry="handleSaveClick"
    />
  </div>
</template>