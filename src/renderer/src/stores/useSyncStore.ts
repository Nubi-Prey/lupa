import { create } from 'zustand'
import type { ConnectionInfo } from '../../../preload/index.d'

interface SyncState {
  connectionInfo: ConnectionInfo | null
  isOnline: boolean
  lastSync: string | null
  syncing: boolean
  checkConnection: () => Promise<void>
  syncAll: () => Promise<void>
  setConnectionState: (state: string, info: ConnectionInfo) => void
  initListener: () => () => void
}

export const useSyncStore = create<SyncState>((set) => ({
  connectionInfo: null,
  isOnline: false,
  lastSync: null,
  syncing: false,

  setConnectionState: (state, info) => {
    set({
      connectionInfo: { ...info, state: state as ConnectionInfo['state'] },
      isOnline: state === 'connected'
    })
  },

  initListener: () => {
    return window.api.db.onStateChange((state, info) => {
      set({
        connectionInfo: info as ConnectionInfo,
        isOnline: state === 'connected'
      })
    })
  },

  checkConnection: async () => {
    try {
      const info = await window.api.db.getState()
      set({
        connectionInfo: info,
        isOnline: info.state === 'connected'
      })
    } catch {
      set({ isOnline: false })
    }
  },

  syncAll: async () => {
    set({ syncing: true })
    try {
      const info = await window.api.db.connect()
      set({
        connectionInfo: info,
        isOnline: info.state === 'connected',
        lastSync: info.state === 'connected' ? new Date().toISOString() : null
      })
    } catch {
      set({ isOnline: false })
    } finally {
      set({ syncing: false })
    }
  }
}))
