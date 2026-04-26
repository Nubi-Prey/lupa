import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, CheckCircle2, XCircle, Loader2, Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useThemeStore } from '@renderer/stores/useThemeStore'
import type { ConnectionInfo } from '../../../preload/index.d'
import type { Theme } from '../../../preload/index.d'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor }
]

export function SettingsPage() {
  const navigate = useNavigate()
  const [uri, setUri] = useState('')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionInfo | null>(null)
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    window.api.config.get().then((config) => {
      setUri(config.mongodbUri)
    })
  }, [])

  async function handleSave() {
    await window.api.config.set('mongodbUri', uri)
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)

    if (!saved) {
      await window.api.config.set('mongodbUri', uri)
      setSaved(true)
    }

    try {
      const info = await window.api.db.connect()
      setTestResult(info)
      if (info.state === 'connected') {
        setTimeout(() => navigate('/'), 1000)
      }
    } catch {
      setTestResult({
        state: 'failed',
        dbName: '',
        host: '',
        uri: '',
        error: 'Falha na conexão'
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Configurações</h1>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Escolha o tema da interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                    theme === opt.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Banco de Dados
            </CardTitle>
            <CardDescription>
              Configure a conexão com o MongoDB. Aceita URIs no formato mongodb:// ou mongodb+srv://
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">URI do MongoDB</label>
              <Input
                value={uri}
                onChange={(e) => {
                  setUri(e.target.value)
                  setSaved(false)
                  setTestResult(null)
                }}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                type="password"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A URI é salva localmente no seu computador e não é enviada a terceiros.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={!uri.trim()}>
                Salvar
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={!uri.trim() || testing}>
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  'Testar Conexão'
                )}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Salvo
                </span>
              )}
            </div>

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
                  testResult.state === 'connected'
                    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                {testResult.state === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Conectado ao banco <strong>{testResult.dbName}</strong> em <strong>{testResult.host}</strong>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Falha na conexão: {testResult.error || 'Erro desconhecido'}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
