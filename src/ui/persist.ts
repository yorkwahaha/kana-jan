import { createLobbyState } from '../engine/game'
import { makeTargetBonus } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { getSound, ROW_ORDER } from '../data/kana'
import type { GameState } from '../engine/types'

const KEY = 'kana-jan-save-v1'
const SAVE_VERSION = 2

interface SavedGame {
  version: typeof SAVE_VERSION
  state: GameState
}

const VALID_PHASES = new Set([
  'lobby', 'preview', 'dealing', 'playerDraw', 'playerAction', 'discard', 'reaction',
  'scoring', 'review', 'refill', 'nextTurn', 'gameOver',
])

function isValidCard(card: unknown): card is KanaCard {
  if (!card || typeof card !== 'object') return false
  const candidate = card as Partial<KanaCard>
  if (typeof candidate.id !== 'string') return false
  try {
    const canonical = getCardById(candidate.id)
    return candidate.sound === canonical.sound &&
      candidate.romaji === canonical.romaji &&
      candidate.hiragana === canonical.hiragana &&
      candidate.katakana === canonical.katakana &&
      candidate.row === canonical.row &&
      candidate.column === canonical.column &&
      candidate.cardType === canonical.cardType &&
      candidate.vocabulary === canonical.vocabulary &&
      candidate.writtenForm === canonical.writtenForm
  } catch {
    return false
  }
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function hasValidManifest(manifest: unknown): boolean {
  if (manifest === undefined) return true
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return false
  return Object.values(manifest).every((count) => Number.isInteger(count) && isNonNegativeFinite(count))
}

function hasValidCoreState(state: GameState): boolean {
  if (!VALID_PHASES.has(state.phase)) return false
  if (!Array.isArray(state.players) || state.players.length !== 4) return false
  if (!Number.isInteger(state.currentPlayerIndex) || state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length) return false
  if (!Number.isInteger(state.startPlayerIndex) || state.startPlayerIndex < 0 || state.startPlayerIndex >= state.players.length) return false
  if (!Number.isInteger(state.seed) || !Number.isInteger(state.rngState)) return false
  if (!Array.isArray(state.activeRows) || state.activeRows.length === 0) return false
  if (new Set(state.activeRows).size !== state.activeRows.length) return false
  if (!state.activeRows.every((row) => ROW_ORDER.includes(row))) return false
  if (!Array.isArray(state.deck) || !state.deck.every(isValidCard)) return false
  if (!Array.isArray(state.discardPile) || !state.discardPile.every(isValidCard)) return false
  if (state.currentDiscard !== null && !isValidCard(state.currentDiscard)) return false
  if (!hasValidManifest(state.deckManifest)) return false

  const ids = state.players.map((player) => player.id)
  const seats = state.players.map((player) => player.seat).sort((a, b) => a - b)
  if (new Set(ids).size !== 4 || ids.some((id) => typeof id !== 'string' || !id)) return false
  if (seats.join(',') !== '0,1,2,3') return false
  const playerIds = new Set(ids)
  if (!Array.isArray(state.reactionOptions) || !state.reactionOptions.every((option) => playerIds.has(option.playerId))) return false

  if (state.pendingScore) {
    const pending = state.pendingScore
    if (!playerIds.has(pending.playerId)) return false
    if (!Array.isArray(pending.yaku?.cards) || !pending.yaku.cards.every(isValidCard)) return false
    if (pending.claimedCard && !isValidCard(pending.claimedCard)) return false
    if (pending.fromPlayerId && !playerIds.has(pending.fromPlayerId)) return false
  }
  return state.players.every((player) =>
    typeof player.name === 'string' &&
    isNonNegativeFinite(player.gold) &&
    isNonNegativeFinite(player.score) &&
    Number.isInteger(player.seat) &&
    Array.isArray(player.hand) && player.hand.every(isValidCard) &&
    Array.isArray(player.discards ?? []) && (player.discards ?? []).every(isValidCard) &&
    Array.isArray(player.completed ?? []) &&
    (player.completed ?? []).every((completed) => completed?.yaku?.cards?.every(isValidCard)),
  )
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
    if (parsed.currentDiscard === undefined) parsed.currentDiscard = null
    if (!hasValidCoreState(parsed)) return null
    parsed.bonus = makeTargetBonus(getSound(parsed.bonus.sound), parsed.bonus.points)
    if (parsed.lastDiscardPlayerId === undefined) parsed.lastDiscardPlayerId = null
    if (typeof parsed.comboCount !== 'number') parsed.comboCount = 0
    if (typeof parsed.turnOwnerIndex !== 'number') {
      const ownerId = parsed.pendingScore?.fromPlayerId ?? parsed.lastDiscardPlayerId
      const ownerIndex = ownerId ? parsed.players.findIndex((player) => player.id === ownerId) : -1
      parsed.turnOwnerIndex = ownerIndex >= 0 ? ownerIndex : (parsed.currentPlayerIndex ?? 0)
    }
    parsed.matchId ??= `legacy-${parsed.seed}`
    parsed.deckManifest ??= rebuildDeckManifest(parsed)
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

export function initialState(): GameState {
  return loadGame() ?? createLobbyState()
}
