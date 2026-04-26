import { Component, type ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message || 'Erro inesperado'}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            Recarregar
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
