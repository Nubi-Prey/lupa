export interface ServiceItem {
  id?: string
  label: string
  category: string
  basePrice: number
  tags: string[]
}

export interface Customer {
  id?: string
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  createdAt?: Date
}

export type ServiceOrderStatus = 'quote' | 'pending' | 'in_progress' | 'ready' | 'delivered'

export interface ServiceOrderItem {
  description: string
  quantity: number
  price: number
}

export interface ServiceOrder {
  id?: string
  osNumber: number
  customer: {
    name: string
    phone: string
  }
  items: ServiceOrderItem[]
  status: ServiceOrderStatus
  dates: {
    created: string
    deadline: string
    finished?: string
  }
  financial: {
    total: number
    deposit: number
    balance: number
  }
  attachments: string[]
  notes?: string
}

export const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  quote: 'Orçamento',
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  ready: 'Pronto',
  delivered: 'Entregue'
}

export const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  quote: 'bg-status-quote text-black',
  pending: 'bg-status-pending text-black',
  in_progress: 'bg-status-in-progress text-white',
  ready: 'bg-status-ready text-white',
  delivered: 'bg-status-delivered text-white'
}

export const CATEGORIES = ['Conserto', 'Fabricação', 'Limpeza', 'Restauração', 'Outro']
