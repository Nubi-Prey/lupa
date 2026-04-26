import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { Plus, Trash2, Search, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { useServiceOrderStore } from '@renderer/stores/useServiceOrderStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useCustomerStore } from '@renderer/stores/useCustomerStore'
import { formatCurrency, isValidBrazilianPhone, lineTotal } from '@renderer/lib/utils'
import { CATEGORIES } from '@renderer/types'
import type { ServiceOrderItem, Customer, ServiceItem } from '@renderer/types'

export function ServiceOrderForm() {
  const navigate = useNavigate()
  const { addOrder } = useServiceOrderStore()
  const { services, fetchServices, addService } = useServiceStore()
  const { customers, fetchCustomers, addCustomer } = useCustomerStore()

  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [serviceQuery, setServiceQuery] = useState('')
  const [items, setItems] = useState<ServiceOrderItem[]>([])
  const [deposit, setDeposit] = useState(0)
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerHighlight, setCustomerHighlight] = useState(0)
  const [serviceHighlight, setServiceHighlight] = useState(0)

  const customerInputRef = useRef<HTMLInputElement>(null)
  const deadlineInputRef = useRef<HTMLInputElement>(null)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)
  const serviceInputRef = useRef<HTMLInputElement>(null)
  const depositInputRef = useRef<HTMLInputElement>(null)

  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false)
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('')

  const [quickServiceOpen, setQuickServiceOpen] = useState(false)
  const [quickServiceLabel, setQuickServiceLabel] = useState('')
  const [quickServicePrice, setQuickServicePrice] = useState(0)
  const [quickServiceCategory, setQuickServiceCategory] = useState(CATEGORIES[0])

  useEffect(() => {
    fetchServices()
    fetchCustomers()
  }, [fetchServices, fetchCustomers])

  useEffect(() => {
    customerInputRef.current?.focus()
  }, [])

  const customerFuse = useMemo(
    () => new Fuse(customers, { keys: ['name', 'phone'], threshold: 0.4 }),
    [customers]
  )

  const serviceFuse = useMemo(
    () => new Fuse<ServiceItem>(services, { keys: ['label', 'tags'], threshold: 0.4 }),
    [services]
  )

  const customerResults = customerQuery.trim()
    ? customerFuse.search(customerQuery).map((r) => r.item)
    : customers

  const serviceResults = serviceQuery.trim()
    ? serviceFuse.search(serviceQuery).map((r) => r.item)
    : services

  const noCustomerMatch = customerQuery.trim() && customerResults.length === 0
  const noServiceMatch = serviceQuery.trim() && serviceResults.length === 0

  const customerDropdownItems = customerSearchOpen && customerQuery.trim() && !quickCustomerOpen
    ? customerResults.slice(0, 10)
    : []

  const serviceDropdownItems = serviceQuery.trim() && !quickServiceOpen
    ? serviceResults.slice(0, 8)
    : []

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer)
    setCustomerQuery('')
    setCustomerSearchOpen(false)
    setCustomerHighlight(0)
    setTimeout(() => deadlineInputRef.current?.focus(), 50)
  }

  async function handleQuickCreateCustomer() {
    const name = customerQuery.trim()
    if (!name) return
    const created = await addCustomer({ name, phone: quickCustomerPhone })
    if (created) {
      selectCustomer(created)
    }
    setQuickCustomerOpen(false)
    setQuickCustomerPhone('')
  }

  function openQuickCustomer() {
    setQuickCustomerPhone('')
    setQuickCustomerOpen(true)
  }

  function addServiceItem(service: ServiceItem) {
    setItems([...items, { description: service.label, quantity: 1, price: service.basePrice }])
    setServiceQuery('')
    setQuickServiceOpen(false)
    setServiceHighlight(0)
    setTimeout(() => depositInputRef.current?.focus(), 50)
  }

  async function handleQuickCreateService() {
    const label = quickServiceLabel.trim() || serviceQuery.trim()
    if (!label) return
    const created = await addService({
      label,
      category: quickServiceCategory,
      basePrice: quickServicePrice,
      tags: []
    })
    if (created) {
      addServiceItem(created)
    }
    setQuickServiceLabel('')
    setQuickServicePrice(0)
    setQuickServiceCategory(CATEGORIES[0])
    setQuickServiceOpen(false)
    setServiceQuery('')
  }

  function openQuickService() {
    setQuickServiceLabel(serviceQuery.trim())
    setQuickServicePrice(0)
    setQuickServiceCategory(CATEGORIES[0])
    setQuickServiceOpen(true)
  }

  function addItemManually() {
    setItems([...items, { description: '', quantity: 1, price: 0 }])
  }

  function updateItem(index: number, field: keyof ServiceOrderItem, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + lineTotal(item), 0)
  const balance = total - deposit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || items.length === 0) return

    const order = await addOrder({
      customer: { name: selectedCustomer.name, phone: selectedCustomer.phone },
      items,
      status: 'pending',
      dates: {
        created: new Date().toISOString(),
        deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString()
      },
      financial: { total, deposit, balance },
      attachments: [],
      notes
    })

    if (order?.id) {
      navigate(`/os/${order.id}`)
    }
  }

  const handleCustomerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!customerDropdownItems.length && !noCustomerMatch) {
        if (e.key === 'Enter' && selectedCustomer) {
          e.preventDefault()
          deadlineInputRef.current?.focus()
        }
        if (e.key === 'Escape') {
          setCustomerSearchOpen(false)
        }
        return
      }

      const totalItems = customerDropdownItems.length + (noCustomerMatch ? 0 : 1) + 1

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCustomerHighlight((h) => Math.min(h + 1, totalItems - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCustomerHighlight((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (customerHighlight < customerDropdownItems.length) {
          selectCustomer(customerDropdownItems[customerHighlight])
        } else if (noCustomerMatch) {
          openQuickCustomer()
        } else {
          openQuickCustomer()
        }
      } else if (e.key === 'Escape') {
        setCustomerSearchOpen(false)
      }
    },
    [customerDropdownItems, customerHighlight, noCustomerMatch, selectedCustomer]
  )

  const handleServiceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!serviceDropdownItems.length && !noServiceMatch) return

      const totalItems = serviceDropdownItems.length + (noServiceMatch ? 0 : 0) + 1

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setServiceHighlight((h) => Math.min(h + 1, totalItems - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setServiceHighlight((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (serviceHighlight < serviceDropdownItems.length) {
          addServiceItem(serviceDropdownItems[serviceHighlight])
        } else {
          openQuickService()
        }
      } else if (e.key === 'Escape') {
        setServiceQuery('')
      }
    },
    [serviceDropdownItems, serviceHighlight, noServiceMatch]
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{selectedCustomer.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setTimeout(() => customerInputRef.current?.focus(), 50)
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={customerInputRef}
                    placeholder="Buscar cliente por nome ou telefone..."
                    className="pl-9"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value)
                      setCustomerSearchOpen(true)
                      setQuickCustomerOpen(false)
                      setCustomerHighlight(0)
                    }}
                    onFocus={() => setCustomerSearchOpen(true)}
                    onKeyDown={handleCustomerKeyDown}
                  />
                  {customerSearchOpen && customerQuery.trim() && !quickCustomerOpen && (
                    <div className="absolute z-10 mt-1 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                      {customerDropdownItems.map((customer, i) => (
                        <button
                          key={customer.id}
                          type="button"
                          className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${i === customerHighlight ? 'bg-accent' : 'hover:bg-accent'}`}
                          onClick={() => selectCustomer(customer)}
                          onMouseEnter={() => setCustomerHighlight(i)}
                        >
                          <div className="flex-1 text-left">
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                          </div>
                        </button>
                      ))}
                      {noCustomerMatch && (
                        <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                          Nenhum cliente encontrado
                        </div>
                      )}
                      <button
                        type="button"
                        className={`flex w-full items-center gap-2 border-t px-3 py-2 text-sm font-medium text-primary ${customerHighlight === customerDropdownItems.length ? 'bg-accent' : 'hover:bg-accent'}`}
                        onClick={openQuickCustomer}
                        onMouseEnter={() => setCustomerHighlight(customerDropdownItems.length)}
                      >
                        <UserPlus className="h-4 w-4" />
                        Cadastrar &quot;{customerQuery.trim()}&quot;
                      </button>
                    </div>
                  )}
                  {quickCustomerOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-3 shadow-lg">
                      <p className="mb-2 text-sm font-medium">
                        Novo cliente: {customerQuery.trim()}
                      </p>
                      <div className="space-y-2">
                        <Input
                          placeholder="Telefone"
                          value={quickCustomerPhone}
                          onChange={(e) => setQuickCustomerPhone(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickCreateCustomer()
                            if (e.key === 'Escape') setQuickCustomerOpen(false)
                          }}
                        />
                        {quickCustomerPhone && !isValidBrazilianPhone(quickCustomerPhone).valid && (
                          <p className="text-xs text-destructive">{isValidBrazilianPhone(quickCustomerPhone).reason}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuickCustomerOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleQuickCreateCustomer}
                          >
                            Cadastrar e Selecionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prazo e Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Prazo de Entrega</label>
                <Input
                  ref={deadlineInputRef}
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      notesInputRef.current?.focus()
                    }
                  }}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Observações</label>
                <Textarea
                  ref={notesInputRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      serviceInputRef.current?.focus()
                    }
                  }}
                  rows={3}
                  placeholder="Observações gerais sobre a OS..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Itens do Serviço</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItemManually}>
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Busca Rápida de Serviços</label>
              <Input
                ref={serviceInputRef}
                placeholder="Digite para buscar serviço (autocomplete)..."
                value={serviceQuery}
                onChange={(e) => {
                  setServiceQuery(e.target.value)
                  setQuickServiceOpen(false)
                  setServiceHighlight(0)
                }}
                onKeyDown={handleServiceKeyDown}
              />
              {serviceQuery.trim() && !quickServiceOpen && (
                <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-popover shadow-lg">
                  {serviceDropdownItems.map((service, i) => (
                    <button
                      key={service.id}
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-sm ${i === serviceHighlight ? 'bg-accent' : 'hover:bg-accent'}`}
                      onClick={() => addServiceItem(service)}
                      onMouseEnter={() => setServiceHighlight(i)}
                    >
                      <span>{service.label}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(service.basePrice)}
                      </span>
                    </button>
                  ))}
                  {noServiceMatch && (
                    <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                      Nenhum serviço encontrado
                    </div>
                  )}
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 border-t px-3 py-2 text-sm font-medium text-primary ${serviceHighlight === serviceDropdownItems.length ? 'bg-accent' : 'hover:bg-accent'}`}
                    onClick={openQuickService}
                    onMouseEnter={() => setServiceHighlight(serviceDropdownItems.length)}
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar serviço &quot;{serviceQuery.trim()}&quot;
                  </button>
                </div>
              )}
              {quickServiceOpen && (
                <div className="mt-1 rounded-md border bg-popover p-3 shadow-lg">
                  <p className="mb-2 text-sm font-medium">Novo serviço</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do serviço"
                      value={quickServiceLabel}
                      onChange={(e) => setQuickServiceLabel(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickCreateService()
                        if (e.key === 'Escape') setQuickServiceOpen(false)
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={quickServiceCategory}
                        onChange={(e) => setQuickServiceCategory(e.target.value)}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Preço"
                          className="pl-9"
                          value={quickServicePrice || ''}
                          onChange={(e) => setQuickServicePrice(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickCreateService()
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setQuickServiceOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleQuickCreateService}
                        disabled={!quickServiceLabel.trim() && !serviceQuery.trim()}
                      >
                        Cadastrar e Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Descrição do serviço"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    required
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      className="w-16 text-center"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Math.max(1, Number(e.target.value)))}
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
                      onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && index === items.length - 1) {
                          e.preventDefault()
                          depositInputRef.current?.focus()
                        }
                      }}
                      required
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-medium">
                    {formatCurrency(lineTotal(item))}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum item adicionado. Use a busca acima ou adicione manualmente.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Total</label>
                <div className="rounded-md border bg-muted px-3 py-2 text-lg font-semibold">
                  {formatCurrency(total)}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Entrada (R$)</label>
                <Input
                  ref={depositInputRef}
                  type="number"
                  step="0.01"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Saldo Devedor</label>
                <div className="rounded-md border bg-muted px-3 py-2 text-lg font-semibold">
                  {formatCurrency(balance)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/os')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!selectedCustomer || items.length === 0}>
            Criar Ordem de Serviço
          </Button>
        </div>
      </form>
    </div>
  )
}
