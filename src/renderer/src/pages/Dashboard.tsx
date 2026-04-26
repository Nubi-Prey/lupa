import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { FileText, Users, Clock, AlertCircle } from 'lucide-react'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useCustomerStore } from '@renderer/stores/useCustomerStore'
import { STATUS_LABELS, STATUS_COLORS } from '@renderer/types'
import { formatDate } from '@renderer/lib/utils'
import type { ServiceOrder, ServiceOrderStatus } from '@renderer/types'

export function Dashboard() {
  const navigate = useNavigate()
  const { orders, fetchOrders } = useServiceOrderStore()
  const { services, fetchServices } = useServiceStore()
  const { customers, fetchCustomers } = useCustomerStore()

  useEffect(() => {
    fetchOrders()
    fetchServices()
    fetchCustomers()
  }, [fetchOrders, fetchServices, fetchCustomers])

  const pending = orders.filter((o) => o.status === 'pending')
  const inProgress = orders.filter((o) => o.status === 'in_progress')
  const ready = orders.filter((o) => o.status === 'ready')

  const statusGroups: { status: ServiceOrderStatus; label: string; items: ServiceOrder[] }[] = [
    { status: 'pending', label: 'Pendentes', items: pending },
    { status: 'in_progress', label: 'Em Andamento', items: inProgress },
    { status: 'ready', label: 'Prontos', items: ready }
  ]

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => navigate('/os/new')}>
          <FileText className="h-4 w-4" />
          Nova OS
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordens Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-status-pending" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-status-in-progress" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontos</CardTitle>
            <FileText className="h-4 w-4 text-status-ready" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ready.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Atividade Recente</h2>
        <div className="grid grid-cols-3 gap-4">
          {statusGroups.map((group) => (
            <Card key={group.status}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma OS</p>
                ) : (
                  <div className="space-y-2">
                    {group.items.slice(0, 5).map((order) => (
                      <button
                        key={order.id}
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                        onClick={() => navigate(`/os/${order.id}`)}
                      >
                        <div>
                          <div className="font-medium">#{order.osNumber}</div>
                          <div className="text-xs text-muted-foreground">{order.customer.name}</div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[order.status]}`}
                          >
                            {STATUS_LABELS[order.status]}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(order.dates.created)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
