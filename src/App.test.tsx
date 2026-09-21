import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { App } from './App'

describe('App render', () => {
  it('renders without crashing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('かなジャン！')
    expect(html).toContain('lobby')
    expect(html).not.toContain('登場牌組')
    expect(html).not.toContain('對戰 さくら、ひなた、あおい')
    expect(html).not.toContain('支援 2～4 位真人玩家同樂')
    expect(html).not.toContain('牌局模式與登場行')
    expect(html).not.toContain('tutorial-dialog')
  })
})
