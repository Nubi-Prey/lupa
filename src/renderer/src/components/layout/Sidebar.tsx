import { NavLink } from 'react-router-dom'
import { FileText, Users, Settings, Cog, Wrench, LayoutDashboard, Search } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useSyncStore } from '@renderer/stores/useSyncStore'
import { useEffect } from 'react'

interface SidebarProps {
  onOpenCommandBar: () => void
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/os', label: 'Ordens', icon: FileText },
  { to: '/services', label: 'Serviços', icon: Settings },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/workshop', label: 'Oficina', icon: Wrench },
  { to: '/settings', label: 'Configurações', icon: Cog }
]

export function Sidebar({ onOpenCommandBar }: SidebarProps) {
  const { isOnline, checkConnection, initListener } = useSyncStore()

  useEffect(() => {
    checkConnection()
    const cleanup = initListener()
    return cleanup
  }, [checkConnection, initListener])

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <Search className="h-4 w-4" />
        <span className="text-lg font-bold tracking-tight">Lupa</span>
      </div>

      <button
        onClick={onOpenCommandBar}
        className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-1.5 text-sm text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/80"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 text-[10px] font-mono">
          Ctrl+K
        </kbd>
      </button>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <div className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-400')} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
    </aside>
  )
}
