import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { Search, FileText, User, Wrench, ArrowRight } from 'lucide-react'
import type { ServiceOrder, ServiceItem, Customer } from '@renderer/types'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useCustomerStore } from '@renderer/stores/useCustomerStore'
import { cn } from '@renderer/lib/utils'

interface CommandBarProps {
  open: boolean
  onClose: () => void
}

interface SearchResult {
  type: 'order' | 'service' | 'customer' | 'action'
  id: string
  label: string
  sublabel?: string
  icon: typeof FileText
  action: () => void
}

const defaultActions = (
  onClose: () => void,
  navigate: ReturnType<typeof useNavigate>
): SearchResult[] => [
  {
    type: 'action',
    id: 'new-os',
    label: 'Nova Ordem de Serviço',
    sublabel: 'Criar uma nova OS',
    icon: FileText,
    action: () => {
      onClose()
      navigate('/os/new')
    }
  },
  {
    type: 'action',
    id: 'new-customer',
    label: 'Novo Cliente',
    sublabel: 'Cadastrar cliente',
    icon: User,
    action: () => {
      onClose()
      navigate('/customers')
    }
  },
  {
    type: 'action',
    id: 'new-service',
    label: 'Novo Serviço',
    sublabel: 'Cadastrar serviço',
    icon: Wrench,
    action: () => {
      onClose()
      navigate('/services')
    }
  }
]

function buildSearchResults(
  searchQuery: string,
  orders: ServiceOrder[],
  services: ServiceItem[],
  customers: Customer[],
  onClose: () => void,
  navigate: ReturnType<typeof useNavigate>
): SearchResult[] {
  if (!searchQuery.trim()) {
    return defaultActions(onClose, navigate)
  }

  const searchResults: SearchResult[] = []

  const orderFuse = new Fuse(orders, {
    keys: [
      { name: 'customer.name', weight: 2 },
      { name: 'osNumber', weight: 1 },
      { name: 'items.description', weight: 1 }
    ],
    threshold: 0.4
  })

  const serviceFuse = new Fuse<ServiceItem>(services, {
    keys: [
      { name: 'label', weight: 2 },
      { name: 'tags', weight: 1 },
      { name: 'category', weight: 1 }
    ],
    threshold: 0.4
  })

  const customerFuse = new Fuse<Customer>(customers, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'phone', weight: 1 }
    ],
    threshold: 0.4
  })

  orderFuse
    .search(searchQuery)
    .slice(0, 5)
    .forEach((r) => {
      const order = r.item as ServiceOrder
      searchResults.push({
        type: 'order',
        id: order.id || '',
        label: `OS #${order.osNumber} - ${order.customer.name}`,
        sublabel: `${order.items.length} item(s)`,
        icon: FileText,
        action: () => {
          onClose()
          navigate(`/os/${order.id}`)
        }
      })
    })

  serviceFuse
    .search(searchQuery)
    .slice(0, 3)
    .forEach((r) => {
      const service = r.item
      searchResults.push({
        type: 'service',
        id: service.id || '',
        label: service.label,
        sublabel: service.category,
        icon: Wrench,
        action: () => {
          onClose()
          navigate('/services')
        }
      })
    })

  customerFuse
    .search(searchQuery)
    .slice(0, 3)
    .forEach((r) => {
      const customer = r.item
      searchResults.push({
        type: 'customer',
        id: customer.id || '',
        label: customer.name,
        sublabel: customer.phone,
        icon: User,
        action: () => {
          onClose()
          navigate('/customers')
        }
      })
    })

  return searchResults
}

export function CommandBar({ open, onClose }: CommandBarProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { orders } = useServiceOrderStore()
  const { services } = useServiceStore()
  const { customers } = useCustomerStore()

  const results = useMemo(
    () => buildSearchResults(query, orders, services, customers, onClose, navigate),
    [query, orders, services, customers, onClose, navigate]
  )

  const handleOpen = useCallback(() => {
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    if (open) handleOpen()
  }, [open, handleOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
      }
      if (!open) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        results[selectedIndex].action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, results, selectedIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            placeholder="Buscar ordens, serviços, clientes..."
            className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-auto p-1">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado para &quot;{query}&quot;
            </div>
          )}
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
              onClick={() => result.action()}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <result.icon className="h-4 w-4 shrink-0 opacity-50" />
              <div className="flex-1 text-left">
                <div>{result.label}</div>
                {result.sublabel && (
                  <div className="text-xs text-muted-foreground">{result.sublabel}</div>
                )}
              </div>
              {index === selectedIndex && <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
