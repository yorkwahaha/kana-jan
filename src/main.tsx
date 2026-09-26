import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AudioReview } from './ui/AudioReview'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './styles.css'

const Root = window.location.hash === '#audio-review' ? AudioReview : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
