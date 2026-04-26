import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ServiceOrder, ServiceOrderItem } from '@renderer/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}

export function lineTotal(item: ServiceOrderItem): number {
  return (item.quantity || 1) * item.price
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

export interface PhoneValidation {
  valid: boolean
  reason?: string
}

export function isValidBrazilianPhone(phone: string): PhoneValidation {
  if (!phone || !phone.trim()) {
    return { valid: false, reason: 'Telefone não informado' }
  }

  const digits = phone.replace(/\D/g, '')

  if (digits.length < 10 || digits.length > 13) {
    return { valid: false, reason: 'Quantidade de dígitos inválida' }
  }

  let local = digits
  if (local.startsWith('55') && (local.length === 12 || local.length === 13)) {
    local = local.slice(2)
  }

  if (local.length !== 10 && local.length !== 11) {
    return { valid: false, reason: 'Quantidade de dígitos inválida' }
  }

  const ddd = local.slice(0, 2)
  if (!/^[1-9][1-9]$/.test(ddd)) {
    return { valid: false, reason: 'DDD inválido' }
  }

  const firstDigit = local[2]
  if (local.length === 11) {
    if (firstDigit !== '9') {
      return { valid: false, reason: 'Celular deve começar com 9 após o DDD' }
    }
  } else {
    if (!/^[2-5]$/.test(firstDigit)) {
      return { valid: false, reason: 'Número fixo deve começar com 2 a 5 após o DDD' }
    }
  }

  return { valid: true }
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return digits
  }
  return '55' + digits
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const validation = isValidBrazilianPhone(phone)
  if (!validation.valid) return null
  const normalized = normalizePhone(phone)
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

export function buildReadyMessage(order: ServiceOrder): string {
  const items = order.items
    .map((item) => (item.quantity || 1) > 1 ? `${item.description} x${item.quantity || 1}` : item.description)
    .join(', ')
  const balance = order.financial.balance
  const balanceText = balance <= 0 ? 'Quitado' : formatCurrency(balance)
  return (
    `Olá ${order.customer.name}! Sua OS #${order.osNumber} está pronta para retirada.\n` +
    `Itens: ${items}\n` +
    `Total: ${formatCurrency(order.financial.total)} | Saldo pendente: ${balanceText}`
  )
}
