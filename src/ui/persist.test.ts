import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startGame } from '../engine/game'
import { loadGame, saveGame } from './persist'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('對局存檔版本', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('新版 1000 點制允許恢復低於 100、但尚未歸零的合法餘額', () => {
    const state = startGame({ seed: 7, skipPreview: true })
    state.players[0]!.gold = 70
    saveGame(state)

    expect(loadGame()?.players[0]?.gold).toBe(70)
  })

  it('未標版本的舊 20/25 點制存檔仍會被拒絕', () => {
    const state = startGame({ seed: 7, skipPreview: true })
    state.players[0]!.gold = 20
    localStorage.setItem('kana-jan-save-v1', JSON.stringify(state))

    expect(loadGame()).toBeNull()
  })

  it('載入舊存檔時會將 Bonus 單字卡轉為同讀音的平假名卡', () => {
    const state = startGame({ seed: 9, skipPreview: true })
    state.bonus.cardId = `${state.bonus.sound}-vocabulary`
    state.bonus.label = '舊單字標籤'
    saveGame(state)

    const restored = loadGame()
    expect(restored?.bonus.cardId).toBe(`${state.bonus.sound}-hiragana`)
    expect(restored?.bonus.label).not.toBe('舊單字標籤')
  })
})
