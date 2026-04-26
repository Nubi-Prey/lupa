import { ElectronAPI } from '@electron-toolkit/preload'
import type { ServiceItem, Customer, ServiceOrder, ServiceOrderStatus } from '../renderer/src/types'

export type Theme = 'light' | 'dark' | 'system'

export interface ConnectionInfo {
  state: 'disconnected' | 'connecting' | 'connected' | 'failed'
  dbName: string
  host: string
  uri: string
  error?: string
}

export interface LupaAPI {
  db: {
    connect: () => Promise<ConnectionInfo>
    disconnect: () => Promise<{ success: boolean }>
    getState: () => Promise<ConnectionInfo>
    onStateChange: (callback: (state: string, info: ConnectionInfo) => void) => () => void
  }
  services: {
    findAll: () => Promise<ServiceItem[]>
    create: (data: Partial<ServiceItem>) => Promise<ServiceItem>
    update: (id: string, data: Partial<ServiceItem>) => Promise<ServiceItem>
    delete: (id: string) => Promise<{ success: boolean }>
  }
  customers: {
    findAll: () => Promise<Customer[]>
    create: (data: Partial<Customer>) => Promise<Customer>
    update: (id: string, data: Partial<Customer>) => Promise<Customer>
    delete: (id: string) => Promise<{ success: boolean }>
  }
  orders: {
    findAll: () => Promise<ServiceOrder[]>
    findById: (id: string) => Promise<ServiceOrder>
    create: (data: Partial<ServiceOrder>) => Promise<ServiceOrder>
    update: (id: string, data: Partial<ServiceOrder>) => Promise<ServiceOrder>
    updateStatus: (id: string, status: ServiceOrderStatus) => Promise<ServiceOrder>
    delete: (id: string) => Promise<{ success: boolean }>
  }
  cache: {
    load: () => Promise<{
      services: ServiceItem[]
      customers: Customer[]
      serviceOrders: ServiceOrder[]
      lastSync: string | null
    }>
  }
  config: {
    get: () => Promise<{ mongodbUri: string; theme: string }>
    set: (key: string, value: unknown) => Promise<{ mongodbUri: string; theme: string }>
    hasDbUri: () => Promise<boolean>
    onUriChange: (callback: (has: boolean) => void) => () => void
  }
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LupaAPI
  }
}
