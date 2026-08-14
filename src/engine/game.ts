import { BONUS_MISSIONS } from '../data/bonuses'
import { CARD_CATALOG, displayGlyph, type KanaCard } from '../data/cards'
import { dealHands, drawOne, refillHand } from './deck'
import { createRng } from './rng'
import { computeRankings, removeCardsFromHand, settleGold } from './scoring'
import {
  DEFAULT_AI_NAMES,
  HAND_SIZE,
  INITIAL_GOLD,
  PLAYER_COUNT,
  type GameState,
  type PlayerState,
  type StartConfig,
} from './types'
import { findYaku } from './yaku'

export type GameAction =
  | { type: 'START'; config?: StartConfig }
  | { type: 'DEAL_DONE' }
  | { type: 'DRAW' }
  | { type: 'CHOOSE_YAKU'; yakuId: string }
  | { type: 'SKIP_YAKU' }
  | { type: 'DISCARD'; cardId: string }
  | { type: 'CLAIM_YAKU'; yakuId: string }
  | { type: 'PASS_CLAIM' }
  | { type: 'FINISH_PRONUNCIATION' }
  | { type: 'APPLY_SCORING' }
  | { type: 'REFILL' }
  | { type: 'NEXT_TURN' }
  | { type: 'SYNC_RNG'; rngState: number }
  | { type: 'RESTART'; config?: StartConfig }

export function createLobbyState(): GameState {
  return {
    phase: 'lobby',
    seed: 0,
    rngState: 0,
    players: [],
    deck: [],
    discardPile: [],
    currentDiscard: null,
    currentPlayerIndex: 0,
    startPlayerIndex: 0,
    bonus: BONUS_MISSIONS[0]!,
    pendingScore: null,
    reactionOptions: [],
    reactionIndex: 0,
    events: [],
    eventSeq: 0,
    turnNumber: 0,
    drewThisTurn: false,
    declaredThisTurn: false,
    lastDrawnCardId: null,
    gameOverReason: null,
    rankings: null,
    lastFx: null,
    lastTransfers: [],
  }
}

function pushEvent(state: GameState, text: string): GameState {
  const id = `e${state.eventSeq + 1}`
  return {
    ...state,
    eventSeq: state.eventSeq + 1,
    events: [...state.events, { id, text }].slice(-80),
  }
}

function replacePlayer(state: GameState, player: PlayerState): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === player.id ? player : p)),
  }
}

export function currentPlayer(state: GameState): PlayerState {
  const p = state.players[state.currentPlayerIndex]
  if (!p) throw new Error('No current player')
  return p
}

export function reactionActor(state: GameState): PlayerState | null {
  const opt = state.reactionOptions[state.reactionIndex]
  if (!opt) return null
  return state.players.find((p) => p.id === opt.playerId) ?? null
}

export function availableYakuFor(state: GameState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return []
  return findYaku(player.hand, state.bonus)
}

export function reactionOrder(fromIndex: number, count: number): number[] {
  const order: number[] = []
  for (let i = 1; i < count; i++) {
    order.push((fromIndex + i) % count)
  }
  return order
}

export function currentReactionYakus(state: GameState) {
  const discarded = state.currentDiscard
  const actor = reactionActor(state)
  if (!discarded || !actor) return []
  return findYaku([...actor.hand, discarded], state.bonus, {
    mustIncludeCardId: discarded.id,
  })
}

function buildReactionOptions(state: GameState): GameState {
  const discarded = state.currentDiscard
  if (!discarded) return { ...state, reactionOptions: [], reactionIndex: 0 }

  const options = []
  for (const index of reactionOrder(state.currentPlayerIndex, state.players.length)) {
    const player = state.players[index]
    if (!player) continue
    const yakus = findYaku([...player.hand, discarded], state.bonus, {
      mustIncludeCardId: discarded.id,
    })
    if (yakus.length > 0) {
      options.push({ playerId: player.id, yaku: yakus[0]! })
    }
  }
  return { ...state, reactionOptions: options, reactionIndex: 0 }
}

function goGameOver(state: GameState, reason: 'gold' | 'deck'): GameState {
  const ranked = computeRankings(state.players)
  let next: GameState = {
    ...state,
    phase: 'gameOver',
    gameOverReason: reason,
    rankings: ranked,
    pendingScore: null,
  }
  const winner = ranked[0]
  const reasonText = reason === 'gold' ? '有人金幣歸零' : '牌庫耗盡'
  next = pushEvent(next, `遊戲結束（${reasonText}）`)
  if (winner) {
    next = pushEvent(next, `優勝：${winner.name}（${winner.score} 分／${winner.gold} 枚金幣）`)
  }
  return next
}

function maybePronunciation(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId)
  if (player?.kind === 'human') return { ...state, phase: 'pronunciation' }
  return { ...state, phase: 'scoring' }
}

export function startGame(config: StartConfig = {}): GameState {
  const seed = config.seed ?? (Date.now() ^ 0x9e3779b9) >>> 0
  const rng = createRng(seed)
  const bonus = config.bonus ?? rng.pick(BONUS_MISSIONS)
  const aiNames = config.aiNames ?? DEFAULT_AI_NAMES
  const difficulty = config.aiDifficulty ?? 'normal'
  const gold = config.initialGold ?? INITIAL_GOLD
  const playerName = (config.playerName ?? '小春').trim() || '小春'

  let deck: KanaCard[] = config.deck ? [...config.deck] : rng.shuffle(CARD_CATALOG)

  let hands: KanaCard[][]
  if (config.hands) {
    hands = config.hands.map((h) => [...h])
  } else {
    const dealt = dealHands(deck, PLAYER_COUNT, HAND_SIZE)
    hands = dealt.hands
    deck = dealt.remaining
  }

  const startPlayerIndex =
    config.startPlayerIndex !== undefined ? config.startPlayerIndex : rng.nextInt(PLAYER_COUNT)

  const players: PlayerState[] = [
    {
      id: 'p0',
      name: playerName,
      kind: 'human',
      seat: 0,
      aiDifficulty: difficulty,
      gold,
      score: 0,
      hand: hands[0] ?? [],
      completed: [],
    },
    ...[0, 1, 2].map((i) => ({
      id: `p${i + 1}`,
      name: aiNames[i] ?? `電腦${i + 2}`,
      kind: 'ai' as const,
      seat: i + 1,
      aiDifficulty: difficulty,
      gold,
      score: 0,
      hand: hands[i + 1] ?? [],
      completed: [],
    })),
  ]

  let state: GameState = {
    ...createLobbyState(),
    phase: 'dealing',
    seed,
    rngState: rng.getState(),
    players,
    deck,
    bonus,
    currentPlayerIndex: startPlayerIndex,
    startPlayerIndex,
    turnNumber: 1,
  }
  state = pushEvent(state, `遊戲開始！本局 Bonus：${bonus.label}`)
  state = pushEvent(state, `起始玩家：${players[startPlayerIndex]?.name ?? ''}`)
  return state
}

function applyScoring(state: GameState): GameState {
  const pending = state.pendingScore
  if (!pending) return { ...state, phase: 'refill' }

  const player = state.players.find((p) => p.id === pending.playerId)
  if (!player) throw new Error('Scoring player missing')

  let hand = [...player.hand]
  if (pending.source === 'ron' && state.currentDiscard) {
    if (!hand.some((c) => c.id === state.currentDiscard!.id)) {
      hand.push(state.currentDiscard)
    }
  }

  hand = removeCardsFromHand(hand, pending.yaku.cards)

  const scoredPlayer: PlayerState = {
    ...player,
    hand,
    completed: [
      ...player.completed,
      {
        yaku: pending.yaku,
        source: pending.source,
        fromPlayerId: pending.fromPlayerId,
      },
    ],
  }

  let next = replacePlayer(state, scoredPlayer)
  const settled = settleGold(
    next.players,
    pending.playerId,
    pending.yaku.totalScore,
    pending.source,
    pending.fromPlayerId,
  )
  next = { ...next, players: settled.players }

  const verb = pending.source === 'tsumo' ? 'できた！' : 'もらった！'
  next = pushEvent(next, `${player.name} ${verb}完成了「${pending.yaku.label}」（${pending.yaku.totalScore} 分）`)
  next = {
    ...next,
    lastFx: pending.source === 'tsumo' ? 'dekita' : 'moratta',
    lastTransfers: settled.transfers,
  }

  for (const t of settled.transfers) {
    const from = next.players.find((p) => p.id === t.fromId)
    const to = next.players.find((p) => p.id === t.toId)
    if (from && to) {
      next = pushEvent(next, `${to.name} 從${from.name}獲得 ${t.amount} 枚金幣`)
    }
  }

  if (pending.source === 'ron') {
    next = { ...next, currentDiscard: null }
  }

  if (settled.bankrupt) {
    return goGameOver(next, 'gold')
  }
  return { ...next, phase: 'refill' }
}

function applyRefill(state: GameState): GameState {
  const targetId = state.pendingScore?.playerId ?? currentPlayer(state).id
  const player = state.players.find((p) => p.id === targetId)
  if (!player) return { ...state, phase: 'nextTurn', pendingScore: null }

  const filled = refillHand(player.hand, state.deck, HAND_SIZE)
  let next: GameState = replacePlayer(state, { ...player, hand: filled.hand })
  next = {
    ...next,
    deck: filled.deck,
    pendingScore: null,
    reactionOptions: [],
    reactionIndex: 0,
    declaredThisTurn: false,
  }

  if (state.currentDiscard && !next.discardPile.some((c) => c.id === state.currentDiscard!.id)) {
    // 無人宣告的棄牌進入棄牌堆
    if (!player.completed.some((c) => c.yaku.cards.some((card) => card.id === state.currentDiscard!.id))) {
      const stillHeld = next.players.some((p) => p.hand.some((c) => c.id === state.currentDiscard!.id))
      const inCompleted = next.players.some((p) =>
        p.completed.some((cy) => cy.yaku.cards.some((c) => c.id === state.currentDiscard!.id)),
      )
      if (!stillHeld && !inCompleted) {
        next = { ...next, discardPile: [...next.discardPile, state.currentDiscard] }
      }
    }
  }

  if (next.deck.length === 0) {
    return goGameOver(next, 'deck')
  }
  return { ...next, phase: 'nextTurn' }
}

/**
 * 規則決定（記錄於 README）：
 * - 未結算時必須棄 1 張。
 * - 結算後手牌 ≤ 7，不棄牌，直接補到 7 張。
 * - 每回合最多結算一個牌型。
 * - 牌庫在補牌後為空則結束。
 * - 棄牌宣告由回合順序最近者優先，可放棄後交給下一位。
 */
export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
    case 'RESTART':
      return startGame(action.config)

    case 'SYNC_RNG':
      return { ...state, rngState: action.rngState }

    case 'DEAL_DONE': {
      if (state.phase !== 'dealing') return state
      return { ...state, phase: 'playerDraw' }
    }

    case 'DRAW': {
      if (state.phase !== 'playerDraw') return state
      const player = currentPlayer(state)
      if (state.deck.length === 0) {
        let next = pushEvent(state, `${player.name} 無法抽牌（牌庫已空）`)
        next = { ...next, drewThisTurn: false, lastDrawnCardId: null, phase: 'playerAction' }
        return next
      }
      const { card, remaining } = drawOne(state.deck)
      if (!card) {
        return { ...state, phase: 'playerAction', drewThisTurn: false }
      }
      const updated: PlayerState = { ...player, hand: [...player.hand, card] }
      let next = replacePlayer(state, updated)
      next = {
        ...next,
        deck: remaining,
        drewThisTurn: true,
        lastDrawnCardId: card.id,
        lastFx: 'draw',
        phase: 'playerAction',
      }
      next = pushEvent(next, `${player.name} 抽了一張牌`)
      return next
    }

    case 'CHOOSE_YAKU': {
      if (state.phase !== 'playerAction') return state
      const player = currentPlayer(state)
      const yakus = findYaku(player.hand, state.bonus)
      const yaku = yakus.find((y) => y.id === action.yakuId)
      if (!yaku) return state
      const next: GameState = {
        ...state,
        declaredThisTurn: true,
        pendingScore: {
          playerId: player.id,
          yaku,
          source: 'tsumo',
        },
      }
      return maybePronunciation(next, player.id)
    }

    case 'SKIP_YAKU': {
      if (state.phase !== 'playerAction') return state
      const player = currentPlayer(state)
      if (player.hand.length === 0) {
        return { ...state, phase: 'refill' }
      }
      return { ...state, phase: 'discard' }
    }

    case 'DISCARD': {
      if (state.phase !== 'discard') return state
      const player = currentPlayer(state)
      const card = player.hand.find((c) => c.id === action.cardId)
      if (!card) return state
      const updated: PlayerState = {
        ...player,
        hand: player.hand.filter((c) => c.id !== action.cardId),
      }
      let next = replacePlayer(state, updated)
      next = {
        ...next,
        currentDiscard: card,
        lastFx: 'discard',
      }
      next = pushEvent(next, `${player.name} 丟出了「${displayGlyph(card)}」`)
      next = buildReactionOptions(next)
      if (next.reactionOptions.length > 0) {
        return { ...next, phase: 'reaction' }
      }
      return { ...next, phase: 'refill' }
    }

    case 'CLAIM_YAKU': {
      if (state.phase !== 'reaction') return state
      const actor = reactionActor(state)
      const discarded = state.currentDiscard
      if (!actor || !discarded) return state
      const yakus = findYaku([...actor.hand, discarded], state.bonus, {
        mustIncludeCardId: discarded.id,
      })
      const yaku = yakus.find((y) => y.id === action.yakuId) ?? yakus[0]
      if (!yaku) return state
      const discarder = currentPlayer(state)
      let next: GameState = {
        ...state,
        pendingScore: {
          playerId: actor.id,
          yaku,
          source: 'ron',
          fromPlayerId: discarder.id,
        },
      }
      next = pushEvent(next, `${actor.name} 使用「${displayGlyph(discarded)}」宣告もらった！`)
      return maybePronunciation(next, actor.id)
    }

    case 'PASS_CLAIM': {
      if (state.phase !== 'reaction') return state
      const actor = reactionActor(state)
      const next = actor ? pushEvent(state, `${actor.name} 放棄宣告`) : state
      const nextIndex = state.reactionIndex + 1
      if (nextIndex < state.reactionOptions.length) {
        return { ...next, reactionIndex: nextIndex }
      }
      return { ...next, phase: 'refill', reactionIndex: nextIndex }
    }

    case 'FINISH_PRONUNCIATION': {
      if (state.phase !== 'pronunciation') return state
      return { ...state, phase: 'scoring' }
    }

    case 'APPLY_SCORING': {
      if (state.phase !== 'scoring') return state
      return applyScoring(state)
    }

    case 'REFILL': {
      if (state.phase !== 'refill') return state
      return applyRefill(state)
    }

    case 'NEXT_TURN': {
      if (state.phase !== 'nextTurn') return state
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length
      const nextPlayer = state.players[nextIndex]
      let next: GameState = {
        ...state,
        phase: 'playerDraw',
        currentPlayerIndex: nextIndex,
        turnNumber: state.turnNumber + 1,
        drewThisTurn: false,
        declaredThisTurn: false,
        lastDrawnCardId: null,
        pendingScore: null,
        reactionOptions: [],
        reactionIndex: 0,
      }
      next = pushEvent(next, `下一回合：${nextPlayer?.name ?? ''}`)
      return next
    }

    default:
      return state
  }
}

/** 自動推進不需玩家決策的階段（發牌結束、計分、補牌、換回合） */
export function autoStep(state: GameState): GameState {
  switch (state.phase) {
    case 'scoring':
      return reduce(state, { type: 'APPLY_SCORING' })
    case 'refill':
      return reduce(state, { type: 'REFILL' })
    case 'nextTurn':
      return reduce(state, { type: 'NEXT_TURN' })
    default:
      return state
  }
}

export function drainAuto(state: GameState): GameState {
  let current = state
  for (let i = 0; i < 8; i++) {
    const next = autoStep(current)
    if (next === current || next.phase === current.phase) return next
    current = next
  }
  return current
}

export function reduceMany(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce((s, a) => drainAuto(reduce(s, a)), state)
}
