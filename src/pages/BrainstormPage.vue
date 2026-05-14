<script setup lang="ts">
import SkillChat from '@/components/SkillChat.vue'
</script>

<template>
  <SkillChat
    skillSlug="sermon-brainstorm"
    title="Sermon Brainstorm"
    subtitle="Think out loud about Sunday's message"
    initialMessage="I'd like to brainstorm a sermon. Can you walk me through it?"
    aiRole="orchestrator"
  />
</template>
