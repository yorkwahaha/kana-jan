import { describe, expect, it } from 'vitest'
import { DEFAULT_BONUS } from '../data/bonuses'
import { CARD_CATALOG, getCardById, type KanaCard } from '../data/cards'
import { createRng } from './rng'
import { drainAuto, reduce, startGame } from './game'
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
    const yakus = findYaku(state.players[0]!.hand, state.bonus, { activeRows: state.activeRows })
    const sameSound = yakus.find((y) => y.kind === 'sameSound')
    expect(sameSound).toBeTruthy()
    state = play(state, { type: 'CHOOSE_YAKU', yakuId: sameSound!.id })
    expect(state.phase).toBe('review')
    const p0mid = state.players[0]!
    expect(p0mid.score).toBe(3)
    expect(p0mid.gold).toBe(INITIAL_GOLD + 3 * 3)
    state = play(state, { type: 'FINISH_REVIEW' })
    expect(state.phase).toBe('playerDraw')
    const p0 = state.players[0]!
    expect(p0.hand).toHaveLength(7)
    expect(p0.hand.some((c) => c.sound === 'ka')).toBe(false)
    expect(p0.completed).toHaveLength(1)
    expect(p0.score).toBe(3)
    expect(p0.gold).toBe(INITIAL_GOLD + 3 * 3)
    expect(state.players.slice(1).every((p) => p.gold === INITIAL_GOLD - 3)).toBe(true)
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
    // only discarder (p0) pays 3
    expect(state.players[0]?.gold).toBe(INITIAL_GOLD - 3)
    expect(state.players[1]?.gold).toBe(INITIAL_GOLD + 3)
    expect(state.players[2]?.gold).toBe(INITIAL_GOLD)
    expect(state.players[3]?.gold).toBe(INITIAL_GOLD)
    expect(state.lastTransfers).toEqual([{ fromId: 'p0', toId: 'p1', amount: 3 }])
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
    expect(INITIAL_GOLD).toBe(20)
    expect(ready.players.every((p) => p.gold === 20 && p.score === 0 && p.completed.length === 0)).toBe(true)
    expect(ready.events.some((e) => e.text.includes('遊戲開始'))).toBe(true)
  })
})

describe('課程預覽', () => {
  it('未略過時先進入本次登場畫面，且あ行不判定同一段', () => {
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
