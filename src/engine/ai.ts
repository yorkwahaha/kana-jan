import type { CardType, KanaCard } from '../data/cards'
import { isThreeSoundRow, soundsForRows, type RowId } from '../data/kana'
import { currentPlayer, currentReactionYakus, reactionActor, type GameAction } from './game'
import type { Rng } from './rng'
import type { GameState, PlayerState, YakuCandidate } from './types'
import { findNearYaku, findYaku, fiveSoundRowCount, sameRowScoreTable } from './yaku'

const CARD_TYPES: readonly CardType[] = ['hiragana', 'katakana', 'vocabulary']
const EARLY_TURN = 4
const EARLY_DEFENSE_WEIGHT = 0.35
const TENPAI_DEFENSE_WEIGHT = 1.2
/** 只聽同音對子時，高到足以為了安靜的一行生張拆掉這對，但普通同音生張仍會丟。 */
const PAIR_TENPAI_DEFENSE_WEIGHT = 2.2
const LATE_DEFENSE_WEIGHT = 5
const EASY_MISS_SAFETY_CHANCE = 0.3
const EASY_DEFENSE_SCALE = 0.75
const HOLD_LOW_YAKU_CHANCE = 0.75
const GOLD_BEHIND = 200
const DRAWN_LIVE_KEEP = 3

function minDistance(hand: KanaCard[]): { distance: number; cardIds: Set<string> } {
  const best = { distance: 5, cardIds: new Set<string>() }
  const consider = (distance: number, ids: Set<string>) => {
    if (distance < best.distance || (distance === best.distance && ids.size > best.cardIds.size)) {
      best.distance = distance
      best.cardIds = ids
    }
  }

  const bySound = new Map<string, KanaCard[]>()
  for (const card of hand) {
    const list = bySound.get(card.sound) ?? []
    list.push(card)
    bySound.set(card.sound, list)
  }
  for (const group of bySound.values()) {
    consider(Math.max(0, 3 - group.length), new Set(group.map((card) => card.id)))
  }

  const byRow = new Map<string, KanaCard[]>()
  for (const card of hand) {
    const list = byRow.get(card.row) ?? []
    list.push(card)
    byRow.set(card.row, list)
  }
  for (const [row, group] of byRow) {
    const sounds = new Set(group.map((card) => card.sound))
    const targetSize = isThreeSoundRow(row as RowId) ? 3 : 5
    consider(Math.max(0, targetSize - sounds.size), new Set(group.map((card) => card.id)))
  }

  return best
}

function keepValue(card: KanaCard, hand: KanaCard[]): number {
  const sameSoundCount = hand.filter((c) => c.sound === card.sound).length
  const rowSounds = new Set(hand.filter((c) => c.row === card.row).map((c) => c.sound)).size
  return sameSoundCount * 4 + rowSounds * 2
}

const DISCARD_SCORE_BAND = 0.75

function countSound(cards: readonly KanaCard[], sound: string): number {
  let count = 0
  for (const card of cards) if (card.sound === sound) count += 1
  return count
}

/** 牌河、副露、當前棄牌。不含任何人的手牌。 */
function publicCards(state: GameState): KanaCard[] {
  const byId = new Map<string, KanaCard>()
  for (const card of state.discardPile) byId.set(card.id, card)
  for (const player of state.players) {
    for (const card of player.discards ?? []) byId.set(card.id, card)
    for (const meld of player.completed) {
      for (const card of meld.yaku.cards) byId.set(card.id, card)
    }
  }
  if (state.currentDiscard) byId.set(state.currentDiscard.id, state.currentDiscard)
  return [...byId.values()]
}

function soundSupply(state: GameState, sound: string): number {
  if (!state.deckManifest) return 9
  let total = 0
  for (const type of CARD_TYPES) total += state.deckManifest[`${sound}:${type}`] ?? 0
  return total
}

/** 對手手牌與牌山裡，這個讀音理論上還能有幾張。不讀取對手手牌。 */
function hiddenFromOpponents(state: GameState, player: PlayerState, sound: string): number {
  return Math.max(0, soundSupply(state, sound) - countSound(player.hand, sound) - countSound(publicCards(state), sound))
}

function pairThreat(hidden: number): number {
  if (hidden < 2) return 0
  if (hidden >= 6) return 4
  if (hidden >= 4) return 3
  return 2
}

function rowThreat(card: KanaCard, state: GameState, player: PlayerState): number {
  if (!state.activeRows.includes(card.row)) return 0
  const sounds = soundsForRows([card.row]).map((kana) => kana.sound)
  for (const sound of sounds) {
    if (sound === card.sound) continue
    if (hiddenFromOpponents(state, player, sound) < 1) return 0
  }

  let points = 0
  if (isThreeSoundRow(card.row)) {
    points = 3
  } else {
    const base = sameRowScoreTable(fiveSoundRowCount(state.activeRows)).base
    if (base <= 0) return 0
    if (base >= 480) points = 6
    else if (base >= 300) points = 4
    else points = 2
  }

  const riverSounds = new Set(publicCards(state).filter((seen) => seen.row === card.row).map((seen) => seen.sound))
  const quietSounds = sounds.filter((sound) => !riverSounds.has(sound)).length
  if (quietSounds >= sounds.length - 1) points += 3
  else if (quietSounds >= 3) points += 1
  return points
}

function tileDanger(card: KanaCard, state: GameState, player: PlayerState): number {
  return pairThreat(hiddenFromOpponents(state, player, card.sound)) + rowThreat(card, state, player)
}

function waitingStyle(
  hand: KanaCard[],
  best: { distance: number; cardIds: Set<string> },
): 'none' | 'pair' | 'big' {
  if (best.distance > 1) return 'none'
  const sounds = new Set(hand.filter((card) => best.cardIds.has(card.id)).map((card) => card.sound))
  return sounds.size > 1 ? 'big' : 'pair'
}

function defenseWeight(
  state: GameState,
  player: PlayerState,
  hand: KanaCard[],
  best: { distance: number; cardIds: Set<string> },
  style: 'normal' | 'easy',
  rng: Rng | null,
): number {
  const early = state.turnNumber <= EARLY_TURN
  const waiting = waitingStyle(hand, best)
  const pushing = waiting === 'none' && isGoldBehind(player, state)
  let weight = EARLY_DEFENSE_WEIGHT
  if (!early && !pushing) {
    if (waiting === 'big') weight = TENPAI_DEFENSE_WEIGHT
    else if (waiting === 'pair') weight = PAIR_TENPAI_DEFENSE_WEIGHT
    else weight = LATE_DEFENSE_WEIGHT
  }
  if (style === 'easy') {
    if (rng && rng.next() < EASY_MISS_SAFETY_CHANCE) return 0
    weight *= EASY_DEFENSE_SCALE
  }
  return weight
}

function discardScore(
  card: KanaCard,
  player: PlayerState,
  state: GameState,
  best: { distance: number; cardIds: Set<string> },
  weight: number,
): number {
  const remaining = player.hand.filter((candidate) => candidate.id !== card.id)
  const after = minDistance(remaining)
  const danger = tileDanger(card, state, player)
  let score =
    (after.distance - best.distance) * 8 +
    (best.cardIds.has(card.id) ? 6 : 0) +
    keepValue(card, player.hand) +
    danger * weight
  if (weight >= LATE_DEFENSE_WEIGHT && danger > 0 && card.id === state.lastDrawnCardId) {
    score += DRAWN_LIVE_KEEP
  }
  return score
}

function rankedDiscards(
  player: PlayerState,
  state: GameState,
  weight: number,
): Array<{ id: string; score: number }> {
  const best = minDistance(player.hand)
  return player.hand
    .map((card) => ({ id: card.id, score: discardScore(card, player, state, best, weight) }))
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
}

function pickDiscard(player: PlayerState, state: GameState, rng: Rng): string {
  if (player.hand.length === 0) throw new Error('Empty hand')
  const best = minDistance(player.hand)
  const weight = defenseWeight(
    state,
    player,
    player.hand,
    best,
    player.aiDifficulty === 'easy' ? 'easy' : 'normal',
    rng,
  )
  const scored = rankedDiscards(player, state, weight)
  const floor = scored[0]!.score
  const candidates = scored.filter((candidate) => candidate.score <= floor + DISCARD_SCORE_BAND)
  return rng.pick(candidates).id
}

/** 遠端玩家逾時時採用普通難度的攻守評分，不消耗引擎亂數，也不套用簡單難度的漏看。 */
export function pickSafeTimeoutDiscard(player: PlayerState, state: GameState): string {
  if (player.hand.length === 0) throw new Error('Empty hand')
  const best = minDistance(player.hand)
  const weight = defenseWeight(state, player, player.hand, best, 'normal', null)
  return rankedDiscards(player, state, weight)[0]!.id
}

function isGoldBehind(player: PlayerState, state: GameState): boolean {
  const leader = state.players.reduce((max, other) => Math.max(max, other.gold), 0)
  return leader - player.gold >= GOLD_BEHIND
}

function shouldDelayLowYaku(
  yaku: YakuCandidate,
  player: PlayerState,
  state: GameState,
  rng: Rng,
): boolean {
  if (yaku.kind !== 'sameSound' || yaku.totalScore >= 480) return false
  if (state.turnNumber > EARLY_TURN) return false
  if (isGoldBehind(player, state)) return false
  const near = findNearYaku(player.hand, state.activeRows)
  if (!near.some((hint) => hint.kind !== 'sameSound')) return false
  return rng.next() < HOLD_LOW_YAKU_CHANCE
}

function decideAction(state: GameState, rng: Rng): GameAction {
  const player = currentPlayer(state)
  const yakus = findYaku(player.hand, state.bonus, { activeRows: state.activeRows })
  if (yakus.length === 0) return { type: 'SKIP_YAKU' }

  if (player.aiDifficulty === 'easy') {
    const highestScore = yakus[0]!.totalScore
    const chosen = rng.pick(yakus.filter((yaku) => yaku.totalScore === highestScore))
    return { type: 'CHOOSE_YAKU', yakuId: chosen.id }
  }

  const best = yakus[0]!
  if (state.comboCount === 0 && shouldDelayLowYaku(best, player, state, rng)) {
    return { type: 'SKIP_YAKU' }
  }
  return { type: 'CHOOSE_YAKU', yakuId: best.id }
}

/** 只看一行／三音行，不把同音對子算進大役距離。 */
function bigShapeDistance(hand: KanaCard[], activeRows: readonly RowId[]): number {
  let best = 5
  const eligible = hand.filter((card) => activeRows.includes(card.row))
  const byRow = new Map<string, KanaCard[]>()
  for (const card of eligible) {
    const list = byRow.get(card.row) ?? []
    list.push(card)
    byRow.set(card.row, list)
  }
  for (const [row, group] of byRow) {
    const sounds = new Set(group.map((card) => card.sound))
    const targetSize = isThreeSoundRow(row as RowId) ? 3 : 5
    best = Math.min(best, Math.max(0, targetSize - sounds.size))
  }
  return best
}

function claimBreaksBigWait(hand: KanaCard[], yaku: YakuCandidate, activeRows: readonly RowId[]): boolean {
  const before = bigShapeDistance(hand, activeRows)
  if (before > 1) return false
  const used = new Set(yaku.cards.map((card) => card.id))
  const after = hand.filter((card) => !used.has(card.id))
  return bigShapeDistance(after, activeRows) > before
}

function decideReaction(actor: PlayerState, yakus: YakuCandidate[], state: GameState, rng: Rng): GameAction {
  const best = yakus[0]!
  if (actor.aiDifficulty === 'easy') {
    const highestScore = best.totalScore
    const chosen = rng.pick(yakus.filter((yaku) => yaku.totalScore === highestScore))
    return { type: 'CLAIM_YAKU', yakuId: chosen.id }
  }
  if (best.kind !== 'sameSound' || best.totalScore >= 480) {
    return { type: 'CLAIM_YAKU', yakuId: best.id }
  }
  if (!isGoldBehind(actor, state)) {
    const cheap = yakus.filter((yaku) => yaku.kind === 'sameSound' && yaku.totalScore < 480)
    const breaks = (yaku: YakuCandidate) => claimBreaksBigWait(actor.hand, yaku, state.activeRows)
    if (cheap.length > 0 && cheap.every(breaks)) {
      return { type: 'PASS_CLAIM' }
    }
  }
  return { type: 'CLAIM_YAKU', yakuId: best.id }
}

export function decideAi(state: GameState, rng: Rng): GameAction | null {
  switch (state.phase) {
    case 'playerDraw': {
      if (currentPlayer(state).kind !== 'ai') return null
      return { type: 'DRAW' }
    }
    case 'playerAction': {
      if (currentPlayer(state).kind !== 'ai') return null
      return decideAction(state, rng)
    }
    case 'discard': {
      if (currentPlayer(state).kind !== 'ai') return null
      const id = pickDiscard(currentPlayer(state), state, rng)
      return { type: 'DISCARD', cardId: id }
    }
    case 'reaction': {
      const actor = reactionActor(state)
      if (!actor || actor.kind !== 'ai') return null
      const yakus = currentReactionYakus(state)
      if (yakus.length === 0) return { type: 'PASS_CLAIM' }
      return decideReaction(actor, yakus, state, rng)
    }
    case 'review': {
      return { type: 'FINISH_REVIEW' }
    }
    default:
      return null
  }
}

export function needsHumanInput(state: GameState): boolean {
  if (state.phase === 'playerDraw' || state.phase === 'playerAction' || state.phase === 'discard') {
    const p = currentPlayer(state)
    return p.kind === 'human' || p.kind === 'remote'
  }
  if (state.phase === 'reaction') {
    const actor = reactionActor(state)
    return actor?.kind === 'human' || actor?.kind === 'remote'
  }
  if (state.phase === 'review' || state.phase === 'preview') {
    return state.players.some((p) => p.kind === 'human' || p.kind === 'remote')
  }
  return false
}
