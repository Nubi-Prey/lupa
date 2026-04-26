import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Printer, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@renderer/components/ui/table'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { STATUS_LABELS, STATUS_COLORS, type ServiceOrderStatus, type ServiceOrder } from '@renderer/types'
import { formatCurrency, formatDate } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'

type SortKey = 'osNumber' | 'deadline' | 'total' | 'items' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<ServiceOrderStatus, number> = {
  quote: 0,
  pending: 1,
  in_progress: 2,
  ready: 3,
  delivered: 4
}

function sortOrders(orders: ServiceOrder[], key: SortKey, dir: SortDir): ServiceOrder[] {
  const sorted = [...orders].sort((a, b) => {
    switch (key) {
      case 'osNumber':
        return a.osNumber - b.osNumber
      case 'deadline':
        return new Date(a.dates.deadline).getTime() - new Date(b.dates.deadline).getTime()
      case 'total':
        return a.financial.total - b.financial.total
      case 'items':
        return a.items.length - b.items.length
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    }
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function ServiceOrdersPage() {
  const navigate = useNavigate()
  const { orders, fetchOrders, updateStatus } = useServiceOrderStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('osNumber')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  const sorted = useMemo(() => sortOrders(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'osNumber' ? 'desc' : 'asc')
    }
  }

  async function handleStatusChange(id: string, status: ServiceOrderStatus) {
    await updateStatus(id, status)
  }

  function SortableHeader({ label, sKey, className }: { label: string; sKey: SortKey; className?: string }) {
    const active = sortKey === sKey
    return (
      <TableHead className={className}>
        <button
          type="button"
          className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground font-medium')}
          onClick={() => toggleSort(sKey)}
        >
          {label}
          <ArrowUpDown className={cn('h-3 w-3', active ? 'opacity-100' : 'opacity-30')} />
          {active && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
      </TableHead>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
        <Button onClick={() => navigate('/os/new')}>
          <Plus className="h-4 w-4" />
          Nova OS
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
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
              <option value="all">Todos os Status</option>
              <option value="quote">Orçamento</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="ready">Pronto</option>
              <option value="delivered">Entregue</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="OS #" sKey="osNumber" />
                <TableHead>Cliente</TableHead>
                <SortableHeader label="Itens" sKey="items" />
                <SortableHeader label="Total" sKey="total" />
                <SortableHeader label="Prazo" sKey="deadline" />
                <SortableHeader label="Status" sKey="status" />
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">#{order.osNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customer.name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{order.items.length} item(s)</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.financial.total)}
                  </TableCell>
                  <TableCell>{formatDate(order.dates.deadline)}</TableCell>
                  <TableCell>
                    <select
                      value={order.status}
                      onChange={(e) =>
                        order.id &&
                        handleStatusChange(order.id, e.target.value as ServiceOrderStatus)
                      }
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/os/${order.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/os/${order.id}/print`)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma ordem encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
