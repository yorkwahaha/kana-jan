import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { App } from './App'

describe('App render', () => {
  it('renders without crashing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('かなジャン！')
    expect(html).toContain('lobby')
  })
})
