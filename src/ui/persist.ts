import { createLobbyState } from '../engine/game'
import { makeTargetBonus } from '../data/bonuses'
import type { KanaCard } from '../data/cards'
import { getSound } from '../data/kana'
import { isPersistentGameState, isRecord } from '../engine/stateValidation'
import type { GameState } from '../engine/types'

const KEY = 'kana-jan-save-v1'
const SAVE_VERSION = 2

interface SavedGame {
  version: typeof SAVE_VERSION
  state: GameState
}

function rebuildDeckManifest(state: GameState): Record<string, number> {
  const unique = new Map<string, KanaCard>()
  const add = (card: KanaCard) => unique.set(card.id, card)
  state.deck.forEach(add)
  for (const player of state.players) {
    player.hand.forEach(add)
    player.discards.forEach(add)
    player.completed.forEach((completed) => completed.yaku.cards.forEach(add))
  }
  const manifest: Record<string, number> = {}
  for (const card of unique.values()) {
    const key = `${card.sound}:${card.cardType}`
    manifest[key] = (manifest[key] ?? 0) + 1
  }
  return manifest
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
    const decoded = JSON.parse(raw) as unknown
    const isVersioned =
      isRecord(decoded) &&
      'version' in decoded &&
      decoded.version === SAVE_VERSION &&
      'state' in decoded
    const rawState = isVersioned ? decoded.state : decoded
    if (!isRecord(rawState) || typeof rawState.phase !== 'string' || !Array.isArray(rawState.players)) return null
    const parsed = rawState as unknown as GameState
    if (parsed.phase === 'lobby') return null
    if (!Array.isArray(parsed.activeRows) || !parsed.lessonId || !parsed.bonus?.sound) return null
    if (parsed.currentDiscard === undefined) parsed.currentDiscard = null
    if (parsed.lastDiscardPlayerId === undefined) parsed.lastDiscardPlayerId = null
    if (typeof parsed.comboCount !== 'number') parsed.comboCount = 0
    parsed.players = parsed.players.map((player) => ({ ...player, discards: player.discards ?? [] }))
    if (typeof parsed.turnOwnerIndex !== 'number') {
      const ownerId = parsed.pendingScore?.fromPlayerId ?? parsed.lastDiscardPlayerId
      const ownerIndex = ownerId ? parsed.players.findIndex((player) => player.id === ownerId) : -1
      parsed.turnOwnerIndex = ownerIndex >= 0 ? ownerIndex : (parsed.currentPlayerIndex ?? 0)
    }
    parsed.matchId ??= `legacy-${parsed.seed}`
    parsed.bonus = makeTargetBonus(getSound(parsed.bonus.sound), parsed.bonus.points)
    parsed.deckManifest ??= rebuildDeckManifest(parsed)
    if (!isPersistentGameState(parsed)) return null
    // 未標版本的舊檔仍以餘額辨識 20/25 點制；新版合法低餘額必須可恢復。
    if (!isVersioned && parsed.players.some((p) => p.gold < 100)) return null
    // 自動消除存檔中歷史殘留的個位數零頭（如 857 -> 860, 1994 -> 1990, 1349 -> 1350），確保十位數起跳
    parsed.players = parsed.players.map((p) => ({
      ...p,
      gold: Math.max(0, Math.round(p.gold / 10) * 10),
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

export function initialState(): GameState {
  return loadGame() ?? createLobbyState()
}
