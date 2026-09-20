import { describe, expect, it } from 'vitest'
import { DEFAULT_BONUS } from '../data/bonuses'
import { CARD_CATALOG, getCardById, type KanaCard } from '../data/cards'
import { createRng } from './rng'
import { drainAuto, isClientAction, reduce, startGame } from './game'
import { reactionOrder } from './game'
import { HAND_SIZE, INITIAL_GOLD } from './types'
import { findYaku } from './yaku'

const bonus = DEFAULT_BONUS

function play(state: ReturnType<typeof startGame>, type: Parameters<typeof reduce>[1]) {
  return drainAuto(reduce(state, type))
}

function cards(...ids: string[]): KanaCard[] {
  return ids.map(getCardById)
}

function fillHand(base: KanaCard[], extras: string[]): KanaCard[] {
  const used = new Set(base.map((c) => c.id))
  const rest = extras.map(getCardById).filter((c) => !used.has(c.id))
  return [...base, ...rest].slice(0, HAND_SIZE)
}

describe('Bonus 任務分數', () => {
  it('開局 Bonus 使用 +90 而非舊 3 點制', () => {
    const state = startGame({ seed: 42, skipPreview: true })
    expect(state.bonus.points).toBe(90)
    expect(state.turnOwnerIndex).toBe(state.currentPlayerIndex)
  })
})

describe('客端動作白名單', () => {
  it('允許出牌／宣告，拒絕重開牌局與同步亂數', () => {
    expect(isClientAction({ type: 'DISCARD', cardId: 'x' })).toBe(true)
    expect(isClientAction({ type: 'CHOOSE_YAKU', yakuId: 'y' })).toBe(true)
    expect(isClientAction({ type: 'CLAIM_YAKU', yakuId: 'y' })).toBe(true)
    expect(isClientAction({ type: 'START' })).toBe(false)
    expect(isClientAction({ type: 'RESTART' })).toBe(false)
    expect(isClientAction({ type: 'SYNC_RNG', rngState: 1 })).toBe(false)
    expect(isClientAction({ type: 'DRAW' })).toBe(false)
  })
})

describe('seed 可重現', () => {
  it('相同 seed 產生相同起始玩家、Bonus 與牌庫', () => {
    const a = startGame({ seed: 42 })
    const b = startGame({ seed: 42 })
    expect(a.startPlayerIndex).toBe(b.startPlayerIndex)
    expect(a.bonus.sound).toBe(b.bonus.sound)
    expect(a.deck.map((c) => c.id)).toEqual(b.deck.map((c) => c.id))
    expect(a.players.map((p) => p.hand.map((c) => c.id))).toEqual(
      b.players.map((p) => p.hand.map((c) => c.id)),
    )
  })
})

describe('回合：抽牌、棄牌、補牌', () => {
  it('抽牌後手牌變 8 張，棄牌後回到 7 張', () => {
    let state = startGame({
      seed: 1,
      startPlayerIndex: 0,
      bonus,
      hands: [
        fillHand([], ['a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'ka-hiragana', 'ki-hiragana']),
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ka-katakana', 'ki-katakana']),
        fillHand([], ['ku-katakana', 'ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana']),
      ],
      deck: [getCardById('to-hiragana'), getCardById('te-hiragana'), ...CARD_CATALOG.filter((c) => c.id === 'na-katakana')],
    })
    state = play(state, { type: 'DEAL_DONE' })
    expect(state.phase).toBe('playerDraw')
    state = play(state, { type: 'DRAW' })
    expect(state.players[0]?.hand).toHaveLength(8)
    expect(state.phase).toBe('playerAction')
    state = play(state, { type: 'SKIP_YAKU' })
    expect(state.phase).toBe('discard')
    const discardId = state.players[0]!.hand[0]!.id
    state = play(state, { type: 'DISCARD', cardId: discardId })
    expect(state.players[0]?.hand).toHaveLength(HAND_SIZE)
    expect(state.lastFx).toBe('discard')
  })

  it('抽牌後新牌置於最右端不立即重排，棄牌後才整理手牌並自動排序', () => {
    let state = startGame({
      seed: 1,
      startPlayerIndex: 0,
      bonus,
      hands: [
        fillHand([], ['ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana', 'ma-hiragana', 'ra-hiragana']),
        fillHand([], ['sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'ta-katakana', 'chi-katakana']),
        fillHand([], ['na-katakana', 'ni-katakana', 'nu-katakana', 'ne-katakana', 'no-katakana', 'ha-katakana', 'hi-katakana']),
        fillHand([], ['ma-katakana', 'mi-katakana', 'mu-katakana', 'me-katakana', 'mo-katakana', 'ra-katakana', 'ri-katakana']),
      ],
      deck: [getCardById('a-hiragana'), getCardById('i-hiragana')],
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    // 抽到的 a-hiragana 應在最右端（最後一格），前 7 張保持原排序
    expect(state.players[0]?.hand.map((c) => c.id)).toEqual([
      'ka-hiragana',
      'sa-hiragana',
      'ta-hiragana',
      'na-hiragana',
      'ha-hiragana',
      'ma-hiragana',
      'ra-hiragana',
      'a-hiragana',
    ])
    expect(state.lastDrawnCardId).toBe('a-hiragana')

    // 打出手牌中的 ka-hiragana，打出後剩餘 7 張整理並自動排序
    state = play(state, { type: 'SKIP_YAKU' })
    state = play(state, { type: 'DISCARD', cardId: 'ka-hiragana' })
    expect(state.players[0]?.hand.map((c) => c.id)).toEqual([
      'a-hiragana',
      'sa-hiragana',
      'ta-hiragana',
      'na-hiragana',
      'ha-hiragana',
      'ma-hiragana',
      'ra-hiragana',
    ])
  })
})

describe('完成牌型流程', () => {
  it('自摸完成後卡片移出並補到 7 張，對手付款', () => {
    const yakuCards = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    const rest = cards('sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana')
    let state = startGame({
      seed: 3,
      startPlayerIndex: 0,
      bonus,
      hands: [
        [...yakuCards, ...rest],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: cards('o-hiragana', 'ki-hiragana', 'ko-hiragana', 'te-hiragana', 'to-hiragana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const yakus = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows })
    const sameSound = yakus.find((y) => y.kind === 'sameSound')
    expect(sameSound).toBeTruthy()
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: sameSound!.id })
    expect(state.phase).toBe('review')
    const p0mid = state.players[0]!
    expect(p0mid.score).toBe(480)
    expect(p0mid.gold).toBe(INITIAL_GOLD + 480)
    state = play(state, { type: 'FINISH_REVIEW' })
    expect(state.phase).toBe('playerDraw')
    const p0 = state.players[0]!
    expect(p0.hand).toHaveLength(7)
    expect(p0.hand.some((c) => c.sound === 'ka')).toBe(false)
    expect(p0.completed).toHaveLength(1)
    expect(p0.score).toBe(480)
    expect(p0.gold).toBe(INITIAL_GOLD + 480)
    expect(state.players.slice(1).every((p) => p.gold === INITIAL_GOLD - 160)).toBe(true)
  })
})

describe('棄牌優先順序', () => {
  it('多名玩家都能使用同一張棄牌時，回合順序最近者優先', () => {
    // 棄牌：か hiragana
    // p1（下一家）可用來完成同音
    // p2 可用來完成か行
    const discardId = 'ka-hiragana'
    let state = startGame({
      seed: 5,
      startPlayerIndex: 0,
      bonus,
      hands: [
        cards(discardId, 'a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-vocabulary'),
        cards('ka-katakana', 'ka-vocabulary', 'i-katakana', 'u-katakana', 'e-katakana', 'o-katakana', 'na-katakana'),
        cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'ko-hiragana', 'sa-hiragana', 'shi-hiragana', 'su-hiragana'),
        cards('ta-katakana', 'chi-katakana', 'tsu-katakana', 'te-katakana', 'to-katakana', 'ni-vocabulary', 'nu-vocabulary'),
      ],
      deck: cards('se-hiragana', 'so-hiragana', 'ne-katakana', 'no-hiragana', 'a-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    state = play(state, { type: 'SKIP_YAKU' })
    state = play(state, { type: 'DISCARD', cardId: discardId })
    expect(state.phase).toBe('reaction')
    expect(state.lastDiscardPlayerId).toBe('p0')
    expect(state.players[0]?.discards.map((c) => c.id)).toContain(discardId)
    expect(state.reactionOptions.map((o) => o.playerId)).toEqual(['p1', 'p2'])
    expect(reactionOrder(0, 4)).toEqual([1, 2, 3])

    const p1Yaku = state.reactionOptions[0]!
    state = play(state, { type: 'CLAIM_YAKU', yakuId: p1Yaku.yaku.id })
    // p1 is AI; scoring then review, drainAuto stops at review unless FINISH_REVIEW
    expect(state.players[1]?.completed).toHaveLength(1)
    expect(state.players[1]?.completed[0]?.source).toBe('ron')
    expect(state.players[2]?.completed).toHaveLength(0)
    // only discarder (p0) pays 480 (三位相和 480 分)
    expect(state.players[0]?.gold).toBe(INITIAL_GOLD - 480)
    expect(state.players[1]?.gold).toBe(INITIAL_GOLD + 480)
    expect(state.players[2]?.gold).toBe(INITIAL_GOLD)
    expect(state.players[3]?.gold).toBe(INITIAL_GOLD)
    expect(state.lastTransfers).toEqual([{ fromId: 'p0', toId: 'p1', amount: 480 }])
    expect(state.events.some((e) => e.text.includes('抄了'))).toBe(true)
    expect(state.players[0]?.discards.some((c) => c.id === discardId)).toBe(false)
  })
})

describe('棄牌河', () => {
  it('無人抄走的棄牌會留在該玩家面前', () => {
    const discardId = 'ra-hiragana'
    let state = startGame({
      seed: 8,
      startPlayerIndex: 0,
      bonus,
      hands: [
        fillHand([], [discardId, 'a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'ka-hiragana']),
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ha-hiragana', 'hi-hiragana']),
        fillHand([], ['ma-hiragana', 'mi-hiragana', 'mu-hiragana', 'me-hiragana', 'mo-hiragana', 'ri-hiragana', 'ru-hiragana']),
      ],
      deck: cards('o-katakana', 'a-katakana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    state = play(state, { type: 'SKIP_YAKU' })
    state = play(state, { type: 'DISCARD', cardId: discardId })
    expect(state.players[0]?.discards.map((c) => c.id)).toEqual([discardId])
    expect(state.discardPile.map((c) => c.id)).toEqual([discardId])
    expect(state.players.slice(1).every((p) => p.discards.length === 0)).toBe(true)
  })
})

describe('牌庫不足與耗盡', () => {
  it('補牌時牌庫不足則補到可補的數量，耗盡後結束', () => {
    const yakuCards = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    const rest = cards('sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana')
    let state = startGame({
      seed: 6,
      startPlayerIndex: 0,
      bonus,
      hands: [
        [...yakuCards, ...rest],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: cards('o-hiragana'), // draw 1, then after yaku need 2 refill but 0 left
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const yaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find((y) => y.kind === 'sameSound')!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: yaku.id })
    expect(state.phase).toBe('review')
    state = play(state, { type: 'FINISH_REVIEW' })
    expect(state.phase).toBe('gameOver')
    expect(state.gameOverReason).toBe('deck')
    expect(state.players[0]!.hand.length).toBeLessThan(7)
    expect(state.rankings?.[0]?.playerId).toBe('p0')
  })

  it('牌庫空時不得繼續抽牌', () => {
    let state = startGame({
      seed: 7,
      startPlayerIndex: 0,
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'ka-katakana', 'ki-katakana'),
        cards('sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana'),
        cards('na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ku-katakana', 'ke-katakana'),
        cards('ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'ta-katakana'),
      ],
      deck: [],
    })
    state = play(state, { type: 'DEAL_DONE' })
    const before = state.players[0]!.hand.length
    state = play(state, { type: 'DRAW' })
    expect(state.players[0]!.hand.length).toBe(before)
    expect(state.drewThisTurn).toBe(false)
    expect(state.phase).toBe('playerAction')
  })
})

describe('金幣歸零結束', () => {
  it('有人金幣歸零時完成當次結算後遊戲結束', () => {
    const yakuCards = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    const rest = cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana')
    let state = startGame({
      seed: 8,
      startPlayerIndex: 0,
      bonus,
      initialGold: 50,
      hands: [
        [...yakuCards, ...rest],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: cards('o-hiragana', 'ki-hiragana', 'ko-hiragana', 'te-hiragana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const yaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find((y) => y.kind === 'sameSound')!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: yaku.id })
    expect(state.phase).toBe('gameOver')
    expect(state.gameOverReason).toBe('gold')
    expect(state.players.some((p) => p.gold === 0)).toBe(true)
    expect(state.rankings).toBeTruthy()
  })
})

describe('事件記錄不洩漏隱藏手牌', () => {
  it('抽牌紀錄不含卡面', () => {
    let state = startGame({
      seed: 9,
      startPlayerIndex: 0,
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'ka-katakana', 'ki-katakana'),
        cards('sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana'),
        cards('na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ku-katakana', 'ke-katakana'),
        cards('ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'ta-katakana'),
      ],
      deck: cards('to-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const drawLog = state.events.filter((e) => e.text.includes('抽了'))
    expect(drawLog.some((e) => e.text.includes('と') || e.text.includes('とけい'))).toBe(false)
  })
})

describe('亂數封裝', () => {
  it('shuffle 對同一 seed 穩定', () => {
    const a = createRng(123).shuffle([1, 2, 3, 4, 5, 6, 7, 8])
    const b = createRng(123).shuffle([1, 2, 3, 4, 5, 6, 7, 8])
    expect(a).toEqual(b)
    const c = createRng(124).shuffle([1, 2, 3, 4, 5, 6, 7, 8])
    expect(c).not.toEqual(a)
  })
})

describe('再玩一次', () => {
  it('RESTART 會完整重置', () => {
    let state = startGame({ seed: 10, bonus, skipPreview: true })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const restarted = play(state, { type: 'RESTART', config: { seed: 11, bonus, skipPreview: true } })
    expect(restarted.phase).toBe('dealing')
    const ready = play(restarted, { type: 'DEAL_DONE' })
    expect(ready.phase).toBe('playerDraw')
    expect(INITIAL_GOLD).toBe(1000)
    expect(ready.players.every((p) => p.gold === 1000 && p.score === 0 && p.completed.length === 0)).toBe(true)
    expect(ready.events.some((e) => e.text.includes('遊戲開始'))).toBe(true)
  })
})

describe('課程預覽', () => {
  it('未略過時先進入本次登場畫面', () => {
    const state = startGame({ seed: 12, lessonId: 'a' })
    expect(state.phase).toBe('preview')
    expect(state.activeRows).toEqual(['a'])
    const after = play(state, { type: 'SKIP_PREVIEW' })
    expect(after.phase).toBe('dealing')
  })
})

describe('連線玩家設定 (playerConfigs)', () => {
  it('支援指定 remote 真人玩家與 AI 混編之座位配置', () => {
    const state = startGame({
      seed: 99,
      skipPreview: true,
      playerConfigs: [
        { id: 'host-1', name: '房主', kind: 'human', seat: 0 },
        { id: 'peer-2', name: '朋友A', kind: 'remote', seat: 1 },
        { id: 'peer-3', name: '朋友B', kind: 'remote', seat: 2 },
        { id: 'ai-4', name: '電腦さくら', kind: 'ai', seat: 3, aiDifficulty: 'easy' },
      ],
    })
    expect(state.players).toHaveLength(4)
    expect(state.players[0]!.name).toBe('房主')
    expect(state.players[0]!.kind).toBe('human')
    expect(state.players[1]!.name).toBe('朋友A')
    expect(state.players[1]!.kind).toBe('remote')
    expect(state.players[2]!.name).toBe('朋友B')
    expect(state.players[2]!.kind).toBe('remote')
    expect(state.players[3]!.name).toBe('電腦さくら')
    expect(state.players[3]!.kind).toBe('ai')
    expect(state.players[3]!.aiDifficulty).toBe('easy')
    expect(state.players.every((p) => p.hand.length === HAND_SIZE)).toBe(true)
  })
})

describe('金幣總額與讓渡 (4000 點制)', () => {
  it('自摸牌型後四名玩家金幣合計依然為 4000 且無個位數', () => {
    let state = startGame({
      seed: 77,
      startPlayerIndex: 0,
      skipPreview: true,
      bonus,
      hands: [
        [getCardById('ka-hiragana'), getCardById('ka-katakana'), getCardById('ka-vocabulary'), getCardById('a-hiragana'), getCardById('i-hiragana'), getCardById('u-hiragana'), getCardById('e-hiragana')],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: cards('o-hiragana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const yaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows })[0]!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: yaku.id })
    const totalGold = state.players.reduce((sum, p) => sum + p.gold, 0)
    expect(totalGold).toBe(4000)
    expect(state.players.every((p) => p.gold % 10 === 0)).toBe(true)
  })

  it('放槍者金幣不足以支付時歸零，和牌者仍拿到全部分數，使得總額大於 4000', () => {
    let state = startGame({
      seed: 88,
      startPlayerIndex: 1,
      skipPreview: true,
      bonus,
      hands: [
        [getCardById('ka-hiragana'), getCardById('ka-katakana'), getCardById('a-hiragana'), getCardById('i-hiragana'), getCardById('u-hiragana'), getCardById('e-hiragana'), getCardById('o-hiragana')],
        fillHand([getCardById('ka-vocabulary')], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: cards('to-vocabulary'),
    })
    // 將玩家 1（即將放槍者）的金幣手動設定為 80
    state = {
      ...state,
      players: state.players.map((p, idx) => (idx === 1 ? { ...p, gold: 80 } : p)),
    }
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    state = play(state, { type: 'SKIP_YAKU' })
    state = play(state, { type: 'DISCARD', cardId: 'ka-vocabulary' })
    expect(state.phase).toBe('reaction')
    // 玩家 0 抄牌（ron，同音三張三位相和 480 分）
    const yaku = findYaku([...state.players[0]!.hand, state.currentDiscard!], state.bonus, {
      mustIncludeCardId: 'ka-vocabulary',
      activeRows: state.activeRows,
    })[0]!
    state = play(state, { type: 'CLAIM_YAKU', yakuId: yaku.id })
    // 放槍者金幣歸零
    expect(state.players[1]!.gold).toBe(0)
    // 贏家依然全拿 480 分 (1000 + 480 = 1480)
    expect(state.players[0]!.gold).toBe(1480)
    // 總金幣超出 4000 (1480 + 0 + 1000 + 1000 = 3480，原本總數為 1000*3 + 80 = 3080)
    const totalGold = state.players.reduce((sum, p) => sum + p.gold, 0)
    expect(totalGold).toBe(3480)
    expect(state.phase).toBe('gameOver')
    expect(state.gameOverReason).toBe('gold')
  })
})

describe('連鎖和牌 (Combo 機制)', () => {
  it('自摸後手牌補滿 7 張，若剛好有另一組牌型，進入 playerAction 允許連鎖宣告 (Combo)', () => {
    let state = startGame({
      seed: 123,
      startPlayerIndex: 0,
      skipPreview: true,
      bonus,
      hands: [
        // 7 張：ka-hiragana, ka-katakana + a-row 5 張
        [
          getCardById('ka-hiragana'),
          getCardById('ka-katakana'),
          getCardById('a-hiragana'),
          getCardById('i-hiragana'),
          getCardById('u-hiragana'),
          getCardById('e-hiragana'),
          getCardById('o-hiragana'),
        ],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: [
        getCardById('ka-vocabulary'), // 摸牌：湊成 ka 同音三張
        getCardById('ta-vocabulary'), // 補牌 1
        getCardById('chi-vocabulary'), // 補牌 2
      ],
    })

    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    expect(state.currentPlayerIndex).toBe(0)
    // 第一次和牌：打出 ka 同音三張
    const kaYaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find(
      (y) => y.sound === 'ka',
    )!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: kaYaku.id })
    expect(state.phase).toBe('review')
    expect(state.comboCount).toBe(1)

    // 完成審查並進入補牌：手牌剩 a-row 5 張，補進 2 張卡片
    state = play(state, { type: 'FINISH_REVIEW' })

    // 因為補滿 7 張手牌中依然存在 a-row 5 張同一行牌型，應進入 playerAction 允許連鎖！
    expect(state.phase).toBe('playerAction')
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0]!.hand).toHaveLength(7)
    expect(state.events.some((e) => e.text.includes('連鎖'))).toBe(true)

    // 第二次連鎖和牌：打出 a-row 同一行
    const aRowYaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find(
      (y) => y.row === 'a',
    )!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: aRowYaku.id })
    expect(state.phase).toBe('review')
    expect(state.comboCount).toBe(2)
    expect(state.events.some((e) => e.text.includes('Combo 2'))).toBe(true)
  })

  it('在連鎖 playerAction 階段主動跳過 (SKIP_YAKU)，不進入棄牌階段，直接推進至 nextTurn', () => {
    let state = startGame({
      seed: 124,
      startPlayerIndex: 0,
      skipPreview: true,
      bonus,
      hands: [
        [
          getCardById('ka-hiragana'),
          getCardById('ka-katakana'),
          getCardById('a-hiragana'),
          getCardById('i-hiragana'),
          getCardById('u-hiragana'),
          getCardById('e-hiragana'),
          getCardById('o-hiragana'),
        ],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: [
        getCardById('ka-vocabulary'),
        getCardById('ta-vocabulary'),
        getCardById('chi-vocabulary'),
        getCardById('tsu-vocabulary'),
        getCardById('te-vocabulary'),
      ],
    })

    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const kaYaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find(
      (y) => y.sound === 'ka',
    )!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: kaYaku.id })
    state = play(state, { type: 'FINISH_REVIEW' })
    expect(state.phase).toBe('playerAction')

    // 玩家主動跳過連鎖和牌
    state = play(state, { type: 'SKIP_YAKU' })
    // 手牌剛好為 7 張，不棄牌，直接輪到玩家 1 抽牌
    expect(state.phase).toBe('playerDraw')
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.players[0]!.hand).toHaveLength(7)
  })

  it('補牌後手牌無任何合法牌型時，自動結束連鎖並換下一家', () => {
    let state = startGame({
      seed: 125,
      startPlayerIndex: 0,
      skipPreview: true,
      bonus,
      hands: [
        // 手牌：同音三張 ka，其餘 4 張無法成牌
        [
          getCardById('ka-hiragana'),
          getCardById('ka-katakana'),
          getCardById('sa-hiragana'),
          getCardById('ta-hiragana'),
          getCardById('na-hiragana'),
          getCardById('ha-hiragana'),
          getCardById('ma-hiragana'),
        ],
        fillHand([], ['sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'ta-katakana', 'chi-katakana']),
        fillHand([], ['na-katakana', 'ni-katakana', 'nu-katakana', 'ne-katakana', 'no-katakana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-vocabulary', 'shi-vocabulary', 'su-vocabulary', 'se-vocabulary', 'so-vocabulary']),
      ],
      deck: [
        getCardById('ka-vocabulary'), // 摸進第 3 張 ka
        getCardById('ra-hiragana'), // 補牌 1（無法成牌）
        getCardById('ri-hiragana'), // 補牌 2
        getCardById('ru-hiragana'), // 補牌 3
      ],
    })

    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const kaYaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows })[0]!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: kaYaku.id })
    state = play(state, { type: 'FINISH_REVIEW' })

    // 補牌後無牌型，自動推進至下一位玩家抽牌
    expect(state.phase).toBe('playerDraw')
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.comboCount).toBe(0)
  })

  it('牌庫耗盡時若補牌剛好湊齊牌型，仍可連鎖出牌；無牌型後才判定牌庫耗盡結束遊戲', () => {
    let state = startGame({
      seed: 126,
      startPlayerIndex: 0,
      skipPreview: true,
      bonus,
      hands: [
        [
          getCardById('ka-hiragana'),
          getCardById('ka-katakana'),
          getCardById('a-hiragana'),
          getCardById('i-hiragana'),
          getCardById('u-hiragana'),
          getCardById('e-hiragana'),
          getCardById('o-hiragana'),
        ],
        fillHand([], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      // 牌庫只有 1 張摸牌和 2 張補牌，補完後牌庫恰好為 0
      deck: [
        getCardById('ka-vocabulary'),
        getCardById('ta-vocabulary'),
        getCardById('chi-vocabulary'),
      ],
    })

    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const kaYaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find(
      (y) => y.sound === 'ka',
    )!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: kaYaku.id })
    state = play(state, { type: 'FINISH_REVIEW' })

    // 此時牌庫長度為 0，但手牌依然有 a-row 牌型，依然允許連鎖！
    expect(state.deck).toHaveLength(0)
    expect(state.phase).toBe('playerAction')

    // 若玩家跳過，才因牌庫耗盡而結束遊戲
    state = play(state, { type: 'SKIP_YAKU' })
    expect(state.phase).toBe('gameOver')
    expect(state.gameOverReason).toBe('deck')
  })

  it('抄牌 (Ron) 補牌後若手牌湊齊合法牌型，亦能無縫觸發 Combo 連鎖', () => {
    const discardCard = getCardById('ka-vocabulary')
    let state = startGame({
      seed: 999,
      startPlayerIndex: 1, // 由玩家 1 起手
      skipPreview: true,
      bonus,
      hands: [
        // 玩家 0 手牌：ka-hiragana, ka-katakana + a-hiragana, a-katakana + 3 張雜牌
        [
          getCardById('ka-hiragana'),
          getCardById('ka-katakana'),
          getCardById('a-hiragana'),
          getCardById('a-katakana'),
          getCardById('sa-hiragana'),
          getCardById('ta-hiragana'),
          getCardById('na-hiragana'),
        ],
        fillHand([discardCard], ['sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana']),
        fillHand([], ['na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana']),
      ],
      deck: [
        getCardById('sa-vocabulary'), // 玩家 1 抽這張
        getCardById('a-vocabulary'), // 補牌 1：剛好與 a-hiragana、a-katakana 湊成同音三張！
        getCardById('chi-vocabulary'), // 補牌 2
        getCardById('ma-hiragana'),
        getCardById('mi-hiragana'),
        getCardById('mu-hiragana'),
        getCardById('me-hiragana'),
        getCardById('mo-hiragana'),
      ],
    })

    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    state = play(state, { type: 'SKIP_YAKU' })
    state = play(state, { type: 'DISCARD', cardId: discardCard.id })
    expect(state.phase).toBe('reaction')

    // 玩家 0 抄牌（もらった）
    const yaku = findYaku([...state.players[0]!.hand, state.currentDiscard!], state.bonus, {
      mustIncludeCardId: discardCard.id,
      activeRows: state.activeRows,
    })[0]!
    state = play(state, { type: 'CLAIM_YAKU', yakuId: yaku.id })
    expect(state.phase).toBe('review')
    expect(state.comboCount).toBe(1)

    // 結算審查完畢，進行補牌
    state = play(state, { type: 'FINISH_REVIEW' })
    // 補牌進 a-vocabulary 後，手牌有 a 同音三張，玩家 0 成為當前回合者並進入 playerAction！
    expect(state.phase).toBe('playerAction')
    expect(state.currentPlayerIndex).toBe(0)

    // 玩家 0 連鎖宣告第二組牌型（a 同音三張）
    const aYaku = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).find(
      (y) => y.sound === 'a',
    )!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: aYaku.id })
    expect(state.phase).toBe('review')
    expect(state.comboCount).toBe(2)

    // 抄牌連鎖結束後，應輪到原棄牌者（p1）的下一家 p2，而不是抄牌者 p0 的下一家 p1
    state = play(state, { type: 'FINISH_REVIEW' })
    expect(state.phase).toBe('playerDraw')
    expect(state.currentPlayerIndex).toBe(2)
    expect(state.turnOwnerIndex).toBe(2)
  })

  it('略過可成的牌型並棄牌後，即使手牌仍有役也不再強行進入連鎖宣告', () => {
    const yakuCards = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    const rest = cards('sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana')
    let state = startGame({
      seed: 321,
      startPlayerIndex: 0,
      skipPreview: true,
      bonus,
      hands: [
        [...yakuCards, ...rest],
        fillHand([], ['sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'ta-katakana', 'chi-katakana']),
        fillHand([], ['na-katakana', 'ni-katakana', 'nu-katakana', 'ne-katakana', 'no-katakana', 'ki-katakana', 'ku-katakana']),
        fillHand([], ['ke-katakana', 'ko-katakana', 'sa-vocabulary', 'shi-vocabulary', 'su-vocabulary', 'se-vocabulary', 'so-vocabulary']),
      ],
      deck: cards('ra-hiragana', 'ri-hiragana', 'ru-hiragana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    expect(findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).length).toBeGreaterThan(0)
    state = play(state, { type: 'SKIP_YAKU' })
    expect(state.phase).toBe('discard')
    state = play(state, { type: 'DISCARD', cardId: 'ha-hiragana' })
    expect(state.phase).toBe('playerDraw')
    expect(state.currentPlayerIndex).toBe(1)
    expect(findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows }).some((y) => y.kind === 'sameSound')).toBe(true)
  })
})

