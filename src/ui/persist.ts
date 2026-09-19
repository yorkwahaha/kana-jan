import { createLobbyState } from '../engine/game'
import type { GameState } from '../engine/types'

const KEY = 'kana-jan-save-v1'
const TUTORIAL_KEY = 'kana-jan-tutorial-seen'

export function saveGame(state: GameState) {
  try {
    if (state.phase === 'lobby') {
      localStorage.removeItem(KEY)
      return
    }
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore quota
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (!parsed || !parsed.phase || !Array.isArray(parsed.players)) return null
    if (parsed.phase === 'lobby') return null
    if (!Array.isArray(parsed.activeRows) || !parsed.lessonId || !parsed.bonus?.sound) return null
    if (parsed.lastDiscardPlayerId === undefined) parsed.lastDiscardPlayerId = null
    // 舊版 20/25 點制舊檔過濾，避免污染 1000 點新制
    if (parsed.players.some((p) => p.gold < 100)) return null
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

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return false
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
