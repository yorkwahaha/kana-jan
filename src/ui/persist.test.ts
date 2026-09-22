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

  it('拒絕牌 ID 與牌面內容不一致的竄改存檔', () => {
    const state = startGame({ seed: 15, skipPreview: true })
    state.deck[0] = { ...state.deck[0]!, id: 'a-hiragana' }
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state }))
    expect(loadGame()).toBeNull()
  })

  it('拒絕負數數值、重複座位與非法登場行', () => {
    const state = startGame({ seed: 16, skipPreview: true })
    state.players[0]!.gold = -10
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state }))
    expect(loadGame()).toBeNull()

    const duplicateSeat = startGame({ seed: 17, skipPreview: true })
    duplicateSeat.players[1]!.seat = 0
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state: duplicateSeat }))
    expect(loadGame()).toBeNull()

    const badRows = startGame({ seed: 18, skipPreview: true })
    badRows.activeRows = ['a', 'a']
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state: badRows }))
    expect(loadGame()).toBeNull()
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

  it('缺少 turnOwnerIndex 的抄牌舊檔會從原棄牌者恢復回合擁有者', () => {
    const state = startGame({ seed: 11, skipPreview: true })
    state.currentPlayerIndex = 2
    state.lastDiscardPlayerId = state.players[1]!.id
    const legacy = { version: 2, state: { ...state, turnOwnerIndex: undefined } }
    localStorage.setItem('kana-jan-save-v1', JSON.stringify(legacy))

    expect(loadGame()?.turnOwnerIndex).toBe(1)
  })

  it('舊存檔缺少 currentDiscard 欄位時視為 null', () => {
    const state = startGame({ seed: 14, skipPreview: true })
    const legacyState = { ...state } as Partial<typeof state>
    delete legacyState.currentDiscard
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state: legacyState }))

    expect(loadGame()?.currentDiscard).toBeNull()
  })

  it('拒絕含未知牌資料的損壞存檔', () => {
    const state = startGame({ seed: 12, skipPreview: true })
    state.deck[0] = { ...state.deck[0]!, sound: 'invalid' }
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state }))

    expect(loadGame()).toBeNull()
  })

  it('拒絕 currentDiscard 或 pendingScore 內含未知牌資料的存檔', () => {
    const state = startGame({ seed: 13, skipPreview: true })
    const badCard = { ...state.players[0]!.hand[0]!, sound: 'invalid' }

    state.currentDiscard = badCard
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state }))
    expect(loadGame()).toBeNull()

    state.currentDiscard = null
    state.pendingScore = {
      playerId: state.players[0]!.id,
      source: 'tsumo',
      yaku: {
        id: 'bad', kind: 'sameSound', cards: [badCard], baseScore: 120,
        typeBonus: 0, missionBonus: 0, totalScore: 120, label: 'bad',
      },
    }
    localStorage.setItem('kana-jan-save-v1', JSON.stringify({ version: 2, state }))
    expect(loadGame()).toBeNull()
  })
})
