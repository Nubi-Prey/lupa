import './assets/main.css'

import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { ServiceOrdersPage } from './pages/ServiceOrdersPage'
import { ServiceOrderForm } from './pages/ServiceOrderForm'
import { ServiceOrderDetail } from './pages/ServiceOrderDetail'
import { PrintServiceOrder } from './pages/PrintServiceOrder'
import { ServicesPage } from './pages/ServicesPage'
import { CustomersPage } from './pages/CustomersPage'
import { WorkshopPage } from './pages/WorkshopPage'
import { SettingsPage } from './pages/SettingsPage'

function SettingsGuard(): null {
  const navigate = useNavigate()

  useEffect(() => {
    window.api.config.hasDbUri().then((has) => {
      if (!has) {
        navigate('/settings', { replace: true })
      }
    })
  }, [navigate])

  return null
}

function SetupLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-6">
        <SettingsPage />
      </div>
    </div>
  )
}

function AppRoutes(): React.JSX.Element {
  const [hasUri, setHasUri] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.config.hasDbUri().then((has) => {
      setHasUri(has)
    })

    const cleanup = window.api.config.onUriChange((has: boolean) => {
      setHasUri(has)
    })

    return () => {
      cleanup()
    }
  }, [])

  if (hasUri === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!hasUri) {
    return (
      <HashRouter>
        <Routes>
          <Route path="*" element={<SetupLayout />} />
        </Routes>
      </HashRouter>
    )
  }

  return (
    <HashRouter>
      <SettingsGuard />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/os" element={<ServiceOrdersPage />} />
          <Route path="/os/new" element={<ServiceOrderForm />} />
          <Route path="/os/:id" element={<ServiceOrderDetail />} />
          <Route path="/os/:id/print" element={<PrintServiceOrder />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/workshop" element={<WorkshopPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

function App(): React.JSX.Element {
  return <AppRoutes />
}

export default App
