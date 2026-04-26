import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { STATUS_LABELS, type ServiceOrderStatus, type ServiceOrder } from '@renderer/types'
import { formatCurrency, formatDate } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'

type SortKey = 'deadline' | 'total' | 'osNumber' | 'items'
type SortDir = 'asc' | 'desc'

function sortOrders(orders: ServiceOrder[], key: SortKey, dir: SortDir): ServiceOrder[] {
  const sorted = [...orders].sort((a, b) => {
    switch (key) {
      case 'deadline':
        return new Date(a.dates.deadline).getTime() - new Date(b.dates.deadline).getTime()
      case 'total':
        return a.financial.total - b.financial.total
      case 'osNumber':
        return a.osNumber - b.osNumber
      case 'items':
        return a.items.length - b.items.length
    }
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function WorkshopPage() {
  const navigate = useNavigate()
  const { orders, fetchOrders } = useServiceOrderStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const matchesSearch =
          !search.trim() ||
          order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          String(order.osNumber).includes(search)
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [orders, search, statusFilter]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const statusGroups: ServiceOrderStatus[] = ['quote', 'pending', 'in_progress', 'ready']

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Oficina</h1>
        <p className="text-sm text-muted-foreground">Visualização técnica das Ordens de Serviço</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ServiceOrderStatus | 'all')}
          className="w-44"
        >
          <option value="all">Todos</option>
          <option value="quote">Orçamento</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="ready">Pronto</option>
        </Select>
        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>Ordenar:</span>
          <button
            type="button"
            className={cn('px-1.5 py-0.5 rounded hover:bg-accent', sortKey === 'deadline' && 'font-medium text-foreground')}
            onClick={() => toggleSort('deadline')}
          >
            Prazo{sortKey === 'deadline' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <button
            type="button"
            className={cn('px-1.5 py-0.5 rounded hover:bg-accent', sortKey === 'total' && 'font-medium text-foreground')}
            onClick={() => toggleSort('total')}
          >
            Valor{sortKey === 'total' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <button
            type="button"
            className={cn('px-1.5 py-0.5 rounded hover:bg-accent', sortKey === 'items' && 'font-medium text-foreground')}
            onClick={() => toggleSort('items')}
          >
            Itens{sortKey === 'items' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <button
            type="button"
            className={cn('px-1.5 py-0.5 rounded hover:bg-accent', sortKey === 'osNumber' && 'font-medium text-foreground')}
            onClick={() => toggleSort('osNumber')}
          >
            OS#{sortKey === 'osNumber' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {statusGroups.map((status) => {
          const groupOrders = sortOrders(
            filtered.filter((o) => o.status === status),
            sortKey,
            sortDir
          )
          return (
            <div key={status}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-3 w-3 rounded-full',
                    status === 'quote' && 'bg-status-quote',
                    status === 'pending' && 'bg-status-pending',
                    status === 'in_progress' && 'bg-status-in-progress',
                    status === 'ready' && 'bg-status-ready'
                  )}
                />
                <h2 className="font-semibold">{STATUS_LABELS[status]}</h2>
                <span className="text-sm text-muted-foreground">({groupOrders.length})</span>
              </div>
              <div className="space-y-3">
                {groupOrders.map((order) => (
                  <Card key={order.id} className="cursor-pointer" onClick={() => order.id && navigate(`/os/${order.id}`)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="font-mono">#{order.osNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal text-muted-foreground">
                            {formatCurrency(order.financial.total)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Prazo: {formatDate(order.dates.deadline)}
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">{order.customer.name}</div>
                        {order.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/os/${order.id}`)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="text-xs text-muted-foreground">
                            - {item.description}{(item.quantity || 1) > 1 ? ` ×${item.quantity || 1}` : ''}
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="mt-2 truncate text-xs italic text-muted-foreground">
                          {order.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {groupOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma OS</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
