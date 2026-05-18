<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SkillChat from '@/components/SkillChat.vue'

const route = useRoute()

function q(name: string): string {
  const value = route.query[name]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ? String(value) : ''
}

const notebookSeededMessage = computed(() => {
  if (q('fromNotebook') !== '1') return null

  const seriesTitle = q('seriesTitle')
  const weekNumber = q('weekNumber')
  const sermonTitle = q('sermonTitle')
  const scriptureRef = q('scriptureRef')
  const bigIdea = q('bigIdea')
  const connectiveThread = q('connectiveThread')

  const lines = [
    `I'd like to do sermon research from my series plan.`,
    seriesTitle ? `Series: ${seriesTitle}` : '',
    weekNumber ? `Week: ${weekNumber}` : '',
    sermonTitle ? `Planned sermon title: ${sermonTitle}` : '',
    scriptureRef ? `Passage: ${scriptureRef}` : '',
    bigIdea ? `Big idea: ${bigIdea}` : '',
    connectiveThread ? `Connective thread: ${connectiveThread}` : '',
    '',
    'Use this as the starting context for research.',
  ].filter(Boolean)

  return lines.join('\n')
})

const initialMessage = computed(
  () => notebookSeededMessage.value ?? "I'd like to do some research for a sermon. Where do we start?"
)
</script>

<template>
  <SkillChat
    skillSlug="sermon-research"
    title="Sermon Research"
    subtitle="Deep research on a passage"
    :initialMessage="initialMessage"
    aiRole="orchestrator"
  />
</template>
