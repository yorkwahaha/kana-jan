import { createLobbyState } from '../engine/game'
import { makeTargetBonus } from '../data/bonuses'
import { getSound } from '../data/kana'
import type { GameState } from '../engine/types'

const KEY = 'kana-jan-save-v1'
const TUTORIAL_KEY = 'kana-jan-tutorial-seen'
const SAVE_VERSION = 2

interface SavedGame {
  version: typeof SAVE_VERSION
  state: GameState
}

export function saveGame(state: GameState) {
  try {
    if (state.phase === 'lobby') {
      localStorage.removeItem(KEY)
      return
    }
    const saved: SavedGame = { version: SAVE_VERSION, state }
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // ignore quota
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const decoded = JSON.parse(raw) as GameState | SavedGame
    const isVersioned =
      typeof decoded === 'object' &&
      decoded !== null &&
      'version' in decoded &&
      decoded.version === SAVE_VERSION &&
      'state' in decoded
    const parsed = (isVersioned ? decoded.state : decoded) as GameState
    if (!parsed || !parsed.phase || !Array.isArray(parsed.players)) return null
    if (parsed.phase === 'lobby') return null
    if (!Array.isArray(parsed.activeRows) || !parsed.lessonId || !parsed.bonus?.sound) return null
    parsed.bonus = makeTargetBonus(getSound(parsed.bonus.sound), parsed.bonus.points)
    if (parsed.lastDiscardPlayerId === undefined) parsed.lastDiscardPlayerId = null
    if (typeof parsed.comboCount !== 'number') parsed.comboCount = 0
    if (typeof parsed.turnOwnerIndex !== 'number') {
      parsed.turnOwnerIndex = parsed.currentPlayerIndex ?? 0
    }
    // 未標版本的舊檔仍以餘額辨識 20/25 點制；新版合法低餘額必須可恢復。
    if (!isVersioned && parsed.players.some((p) => p.gold < 100)) return null
    // 自動消除存檔中歷史殘留的個位數零頭（如 857 -> 860, 1994 -> 1990, 1349 -> 1350），確保十位數起跳
    parsed.players = parsed.players.map((p) => ({
      ...p,
      gold: Math.max(0, Math.round(p.gold / 10) * 10),
      discards: p.discards ?? [],
    }))
    return parsed
  } catch {
    return null
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    // ignore
  }
}

export function initialState(): GameState {
  return loadGame() ?? createLobbyState()
}
