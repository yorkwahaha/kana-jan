import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ScoreReview } from './ScoreReview'
import type { GameState } from '../engine/types'
import { DEFAULT_SETTINGS } from './settings'
import { buildCard } from '../data/cards'
import { KANA_SOUNDS } from '../data/kana'
import { DEFAULT_BONUS } from '../data/bonuses'

function makeMockState(overrides?: Partial<GameState>): GameState {
  const niSound = KANA_SOUNDS.find((s) => s.sound === 'ni')!
  const kuSound = KANA_SOUNDS.find((s) => s.sound === 'ku')!
  const cardNi = buildCard(niSound, 'vocabulary')
  const cardKu = buildCard(kuSound, 'vocabulary')

  return {
    currentPlayerIndex: 0,
    startPlayerIndex: 0,
    seed: 1,
    rngState: 1,
    phase: 'scoring',
    bonus: DEFAULT_BONUS,
    lessonId: 'basic-vowels',
    activeRows: ['a', 'ka', 'sa', 'ta', 'na'],
    deck: [],
    discardPile: [],
    currentDiscard: null,
    reactionOptions: [],
    reactionIndex: 0,
    events: [],
    eventSeq: 0,
    turnNumber: 5,
    lastDrawnCardId: null,
    gameOverReason: null,
    rankings: null,
    lastFx: null,
    lastDiscardPlayerId: null,
    players: [
      { id: 'p0', name: '小春', kind: 'human', seat: 0, aiDifficulty: 'normal', gold: 920, score: 0, hand: [], discards: [], completed: [] },
      { id: 'p1', name: 'さくら', kind: 'ai', seat: 1, aiDifficulty: 'normal', gold: 920, score: 0, hand: [], discards: [], completed: [] },
      { id: 'p2', name: 'ひなた', kind: 'ai', seat: 2, aiDifficulty: 'normal', gold: 1240, score: 0, hand: [], discards: [], completed: [] },
      { id: 'p3', name: 'あおい', kind: 'ai', seat: 3, aiDifficulty: 'normal', gold: 920, score: 0, hand: [], discards: [], completed: [] },
    ],
    pendingScore: {
      playerId: 'p2',
      source: 'tsumo',
      yaku: {
        id: 'word-niku',
        kind: 'word',
        label: '組字 にく',
        word: 'にく',
        baseScore: 240,
        typeBonus: 0,
        missionBonus: 0,
        totalScore: 240,
        cards: [cardNi, cardKu],
      },
    },
    lastTransfers: [
      { fromId: 'p0', toId: 'p2', amount: 80 },
      { fromId: 'p1', toId: 'p2', amount: 80 },
      { fromId: 'p3', toId: 'p2', amount: 80 },
    ],
    comboCount: 0,
    turnOwnerIndex: 0,
    ...overrides,
  }
}

describe('ScoreReview (金幣讓渡畫面精簡化與籌碼跳動)', () => {
  it('does NOT render 繼續對局 button in regular round settlement', () => {
    const state = makeMockState()
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )

    expect(html).not.toContain('繼續對局')
    expect(html).not.toContain('settlement-continue-btn')
    expect(html).not.toContain('settlement-auto-timer')
  })

  it('does NOT render 自摸 banner or 組字+240 yaku header', () => {
    const state = makeMockState()
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )

    // 橫條 banner 已移除
    expect(html).not.toContain('settlement-deal-banner')
    expect(html).not.toContain('deal-tsumo')
    expect(html).not.toContain('deal-ron')
    expect(html).not.toContain('三家分攤')

    // 中央役種文字與分數標頭已移除
    expect(html).not.toContain('settlement-yaku-header')
    expect(html).not.toContain('settlement-yaku-title')
    expect(html).not.toContain('settlement-yaku-score')
  })

  it('renders winning hand cards in the center cards row', () => {
    const state = makeMockState()
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )

    // 保留中央和牌牌面展示
    expect(html).toContain('settlement-cards-row')
    expect(html).toContain('kana-card')
    expect(html).toContain('に')
    expect(html).toContain('く')
  })

  it('displays pre-settlement starting gold initially so numbers can roll', () => {
    const state = makeMockState()
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )

    // 初始渲染時尚未推進動畫，籌碼應為結算前初始金幣（1000 點），而非立即顯示結算後結果 (1240 / 920)
    // 贏家 p2: 1240 - (+240) = 1000
    // 輸家 p0: 920 - (-80) = 1000
    expect(html).toContain('1000')
    // 仍包含名次與變動 delta
    expect(html).toContain('+240')
    expect(html).toContain('-80')
  })

  it('renders restart and lobby buttons when isGameOver is true', () => {
    const state = makeMockState({ gameOverReason: 'gold' })
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} isGameOver={true} />,
    )

    expect(html).toContain('game-over-center-banner')
    expect(html).toContain('再玩一次')
    expect(html).toContain('回到大廳')
  })
})
