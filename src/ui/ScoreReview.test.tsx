import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import {
  GAME_OVER_TRANSFER_REVEAL_MS,
  SCORE_REVIEW_AUTO_ADVANCE_MS,
  ScoreReview,
  profilePlayerForSeat,
  scoreReviewAutoAdvanceMs,
  settlementPresentationStage,
  settlementStageLayers,
} from './ScoreReview'
import type { GameState } from '../engine/types'
import { DEFAULT_SETTINGS } from './settings'
import { buildCard } from '../data/cards'
import { KANA_SOUNDS } from '../data/kana'
import { DEFAULT_BONUS } from '../data/bonuses'

it('和牌畫面可設定 4 秒、8 秒或手動跳過', () => {
  expect(SCORE_REVIEW_AUTO_ADVANCE_MS).toBe(4000)
  expect(scoreReviewAutoAdvanceMs('4s')).toBe(4000)
  expect(scoreReviewAutoAdvanceMs('8s')).toBe(8000)
  expect(scoreReviewAutoAdvanceMs('manual')).toBeNull()
  expect(GAME_OVER_TRANSFER_REVEAL_MS).toBe(4200)
})

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
        id: 'same-sound-ni',
        kind: 'sameSound',
        label: 'に同音組',
        sound: 'ni',
        baseScore: 120,
        typeBonus: 0,
        missionBonus: 0,
        totalScore: 120,
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
  it('觀戰者不會套用任何座位的個人戰績', () => {
    expect(profilePlayerForSeat(makeMockState().players, -1)).toBeNull()
  })

  it('does NOT render 繼續對局 button in regular round settlement', () => {
    const state = makeMockState()
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )

    expect(html).not.toContain('繼續對局')
    expect(html).not.toContain('settlement-continue-btn')
    expect(html).not.toContain('settlement-auto-timer')
  })

  it('手動停駐模式顯示明確的繼續對局按鈕', () => {
    const html = renderToString(
      <ScoreReview
        state={makeMockState()}
        settings={{ ...DEFAULT_SETTINGS, winScreenHold: 'manual' }}
        mySeat={0}
      />,
    )
    expect(html).toContain('settlement-continue-btn')
    expect(html).toContain('繼續對局')
  })

  it('does NOT render 自摸 banner or yaku header', () => {
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

  it('keeps all player panels neutral during an in-game settlement', () => {
    const html = renderToString(
      <ScoreReview state={makeMockState()} settings={DEFAULT_SETTINGS} mySeat={0} />,
    )

    expect(html).not.toContain('is-winner')
    expect(html).not.toContain('is-payer')
    expect(html).not.toContain('settlement-fireworks')
    expect(html.match(/is-neutral/g)).toHaveLength(4)
  })

  it('reserves blue first-place emphasis and fireworks for game over', () => {
    const html = renderToString(
      <ScoreReview
        state={makeMockState({ gameOverReason: 'gold', lastTransfers: [] })}
        settings={DEFAULT_SETTINGS}
        mySeat={0}
        isGameOver={true}
      />,
    )

    expect(html).toContain('is-winner')
    expect(html).toContain('settlement-fireworks')
    expect(html).not.toContain('is-payer')
  })

  it('renders restart and lobby buttons immediately when game-over has no transfers', () => {
    const base = makeMockState()
    const state = makeMockState({
      gameOverReason: 'gold',
      lastTransfers: [],
      players: base.players.map((player, index) => index === 0 ? { ...player, gold: 0 } : player),
    })
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} isGameOver={true} />,
    )

    expect(html).toContain('data-settlement-stage="summary"')
    expect(html).toContain('game-over-center-banner')
    expect(html).toContain('再玩一次')
    expect(html).toContain('回到大廳')
    expect(html).not.toContain('settlement-arrows-layer')
    expect(html).toContain('點數已歸零')
    expect(html).not.toContain('分數已歸零')
  })

  it('keeps transfer arrows and withholds the game-over banner during the 4200ms transfer stage', () => {
    const state = makeMockState({ gameOverReason: 'gold' })
    const html = renderToString(
      <ScoreReview state={state} settings={DEFAULT_SETTINGS} mySeat={0} isGameOver={true} />,
    )

    expect(html).toContain('data-settlement-stage="transfer"')
    expect(html).toContain('settlement-arrows-layer')
    expect(html).not.toContain('game-over-center-banner')
    expect(html).not.toContain('再玩一次')
    expect(html).toContain('settlement-badge')
    expect(html).toContain('settlement-rank')
  })

  it('客端結算畫面標示等待房主，且遮罩不可點擊繼續', () => {
    const html = renderToString(
      <ScoreReview state={makeMockState()} settings={DEFAULT_SETTINGS} mySeat={0} canFinish={false} />,
    )
    expect(html).toContain('等待房主繼續')
    expect(html).toContain('is-waiting-host')
  })

  it('牌庫耗盡時依 gameOverReason 顯示終局原因', () => {
    const html = renderToString(
      <ScoreReview
        state={makeMockState({ gameOverReason: 'deck', lastTransfers: [] })}
        settings={DEFAULT_SETTINGS}
        mySeat={0}
        isGameOver={true}
      />,
    )
    expect(html).toContain('牌庫已耗盡')
    expect(html).not.toContain('點數已歸零')
  })

  it('treats transfer and summary layers as mutually exclusive around the 4200ms reveal', () => {
    expect(GAME_OVER_TRANSFER_REVEAL_MS).toBe(4200)

    const transferStage = settlementPresentationStage({
      isGameOver: true,
      transferCount: 3,
      elapsedMs: 0,
    })
    const lateTransfer = settlementPresentationStage({
      isGameOver: true,
      transferCount: 3,
      elapsedMs: 4199,
    })
    const summaryStage = settlementPresentationStage({
      isGameOver: true,
      transferCount: 3,
      elapsedMs: GAME_OVER_TRANSFER_REVEAL_MS,
    })
    const noTransfer = settlementPresentationStage({
      isGameOver: true,
      transferCount: 0,
      elapsedMs: 0,
    })
    const normalRound = settlementPresentationStage({
      isGameOver: false,
      transferCount: 3,
      elapsedMs: 9000,
    })

    expect(transferStage).toBe('transfer')
    expect(lateTransfer).toBe('transfer')
    expect(summaryStage).toBe('summary')
    expect(noTransfer).toBe('summary')
    expect(normalRound).toBe('transfer')

    const transferLayers = settlementStageLayers(transferStage, true, 3)
    const summaryLayers = settlementStageLayers(summaryStage, true, 3)
    const emptyLayers = settlementStageLayers(noTransfer, true, 0)

    expect(transferLayers.showArrows).toBe(true)
    expect(transferLayers.showGameOverSummary).toBe(false)
    expect(summaryLayers.showArrows).toBe(false)
    expect(summaryLayers.showGameOverSummary).toBe(true)
    expect(emptyLayers.showArrows).toBe(false)
    expect(emptyLayers.showGameOverSummary).toBe(true)
    expect(summaryLayers.showArrows && summaryLayers.showGameOverSummary).toBe(false)
  })
})
