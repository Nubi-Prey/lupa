import { create } from 'zustand'
import type { Customer } from '@renderer/types'

interface CustomerState {
  customers: Customer[]
  loading: boolean
  error: string | null
  fetchCustomers: () => Promise<void>
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer | null>
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null })
    try {
      const customers = (await window.api.customers.findAll()) as Customer[]
      set({ customers, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  addCustomer: async (customer) => {
    try {
      const created = (await window.api.customers.create(customer)) as Customer
      const customers = (await window.api.customers.findAll()) as Customer[]
      set({ customers })
      return created
    } catch (error) {
      set({ error: String(error) })
      return null
    }
  },

  updateCustomer: async (id, customer) => {
    try {
      await window.api.customers.update(id, customer)
      const customers = (await window.api.customers.findAll()) as Customer[]
      set({ customers })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  deleteCustomer: async (id) => {
    try {
      await window.api.customers.delete(id)
      const customers = (await window.api.customers.findAll()) as Customer[]
      set({ customers })
    } catch (error) {
      set({ error: String(error) })
    }
  }
}))
