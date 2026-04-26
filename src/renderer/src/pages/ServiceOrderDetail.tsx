import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Pencil, Check, X, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Input } from '@renderer/components/ui/input'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { STATUS_LABELS, STATUS_COLORS, type ServiceOrderStatus, type ServiceOrderItem } from '@renderer/types'
import { formatCurrency, formatDate, buildWhatsAppUrl, buildReadyMessage, isValidBrazilianPhone, lineTotal } from '@renderer/lib/utils'

const NEXT_STATUS: Record<ServiceOrderStatus, ServiceOrderStatus | null> = {
  quote: 'pending',
  pending: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
  delivered: null
}

const NEXT_STATUS_LABEL: Record<string, string> = {
  quote: 'Aprovar Orçamento',
  pending: 'Iniciar',
  in_progress: 'Finalizar',
  ready: 'Entregar'
}

export function ServiceOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrder, fetchOrderById, updateStatus, updateOrder } = useServiceOrderStore()

  const [editingDeposit, setEditingDeposit] = useState(false)
  const [depositInput, setDepositInput] = useState('0')
  const [editingItems, setEditingItems] = useState(false)
  const [itemDrafts, setItemDrafts] = useState<ServiceOrderItem[]>([])

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
  const nextStatus = NEXT_STATUS[order.status]

  async function handleNextStatus() {
    if (!nextStatus || !order.id) return
    await updateStatus(order.id, nextStatus)
    if (id) fetchOrderById(id)
  }

  function startEditDeposit() {
    setDepositInput(String(order.financial.deposit))
    setEditingDeposit(true)
  }

  async function saveDeposit() {
    if (!order.id) return
    const newDeposit = Number(depositInput)
    const newBalance = order.financial.total - newDeposit
    await updateOrder(order.id, {
      financial: { total: order.financial.total, deposit: newDeposit, balance: newBalance }
    })
    setEditingDeposit(false)
    if (id) fetchOrderById(id)
  }

  function cancelEditDeposit() {
    setEditingDeposit(false)
  }

  function startEditItems() {
    setItemDrafts(order.items.map((item) => ({ ...item })))
    setEditingItems(true)
  }

  function cancelEditItems() {
    setEditingItems(false)
    setItemDrafts([])
  }

  async function saveItems() {
    if (!order.id) return
    const newTotal = itemDrafts.reduce((sum, item) => sum + lineTotal(item), 0)
    const newBalance = newTotal - order.financial.deposit
    await updateOrder(order.id, {
      items: itemDrafts,
      financial: { total: newTotal, deposit: order.financial.deposit, balance: newBalance }
    })
    setEditingItems(false)
    setItemDrafts([])
    if (id) fetchOrderById(id)
  }

  function updateDraft(index: number, field: keyof ServiceOrderItem, value: string | number) {
    setItemDrafts((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function removeDraft(index: number) {
    setItemDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  function addDraft() {
    setItemDrafts((prev) => [...prev, { description: '', quantity: 1, price: 0 }])
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">OS #{order.osNumber}</h1>
            <p className="text-sm text-muted-foreground">{order.customer.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {nextStatus && order.id && (
            <Button onClick={handleNextStatus}>{NEXT_STATUS_LABEL[order.status]}</Button>
          )}
          {order.status === 'ready' && (
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={!isValidBrazilianPhone(order.customer.phone).valid}
              onClick={() => {
                const url = buildWhatsAppUrl(order.customer.phone, buildReadyMessage(order))
                if (url) window.api.openExternal(url)
              }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/os/${order.id}/print`)}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{order.customer.name}</div>
            {order.customer.phone ? (
              isValidBrazilianPhone(order.customer.phone).valid ? (
                <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
              ) : (
                <div className="text-sm text-destructive">
                  Telefone inválido — {isValidBrazilianPhone(order.customer.phone).reason}
                </div>
              )
            ) : (
              <div className="text-sm text-destructive">Telefone não informado</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Datas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div>Criada: {formatDate(order.dates.created)}</div>
              <div>Prazo: {formatDate(order.dates.deadline)}</div>
              {order.dates.finished && <div>Concluída: {formatDate(order.dates.finished)}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Itens</CardTitle>
            {!editingItems ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={startEditItems}
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cancelEditItems}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={saveItems}>
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingItems ? (
            <div className="space-y-3">
              {itemDrafts.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Descrição"
                    value={item.description}
                    onChange={(e) => updateDraft(i, 'description', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      className="w-16 text-center"
                      value={item.quantity}
                      onChange={(e) => updateDraft(i, 'quantity', Math.max(1, Number(e.target.value)))}
                    />
                    <span className="text-xs text-muted-foreground">&times;</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-28 pl-9"
                      value={item.price}
                      onChange={(e) => updateDraft(i, 'price', Number(e.target.value))}
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-medium">
                    {formatCurrency(lineTotal(item))}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDraft(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDraft}>
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <span>{item.description}</span>
                    {(item.quantity || 1) > 1 && (
                      <span className="text-sm text-muted-foreground">
                        &times;{item.quantity || 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(item.quantity || 1) > 1 && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} un.
                      </span>
                    )}
                    <span className="font-medium">{formatCurrency(lineTotal(item))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{formatCurrency(order.financial.total)}</div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Entrada</span>
                {!editingDeposit && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={startEditDeposit}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
              {editingDeposit ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-28 pl-7 text-sm"
                      value={depositInput}
                      onChange={(e) => setDepositInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveDeposit()
                        if (e.key === 'Escape') cancelEditDeposit()
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-green-600 hover:text-green-700"
                    onClick={saveDeposit}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:text-red-700"
                    onClick={cancelEditDeposit}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-lg font-semibold">
                  {formatCurrency(order.financial.deposit)}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Saldo</div>
              <div className="text-lg font-semibold">{formatCurrency(order.financial.balance)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
