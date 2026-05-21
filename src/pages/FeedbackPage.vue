<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessageSquare } from 'lucide-vue-next'
import { useConvexAction } from '@/composables/useConvexAction'

type FeedbackMode = 'selector' | 'feedback' | 'bug-report' | 'feature-request'

const route = useRoute()
const router = useRouter()

const mode = computed<FeedbackMode>(() => {
  const path = route.path
  if (path.endsWith('/feedback/feedback')) return 'feedback'
  if (path.endsWith('/feedback/bug-report')) return 'bug-report'
  if (path.endsWith('/feedback/feature-request')) return 'feature-request'
  return 'selector'
})

const overallExperience = ref<'excellent' | 'good' | 'okay' | 'poor'>('good')
const mostHelpfulUse = ref<'sermon_prep' | 'sermon_writing' | 'repurposing' | 'pastoral_tools' | 'other'>('sermon_prep')
const easeOfUse = ref<'very_easy' | 'easy' | 'neutral' | 'hard'>('easy')
const wouldRecommend = ref<'yes' | 'maybe' | 'no'>('yes')
const feedbackText = ref('')

const bugSummary = ref('')
const bugWhatHappened = ref('')
const bugExpected = ref('')
const bugSteps = ref('')
const bugImpact = ref<'blocker' | 'major' | 'minor'>('major')

const featureTitle = ref('')
const featureProblem = ref('')
const featureProposal = ref('')
const featureWorkflow = ref('')

const { run: sendFeedback, isLoading } = useConvexAction('feedback/actions:send' as any)
const message = ref<string | null>(null)

function goTo(form: Exclude<FeedbackMode, 'selector'>) {
  router.push(`/feedback/${form}`)
}

function buildBugText(): string {
  return [
    'FORM_TYPE: bug_report',
    `IMPACT: ${bugImpact.value}`,
    '',
    'SUMMARY:',
    bugSummary.value.trim() || '(none)',
    '',
    'WHAT_HAPPENED:',
    bugWhatHappened.value.trim() || '(none)',
    '',
    'EXPECTED_BEHAVIOR:',
    bugExpected.value.trim() || '(none)',
    '',
    'STEPS_TO_REPRODUCE:',
    bugSteps.value.trim() || '(none)',
  ].join('\n')
}

function buildFeatureText(): string {
  return [
    'FORM_TYPE: feature_request',
    '',
    'TITLE:',
    featureTitle.value.trim() || '(none)',
    '',
    'PROBLEM_TO_SOLVE:',
    featureProblem.value.trim() || '(none)',
    '',
    'PROPOSED_SOLUTION:',
    featureProposal.value.trim() || '(none)',
    '',
    'WORKFLOW_OR_CONTEXT:',
    featureWorkflow.value.trim() || '(none)',
  ].join('\n')
}

async function submitCurrentForm() {
  message.value = null

  const payload =
    mode.value === 'feedback'
      ? {
          overallExperience: overallExperience.value,
          mostHelpfulUse: mostHelpfulUse.value,
          easeOfUse: easeOfUse.value,
          wouldRecommend: wouldRecommend.value,
          feedbackText: feedbackText.value,
        }
      : mode.value === 'bug-report'
      ? {
          overallExperience: 'okay' as const,
          mostHelpfulUse: 'other' as const,
          easeOfUse: 'neutral' as const,
          wouldRecommend: 'maybe' as const,
          feedbackText: buildBugText(),
        }
      : {
          overallExperience: 'good' as const,
          mostHelpfulUse: 'other' as const,
          easeOfUse: 'easy' as const,
          wouldRecommend: 'yes' as const,
          feedbackText: buildFeatureText(),
        }

  const result = await sendFeedback(payload as any)
  message.value = result ? 'Thanks! Your submission has been sent.' : 'Unable to send right now.'
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-3xl mx-auto py-8 space-y-6">
      <div class="flex items-center gap-3">
        <MessageSquare class="h-6 w-6 text-muted-foreground" />
        <h2 class="text-xl font-semibold tracking-tight">Send Feedback</h2>
      </div>

      <div v-if="mode === 'selector'" class="rounded-xl border bg-card p-5 space-y-4">
        <p class="text-sm text-muted-foreground">Choose what you want to send.</p>

        <button
          @click="goTo('feedback')"
          class="w-full rounded-lg border border-border bg-background px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <div class="text-sm font-medium text-foreground">1. Feedback</div>
          <div class="text-xs text-muted-foreground mt-0.5">General product feedback form</div>
        </button>

        <button
          @click="goTo('bug-report')"
          class="w-full rounded-lg border border-border bg-background px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <div class="text-sm font-medium text-foreground">2. Bug report</div>
          <div class="text-xs text-muted-foreground mt-0.5">Report something broken or incorrect</div>
        </button>

        <button
          @click="goTo('feature-request')"
          class="w-full rounded-lg border border-border bg-background px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <div class="text-sm font-medium text-foreground">3. Feature request</div>
          <div class="text-xs text-muted-foreground mt-0.5">Request a new capability or improvement</div>
        </button>
      </div>

      <div v-else class="rounded-xl border bg-card p-5 space-y-5">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-foreground">
            {{
              mode === 'feedback' ? 'Feedback form'
              : mode === 'bug-report' ? 'Bug report form'
              : 'Feature request form'
            }}
          </h3>
          <button
            @click="router.push('/feedback')"
            class="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to choices
          </button>
        </div>

        <template v-if="mode === 'feedback'">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">1) Relevance: did this feel like your real week in ministry?</label>
            <select v-model="overallExperience" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="excellent">Yes, exactly my reality</option>
              <option value="good">Mostly yes</option>
              <option value="okay">Some parts fit</option>
              <option value="poor">Not really</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">2) Which part helped you most this week?</label>
            <select v-model="mostHelpfulUse" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="sermon_prep">Sermon prep (research, brainstorm, series)</option>
              <option value="sermon_writing">Sermon writing assist</option>
              <option value="repurposing">Repurposing content (blog, YouTube, social)</option>
              <option value="pastoral_tools">Pastoral tools (devotional, agenda, email)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">3) Clarity: was it easy to know what to do next in the app?</label>
            <select v-model="easeOfUse" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="very_easy">Very clear</option>
              <option value="easy">Mostly clear</option>
              <option value="neutral">Some confusion</option>
              <option value="hard">Often confusing</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">4) Action: would you use this again next week?</label>
            <select v-model="wouldRecommend" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="yes">Yes, definitely</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">5) What should we improve next to make this more useful for you?</label>
            <textarea
              v-model="feedbackText"
              rows="5"
              placeholder="Share a real moment where YouPastor helped or got in your way."
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
        </template>

        <template v-else-if="mode === 'bug-report'">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">1) What went wrong?</label>
            <input
              v-model="bugSummary"
              placeholder="Short title (example: Couldn't save my sermon)"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">2) What were you trying to do?</label>
            <textarea
              v-model="bugWhatHappened"
              rows="4"
              placeholder="Tell us what you clicked or typed before the issue happened"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">3) What did you expect to happen?</label>
            <textarea
              v-model="bugExpected"
              rows="3"
              placeholder="Describe what you wanted to see"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">4) Can you walk us through the steps?</label>
            <textarea
              v-model="bugSteps"
              rows="4"
              placeholder="Example: 1) Open Notebook 2) Click Save 3) Error appears"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">5) How much did this block your work?</label>
            <select v-model="bugImpact" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
              <option value="blocker">I couldn't continue</option>
              <option value="major">It slowed me down a lot</option>
              <option value="minor">It was a small issue</option>
            </select>
          </div>
        </template>

        <template v-else>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">1) What would you like YouPastor to add?</label>
            <input
              v-model="featureTitle"
              placeholder="Short title (example: Sermon checklist template)"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">2) What challenge are you facing today?</label>
            <textarea
              v-model="featureProblem"
              rows="4"
              placeholder="Describe what feels hard, slow, or repetitive right now"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">3) What would your ideal solution look like?</label>
            <textarea
              v-model="featureProposal"
              rows="4"
              placeholder="Tell us what you'd want the app to do"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">4) Where would this help most in your weekly workflow?</label>
            <textarea
              v-model="featureWorkflow"
              rows="3"
              placeholder="Example: sermon prep, meetings, communication, social content"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
        </template>

        <div class="flex items-center gap-3">
          <button
            @click="submitCurrentForm"
            :disabled="isLoading"
            class="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {{
              isLoading ? 'Sending...'
              : mode === 'feedback' ? 'Send feedback'
              : mode === 'bug-report' ? 'Send bug report'
              : 'Send feature request'
            }}
          </button>
          <p v-if="message" class="text-sm text-muted-foreground">{{ message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
