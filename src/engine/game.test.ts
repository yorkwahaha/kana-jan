import { describe, expect, it } from 'vitest'
import { BONUS_MISSIONS } from '../data/bonuses'
import { CARD_CATALOG, getCardById, type KanaCard } from '../data/cards'
import { createRng } from './rng'
import { drainAuto, reduce, startGame } from './game'
import { reactionOrder } from './game'
import { HAND_SIZE } from './types'
import { findYaku } from './yaku'

const bonus = BONUS_MISSIONS.find((b) => b.kind === 'rowYaku')!

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

describe('seed 可重現', () => {
  it('相同 seed 產生相同起始玩家、Bonus 與牌庫', () => {
    const a = startGame({ seed: 42 })
    const b = startGame({ seed: 42 })
    expect(a.startPlayerIndex).toBe(b.startPlayerIndex)
    expect(a.bonus.kind).toBe(b.bonus.kind)
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
  })
})

describe('完成牌型流程', () => {
  it('自摸完成後卡片移出並補到 7 張，對手付款', () => {
    const yakuCards = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    const rest = cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana')
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
    const yakus = findYaku(state.players[0]!.hand, state.bonus)
    const sameSound = yakus.find((y) => y.kind === 'sameSound')
    expect(sameSound).toBeTruthy()
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: sameSound!.id })
    expect(state.phase).toBe('pronunciation')
    state = play(state, { type: 'FINISH_PRONUNCIATION' })
    expect(state.phase).toBe('playerDraw')
    const p0 = state.players[0]!
    expect(p0.hand).toHaveLength(7)
    expect(p0.hand.some((c) => c.sound === 'ka')).toBe(false)
    expect(p0.completed).toHaveLength(1)
    expect(p0.score).toBe(3)
    expect(p0.gold).toBe(20 + 3 * 3)
    expect(state.players.slice(1).every((p) => p.gold === 17)).toBe(true)
  })
})

describe('棄牌優先順序', () => {
  it('多名玩家都能使用同一張棄牌時，回合順序最近者優先', () => {
    // 棄牌：か hiragana
    // p1（下家）可用來完成同音
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
    expect(state.reactionOptions.map((o) => o.playerId)).toEqual(['p1', 'p2'])
    expect(reactionOrder(0, 4)).toEqual([1, 2, 3])

    const p1Yaku = state.reactionOptions[0]!
    state = play(state, { type: 'CLAIM_YAKU', yakuId: p1Yaku.yaku.id })
    // p1 is AI so skips pronunciation, auto scores
    expect(state.players[1]?.completed).toHaveLength(1)
    expect(state.players[1]?.completed[0]?.source).toBe('ron')
    expect(state.players[2]?.completed).toHaveLength(0)
    // only discarder (p0) pays 3
    expect(state.players[0]?.gold).toBe(17)
    expect(state.players[1]?.gold).toBe(23)
    expect(state.players[2]?.gold).toBe(20)
    expect(state.players[3]?.gold).toBe(20)
  })
})

describe('牌庫不足與耗盡', () => {
  it('補牌時牌庫不足則補到可補的數量，耗盡後結束', () => {
    const yakuCards = cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary')
    const rest = cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana')
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
    const yaku = findYaku(state.players[0]!.hand, state.bonus).find((y) => y.kind === 'sameSound')!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: yaku.id })
    state = play(state, { type: 'FINISH_PRONUNCIATION' })
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
      initialGold: 3,
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
    const yaku = findYaku(state.players[0]!.hand, state.bonus).find((y) => y.kind === 'sameSound')!
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: yaku.id })
    state = play(state, { type: 'FINISH_PRONUNCIATION' })
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
    let state = startGame({ seed: 10, bonus })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const restarted = play(state, { type: 'RESTART', config: { seed: 11, bonus } })
    expect(restarted.phase).toBe('dealing')
    const ready = play(restarted, { type: 'DEAL_DONE' })
    expect(ready.phase).toBe('playerDraw')
    expect(ready.players.every((p) => p.gold === 20 && p.score === 0 && p.completed.length === 0)).toBe(true)
    expect(ready.events.some((e) => e.text.includes('遊戲開始'))).toBe(true)
  })
})
