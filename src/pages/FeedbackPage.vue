<script setup lang="ts">
import { ref } from 'vue'
import { MessageSquare } from 'lucide-vue-next'
import { useConvexAction } from '@/composables/useConvexAction'

const overallExperience = ref<'excellent' | 'good' | 'okay' | 'poor'>('good')
const mostHelpfulUse = ref<'sermon_prep' | 'sermon_writing' | 'repurposing' | 'pastoral_tools' | 'other'>('sermon_prep')
const easeOfUse = ref<'very_easy' | 'easy' | 'neutral' | 'hard'>('easy')
const wouldRecommend = ref<'yes' | 'maybe' | 'no'>('yes')
const feedbackText = ref('')

const { run: sendFeedback, isLoading } = useConvexAction('feedback/actions:send' as any)
const message = ref<string | null>(null)

async function submitFeedback() {
  message.value = null
  const result = await sendFeedback({
    overallExperience: overallExperience.value,
    mostHelpfulUse: mostHelpfulUse.value,
    easeOfUse: easeOfUse.value,
    wouldRecommend: wouldRecommend.value,
    feedbackText: feedbackText.value,
  } as any)

  message.value = result ? 'Thanks! Your feedback has been sent.' : 'Unable to send feedback right now.'
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-3xl mx-auto py-8 space-y-6">
      <div class="flex items-center gap-3">
        <MessageSquare class="h-6 w-6 text-muted-foreground" />
        <h2 class="text-xl font-semibold tracking-tight">Send Feedback</h2>
      </div>

      <div class="rounded-xl border bg-card p-5 space-y-5">
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">1) Overall, how has your experience been?</label>
          <select v-model="overallExperience" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="okay">Okay</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">2) Which area helps you the most right now?</label>
          <select v-model="mostHelpfulUse" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
            <option value="sermon_prep">Sermon prep (research, brainstorm, series)</option>
            <option value="sermon_writing">Sermon writing assist</option>
            <option value="repurposing">Repurposing content (blog, YouTube, social)</option>
            <option value="pastoral_tools">Pastoral tools (devotional, agenda, email)</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">3) How easy is YouPastor to use?</label>
          <select v-model="easeOfUse" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
            <option value="very_easy">Very easy</option>
            <option value="easy">Easy</option>
            <option value="neutral">Neutral</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">4) Would you recommend YouPastor to another pastor?</label>
          <select v-model="wouldRecommend" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">5) Any additional feedback?</label>
          <textarea
            v-model="feedbackText"
            rows="5"
            placeholder="What should we improve next?"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="submitFeedback"
            :disabled="isLoading"
            class="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {{ isLoading ? 'Sending...' : 'Send feedback' }}
          </button>
          <p v-if="message" class="text-sm text-muted-foreground">{{ message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
