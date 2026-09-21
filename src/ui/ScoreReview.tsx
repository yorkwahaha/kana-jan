/* eslint-disable react-refresh/only-export-components -- testable stage decision helpers */
import { useEffect, useMemo, useState } from 'react'
import { speechText, type KanaCard } from '../data/cards'
import { speakJapanese } from '../audio/speech'
import { playSfx } from '../audio/sfx'
import type { GameState, PlayerState } from '../engine/types'
import { computeRankings } from '../engine/scoring'
import { CardView } from './CardView'
import { tablePosition } from './seats'
import { SettlementArrows } from './SettlementArrows'
import type { Settings } from './settings'
import { settleMatch } from './profile'

interface Props {
  state: GameState
  settings: Settings
  mySeat?: number
  isGameOver?: boolean
  onFinish?: () => void
  onRestart?: () => void
  onLobby?: () => void
}

const RANK_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
}

export function profilePlayerForSeat(players: PlayerState[], mySeat: number): PlayerState | null {
  if (mySeat < 0) return null
  return (
    players.find((player) => player.seat === mySeat) ??
    players.find((player) => player.kind === 'human') ??
    players[0] ??
    null
  )
}

/** 1st 名次專屬煙火慶祝特效 (參照截圖右方煙火粒子與星芒) */
function Fireworks() {
  return (
    <div className="settlement-fireworks" aria-hidden="true">
      <svg viewBox="0 0 140 140" className="fireworks-svg">
        {/* 中心光暈 */}
        <circle cx="70" cy="70" r="18" fill="url(#firework-glow)" opacity="0.6" className="fw-center-glow" />

        {/* 放射狀白色火花線條 */}
        <g className="fw-rays" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round">
          <line x1="70" y1="46" x2="70" y2="28" />
          <line x1="87" y1="53" x2="100" y2="40" />
          <line x1="94" y1="70" x2="112" y2="70" />
          <line x1="87" y1="87" x2="100" y2="100" />
          <line x1="70" y1="94" x2="70" y2="112" />
          <line x1="53" y1="87" x2="40" y2="100" />
          <line x1="46" y1="70" x2="28" y2="70" />
          <line x1="53" y1="53" x2="40" y2="40" />
        </g>

        {/* 次級青藍放射線 */}
        <g className="fw-sub-rays" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round">
          <line x1="79" y1="48" x2="88" y2="36" />
          <line x1="92" y1="61" x2="104" y2="55" />
          <line x1="92" y1="79" x2="104" y2="85" />
          <line x1="79" y1="92" x2="88" y2="104" />
          <line x1="61" y1="92" x2="52" y2="104" />
          <line x1="48" y1="79" x2="36" y2="85" />
          <line x1="48" y1="61" x2="36" y2="55" />
          <line x1="61" y1="48" x2="52" y2="36" />
        </g>

        {/* 閃爍四角星芒 (✨) */}
        <path
          d="M 70,55 Q 70,70 55,70 Q 70,70 70,85 Q 70,70 85,70 Q 70,70 70,55 Z"
          fill="#ffffff"
          className="fw-sparkle-main"
        />
        <path
          d="M 108,35 Q 108,44 99,44 Q 108,44 108,53 Q 108,44 117,44 Q 108,44 108,35 Z"
          fill="#a5f3fc"
          className="fw-sparkle-sub1"
        />
        <path
          d="M 104,95 Q 104,102 97,102 Q 104,102 104,109 Q 104,102 111,102 Q 104,102 104,95 Z"
          fill="#fef08a"
          className="fw-sparkle-sub2"
        />
        <path
          d="M 32,32 Q 32,38 26,38 Q 32,38 32,44 Q 32,38 38,38 Q 32,38 32,32 Z"
          fill="#ffffff"
          className="fw-sparkle-sub3"
        />

        <defs>
          <radialGradient id="firework-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

interface RollingGoldItem {
  current: number
  isRolling: boolean
  justFinished: boolean
}

const PAYER_START_MS = 350
const PAYER_DURATION_MS = 650
const WINNER_START_MS = 1050
const WINNER_DURATION_MS = 750
export const SCORE_REVIEW_AUTO_ADVANCE_MS = 4200
export const GAME_OVER_TRANSFER_REVEAL_MS = 4200

export type SettlementPresentationStage = 'transfer' | 'summary'

export function settlementPresentationStage(input: {
  isGameOver: boolean
  transferCount: number
  elapsedMs: number
}): SettlementPresentationStage {
  if (!input.isGameOver) return 'transfer'
  if (input.transferCount <= 0) return 'summary'
  return input.elapsedMs >= GAME_OVER_TRANSFER_REVEAL_MS ? 'summary' : 'transfer'
}

export function settlementStageLayers(
  stage: SettlementPresentationStage,
  isGameOver: boolean,
  transferCount: number,
) {
  return {
    showArrows: stage === 'transfer' && transferCount > 0,
    showGameOverSummary: isGameOver && stage === 'summary',
  }
}

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x)
}

function useRollingGold(players: PlayerState[], deltas: Record<string, number>) {
  const hasTransfers = useMemo(() => Object.values(deltas).some((d) => d !== 0), [deltas])
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!hasTransfers) return
    let animId: number
    const startTime = performance.now()
    const maxDuration = 2200

    const step = (now: number) => {
      const diff = now - startTime
      setElapsed(diff)
      if (diff < maxDuration) {
        animId = requestAnimationFrame(step)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [hasTransfers, players, deltas])

  return useMemo(() => {
    const map: Record<string, RollingGoldItem> = {}
    for (const p of players) {
      const delta = deltas[p.id] ?? 0
      const target = p.gold
      const start = target - delta

      if (!hasTransfers || delta === 0) {
        map[p.id] = { current: target, isRolling: false, justFinished: false }
        continue
      }

      if (delta < 0) {
        // 失分方遞減滾動
        if (elapsed < PAYER_START_MS) {
          map[p.id] = { current: start, isRolling: false, justFinished: false }
        } else if (elapsed < PAYER_START_MS + PAYER_DURATION_MS) {
          const progress = easeOutQuad((elapsed - PAYER_START_MS) / PAYER_DURATION_MS)
          map[p.id] = {
            current: Math.round(start + delta * progress),
            isRolling: true,
            justFinished: false,
          }
        } else {
          map[p.id] = {
            current: target,
            isRolling: false,
            justFinished: elapsed < PAYER_START_MS + PAYER_DURATION_MS + 350,
          }
        }
      } else {
        // 得分贏家遞增滾動
        if (elapsed < WINNER_START_MS) {
          map[p.id] = { current: start, isRolling: false, justFinished: false }
        } else if (elapsed < WINNER_START_MS + WINNER_DURATION_MS) {
          const progress = easeOutQuad((elapsed - WINNER_START_MS) / WINNER_DURATION_MS)
          map[p.id] = {
            current: Math.round(start + delta * progress),
            isRolling: true,
            justFinished: false,
          }
        } else {
          map[p.id] = {
            current: target,
            isRolling: false,
            justFinished: elapsed < WINNER_START_MS + WINNER_DURATION_MS + 400,
          }
        }
      }
    }
    return map
  }, [hasTransfers, players, deltas, elapsed])
}

export function ScoreReview({
  state,
  settings,
  mySeat = 0,
  isGameOver = false,
  onFinish,
  onRestart,
  onLobby,
}: Props) {
  const pending = state.pendingScore
  const rankings = useMemo(() => state.rankings ?? computeRankings(state.players), [state.rankings, state.players])
  const [showVocabModal, setShowVocabModal] = useState(false)
  const transferCount = state.lastTransfers.length
  const [gameOverElapsedMs, setGameOverElapsedMs] = useState(0)

  const deltas = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of state.lastTransfers) {
      map[t.toId] = (map[t.toId] ?? 0) + t.amount
      map[t.fromId] = (map[t.fromId] ?? 0) - t.amount
    }
    return map
  }, [state.lastTransfers])

  const rollingGold = useRollingGold(state.players, deltas)

  // 對局結束時結算個人存檔資產（依自己的座位，且同一局只結算一次）
  useEffect(() => {
    if (!isGameOver) return
    const me = profilePlayerForSeat(state.players, mySeat)
    const myRank = rankings.find((r) => r.playerId === me?.id)
    if (!myRank || !me) return
    const matchId = `${state.seed}:${me.id}:${rankings.map((r) => `${r.playerId}=${r.gold}`).join(',')}`
    settleMatch(myRank.place, matchId)
  }, [isGameOver, rankings, state.players, state.seed, mySeat])

  // 音效播放（配合金幣飛行與籌碼滾動節奏）
  useEffect(() => {
    if (!pending && !isGameOver) return
    if (pending && settings.speech) {
      const first = pending.yaku.cards[0]
      if (first) void speakJapanese(speechText(first), true)
    }
    if (settings.sfx && (pending || state.lastTransfers.length > 0)) {
      const timers: number[] = []
      // 1. 失分方金幣出發
      timers.push(window.setTimeout(() => playSfx('coin', true), 250))

      // 2. 金幣抵達贏家，籌碼密集跳動
      timers.push(window.setTimeout(() => playSfx('coin', true), 1100))

      return () => {
        for (const t of timers) window.clearTimeout(t)
      }
    }
  }, [pending, isGameOver, state.lastTransfers.length, settings.speech, settings.sfx])

  // 非對局結束時，金幣畫面約 4.2 秒自動推進；對局結束時停在畫面不自動跳過
  useEffect(() => {
    if (isGameOver) return
    if (!pending) return
    const autoTimer = window.setTimeout(() => {
      onFinish?.()
    }, SCORE_REVIEW_AUTO_ADVANCE_MS)
    return () => window.clearTimeout(autoTimer)
  }, [isGameOver, pending, onFinish])

  // 對局結束且有讓渡時，先完整播放 4.2 秒轉帳畫面，再揭示結算摘要
  useEffect(() => {
    if (!isGameOver || transferCount === 0) {
      setGameOverElapsedMs(0)
      return
    }
    setGameOverElapsedMs(0)
    const revealTimer = window.setTimeout(() => {
      setGameOverElapsedMs(GAME_OVER_TRANSFER_REVEAL_MS)
    }, GAME_OVER_TRANSFER_REVEAL_MS)
    return () => window.clearTimeout(revealTimer)
  }, [isGameOver, transferCount])

  const stage = settlementPresentationStage({
    isGameOver,
    transferCount,
    elapsedMs: gameOverElapsedMs,
  })
  const { showArrows, showGameOverSummary } = settlementStageLayers(stage, isGameOver, transferCount)

  const placeOf = (id: string) => rankings.find((r) => r.playerId === id)?.place ?? 4
  const bankruptPlayer = state.players.find((p) => p.gold === 0)

  // 收集本局所有玩家完成牌型中的詞彙卡牌
  const vocabCards = useMemo(() => {
    const map = new Map<string, KanaCard>()
    for (const p of state.players) {
      for (const c of p.completed) {
        for (const card of c.yaku.cards) {
          if (card.cardType === 'vocabulary' && !map.has(card.vocabulary)) {
            map.set(card.vocabulary, card)
          }
        }
      }
    }
    return Array.from(map.values())
  }, [state.players])

  if (!pending && !isGameOver) return null

  return (
    <div
      className={`settlement-overlay ${isGameOver ? 'is-game-over' : ''} ${stage === 'summary' ? 'is-summary-stage' : 'is-transfer-stage'}`}
      data-settlement-stage={stage}
      onClick={isGameOver ? undefined : onFinish}
      aria-live="polite"
    >
      {/* 1. 桌面 4 方結算銘牌 (參照截圖：第一名右邊放煙火、失分方旁附帶短箭頭) */}
      <div className="settlement-badges-layer" onClick={(e) => e.stopPropagation()}>
        {state.players.map((player) => {
          const pos = tablePosition(player.seat, mySeat)
          const delta = deltas[player.id] ?? 0
          const place = placeOf(player.id)
          const isRank1 = place === 1
          const isHighlightWinner = isGameOver && isRank1
          const initial = player.name.slice(0, 1)

          const badgeClass = [
            'settlement-badge',
            `pos-${pos}`,
            `rank-${place}-badge`,
            isHighlightWinner ? 'is-winner' : '',
            !isHighlightWinner ? 'is-neutral' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div key={player.id} className={badgeClass}>
              {/* 第一名旁邊放煙火 */}
              {isHighlightWinner && <Fireworks />}

              {/* 頂部名稱與右上角頭像 */}
              <div className="settlement-badge-header">
                <span className="settlement-player-name" title={player.name}>
                  {player.name}
                </span>
                {pos === 'human' && <span className="settlement-human-tag">你</span>}
                <div className="settlement-badge-avatar" aria-hidden>
                  {initial}
                </div>
              </div>

              {/* 名次與分數 */}
              <div className="settlement-badge-body">
                <span className={`settlement-rank rank-${place}`}>
                  {RANK_LABELS[place] ?? `${place}th`}
                </span>

                <div className="settlement-badge-values">
                  {delta !== 0 && (
                    <div className={`settlement-delta ${delta > 0 ? 'delta-win' : 'delta-loss'}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </div>
                  )}
                  {(() => {
                    const roll = rollingGold[player.id] ?? {
                      current: player.gold,
                      isRolling: false,
                      justFinished: false,
                    }
                    const coinClass = [
                      'settlement-coins',
                      roll.isRolling ? 'is-rolling' : '',
                      roll.isRolling && delta > 0 ? 'rolling-win' : '',
                      roll.isRolling && delta < 0 ? 'rolling-loss' : '',
                      roll.justFinished && delta > 0 ? 'just-finished' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <div className={coinClass}>
                        <span className="coin-icon">🪙</span>
                        <span className="coin-amount">{roll.current}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. 參照圖三：立體帶狀指向箭頭與外圍金幣串（絕對不遮擋中央視窗，一目了然） */}
      {showArrows && (
        <SettlementArrows transfers={state.lastTransfers} players={state.players} mySeat={mySeat} />
      )}

      {/* 3. 中央區 (對局結束提示 與/或 成牌焦點區) */}
      <div className="settlement-center" onClick={(e) => e.stopPropagation()}>
        {/* 對局結束摘要：讓渡播完後才揭示，無讓渡則立刻顯示 */}
        {showGameOverSummary ? (
          <div className="game-over-center-banner">
            <h3 className="game-over-banner-text">
              {bankruptPlayer
                ? `${bankruptPlayer.name} 的點數已歸零，遊戲結束`
                : '牌庫已耗盡，遊戲結束'}
            </h3>

            {/* 若當次有和牌牌型，精簡標記 */}
            {pending && (
              <div className="game-over-winning-yaku">
                <span className="yaku-tag">和牌：{pending.yaku.label}</span>
                <span className="yaku-score">+{pending.yaku.totalScore} 分</span>
              </div>
            )}

            {/* 操作按鈕：再玩一次 與 回到大廳 */}
            <div className="game-over-actions">
              <button
                type="button"
                className="btn primary lg game-over-btn-restart"
                onClick={onRestart}
              >
                🔄 再玩一次
              </button>
              <button
                type="button"
                className="btn lg game-over-btn-lobby"
                onClick={onLobby}
              >
                🏠 回到大廳
              </button>
              {vocabCards.length > 0 && (
                <button
                  type="button"
                  className="btn sm game-over-btn-vocab"
                  onClick={() => setShowVocabModal((v) => !v)}
                >
                  📖 本局單字 ({vocabCards.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 一般回合結算：顯示和牌牌面，移除橫幅與按鈕以達最精簡視覺 */
          pending && (
            <>
              <div className="settlement-cards-row">
                {pending.yaku.cards.map((card) => (
                  <CardView
                    key={card.id}
                    card={card}
                    size="md"
                    revealMeaning
                    showHints={{ ...settings, showRomaji: true }}
                  />
                ))}
              </div>

              {pending.yaku.cards.some((c) => c.cardType === 'vocabulary') && (
                <p className="settlement-meaning">
                  {pending.yaku.cards
                    .filter((c) => c.cardType === 'vocabulary')
                    .map((c) => `${c.vocabulary}（${c.meaning}）`)
                    .join(' · ')}
                </p>
              )}
            </>
          )
        )}
      </div>

      {/* 學習單字檢視彈窗 (可選) */}
      {showVocabModal && vocabCards.length > 0 && (
        <div
          className="vocab-review-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="本局學會單字"
        >
          <div className="vocab-review-header">
            <h4>📖 本局學會單字（點擊聆聽發音）</h4>
            <button
              type="button"
              className="btn sm"
              onClick={() => setShowVocabModal(false)}
            >
              關閉
            </button>
          </div>
          <div className="vocab-review-grid">
            {vocabCards.map((card) => (
              <div
                key={card.id}
                className="vocab-card-item"
                onClick={() => void speakJapanese(speechText(card), true)}
                title={`點擊發音：${card.vocabulary}`}
              >
                <CardView
                  card={card}
                  size="md"
                  revealMeaning
                  showWrittenForm
                  showHints={{ showRomaji: true }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
