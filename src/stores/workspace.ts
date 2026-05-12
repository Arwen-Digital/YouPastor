import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type WorkspaceType =
  | 'sermon-prep'
  | 'communication'
  | 'repurposing'
  | 'social-media'
  | 'pastoral-rhythm'

export const useWorkspaceStore = defineStore('workspace', () => {
  const activeWorkspace = ref<WorkspaceType>('sermon-prep')
  const activeSermonId = ref<string | null>(null)
  const activeSeriesId = ref<string | null>(null)

  const workspaceLabel = computed(() => {
    const labels: Record<WorkspaceType, string> = {
      'sermon-prep': 'Sermon Preparation',
      'communication': 'Communication',
      'repurposing': 'Repurposing',
      'social-media': 'Social Media',
      'pastoral-rhythm': 'Pastoral Rhythm',
    }
    return labels[activeWorkspace.value]
  })

  function setWorkspace(workspace: WorkspaceType) {
    activeWorkspace.value = workspace
  }

  function setActiveSermon(sermonId: string | null) {
    activeSermonId.value = sermonId
  }

  function setActiveSeries(seriesId: string | null) {
    activeSeriesId.value = seriesId
  }

  return {
    activeWorkspace,
    activeSermonId,
    activeSeriesId,
    workspaceLabel,
    setWorkspace,
    setActiveSermon,
    setActiveSeries,
  }
})
