import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  db: {
    connect: () => ipcRenderer.invoke('db:connect'),
    disconnect: () => ipcRenderer.invoke('db:disconnect'),
    getState: () => ipcRenderer.invoke('db:getState'),
    onStateChange: (callback: (state: string, info: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: string, info: unknown) =>
        callback(state, info)
      ipcRenderer.on('db:state-change', handler)
      return () => ipcRenderer.removeListener('db:state-change', handler)
    }
  },
  services: {
    findAll: () => ipcRenderer.invoke('services:findAll'),
    create: (data: unknown) => ipcRenderer.invoke('services:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('services:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('services:delete', id)
  },
  customers: {
    findAll: () => ipcRenderer.invoke('customers:findAll'),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('customers:delete', id)
  },
  orders: {
    findAll: () => ipcRenderer.invoke('orders:findAll'),
    findById: (id: string) => ipcRenderer.invoke('orders:findById', id),
    create: (data: unknown) => ipcRenderer.invoke('orders:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('orders:update', id, data),
    updateStatus: (id: string, status: string) =>
      ipcRenderer.invoke('orders:updateStatus', id, status),
    delete: (id: string) => ipcRenderer.invoke('orders:delete', id)
  },
  cache: {
    load: () => ipcRenderer.invoke('cache:load')
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    hasDbUri: () => ipcRenderer.invoke('config:hasDbUri'),
    onUriChange: (callback: (has: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, has: boolean) => callback(has)
      ipcRenderer.on('config:uri-change', handler)
      return () => ipcRenderer.removeListener('config:uri-change', handler)
    }
  },
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
