import { DEFAULT_BONUS, DEFAULT_MISSION_POINTS, makeTargetBonus } from '../data/bonuses'
import { displayGlyph, type KanaCard } from '../data/cards'
import { soundsForRows } from '../data/kana'
import { DEFAULT_LESSON_ID, getLesson, pickLessonRows } from '../data/lessons'
import { buildLessonDeck, dealHands, drawOne, sortHandByGojuon } from './deck'
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
  | { type: 'SKIP_PREVIEW' }
  | { type: 'DEAL_DONE' }
  | { type: 'DRAW' }
  | { type: 'CHOOSE_YAKU'; yakuId: string }
  | { type: 'SKIP_YAKU' }
  | { type: 'DISCARD'; cardId: string }
  | { type: 'CLAIM_YAKU'; yakuId: string }
  | { type: 'PASS_CLAIM' }
  | { type: 'FINISH_REVIEW' }
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
    bonus: DEFAULT_BONUS,
    lessonId: DEFAULT_LESSON_ID,
    activeRows: getLesson(DEFAULT_LESSON_ID).rows,
    pendingScore: null,
    reactionOptions: [],
    reactionIndex: 0,
    events: [],
    eventSeq: 0,
    turnNumber: 0,
    lastDrawnCardId: null,
    gameOverReason: null,
    rankings: null,
    lastFx: null,
    lastTransfers: [],
    lastDiscardPlayerId: null,
    comboCount: 0,
    turnOwnerIndex: 0,
  }
}

export function pushEvent(state: GameState, text: string): GameState {
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

function syncDiscardPile(state: GameState): GameState {
  return { ...state, discardPile: state.players.flatMap((p) => p.discards ?? []) }
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
  return findYaku(player.hand, state.bonus, { activeRows: state.activeRows })
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
    activeRows: state.activeRows,
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
      activeRows: state.activeRows,
    })
    if (yakus.length > 0) {
      options.push({ playerId: player.id })
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
    pendingScore: state.pendingScore ?? null,
  }
  const winner = ranked[0]
  const reasonText = reason === 'gold' ? '有人金幣歸零' : '牌庫耗盡'
  next = pushEvent(next, `遊戲結束（${reasonText}）`)
  if (winner) {
    next = pushEvent(next, `優勝：${winner.name}（${winner.score} 分／${winner.gold} 枚金幣）`)
  }
  return next
}

function afterDeclare(state: GameState): GameState {
  return { ...state, phase: 'scoring' }
}

export function startGame(config: StartConfig = {}): GameState {
  const seed = config.seed ?? (Date.now() ^ 0x9e3779b9) >>> 0
  const rng = createRng(seed)
  const lesson = getLesson(config.lessonId)
  const activeRows =
    config.activeRows ??
    (lesson.rows.length > 0 ? lesson.rows : pickLessonRows(lesson.id, (arr) => rng.shuffle(arr)))
  const lessonSounds = soundsForRows(activeRows)
  const bonus = config.bonus ?? makeTargetBonus(rng.pick(lessonSounds), DEFAULT_MISSION_POINTS)
  const aiNames = config.aiNames ?? DEFAULT_AI_NAMES
  const difficulty = config.aiDifficulty ?? 'normal'
  const gold = config.initialGold ?? INITIAL_GOLD
  const playerName = (config.playerName ?? '小春').trim() || '小春'

  let deck: KanaCard[] = config.deck ? [...config.deck] : buildLessonDeck(activeRows, rng)

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

  const players: PlayerState[] = config.playerConfigs
    ? config.playerConfigs.map((cfg, idx) => ({
        id: cfg.id,
        name: cfg.name,
        kind: cfg.kind,
        seat: cfg.seat,
        aiDifficulty: cfg.aiDifficulty ?? difficulty,
        gold,
        score: 0,
        hand: sortHandByGojuon(hands[idx] ?? []),
        discards: [],
        completed: [],
      }))
    : [
        {
          id: 'p0',
          name: playerName,
          kind: 'human',
          seat: 0,
          aiDifficulty: difficulty,
          gold,
          score: 0,
          hand: sortHandByGojuon(hands[0] ?? []),
          discards: [],
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
          hand: sortHandByGojuon(hands[i + 1] ?? []),
          discards: [],
          completed: [],
        })),
      ]

  const skipPreview = config.skipPreview || Boolean(config.hands)
  let state: GameState = {
    ...createLobbyState(),
    phase: skipPreview ? 'dealing' : 'preview',
    seed,
    rngState: rng.getState(),
    players,
    deck,
    bonus,
    lessonId: lesson.id,
    activeRows: [...activeRows],
    currentPlayerIndex: startPlayerIndex,
    startPlayerIndex,
    turnOwnerIndex: startPlayerIndex,
    turnNumber: 1,
  }
  state = pushEvent(state, `遊戲開始！課程：${lesson.label}／Bonus：${bonus.label}`)
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

  hand = sortHandByGojuon(removeCardsFromHand(hand, pending.yaku.cards))

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

  if (pending.source === 'ron') {
    const from = next.players.find((p) => p.id === pending.fromPlayerId)
    next = pushEvent(
      next,
      `${player.name} 抄了 ${from?.name ?? '對手'} 的棄牌，完成「${pending.yaku.label}」（${pending.yaku.totalScore} 分）`,
    )
  } else {
    const comboPrefix = state.comboCount > 1 ? `連鎖達成！Combo ${state.comboCount}！` : ''
    next = pushEvent(
      next,
      `${player.name} できた！${comboPrefix}自己湊成了「${pending.yaku.label}」（${pending.yaku.totalScore} 分）`,
    )
  }
  next = {
    ...next,
    lastFx: pending.source === 'tsumo' ? 'dekita' : 'moratta',
    lastTransfers: settled.transfers,
  }

  for (const t of settled.transfers) {
    const from = next.players.find((p) => p.id === t.fromId)
    const to = next.players.find((p) => p.id === t.toId)
    if (from && to) {
      next = pushEvent(next, `${from.name} −${t.amount} → ${to.name} ＋${t.amount}`)
    }
  }

  if (pending.source === 'ron') {
    const claimedId = state.currentDiscard?.id
    if (claimedId && pending.fromPlayerId) {
      const discarder = next.players.find((p) => p.id === pending.fromPlayerId)
      if (discarder) {
        next = replacePlayer(next, {
          ...discarder,
          discards: (discarder.discards ?? []).filter((c) => c.id !== claimedId),
        })
      }
    }
    next = { ...next, currentDiscard: null }
    next = syncDiscardPile(next)
  }

  if (settled.bankrupt) {
    return goGameOver(next, 'gold')
  }
  return { ...next, phase: 'review' }
}

function applyRefill(state: GameState): GameState {
  const scoredThisRefill = Boolean(state.pendingScore)
  const targetId = state.pendingScore?.playerId ?? currentPlayer(state).id
  const player = state.players.find((p) => p.id === targetId)
  if (!player) return { ...state, phase: 'nextTurn', pendingScore: null, comboCount: 0 }

  // 每次只補一張，讓 UI 能在下一步前完整播放抽牌飛行動畫。
  if (player.hand.length < HAND_SIZE && state.deck.length > 0) {
    const { card, remaining } = drawOne(state.deck)
    if (card) {
      let next = replacePlayer(state, {
        ...player,
        hand: sortHandByGojuon([...player.hand, card]),
      })
      next = {
        ...next,
        deck: remaining,
        reactionOptions: [],
        reactionIndex: 0,
        lastTransfers: [],
        lastDrawnCardId: card.id,
        lastFx: 'draw',
      }
      next = syncDiscardPile(next)
      return pushEvent(next, `${player.name} 補了一張牌`)
    }
  }

  let next: GameState = {
    ...state,
    pendingScore: null,
    reactionOptions: [],
    reactionIndex: 0,
    lastTransfers: [],
  }
  next = syncDiscardPile(next)

  // 只有剛完成牌型後的補牌才檢查連鎖；略過＋棄牌後即使手牌仍有役也不再強行進入宣告
  if (scoredThisRefill) {
    const availableYakus = findYaku(player.hand, state.bonus, { activeRows: state.activeRows })
    if (availableYakus.length > 0) {
      const targetIndex = state.players.findIndex((p) => p.id === targetId)
      const nextCurrentIndex = targetIndex !== -1 ? targetIndex : state.currentPlayerIndex
      next = {
        ...next,
        phase: 'playerAction',
        currentPlayerIndex: nextCurrentIndex,
      }
      const nextComboNum = next.comboCount + 1
      next = pushEvent(next, `${player.name} 補牌達成連鎖，可繼續宣告（Combo ${nextComboNum}）！`)
      return next
    }
  }

  // 無法連鎖且牌庫已空，則結束遊戲
  if (next.deck.length === 0) {
    return goGameOver(next, 'deck')
  }

  return { ...next, phase: 'nextTurn', comboCount: 0 }
}

/**
 * 規則決定（記錄於 README）：
 * - 未結算時必須棄 1 自抽牌。
 * - 結算後手牌 ≤ 7，直接補到 7 張；若補牌後仍有合法牌型，可持續連鎖宣告自摸（Combo）。
 * - 當補滿 7 張無牌型或主動放棄時，不棄牌直接換下一家。
 * - 牌庫耗盡且無連鎖可打時結束。
 * - 棄牌宣告由回合順序最近者優先，可放棄後交給下一位。
 */
export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
    case 'RESTART':
      return startGame(action.config)

    case 'SYNC_RNG':
      return { ...state, rngState: action.rngState }

    case 'SKIP_PREVIEW': {
      if (state.phase !== 'preview') return state
      return { ...state, phase: 'dealing' }
    }

    case 'DEAL_DONE': {
      if (state.phase !== 'dealing') return state
      return { ...state, phase: 'playerDraw' }
    }

    case 'DRAW': {
      if (state.phase !== 'playerDraw') return state
      const player = currentPlayer(state)
      if (state.deck.length === 0) {
        let next = pushEvent(state, `${player.name} 無法抽牌（牌庫已空）`)
        next = { ...next, lastDrawnCardId: null, phase: 'playerAction' }
        return next
      }
      const { card, remaining } = drawOne(state.deck)
      if (!card) {
        return { ...state, phase: 'playerAction' }
      }
      const updated: PlayerState = { ...player, hand: [...player.hand, card] }
      let next = replacePlayer(state, updated)
      next = {
        ...next,
        deck: remaining,
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
      const yakus = findYaku(player.hand, state.bonus, { activeRows: state.activeRows })
      const yaku = yakus.find((y) => y.id === action.yakuId)
      if (!yaku) return state
      const comboCount = state.comboCount + 1
      const drawn = state.lastDrawnCardId
        ? player.hand.find((c) => c.id === state.lastDrawnCardId)
        : undefined
      const claimedCard =
        (drawn && yaku.cards.some((c) => c.id === drawn.id) ? drawn : undefined) ?? yaku.cards[0]
      const next: GameState = {
        ...state,
        comboCount,
        pendingScore: {
          playerId: player.id,
          yaku,
          source: 'tsumo',
          claimedCard,
        },
      }
      return afterDeclare(next)
    }

    case 'SKIP_YAKU': {
      if (state.phase !== 'playerAction') return state
      const player = currentPlayer(state)
      // 若手牌長度未超過手牌上限（如連鎖補牌後的 7 張手牌狀態），跳過時不棄牌直接結束該回合
      if (player.hand.length <= HAND_SIZE) {
        if (state.deck.length === 0) {
          return goGameOver(state, 'deck')
        }
        return { ...state, phase: 'nextTurn', comboCount: 0 }
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
        hand: sortHandByGojuon(player.hand.filter((c) => c.id !== action.cardId)),
        discards: [...(player.discards ?? []), card],
      }
      let next = replacePlayer(state, updated)
      next = {
        ...next,
        currentDiscard: card,
        lastFx: 'discard',
        lastDiscardPlayerId: player.id,
      }
      next = syncDiscardPile(next)
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
        activeRows: state.activeRows,
      })
      const yaku = yakus.find((y) => y.id === action.yakuId)
      if (!yaku) return state
      const discarder =
        state.players.find((p) => p.id === state.lastDiscardPlayerId) ?? currentPlayer(state)
      const comboCount = state.comboCount + 1
      let next: GameState = {
        ...state,
        comboCount,
        pendingScore: {
          playerId: actor.id,
          yaku,
          source: 'ron',
          fromPlayerId: discarder.id,
          claimedCard: discarded,
        },
      }
      next = pushEvent(
        next,
        `${actor.name} 抄了 ${discarder.name} 丟出的「${displayGlyph(discarded)}」！`,
      )
      return afterDeclare(next)
    }

    case 'PASS_CLAIM': {
      if (state.phase !== 'reaction') return state
      const actor = reactionActor(state)
      const next = actor ? pushEvent(state, `${actor.name} 放棄宣告`) : state
      const nextIndex = state.reactionIndex + 1
      if (nextIndex < state.reactionOptions.length) {
        return { ...next, reactionIndex: nextIndex }
      }
      return { ...next, phase: 'refill', reactionIndex: nextIndex, lastFx: null }
    }

    case 'FINISH_REVIEW': {
      if (state.phase !== 'review') return state
      const refillPlayerIndex = state.pendingScore
        ? state.players.findIndex((player) => player.id === state.pendingScore?.playerId)
        : state.currentPlayerIndex
      return {
        ...state,
        phase: 'refill',
        currentPlayerIndex: refillPlayerIndex >= 0 ? refillPlayerIndex : state.currentPlayerIndex,
        lastDrawnCardId: null,
        lastFx: null,
      }
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
      const ownerIndex = state.turnOwnerIndex ?? state.currentPlayerIndex
      const nextIndex = (ownerIndex + 1) % state.players.length
      const nextPlayer = state.players[nextIndex]
      let next: GameState = {
        ...state,
        phase: 'playerDraw',
        currentPlayerIndex: nextIndex,
        turnOwnerIndex: nextIndex,
        turnNumber: state.turnNumber + 1,
        lastDrawnCardId: null,
        pendingScore: null,
        reactionOptions: [],
        reactionIndex: 0,
        lastFx: state.lastFx ?? null,
        lastTransfers: [],
        comboCount: 0,
      }
      next = pushEvent(next, `下一回合：${nextPlayer?.name ?? ''}`)
      return next
    }

    default:
      return state
  }
}

const CLIENT_ACTION_TYPES: ReadonlySet<GameAction['type']> = new Set([
  'CHOOSE_YAKU',
  'SKIP_YAKU',
  'DISCARD',
  'CLAIM_YAKU',
  'PASS_CLAIM',
  'SKIP_PREVIEW',
  'FINISH_REVIEW',
])

/** 客端允許送出的動作。START／抽牌／計分等由房主狀態機推進，避免客端重開牌局或竄改亂數。 */
export function isClientAction(action: GameAction): boolean {
  return CLIENT_ACTION_TYPES.has(action.type)
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
    if (next === current) return next
    current = next
  }
  return current
}
