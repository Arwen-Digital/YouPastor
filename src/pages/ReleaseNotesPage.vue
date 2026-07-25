<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, CalendarDays, Sparkles } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import releases from '@/data/releases.json'

const router = useRouter()
const appVersion = __APP_VERSION__

const releaseNotes = computed(() => [...releases].sort((a, b) => b.date.localeCompare(a.date)))

function formatReleaseDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <button
        type="button"
        class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        @click="router.push('/settings')"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to Settings
      </button>

      <header class="mb-8 space-y-2">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">YouPastor v{{ appVersion }}</p>
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">Release Notes</h1>
          </div>
        </div>
        <p class="text-sm leading-relaxed text-muted-foreground">
          New features, improvements, and updates to your YouPastor workspace.
        </p>
      </header>

      <div v-if="releaseNotes.length" class="space-y-4">
        <article
          v-for="release in releaseNotes"
          :key="release.version"
          class="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-foreground">{{ release.title }}</h2>
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  v{{ release.version }}
                </span>
              </div>
              <div class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays class="h-3.5 w-3.5" />
                {{ formatReleaseDate(release.date) }}
              </div>
            </div>
          </div>

          <ul class="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li v-for="change in release.changes" :key="change" class="flex items-start gap-2">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{{ change }}</span>
            </li>
          </ul>
        </article>
      </div>

      <div v-else class="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
        Release notes will appear here with the next update.
      </div>
    </div>
  </div>
</template>
