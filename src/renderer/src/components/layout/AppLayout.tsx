import { useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { CommandBar } from '../CommandBar'

export function AppLayout() {
  const [commandBarOpen, setCommandBarOpen] = useState(false)
  const navigate = useNavigate()

  const openCommandBar = useCallback(() => setCommandBarOpen(true), [])
  const closeCommandBar = useCallback(() => setCommandBarOpen(false), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/os/new')
        return
      }

      if (e.key === 'Escape' && !commandBarOpen) {
        if (isInput) return
        navigate(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, commandBarOpen])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar onOpenCommandBar={openCommandBar} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <CommandBar open={commandBarOpen} onClose={closeCommandBar} />
    </div>
  )
}
