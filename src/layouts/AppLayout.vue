<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Home,
  Notebook,
  BookOpen,
  Lightbulb,
  Search as ResearchIcon,
  Layers,
  FileText,
  Video,
  Users,
  MessageCircle,
  Calendar,
  Mail,
  Mic,
  Heart,
  List,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const hideSidebar = computed(() => route.meta.hideSidebar === true)
const LOW_CREDIT_THRESHOLD = 20
const creditBalance = computed(() => auth.user?.creditBalance ?? 0)
const showLowCreditNotice = computed(() => !!auth.user && creditBalance.value <= LOW_CREDIT_THRESHOLD)
const isAdminUser = computed(() => (auth.user?.email ?? '').toLowerCase() === 'arnold@lifecity.ph')
const updateStatus = ref<'idle' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
const updateProgress = ref(0)
const updateError = ref<string | null>(null)
const updateBadgeVisible = computed(() => updateStatus.value !== 'idle')
const updateActionable = computed(() => updateStatus.value === 'available' || updateStatus.value === 'downloaded')
const updateTitle = computed(() => {
  if (updateStatus.value === 'available') return 'Update available'
  if (updateStatus.value === 'downloading') return 'Downloading update'
  if (updateStatus.value === 'downloaded') return 'Update ready'
  if (updateStatus.value === 'error') return 'Update check failed'
  return ''
})
const updateSubtitle = computed(() => {
  if (updateStatus.value === 'available') return 'Click here to download'
  if (updateStatus.value === 'downloading') return `${Math.round(updateProgress.value)}% downloaded`
  if (updateStatus.value === 'downloaded') return 'Click to restart and install'
  if (updateStatus.value === 'error') return updateError.value ?? 'Please try again later.'
  return ''
})
const lowCreditProgress = computed(() => {
  const pct = (creditBalance.value / LOW_CREDIT_THRESHOLD) * 100
  return Math.max(0, Math.min(100, pct))
})

const isDesktopApp = computed(() => !!window.ipcRenderer)
const showSidebarDragRegion = computed(() => isDesktopApp.value && /mac/i.test(navigator.userAgent))

async function handleSignOut() {
  await auth.signOut()
  router.push('/login')
}

const expandedSections = ref<Record<string, boolean>>({
  'sermon-prep': true,
  'content': false,
  'pastoral': false,
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
]

const workspaceSections: NavItem[] = [
  {
    label: 'Sermon Prep',
    icon: BookOpen,
    section: 'sermon-prep',
    children: [
      { label: 'Series Planner', icon: Layers, path: '/series' },
      { label: 'Brainstorm', icon: Lightbulb, path: '/brainstorm' },
      { label: 'Research', icon: ResearchIcon, path: '/research' },
      { label: 'Create a Sermon', icon: BookOpen, path: '/sermons' },
    ],
  },
  {
    label: 'Content',
    icon: FileText,
    section: 'content',
    children: [
      { label: 'Sermon to Blog', icon: FileText, path: '/workspace/sermon-repurposing/blog' },
      { label: 'Sermon to Youtube', icon: Video, path: '/workspace/sermon-repurposing/youtube' },
      { label: 'Small Group Questions', icon: Users, path: '/workspace/sermon-repurposing/small-group' },
      { label: 'Church Social Post', icon: MessageCircle, path: '/workspace/social-media/post' },
      { label: 'Social Media Calendar', icon: Calendar, path: '/workspace/social-media/calendar' },
      { label: 'Church Email', icon: Mail, path: '/workspace/written-communication/email' },
      { label: 'Announcement Script', icon: Mic, path: '/workspace/written-communication/announcement' },
      { label: 'Church Letter', icon: FileText, path: '/workspace/written-communication/letter' },
    ],
  },
  {
    label: 'Pastoral',
    icon: Heart,
    section: 'pastoral',
    children: [
      { label: 'Meeting Agenda', icon: List, path: '/workspace/pastoral-rhythm/agenda' },
      { label: 'Midweek Devotional', icon: BookOpen, path: '/workspace/pastoral-rhythm/devotional' },
    ],
  },
]

function navigateTo(path: string) {
  router.push(path)
}

async function installUpdateNow() {
  if (!updateActionable.value) return

  try {
    if (updateStatus.value === 'downloaded') {
      await window.appLinks?.installUpdate?.()
      return
    }

    if (updateStatus.value === 'available') {
      await window.appLinks?.downloadUpdate?.()
      return
    }

    // Previous Windows manual-download fallback. Keeping this here so it is easy
    // to restore if Windows auto-install is unreliable for unsigned builds.
    // const isWindows = navigator.userAgent.toLowerCase().includes('win')
    // if (isWindows) {
    //   await window.appLinks?.openExternal('https://github.com/Arwen-Digital/YouPastor/releases/latest/download/YouPastor-Windows-Setup.exe')
    // }
  } catch (err) {
    console.warn('[update] Failed to handle update action', err)
    updateStatus.value = 'error'
    updateError.value = 'Could not process the update. Please visit youpastor.com/download.'
  }
}

function applyUpdateState(payload: any) {
  if (!payload) return
  updateStatus.value = payload.status ?? 'idle'
  updateProgress.value = payload.progress ?? 0
  updateError.value = payload.error ?? null
}

const onUpdateState = (_event: any, payload: any) => {
  applyUpdateState(payload)
}

onMounted(async () => {
  window.ipcRenderer?.on('app:update-state', onUpdateState)

  try {
    const state = await window.appLinks?.getUpdateState?.()
    applyUpdateState(state)
  } catch {
    // no-op
  }
})

onUnmounted(() => {
  window.ipcRenderer?.off('app:update-state', onUpdateState)
})
</script>

<template>
  <div class="flex h-screen bg-background">
    <transition name="sidebar-slide">
      <aside v-if="!hideSidebar" class="w-[260px] flex flex-col bg-muted/50 shrink-0">
      <div v-if="showSidebarDragRegion" class="sidebar-drag-region" />
      <div class="px-3 pt-3 pb-2">
        <button
          @click="navigateTo('/')"
          class="mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/50"
        >
          <img src="/icon.png" alt="YouPastor" class="h-8 w-8 rounded-lg object-cover" />
          <span class="text-base font-semibold tracking-tight text-foreground">YouPastor</span>
        </button>

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
          v-if="updateBadgeVisible"
          @click="installUpdateNow"
          :disabled="!updateActionable"
          :class="[
            'mx-1 mb-2 w-full rounded-xl border px-3 py-2 text-left transition-colors',
            updateActionable
              ? 'border-amber-300/60 bg-amber-50 hover:bg-amber-100 cursor-pointer'
              : 'border-amber-200/50 bg-amber-50/60 cursor-default',
          ]"
        >
          <div class="text-xs font-semibold text-amber-900">{{ updateTitle }}</div>
          <div class="text-[11px] text-amber-800/90">{{ updateSubtitle }}</div>
        </button>

        <div v-if="showLowCreditNotice" class="mx-1 mb-2 rounded-2xl border border-border bg-card p-3 shadow-sm space-y-2">
          <div class="text-sm font-medium text-foreground">{{ creditBalance }} credits remaining</div>
          <p class="text-xs text-muted-foreground">Top up to keep generating content without interruption.</p>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div class="h-full bg-foreground/80" :style="{ width: `${lowCreditProgress}%` }" />
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button
              @click="navigateTo('/upgrade')"
              class="rounded-full border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Add credits
            </button>
            <button
              @click="navigateTo('/upgrade')"
              class="rounded-full bg-foreground px-2 py-1.5 text-xs font-medium text-background hover:opacity-90 transition-opacity"
            >
              Upgrade
            </button>
          </div>
        </div>
        <div v-if="auth.user?.email" class="pb-2 px-3 mb-1.5 border-b border-border/40 flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <img
            v-if="auth.user?.image"
            :src="auth.user.image"
            alt=""
            class="w-5 h-5 rounded-full shrink-0 object-cover"
            referrerpolicy="no-referrer"
          />
          <span v-else class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <span class="truncate font-medium" :title="auth.user.email">{{ auth.user.email }}</span>
        </div>
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
          v-if="isAdminUser"
          @click="navigateTo('/admin')"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive('/admin')
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          ]"
        >
          <Shield class="h-4 w-4" />
          Admin
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
    </transition>

    <main class="flex-1 overflow-hidden transition-all duration-300 relative">
      <div v-if="showSidebarDragRegion" class="main-drag-region" />
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
.sidebar-drag-region {
  height: 32px;
  -webkit-app-region: drag;
}

.main-drag-region {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10px;
  z-index: 10;
  -webkit-app-region: drag;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: width 220ms ease, opacity 180ms ease, transform 220ms ease;
  overflow: hidden;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  width: 0;
  opacity: 0;
  transform: translateX(-16px);
}
.sidebar-slide-enter-to,
.sidebar-slide-leave-from {
  width: 260px;
  opacity: 1;
  transform: translateX(0);
}

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
