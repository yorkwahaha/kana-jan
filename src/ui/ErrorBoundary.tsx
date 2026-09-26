import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kana Jan render error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="fatal-error" role="alert">
        <h1>畫面發生錯誤</h1>
        <p>已阻止整個遊戲直接白屏。請重新整理以回到可恢復狀態。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新整理
        </button>
      </main>
    )
  }
}
