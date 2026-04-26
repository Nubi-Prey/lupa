import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@renderer/components/ui/table'
import { useCustomerStore } from '@renderer/stores/useCustomerStore'
import { formatPhone, isValidBrazilianPhone } from '@renderer/lib/utils'
import type { Customer } from '@renderer/types'

export function CustomersPage() {
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } =
    useCustomerStore()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filtered = search.trim()
    ? customers.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
      )
    : customers

  function openCreate() {
    setEditing(null)
    setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    setDialogOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || ''
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = { ...form }
    if (editing?.id) {
      await updateCustomer(editing.id, data)
    } else {
      await addCustomer(data)
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteCustomer(id)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(customer.phone)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => customer.id && handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg backdrop:bg-black/50"
      >
        <h2 className="text-lg font-semibold">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
        <p className="text-sm text-muted-foreground">
          {editing ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            {form.phone && !isValidBrazilianPhone(form.phone).valid && (
              <p className="mt-1 text-xs text-destructive">{isValidBrazilianPhone(form.phone).reason}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Endereço</label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Observações</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
