<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SkillChat from '@/components/SkillChat.vue'

const route = useRoute()

const workspaceType = computed(() => route.params.type as string)
const subType = computed(() => route.params.sub as string | undefined)

const workspaceLabels: Record<string, string> = {
  'sermon-prep': 'Sermon Prep',
  'sermon-repurposing': 'Sermon Repurposing',
  'social-media': 'Social Media',
  'written-communication': 'Written Communication',
  'pastoral-rhythm': 'Pastoral Rhythm',
}

const subLabels: Record<string, Record<string, string>> = {
  'sermon-prep': {
    'brainstorm': 'Brainstorm',
    'research': 'Research',
    'series': 'Series Idea Generation',
  },
  'sermon-repurposing': {
    'blog': 'Sermon to Blog',
    'youtube': 'Sermon to Youtube',
    'small-group': 'Small Group Questions',
  },
  'social-media': {
    'post': 'Church Social Post',
    'calendar': 'Social Media Calendar',
  },
  'written-communication': {
    'announcement': 'Announcement Script',
    'email': 'Church Email',
    'letter': 'Church Letter',
  },
  'pastoral-rhythm': {
    'agenda': 'Meeting Agenda',
    'devotional': 'Midweek Devotional',
  },
}

const pageTitle = computed(() => {
  const wsLabel = workspaceLabels[workspaceType.value] || workspaceType.value
  if (subType.value && subLabels[workspaceType.value]?.[subType.value]) {
    return subLabels[workspaceType.value][subType.value]
  }
  return wsLabel
})

// Map implemented workspace routes to SkillChat configs
interface SkillConfig {
  skillSlug: string
  title: string
  subtitle: string
  initialMessage: string
  aiRole?: 'orchestrator' | 'generator' | 'researcher'
}

const skillConfigs: Record<string, Record<string, SkillConfig>> = {
  'sermon-repurposing': {
    'blog': {
      skillSlug: 'sermon-to-blog',
      title: 'Sermon to Blog',
      subtitle: 'Turn your sermon into a web-ready article',
      initialMessage: "I'd like to turn a sermon into a blog post. Help me work through it.",
      aiRole: 'generator',
    },
    'youtube': {
      skillSlug: 'sermon-to-youtube',
      title: 'Sermon to YouTube',
      subtitle: 'Optimize your sermon video for discovery',
      initialMessage: "I'd like to optimize a sermon for YouTube. Help me work through it.",
      aiRole: 'generator',
    },
    'small-group': {
      skillSlug: 'small-group-questions',
      title: 'Small Group Questions',
      subtitle: 'Build a discussion guide from your sermon',
      initialMessage: "I'd like to create small group discussion questions from a sermon. Help me work through it.",
      aiRole: 'generator',
    },
  },
  'social-media': {
    'post': {
      skillSlug: 'church-social-post',
      title: 'Church Social Post',
      subtitle: 'Write platform-ready posts for your church',
      initialMessage: "I'd like to create a social media post for the church. Help me work through it.",
      aiRole: 'generator',
    },
    'calendar': {
      skillSlug: 'social-media-calendar',
      title: 'Social Media Calendar',
      subtitle: 'Plan a week or month of content',
      initialMessage: "I'd like to plan a social media content calendar. Help me work through it.",
      aiRole: 'generator',
    },
  },
  'written-communication': {
    'announcement': {
      skillSlug: 'announcement-script',
      title: 'Announcement Script',
      subtitle: 'Write a tight Sunday morning script',
      initialMessage: "I'd like to write a Sunday announcement script. Help me work through it.",
      aiRole: 'generator',
    },
    'email': {
      skillSlug: 'church-email',
      title: 'Church Email',
      subtitle: 'Write a weekly email people actually open',
      initialMessage: "I'd like to write a church email for this week. Help me work through it.",
      aiRole: 'generator',
    },
    'letter': {
      skillSlug: 'church-letter',
      title: 'Church Letter',
      subtitle: 'Write a pastoral letter for any occasion',
      initialMessage: "I'd like to write a church letter. Help me work through it.",
      aiRole: 'generator',
    },
  },
  'pastoral-rhythm': {
    'agenda': {
      skillSlug: 'meeting-agenda',
      title: 'Meeting Agenda',
      subtitle: 'Build a structured meeting agenda',
      initialMessage: "I'd like to build a meeting agenda. Help me work through it.",
      aiRole: 'generator',
    },
    'devotional': {
      skillSlug: 'midweek-devotional',
      title: 'Midweek Devotional',
      subtitle: 'Write a short devotional for Wednesday',
      initialMessage: "I'd like to write a midweek devotional. Help me work through it.",
      aiRole: 'generator',
    },
  },
}

const activeSkill = computed<SkillConfig | null>(() => {
  const type = workspaceType.value
  const sub = subType.value
  if (!sub) return null
  return skillConfigs[type]?.[sub] ?? null
})

const isImplemented = computed(() => activeSkill.value !== null)
</script>

<template>
  <div v-if="isImplemented" class="h-full">
    <SkillChat
      :skillSlug="activeSkill!.skillSlug"
      :title="activeSkill!.title"
      :subtitle="activeSkill!.subtitle"
      :initialMessage="activeSkill!.initialMessage"
      :aiRole="activeSkill!.aiRole"
    />
  </div>

  <div v-else class="max-w-4xl mx-auto py-8 space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight">{{ pageTitle }}</h2>
      <p class="text-sm text-muted-foreground mt-1">
        This workspace is under development.
      </p>
    </div>

    <div class="rounded-xl border bg-card p-12 text-center text-muted-foreground">
      <div class="space-y-2">
        <p class="text-lg font-medium">{{ pageTitle }}</p>
        <p class="text-sm">Coming soon — this feature is being built.</p>
      </div>
    </div>
  </div>
</template>
