import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { STATUS_LABELS } from '@renderer/types'
import { formatCurrency, formatDate, lineTotal } from '@renderer/lib/utils'
import { useEffect } from 'react'

export function PrintServiceOrder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrder, fetchOrderById } = useServiceOrderStore()

  useEffect(() => {
    if (id) fetchOrderById(id)
  }, [id, fetchOrderById])

  if (!currentOrder) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const order = currentOrder

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>

      <div className="print-area grid grid-cols-2 gap-8">
        {[0, 1].map((via) => (
          <div key={via} className="border p-6 text-sm">
            <div className="mb-4 border-b pb-3 text-center">
              <h2 className="text-lg font-bold">LUPA - Ordem de Serviço</h2>
              <p className="text-xs text-gray-500">
                {via === 0 ? 'VIA CLIENTE' : 'VIA ESTABELECIMENTO'}
              </p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">OS #:</span> {order.osNumber}
              </div>
              <div>
                <span className="font-semibold">Data:</span> {formatDate(order.dates.created)}
              </div>
              <div>
                <span className="font-semibold">Prazo:</span> {formatDate(order.dates.deadline)}
              </div>
              <div>
                <span className="font-semibold">Status:</span> {STATUS_LABELS[order.status]}
              </div>
            </div>

            <div className="mb-3 border-b pb-3">
              <span className="font-semibold">Cliente:</span> {order.customer.name}
              <br />
              <span className="font-semibold">Tel:</span> {order.customer.phone}
            </div>

            <div className="mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-left">Descrição</th>
                    <th className="py-1 text-center">Qtd</th>
                    <th className="py-1 text-right">Valor</th>
                    <th className="py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-1">{item.description}</td>
                      <td className="py-1 text-center">{item.quantity || 1}</td>
                      <td className="py-1 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-1 text-right">{formatCurrency(lineTotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-semibold">{formatCurrency(order.financial.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrada:</span>
                <span>{formatCurrency(order.financial.deposit)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Saldo:</span>
                <span>{formatCurrency(order.financial.balance)}</span>
              </div>
            </div>

            {order.notes && (
              <div className="mt-3 text-xs">
                <span className="font-semibold">Obs:</span> {order.notes}
              </div>
            )}

            <div className="mt-8 flex justify-between text-xs">
              <div>
                <div className="border-b border-black px-12 py-6">Assinatura Cliente</div>
              </div>
              <div>
                <div className="border-b border-black px-12 py-6">Assinatura Atendente</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
