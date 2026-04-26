import { useEffect, useState } from 'react'
import Fuse from 'fuse.js'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { DialogHeader, DialogTitle, DialogDescription } from '@renderer/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@renderer/components/ui/table'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { formatCurrency } from '@renderer/lib/utils'
import { CATEGORIES } from '@renderer/types'
import type { ServiceItem } from '@renderer/types'

export function ServicesPage() {
  const { services, fetchServices, addService, updateService, deleteService } = useServiceStore()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [form, setForm] = useState({ label: '', category: CATEGORIES[0], basePrice: 0, tags: '' })

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const fuse = new Fuse(services, {
    keys: ['label', 'tags', 'category'],
    threshold: 0.4
  })

  const filtered = search.trim() ? fuse.search(search).map((r) => r.item) : services

  function openCreate() {
    setEditing(null)
    setForm({ label: '', category: CATEGORIES[0], basePrice: 0, tags: '' })
    setDialogOpen(true)
  }

  function openEdit(service: ServiceItem) {
    setEditing(service)
    setForm({
      label: service.label,
      category: service.category,
      basePrice: service.basePrice,
      tags: service.tags.join(', ')
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      label: form.label,
      category: form.category,
      basePrice: form.basePrice,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }
    if (editing?.id) {
      await updateService(editing.id, data)
    } else {
      await addService(data)
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteService(id)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Serviços</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviços..."
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
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço Base</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.label}</TableCell>
                  <TableCell>{service.category}</TableCell>
                  <TableCell>{formatCurrency(service.basePrice)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {service.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => service.id && handleDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum serviço encontrado
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
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Atualize os dados do serviço'
              : 'Cadastre um novo serviço para autocomplete'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: Solda de corrente de prata"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Categoria</label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Preço Base (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tags (separadas por vírgula)</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Ex: solda, prata, corrente"
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
