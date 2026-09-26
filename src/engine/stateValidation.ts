import { getCardById, type KanaCard } from '../data/cards'
import { ROW_ORDER, getSound } from '../data/kana'
import { HAND_SIZE, type GameState, type PlayerState, type YakuCandidate } from './types'

const PHASES = new Set<GameState['phase']>([
  'lobby', 'preview', 'dealing', 'playerDraw', 'playerAction', 'discard', 'reaction',
  'scoring', 'review', 'refill', 'nextTurn', 'gameOver',
])
const PLAYER_KINDS = new Set(['human', 'ai', 'remote'])
const AI_DIFFICULTIES = new Set(['easy', 'normal'])
const YAKU_KINDS = new Set(['sameSound', 'sameRow', 'sameYoon'])
const SCORE_SOURCES = new Set(['tsumo', 'ron'])
const CARD_TYPES = new Set(['hiragana', 'katakana', 'vocabulary'])
const LAST_FX = new Set(['dekita', 'moratta', 'draw', 'discard', 'coin'])

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

export function isCanonicalCard(card: unknown): card is KanaCard {
  if (!isRecord(card) || typeof card.id !== 'string') return false
  try {
    const canonical = getCardById(card.id)
    return card.sound === canonical.sound &&
      card.romaji === canonical.romaji &&
      card.hiragana === canonical.hiragana &&
      card.katakana === canonical.katakana &&
      card.row === canonical.row &&
      card.column === canonical.column &&
      card.cardType === canonical.cardType &&
      card.vocabulary === canonical.vocabulary &&
      card.writtenForm === canonical.writtenForm
  } catch {
    return false
  }
}

function isHiddenCard(card: unknown): card is KanaCard {
  if (!isRecord(card)) return false
  return typeof card.id === 'string' && /^(?:deck-hidden-\d+|hidden-\d+-\d+)$/.test(card.id) &&
    card.sound === '?' && card.romaji === '?' && card.hiragana === '？' && card.katakana === '？' &&
    card.row === 'a' && card.column === 'a' && card.rowLabel === '？' && card.columnLabel === '？' &&
    card.cardType === 'hiragana' && card.vocabulary === '？' && card.writtenForm === '？' &&
    typeof card.meaning === 'string' && typeof card.image === 'string' && typeof card.icon === 'string' &&
    typeof card.color === 'string'
}

type CardValidator = (value: unknown) => value is KanaCard

function isYaku(value: unknown, cardValidator: CardValidator): value is YakuCandidate {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.label !== 'string') return false
  if (typeof value.kind !== 'string' || !YAKU_KINDS.has(value.kind)) return false
  if (!Array.isArray(value.cards) || value.cards.length === 0 || !value.cards.every(cardValidator)) return false
  if (value.sound !== undefined && typeof value.sound !== 'string') return false
  if (value.row !== undefined && (typeof value.row !== 'string' || !ROW_ORDER.includes(value.row as never))) return false
  if (value.uniformType !== undefined && (typeof value.uniformType !== 'string' || !CARD_TYPES.has(value.uniformType))) return false
  return isNonNegativeFinite(value.baseScore) && isNonNegativeFinite(value.typeBonus) &&
    isNonNegativeFinite(value.missionBonus) && isNonNegativeFinite(value.totalScore)
}

function isPlayer(value: unknown, cardValidator: CardValidator): value is PlayerState {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') return false
  if (typeof value.kind !== 'string' || !PLAYER_KINDS.has(value.kind)) return false
  if (!Number.isInteger(value.seat) || typeof value.aiDifficulty !== 'string' || !AI_DIFFICULTIES.has(value.aiDifficulty)) return false
  if (!isNonNegativeFinite(value.gold) || !isNonNegativeFinite(value.score)) return false
  if (!Array.isArray(value.hand) || !value.hand.every(cardValidator)) return false
  if (!Array.isArray(value.discards) || !value.discards.every(cardValidator)) return false
  if (!Array.isArray(value.completed)) return false
  return value.completed.every((completed) =>
    isRecord(completed) && isYaku(completed.yaku, cardValidator) &&
    typeof completed.source === 'string' && SCORE_SOURCES.has(completed.source) &&
    (completed.fromPlayerId === undefined || typeof completed.fromPlayerId === 'string'),
  )
}

function isBonus(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.sound !== 'string' || typeof value.cardId !== 'string' || typeof value.label !== 'string' || typeof value.detail !== 'string') return false
  if (!isNonNegativeFinite(value.points)) return false
  try {
    getSound(value.sound)
    const card = getCardById(value.cardId)
    return card.sound === value.sound && card.cardType === 'hiragana' && value.cardId === `${value.sound}-hiragana`
  } catch {
    return false
  }
}

function isPendingScore(value: unknown, cardValidator: CardValidator): boolean {
  if (value === null) return true
  if (!isRecord(value) || typeof value.playerId !== 'string' || !isYaku(value.yaku, cardValidator)) return false
  if (typeof value.source !== 'string' || !SCORE_SOURCES.has(value.source)) return false
  if (value.fromPlayerId !== undefined && typeof value.fromPlayerId !== 'string') return false
  if (value.claimedCard !== undefined && !cardValidator(value.claimedCard)) return false
  return true
}

function hasValidManifest(value: unknown): boolean {
  if (value === undefined) return true
  if (!isRecord(value)) return false
  return Object.values(value).every((count) => isNonNegativeInteger(count))
}

function isRanking(value: unknown): boolean {
  return isRecord(value) && typeof value.playerId === 'string' && typeof value.name === 'string' &&
    isNonNegativeFinite(value.score) && isNonNegativeFinite(value.gold) &&
    isNonNegativeInteger(value.completedCount) && Number.isInteger(value.place) && Number(value.place) >= 1
}

function isGameStateShape(value: unknown, cardValidator: CardValidator): value is GameState {
  if (!isRecord(value) || typeof value.phase !== 'string' || !PHASES.has(value.phase as GameState['phase'])) return false
  if (value.matchId !== undefined && typeof value.matchId !== 'string') return false
  if (!Number.isInteger(value.seed) || !Number.isInteger(value.rngState)) return false
  if (!Array.isArray(value.players) || value.players.length !== 4 || !value.players.every((p) => isPlayer(p, cardValidator))) return false
  if (!Array.isArray(value.deck) || !value.deck.every(cardValidator)) return false
  if (!Array.isArray(value.discardPile) || !value.discardPile.every(cardValidator)) return false
  if (value.currentDiscard !== null && !cardValidator(value.currentDiscard)) return false
  if (!Number.isInteger(value.currentPlayerIndex) || !Number.isInteger(value.startPlayerIndex) || !Number.isInteger(value.turnOwnerIndex)) return false
  if (!isBonus(value.bonus) || typeof value.lessonId !== 'string' || !value.lessonId) return false
  if (!Array.isArray(value.activeRows) || value.activeRows.length === 0 || !value.activeRows.every((row) => typeof row === 'string' && ROW_ORDER.includes(row as never))) return false
  if (!isPendingScore(value.pendingScore, cardValidator)) return false
  if (!Array.isArray(value.reactionOptions) || !value.reactionOptions.every((o) => isRecord(o) && typeof o.playerId === 'string')) return false
  if (!isNonNegativeInteger(value.reactionIndex) || !Array.isArray(value.events) || !value.events.every((e) => isRecord(e) && typeof e.id === 'string' && typeof e.text === 'string')) return false
  if (!isNonNegativeInteger(value.eventSeq) || !isNonNegativeInteger(value.turnNumber)) return false
  if (value.lastDrawnCardId !== null && typeof value.lastDrawnCardId !== 'string') return false
  if (value.gameOverReason !== null && value.gameOverReason !== 'gold' && value.gameOverReason !== 'deck') return false
  if (value.rankings !== null && (!Array.isArray(value.rankings) || !value.rankings.every(isRanking))) return false
  if (value.lastFx !== null && (typeof value.lastFx !== 'string' || !LAST_FX.has(value.lastFx))) return false
  if (!Array.isArray(value.lastTransfers) || !value.lastTransfers.every((t) =>
    isRecord(t) && typeof t.fromId === 'string' && typeof t.toId === 'string' && isNonNegativeFinite(t.amount) &&
    (t.paid === undefined || isNonNegativeFinite(t.paid)) &&
    (t.systemTopUp === undefined || isNonNegativeFinite(t.systemTopUp)),
  )) return false
  if (value.lastDiscardPlayerId !== null && typeof value.lastDiscardPlayerId !== 'string') return false
  if (!isNonNegativeInteger(value.comboCount) || !hasValidManifest(value.deckManifest)) return false
  return true
}

function basicStateRelations(state: GameState): boolean {
  const seats = state.players.map((p) => p.seat).sort((a, b) => a - b)
  const playerIds = state.players.map((p) => p.id)
  const idSet = new Set(playerIds)
  if (seats.join(',') !== '0,1,2,3' || idSet.size !== 4) return false
  if (state.currentPlayerIndex < 0 || state.currentPlayerIndex >= 4 || state.startPlayerIndex < 0 || state.startPlayerIndex >= 4 || state.turnOwnerIndex < 0 || state.turnOwnerIndex >= 4) return false
  if (new Set(state.activeRows).size !== state.activeRows.length) return false
  if (state.reactionIndex > state.reactionOptions.length) return false
  if (state.phase === 'reaction' && state.reactionIndex >= state.reactionOptions.length) return false
  const reactionIds = state.reactionOptions.map((o) => o.playerId)
  if (new Set(reactionIds).size !== reactionIds.length || reactionIds.some((id) => !idSet.has(id))) return false
  if (state.lastDiscardPlayerId !== null && !idSet.has(state.lastDiscardPlayerId)) return false
  if (state.pendingScore) {
    if (!idSet.has(state.pendingScore.playerId)) return false
    if (state.pendingScore.fromPlayerId && !idSet.has(state.pendingScore.fromPlayerId)) return false
    if (state.pendingScore.source === 'ron' && !state.pendingScore.fromPlayerId) return false
  }
  if (state.rankings && state.rankings.some((r) => !idSet.has(r.playerId))) return false
  if (state.lastTransfers.some((t) => !idSet.has(t.fromId) || !idSet.has(t.toId) || (t.paid ?? t.amount) + (t.systemTopUp ?? 0) !== t.amount)) return false
  if (state.phase === 'gameOver' && (!state.rankings || !state.gameOverReason)) return false
  if ((state.phase === 'scoring' || state.phase === 'review') && !state.pendingScore) return false
  return true
}

function networkStateRelations(state: GameState): boolean {
  const ownedCards = [
    ...state.deck,
    ...state.players.flatMap((p) => p.hand),
    ...state.players.flatMap((p) => p.discards),
    ...state.players.flatMap((p) => p.completed.flatMap((completed) => completed.yaku.cards)),
  ]
  const ownedIds = ownedCards.map((card) => card.id)
  if (new Set(ownedIds).size !== ownedIds.length) return false
  if (state.players.some((player) => player.hand.length > HAND_SIZE + 1)) return false
  if (ownedCards.some((card) => !/^(?:deck-hidden-\d+|hidden-\d+-\d+)$/.test(card.id) && !state.activeRows.includes(card.row))) return false

  const discardIds = state.players.flatMap((p) => p.discards.map((card) => card.id))
  if (
    discardIds.length !== state.discardPile.length ||
    discardIds.some((id, index) => state.discardPile[index]?.id !== id)
  ) return false
  if (state.currentDiscard) {
    if (!state.lastDiscardPlayerId) return false
    const discarder = state.players.find((p) => p.id === state.lastDiscardPlayerId)
    if (!discarder?.discards.some((card) => card.id === state.currentDiscard?.id)) return false
  }
  return true
}

export function isNetworkGameState(value: unknown): value is GameState {
  const cardValidator: CardValidator = (card): card is KanaCard => isCanonicalCard(card) || isHiddenCard(card)
  return isGameStateShape(value, cardValidator) && basicStateRelations(value) && networkStateRelations(value)
}

export function isPersistentGameState(value: unknown): value is GameState {
  if (!isGameStateShape(value, isCanonicalCard) || !basicStateRelations(value)) return false
  const state = value
  const ownedCards = [
    ...state.deck,
    ...state.players.flatMap((p) => p.hand),
    ...state.players.flatMap((p) => p.discards),
    ...state.players.flatMap((p) => p.completed.flatMap((completed) => completed.yaku.cards)),
  ]
  const ownedIds = ownedCards.map((card) => card.id)
  if (new Set(ownedIds).size !== ownedIds.length) return false
  if (ownedCards.some((card) => !state.activeRows.includes(card.row))) return false

  const discardIds = state.players.flatMap((p) => p.discards.map((card) => card.id))
  if (discardIds.length !== state.discardPile.length || discardIds.some((id, index) => state.discardPile[index]?.id !== id)) return false
  if (state.currentDiscard) {
    if (!state.lastDiscardPlayerId) return false
    const discarder = state.players.find((p) => p.id === state.lastDiscardPlayerId)
    if (!discarder?.discards.some((card) => card.id === state.currentDiscard?.id)) return false
  }

  if (!state.deckManifest) return false
  const actual: Record<string, number> = {}
  for (const card of ownedCards) {
    const key = `${card.sound}:${card.cardType}`
    actual[key] = (actual[key] ?? 0) + 1
  }
  const manifestKeys = Object.keys(state.deckManifest).sort()
  const actualKeys = Object.keys(actual).sort()
  if (manifestKeys.join('|') !== actualKeys.join('|')) return false
  return actualKeys.every((key) => state.deckManifest?.[key] === actual[key])
}
