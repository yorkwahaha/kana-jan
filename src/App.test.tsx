import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('starts the guided tutorial after dealing and allows the player to continue', () => {
    vi.useFakeTimers()
    try {
      localStorage.setItem('kana-jan-settings-v1', JSON.stringify({ bgm: false, sfx: false }))
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '新手教學' }))
      act(() => vi.advanceTimersByTime(4000))
      const guide = screen.getByRole('region', { name: '新手教學' })
      expect(guide.textContent).toContain('1 / 6')
      fireEvent.click(screen.getByRole('button', { name: '下一步' }))
      expect(guide.textContent).toContain('2 / 6')
      fireEvent.click(screen.getByRole('button', { name: '跳過教學' }))
      expect(screen.queryByRole('region', { name: '新手教學' })).toBeNull()
    } finally {
      cleanup()
      localStorage.clear()
      vi.useRealTimers()
    }
  })
})
