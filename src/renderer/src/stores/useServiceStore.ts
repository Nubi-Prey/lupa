import { create } from 'zustand'
import type { ServiceItem } from '@renderer/types'

interface ServiceState {
  services: ServiceItem[]
  loading: boolean
  error: string | null
  fetchServices: () => Promise<void>
  addService: (service: Omit<ServiceItem, 'id'>) => Promise<ServiceItem | null>
  updateService: (id: string, service: Partial<ServiceItem>) => Promise<void>
  deleteService: (id: string) => Promise<void>
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  loading: false,
  error: null,

  fetchServices: async () => {
    set({ loading: true, error: null })
    try {
      const services = (await window.api.services.findAll()) as ServiceItem[]
      set({ services, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  addService: async (service) => {
    try {
      const created = (await window.api.services.create(service)) as ServiceItem
      const services = (await window.api.services.findAll()) as ServiceItem[]
      set({ services })
      return created
    } catch (error) {
      set({ error: String(error) })
      return null
    }
  },

  updateService: async (id, service) => {
    try {
      await window.api.services.update(id, service)
      const services = (await window.api.services.findAll()) as ServiceItem[]
      set({ services })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  deleteService: async (id) => {
    try {
      await window.api.services.delete(id)
      const services = (await window.api.services.findAll()) as ServiceItem[]
      set({ services })
    } catch (error) {
      set({ error: String(error) })
    }
  }
}))
