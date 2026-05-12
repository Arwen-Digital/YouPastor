import Dexie, { type Table } from 'dexie'

export interface CachedSermon {
  id: string
  title: string
  scriptureRef?: string
  status: string
  content?: string
  seriesId?: string
  syncedAt: number
  updatedAt: number
}

export interface CachedWorkspace {
  id: string
  userId: string
  workspaceType: string
  state: string
  syncedAt: number
}

export class YouPastorDB extends Dexie {
  sermons!: Table<CachedSermon, string>
  workspaces!: Table<CachedWorkspace, string>
  preferences!: Table<{ key: string; value: string }, string>

  constructor() {
    super('YouPastorDB')
    this.version(1).stores({
      sermons: 'id, status, seriesId, syncedAt',
      workspaces: 'id, userId, workspaceType, syncedAt',
      preferences: 'key',
    })
  }
}

export const db = new YouPastorDB()
