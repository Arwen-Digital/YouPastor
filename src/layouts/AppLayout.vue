<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Home,
  Search,
  Notebook,
  BookOpen,
  Lightbulb,
  Search as ResearchIcon,
  Layers,
  RefreshCw,
  FileText,
  Video,
  Users,
  MessageSquare,
  MessageCircle,
  Calendar,
  Mail,
  Mic,
  Heart,
  List,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

async function handleSignOut() {
  await auth.signOut()
  router.push('/login')
}

const expandedSections = ref<Record<string, boolean>>({
  'sermon-prep': true,
  'sermon-repurposing': false,
  'social-media': false,
  'written-communication': false,
  'pastoral-rhythm': false,
})

function toggleSection(section: string) {
  expandedSections.value[section] = !expandedSections.value[section]
}

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

interface NavItem {
  label: string
  icon: any
  path?: string
  children?: NavItem[]
  section?: string
}

const topNav: NavItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Notebook', icon: Notebook, path: '/notebook' },
  { label: 'Search', icon: Search, path: '/search' },
]

const workspaceSections: NavItem[] = [
  {
    label: 'Sermon Prep',
    icon: BookOpen,
    section: 'sermon-prep',
    children: [
      { label: 'Brainstorm', icon: Lightbulb, path: '/brainstorm' },
      { label: 'Research', icon: ResearchIcon, path: '/research' },
      { label: 'Series Planner', icon: Layers, path: '/series' },
    ],
  },
  {
    label: 'Sermon Repurposing',
    icon: RefreshCw,
    section: 'sermon-repurposing',
    children: [
      { label: 'Sermon to Blog', icon: FileText, path: '/workspace/sermon-repurposing/blog' },
      { label: 'Sermon to Youtube', icon: Video, path: '/workspace/sermon-repurposing/youtube' },
      { label: 'Small Group Questions', icon: Users, path: '/workspace/sermon-repurposing/small-group' },
    ],
  },
  {
    label: 'Social Media',
    icon: MessageSquare,
    section: 'social-media',
    children: [
      { label: 'Church Social Post', icon: MessageCircle, path: '/workspace/social-media/post' },
      { label: 'Social Media Calendar', icon: Calendar, path: '/workspace/social-media/calendar' },
    ],
  },
  {
    label: 'Written Communication',
    icon: Mail,
    section: 'written-communication',
    children: [
      { label: 'Announcement Script', icon: Mic, path: '/workspace/written-communication/announcement' },
      { label: 'Church Email', icon: Mail, path: '/workspace/written-communication/email' },
      { label: 'Church Letter', icon: FileText, path: '/workspace/written-communication/letter' },
    ],
  },
  {
    label: 'Pastoral Rhythm',
    icon: Heart,
    section: 'pastoral-rhythm',
    children: [
      { label: 'Meeting Agenda', icon: List, path: '/workspace/pastoral-rhythm/agenda' },
      { label: 'Midweek Devotional', icon: BookOpen, path: '/workspace/pastoral-rhythm/devotional' },
    ],
  },
]

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="flex h-screen bg-background">
    <aside class="w-[260px] flex flex-col bg-muted/50">
      <div class="px-3 pt-3 pb-2">
        <button
          v-for="item in topNav"
          :key="item.label"
          @click="navigateTo(item.path!)"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive(item.path!)
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          ]"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </button>
      </div>

      <div class="mx-3 h-px bg-border" />

      <div class="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div v-for="section in workspaceSections" :key="section.label">
          <button
            @click="toggleSection(section.section!)"
            :class="[
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            ]"
          >
            <div class="flex items-center gap-3">
              <component :is="section.icon" class="h-4 w-4" />
              <span class="font-medium">{{ section.label }}</span>
            </div>
            <component
              :is="expandedSections[section.section!] ? ChevronDown : ChevronRight"
              class="h-3.5 w-3.5 text-muted-foreground"
            />
          </button>

          <div
            v-if="expandedSections[section.section!]"
            class="mt-0.5 ml-4 pl-4 border-l border-border/50 space-y-0.5"
          >
            <button
              v-for="child in section.children"
              :key="child.label"
              @click="navigateTo(child.path!)"
              :class="[
                'w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors',
                isActive(child.path!)
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
              ]"
            >
              <component :is="child.icon" class="h-3.5 w-3.5" />
              {{ child.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="px-3 pb-3 pt-2 space-y-1">
        <div class="mx-3 h-px bg-border mb-2" />
        <button
          @click="navigateTo('/settings')"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive('/settings')
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          ]"
        >
          <Settings class="h-4 w-4" />
          Settings
        </button>
        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Zap class="h-4 w-4" />
          Upgrade
        </button>
        <button
          @click="handleSignOut"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut class="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>

    <main class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <transition
          name="page-slide"
          mode="out-in"
        >
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.page-slide-enter-active {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.page-slide-leave-active {
  transition: opacity 150ms ease-in, transform 150ms ease-in;
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
