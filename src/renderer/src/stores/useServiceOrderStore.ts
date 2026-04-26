import { create } from 'zustand'
import type { ServiceOrder, ServiceOrderStatus } from '@renderer/types'

interface ServiceOrderState {
  orders: ServiceOrder[]
  currentOrder: ServiceOrder | null
  loading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  fetchOrderById: (id: string) => Promise<void>
  addOrder: (order: Omit<ServiceOrder, 'id' | 'osNumber'>) => Promise<ServiceOrder | null>
  updateOrder: (id: string, order: Partial<ServiceOrder>) => Promise<void>
  updateStatus: (id: string, status: ServiceOrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
}

export const useServiceOrderStore = create<ServiceOrderState>((set) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null })
    try {
      const orders = (await window.api.orders.findAll()) as ServiceOrder[]
      set({ orders, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  fetchOrderById: async (id) => {
    set({ loading: true, error: null })
    try {
      const order = (await window.api.orders.findById(id)) as ServiceOrder
      set({ currentOrder: order, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  addOrder: async (order) => {
    try {
      const created = (await window.api.orders.create(order)) as ServiceOrder
      const orders = (await window.api.orders.findAll()) as ServiceOrder[]
      set({ orders })
      return created
    } catch (error) {
      set({ error: String(error) })
      return null
    }
  },

  updateOrder: async (id, order) => {
    try {
      await window.api.orders.update(id, order)
      const orders = (await window.api.orders.findAll()) as ServiceOrder[]
      set({ orders })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  updateStatus: async (id, status) => {
    try {
      await window.api.orders.updateStatus(id, status)
      const orders = (await window.api.orders.findAll()) as ServiceOrder[]
      set({ orders })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  deleteOrder: async (id) => {
    try {
      await window.api.orders.delete(id)
      const orders = (await window.api.orders.findAll()) as ServiceOrder[]
      set({ orders })
    } catch (error) {
      set({ error: String(error) })
    }
  }
}))
