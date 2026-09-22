import { describe, expect, it } from 'vitest'
import { DEFAULT_BONUS } from '../data/bonuses'
import { getCardById, type KanaCard } from '../data/cards'
import { decideAi, needsHumanInput } from './ai'
import { currentReactionYakus, drainAuto, reduce, startGame } from './game'
import { createRng } from './rng'
import { findYaku } from './yaku'

const bonus = DEFAULT_BONUS

function cards(...ids: string[]): KanaCard[] {
  return ids.map(getCardById)
}

function play(state: ReturnType<typeof startGame>, action: Parameters<typeof reduce>[1]) {
  return drainAuto(reduce(state, action))
}

describe('電腦決策', () => {
  it('簡單難度在可完成時會結算牌型', () => {
    let state = startGame({
      seed: 99,
      startPlayerIndex: 1,
      aiDifficulty: 'easy',
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana'),
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ki-katakana', 'ku-katakana', 'ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana'),
      ],
      deck: cards('so-hiragana', 'so-katakana', 'so-vocabulary', 'na-katakana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const rng = createRng(1)
    const action = decideAi(state, rng)
    expect(action?.type).toBe('CHOOSE_YAKU')
  })

  it('簡單難度有多組同音候選時仍只從最高分組合中隨機選擇', () => {
    const ka = getCardById('ka-hiragana')
    let state = startGame({
      seed: 109,
      startPlayerIndex: 1,
      aiDifficulty: 'easy',
      activeRows: ['a', 'ka', 'sa', 'ta'],
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'sa-hiragana', 'shi-hiragana'),
        [
          ka,
          { ...ka, id: 'ka-hiragana#1' },
          { ...ka, id: 'ka-hiragana#2' },
          getCardById('ka-katakana'),
          getCardById('ka-vocabulary'),
          getCardById('sa-vocabulary'),
          getCardById('ta-vocabulary'),
        ],
        cards('na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ki-katakana', 'ku-katakana'),
        cards('ke-katakana', 'ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana'),
      ],
      deck: cards('chi-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const yakus = findYaku(state.players[1]!.hand, state.bonus, { activeRows: state.activeRows })

    for (let seed = 1; seed <= 20; seed++) {
      const action = decideAi(state, createRng(seed))
      expect(action?.type).toBe('CHOOSE_YAKU')
      if (action?.type === 'CHOOSE_YAKU') {
        expect(yakus.find((candidate) => candidate.id === action.yakuId)?.totalScore).toBe(840)
      }
    }
  })

  it('簡單難度抄牌時也只從最高分組合中隨機選擇', () => {
    const ka = getCardById('ka-hiragana')
    const discarded = { ...ka, id: 'ka-hiragana#discarded' }
    const base = startGame({
      seed: 110,
      aiDifficulty: 'easy',
      activeRows: ['a', 'ka', 'sa', 'ta'],
      hands: [
        cards('a-hiragana'),
        [
          { ...ka, id: 'ka-hiragana#1' },
          { ...ka, id: 'ka-hiragana#2' },
          getCardById('ka-katakana'),
          getCardById('ka-vocabulary'),
          getCardById('sa-vocabulary'),
          getCardById('ta-vocabulary'),
          getCardById('na-vocabulary'),
        ],
        cards('sa-hiragana'),
        cards('ta-hiragana'),
      ],
    })
    const state = {
      ...base,
      phase: 'reaction' as const,
      currentDiscard: discarded,
      lastDiscardPlayerId: 'p0',
      reactionOptions: [{ playerId: base.players[1]!.id }],
      reactionIndex: 0,
    }
    const yakus = currentReactionYakus(state)
    expect(new Set(yakus.map((yaku) => yaku.totalScore)).size).toBeGreaterThan(1)

    for (let seed = 1; seed <= 20; seed++) {
      const action = decideAi(state, createRng(seed))
      expect(action?.type).toBe('CLAIM_YAKU')
      if (action?.type === 'CLAIM_YAKU') {
        expect(yakus.find((candidate) => candidate.id === action.yakuId)?.totalScore).toBe(840)
      }
    }
  })

  it('普通難度棄牌會避開自己接近完成的牌', () => {
    let state = startGame({
      seed: 100,
      startPlayerIndex: 1,
      aiDifficulty: 'normal',
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        cards('ka-hiragana', 'ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'sa-vocabulary', 'shi-vocabulary', 'a-katakana'),
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'na-katakana'),
      ],
      deck: cards('nu-vocabulary', 'ne-vocabulary', 'no-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const rng = createRng(3)
    const skip = decideAi(state, rng)
    expect(skip?.type).toBe('SKIP_YAKU')
    state = play(state, skip!)
    const discard = decideAi(state, rng)
    expect(discard?.type).toBe('DISCARD')
    if (discard?.type === 'DISCARD') {
      expect(['ka-hiragana', 'ki-hiragana', 'ku-hiragana', 'ke-hiragana']).not.toContain(discard.cardId)
    }
  })

  it('普通難度手牌有同音兩張相同類型（如2平）時，視為接近聽牌而不優先捨棄', () => {
    const k1 = getCardById('ka-hiragana')
    const k2 = { ...k1, id: 'ka-hiragana#1' }
    let state = startGame({
      seed: 101,
      startPlayerIndex: 1,
      aiDifficulty: 'normal',
      bonus,
      hands: [
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'o-hiragana', 'na-hiragana', 'ni-hiragana'),
        [k1, k2, getCardById('sa-vocabulary'), getCardById('chi-vocabulary'), getCardById('tsu-vocabulary'), getCardById('re-vocabulary'), getCardById('ro-vocabulary')],
        cards('ta-hiragana', 'chi-hiragana', 'tsu-hiragana', 'te-hiragana', 'to-hiragana', 'ne-hiragana', 'no-hiragana'),
        cards('ko-katakana', 'sa-katakana', 'shi-katakana', 'su-katakana', 'se-katakana', 'so-katakana', 'na-katakana'),
      ],
      deck: cards('nu-vocabulary', 'ne-vocabulary', 'no-vocabulary'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    const rng = createRng(5)
    const skip = decideAi(state, rng)
    expect(skip?.type).toBe('SKIP_YAKU')
    state = play(state, skip!)
    const discard = decideAi(state, rng)
    expect(discard?.type).toBe('DISCARD')
    if (discard?.type === 'DISCARD') {
      expect([k1.id, k2.id]).not.toContain(discard.cardId)
    }
  })

  it('外面不足兩張的讀音會優先被棄出', () => {
    let state = startGame({
      seed: 102,
      startPlayerIndex: 1,
      aiDifficulty: 'normal',
      bonus,
      hands: [
        cards('i-hiragana', 'ki-hiragana', 'shi-hiragana', 'chi-hiragana', 'ni-hiragana', 'hi-hiragana', 'mi-hiragana'),
        cards('a-hiragana', 'ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana', 'ma-hiragana'),
        cards('u-hiragana', 'ku-hiragana', 'su-hiragana', 'tsu-hiragana', 'nu-hiragana', 'fu-hiragana', 'mu-hiragana'),
        cards('e-hiragana', 'ke-hiragana', 'se-hiragana', 'te-hiragana', 'ne-hiragana', 'he-hiragana', 'me-hiragana'),
      ],
      deck: cards('ra-hiragana'),
    })
    state = play(state, { type: 'DEAL_DONE' })
    state = play(state, { type: 'DRAW' })
    state = play(state, { type: 'SKIP_YAKU' })
    const hand = state.players[1]!.hand
    state = {
      ...state,
      discardPile: cards('ka-katakana'),
      deckManifest: Object.fromEntries(
        hand.map((card) => [`${card.sound}:hiragana`, card.sound === 'ka' ? 2 : 6]),
      ),
    }

    expect(decideAi(state, createRng(1))).toEqual({ type: 'DISCARD', cardId: 'ka-hiragana' })
  })
})

describe('普通難度的攻守', () => {
  const plan = ['a-hiragana', 'i-hiragana', 'u-hiragana']
  const live = ['ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana']

  function pressureState(turnNumber: number, difficulty: 'normal' | 'easy' = 'normal') {
    const state = startGame({
      seed: 7,
      startPlayerIndex: 1,
      skipPreview: true,
      aiDifficulty: difficulty,
      activeRows: ['a', 'ka', 'sa', 'ta', 'na', 'ha'],
      bonus,
      hands: [
        cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'ko-hiragana', 'shi-hiragana', 'chi-hiragana', 'ni-hiragana'),
        cards(...plan, ...live),
        cards('fu-hiragana', 'mu-hiragana', 'ru-hiragana', 're-hiragana', 'ro-hiragana', 'ya-hiragana', 'yu-hiragana'),
        cards('yo-hiragana', 'wa-hiragana', 'wo-hiragana', 'n-hiragana', 'ga-hiragana', 'za-hiragana', 'da-hiragana'),
      ],
      deck: [],
    })
    state.phase = 'discard'
    state.turnNumber = turnNumber
    state.currentPlayerIndex = 1
    state.deckManifest = {
      ...Object.fromEntries(plan.map((id) => [`${id.split('-')[0]}:hiragana`, 1])),
      ...Object.fromEntries(live.map((id) => [`${id.split('-')[0]}:hiragana`, 6])),
    }
    return state
  }

  function discardedId(state: ReturnType<typeof pressureState>, seed = 1): string {
    const action = decideAi(state, createRng(seed))
    expect(action?.type).toBe('DISCARD')
    if (action?.type !== 'DISCARD') throw new Error('expected discard')
    return action.cardId
  }

  it('前期未聽牌仍先丟不推進手牌的生張', () => {
    const id = discardedId(pressureState(1))
    expect(plan).not.toContain(id)
    expect(live).toContain(id)
  })

  it('後期未聽牌寧願拆掉向聽搭子，也不丟外面還夠張數的生張', () => {
    const id = discardedId(pressureState(6))
    expect(plan).toContain(id)
  })

  it('聽牌時留下聽牌材料，並在閒張裡選外面已不夠張數的牌', () => {
    const pair = getCardById('a-hiragana')
    const state = startGame({
      seed: 8,
      startPlayerIndex: 1,
      skipPreview: true,
      aiDifficulty: 'normal',
      activeRows: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
      bonus,
      hands: [
        cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'ko-hiragana', 'shi-hiragana', 'chi-hiragana', 'ni-hiragana'),
        [
          pair,
          { ...pair, id: 'a-hiragana#1' },
          getCardById('ma-hiragana'),
          ...cards('ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana'),
        ],
        cards('fu-hiragana', 'mu-hiragana', 'ru-hiragana', 're-hiragana', 'ro-hiragana', 'ya-hiragana', 'yu-hiragana'),
        cards('yo-hiragana', 'wa-hiragana', 'wo-hiragana', 'n-hiragana', 'ga-hiragana', 'za-hiragana', 'da-hiragana'),
      ],
      deck: [],
    })
    state.phase = 'discard'
    state.turnNumber = 6
    state.currentPlayerIndex = 1
    state.deckManifest = {
      'a:hiragana': 2,
      'ma:hiragana': 1,
      'ka:hiragana': 6,
      'sa:hiragana': 6,
      'ta:hiragana': 6,
      'na:hiragana': 6,
      'ha:hiragana': 6,
    }
    expect(discardedId(state)).toBe('ma-hiragana')
  })

  it('只聽同音對子時，會拆掉這對來避開安靜的一行生張', () => {
    const pair = getCardById('a-hiragana')
    const state = startGame({
      seed: 9,
      startPlayerIndex: 1,
      skipPreview: true,
      aiDifficulty: 'normal',
      activeRows: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
      bonus,
      hands: [
        cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'ko-hiragana', 'shi-hiragana', 'chi-hiragana', 'ni-hiragana'),
        [
          pair,
          { ...pair, id: 'a-hiragana#1' },
          ...cards('ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana', 'ma-hiragana'),
        ],
        cards('fu-hiragana', 'mu-hiragana', 'ru-hiragana', 're-hiragana', 'ro-hiragana', 'ya-hiragana', 'yu-hiragana'),
        cards('yo-hiragana', 'wa-hiragana', 'wo-hiragana', 'n-hiragana', 'ga-hiragana', 'za-hiragana', 'da-hiragana'),
      ],
      deck: [],
    })
    state.phase = 'discard'
    state.turnNumber = 6
    state.currentPlayerIndex = 1
    state.deckManifest = {
      'a:hiragana': 2,
      'ka:hiragana': 6, 'ki:hiragana': 3, 'ku:hiragana': 3, 'ke:hiragana': 3, 'ko:hiragana': 3,
      'sa:hiragana': 6, 'shi:hiragana': 3, 'su:hiragana': 3, 'se:hiragana': 3, 'so:hiragana': 3,
      'ta:hiragana': 6, 'chi:hiragana': 3, 'tsu:hiragana': 3, 'te:hiragana': 3, 'to:hiragana': 3,
      'na:hiragana': 6, 'ni:hiragana': 3, 'nu:hiragana': 3, 'ne:hiragana': 3, 'no:hiragana': 3,
      'ha:hiragana': 6, 'hi:hiragana': 3, 'fu:hiragana': 3, 'he:hiragana': 3, 'ho:hiragana': 3,
      'ma:hiragana': 6, 'mi:hiragana': 3, 'mu:hiragana': 3, 'me:hiragana': 3, 'mo:hiragana': 3,
    }
    expect(['a-hiragana', 'a-hiragana#1']).toContain(discardedId(state))
  })

  it('聽一行時仍留下那一行，不為了安全去拆大聽牌', () => {
    const state = startGame({
      seed: 10,
      startPlayerIndex: 1,
      skipPreview: true,
      aiDifficulty: 'normal',
      activeRows: ['a', 'ka', 'sa', 'ta'],
      bonus,
      hands: [
        cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'ko-hiragana', 'shi-hiragana', 'chi-hiragana', 'ni-hiragana'),
        cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana', 'ka-hiragana', 'sa-hiragana', 'ta-hiragana', 'na-hiragana'),
        cards('fu-hiragana', 'mu-hiragana', 'ru-hiragana', 're-hiragana', 'ro-hiragana', 'ya-hiragana', 'yu-hiragana'),
        cards('yo-hiragana', 'wa-hiragana', 'wo-hiragana', 'n-hiragana', 'ga-hiragana', 'za-hiragana', 'da-hiragana'),
      ],
      deck: [],
    })
    state.phase = 'discard'
    state.turnNumber = 6
    state.currentPlayerIndex = 1
    state.deckManifest = {
      'a:hiragana': 1, 'i:hiragana': 1, 'u:hiragana': 1, 'e:hiragana': 1,
      'ka:hiragana': 6, 'ki:hiragana': 3, 'ku:hiragana': 3, 'ke:hiragana': 3, 'ko:hiragana': 3,
      'sa:hiragana': 6, 'shi:hiragana': 3, 'su:hiragana': 3, 'se:hiragana': 3, 'so:hiragana': 3,
      'ta:hiragana': 6, 'chi:hiragana': 3, 'tsu:hiragana': 3, 'te:hiragana': 3, 'to:hiragana': 3,
      'na:hiragana': 6, 'ni:hiragana': 3, 'nu:hiragana': 3, 'ne:hiragana': 3, 'no:hiragana': 3,
    }
    const id = discardedId(state)
    expect(['a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana']).not.toContain(id)
  })

  it('棄牌不讀取對手手牌', () => {
    const state = pressureState(6)
    const swapped: typeof state = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? { ...player, hand: cards('ba-hiragana', 'bi-hiragana', 'bu-hiragana', 'be-hiragana', 'bo-hiragana', 'pa-hiragana', 'pi-hiragana') }
          : player,
      ),
    }
    expect(discardedId(swapped, 3)).toBe(discardedId(state, 3))
  })

  it('簡單難度大多會看安全牌，但仍有一部分局完全不看', () => {
    let safe = 0
    let careless = 0
    for (let seed = 1; seed <= 30; seed++) {
      const id = discardedId(pressureState(6, 'easy'), seed)
      if (plan.includes(id)) safe += 1
      else careless += 1
    }
    expect(safe).toBeGreaterThan(0)
    expect(careless).toBeGreaterThan(0)
  })

  it('金幣落後時後期仍優先推進手牌，不全面防守', () => {
    const state = pressureState(6)
    state.players[1]!.gold = 700
    const id = discardedId(state)
    expect(plan).not.toContain(id)
    expect(live).toContain(id)
  })
})

describe('普通難度的榮和取捨', () => {
  function reactionFor(
    hand: ReturnType<typeof cards>,
    discard: ReturnType<typeof getCardById>,
    difficulty: 'normal' | 'easy' = 'normal',
  ) {
    const state = startGame({
      seed: 21,
      startPlayerIndex: 0,
      skipPreview: true,
      aiDifficulty: difficulty,
      activeRows: ['ka', 'sa', 'ta'],
      bonus,
      hands: [
        cards('sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana'),
        hand,
        cards('na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ha-hiragana', 'hi-hiragana'),
        cards('ma-hiragana', 'mi-hiragana', 'mu-hiragana', 'me-hiragana', 'mo-hiragana', 'ra-hiragana', 'ri-hiragana'),
      ],
      deck: [],
    })
    return {
      ...state,
      phase: 'reaction' as const,
      currentDiscard: discard,
      lastDiscardPlayerId: 'p0',
      reactionOptions: [{ playerId: 'p1' }],
      reactionIndex: 0,
    }
  }

  const pair = getCardById('ka-hiragana')
  const rowWait = [
    pair,
    { ...pair, id: 'ka-hiragana#1' },
    ...cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'sa-hiragana', 'ta-hiragana'),
  ]

  it('120 的同音會拆掉已聽的一行時放過', () => {
    const state = reactionFor(rowWait, getCardById('ka-katakana'))
    expect(decideAi(state, createRng(1))).toEqual({ type: 'PASS_CLAIM' })
  })

  it('金幣落後、手牌仍有餘張，或役本身是一行時照吃', () => {
    const behind = reactionFor(rowWait, getCardById('ka-katakana'))
    behind.players[1]!.gold = 700
    expect(decideAi(behind, createRng(1))?.type).toBe('CLAIM_YAKU')

    const spare = reactionFor(
      [
        pair,
        { ...pair, id: 'ka-hiragana#1' },
        { ...pair, id: 'ka-hiragana#2' },
        ...cards('ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'sa-hiragana'),
      ],
      getCardById('ka-katakana'),
    )
    expect(decideAi(spare, createRng(1))?.type).toBe('CLAIM_YAKU')

    const row = reactionFor(
      cards('ka-hiragana', 'ki-hiragana', 'ku-hiragana', 'ke-hiragana', 'sa-hiragana', 'shi-hiragana', 'ta-hiragana'),
      getCardById('ko-hiragana'),
    )
    expect(decideAi(row, createRng(1))?.type).toBe('CLAIM_YAKU')
  })

  it('簡單難度仍吃下會拆搭子的 120', () => {
    const state = reactionFor(rowWait, getCardById('ka-katakana'), 'easy')
    expect(decideAi(state, createRng(1))?.type).toBe('CLAIM_YAKU')
  })
})

describe('普通難度的小同音取捨', () => {
  function cheapState(turnNumber = 1) {
    const ka = getCardById('ka-hiragana')
    const state = startGame({
      seed: 11,
      startPlayerIndex: 1,
      skipPreview: true,
      aiDifficulty: 'normal',
      activeRows: ['a', 'ka', 'sa', 'ta'],
      bonus,
      hands: [
        cards('sa-hiragana', 'shi-hiragana', 'su-hiragana', 'se-hiragana', 'so-hiragana', 'ta-hiragana', 'chi-hiragana'),
        [
          ka,
          { ...ka, id: 'ka-hiragana#1' },
          getCardById('ka-katakana'),
          ...cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana'),
        ],
        cards('na-hiragana', 'ni-hiragana', 'nu-hiragana', 'ne-hiragana', 'no-hiragana', 'ha-hiragana', 'hi-hiragana'),
        cards('ma-hiragana', 'mi-hiragana', 'mu-hiragana', 'me-hiragana', 'mo-hiragana', 'ra-hiragana', 'ri-hiragana'),
      ],
      deck: [],
    })
    state.phase = 'playerAction'
    state.turnNumber = turnNumber
    state.currentPlayerIndex = 1
    state.comboCount = 0
    return state
  }

  it('前期接近一行時，多數種子會留下 120 的同音', () => {
    let held = 0
    for (let seed = 1; seed <= 40; seed++) {
      const action = decideAi(cheapState(1), createRng(seed))
      if (action?.type === 'SKIP_YAKU') held += 1
    }
    expect(held).toBeGreaterThanOrEqual(22)
  })

  it('巡目進入中後期、金幣落後，或手上已有 480 分以上時，直接宣告', () => {
    for (let seed = 1; seed <= 12; seed++) {
      expect(decideAi(cheapState(6), createRng(seed))?.type).toBe('CHOOSE_YAKU')
      const behind = cheapState(1)
      behind.players[1]!.gold = 700
      expect(decideAi(behind, createRng(seed))?.type).toBe('CHOOSE_YAKU')
    }

    const ka = getCardById('ka-hiragana')
    const rich = cheapState(1)
    rich.players[1]!.hand = [
      ka,
      getCardById('ka-katakana'),
      getCardById('ka-vocabulary'),
      ...cards('a-hiragana', 'i-hiragana', 'u-hiragana', 'e-hiragana'),
    ]
    expect(decideAi(rich, createRng(1))?.type).toBe('CHOOSE_YAKU')
  })
})

describe('真人操作需求判定 (needsHumanInput)', () => {
  it('remote 與 human 玩家在 playerAction / discard 階段均需真人輸入', () => {
    const baseState = startGame({
      playerConfigs: [
        { id: 'p0', name: '房主', kind: 'human', seat: 0 },
        { id: 'p1', name: '朋友', kind: 'remote', seat: 1 },
        { id: 'p2', name: '電腦1', kind: 'ai', seat: 2 },
        { id: 'p3', name: '電腦2', kind: 'ai', seat: 3 },
      ],
      skipPreview: true,
      startPlayerIndex: 1,
    })

    const stateAtDraw = play(baseState, { type: 'DEAL_DONE' })
    const stateAtAction = play(stateAtDraw, { type: 'DRAW' })
    expect(stateAtAction.phase).toBe('playerAction')
    expect(needsHumanInput(stateAtAction)).toBe(true)

    const stateAtDiscard = play(stateAtAction, { type: 'SKIP_YAKU' })
    expect(stateAtDiscard.phase).toBe('discard')
    expect(needsHumanInput(stateAtDiscard)).toBe(true)
  })

  it('AI 玩家在 discard 階段不需真人輸入', () => {
    const baseState = startGame({
      playerConfigs: [
        { id: 'p0', name: '房主', kind: 'human', seat: 0 },
        { id: 'p1', name: '朋友', kind: 'remote', seat: 1 },
        { id: 'p2', name: '電腦1', kind: 'ai', seat: 2 },
        { id: 'p3', name: '電腦2', kind: 'ai', seat: 3 },
      ],
      skipPreview: true,
      startPlayerIndex: 2,
    })

    const stateAtDraw = play(baseState, { type: 'DEAL_DONE' })
    const stateAtAction = play(stateAtDraw, { type: 'DRAW' })
    const stateAtDiscard = play(stateAtAction, { type: 'SKIP_YAKU' })
    expect(needsHumanInput(stateAtDiscard)).toBe(false)
  })
})
