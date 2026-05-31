<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Lightbulb, BookOpen, MessageSquare, Layers } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const firstName = computed(() => {
  const fullName = String(auth.user?.name ?? '').trim()
  return fullName ? fullName.split(/\s+/)[0] : 'Pastor'
})

interface QuickAction {
  label: string
  icon: any
  path: string
  description: string
}

const quickActions: QuickAction[] = [
  {
    label: "Brainstorm this week's sermon",
    icon: Lightbulb,
    path: '/brainstorm',
    description: 'Generate sermon ideas and angles',
  },
  {
    label: 'Research a passage',
    icon: BookOpen,
    path: '/research',
    description: 'Greek/Hebrew word studies, commentaries',
  },
  {
    label: 'Plan a sermon series',
    icon: Layers,
    path: '/series',
    description: 'Multi-week series from idea to outline',
  },
  {
    label: 'Create Church Social Media Posts',
    icon: MessageSquare,
    path: '/workspace/social-media/post',
    description: 'Generate social media content',
  },
]
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] px-4">
    <div class="w-full max-w-2xl space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">
          Hi {{ firstName }}! How can I help you today?
        </h1>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="action in quickActions"
          :key="action.label"
          @click="router.push(action.path)"
          class="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm hover:bg-accent/30"
        >
          <div class="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary/20 transition-colors">
            <component :is="action.icon" class="h-4 w-4" />
          </div>
          <div class="space-y-0.5">
            <div class="text-sm font-medium text-foreground">{{ action.label }}</div>
            <div class="text-xs text-muted-foreground">{{ action.description }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
