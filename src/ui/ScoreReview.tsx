import { useEffect, useMemo } from 'react'
import { speechText } from '../data/cards'
import { speakJapanese } from '../audio/speech'
import { playSfx } from '../audio/sfx'
import type { GameState } from '../engine/types'
import { computeRankings } from '../engine/scoring'
import { CardView } from './CardView'
import { tablePosition } from './seats'
import { SettlementArrows } from './SettlementArrows'
import type { Settings } from './settings'

interface Props {
  state: GameState
  settings: Settings
  mySeat?: number
  onFinish: () => void
}

const RANK_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
}

export function ScoreReview({ state, settings, mySeat = 0, onFinish }: Props) {
  const pending = state.pendingScore
  const rankings = useMemo(() => computeRankings(state.players), [state.players])

  const deltas = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of state.lastTransfers) {
      map[t.toId] = (map[t.toId] ?? 0) + t.amount
      map[t.fromId] = (map[t.fromId] ?? 0) - t.amount
    }
    return map
  }, [state.lastTransfers])

  useEffect(() => {
    if (!pending) return
    if (settings.speech) {
      const first = pending.yaku.cards[0]
      if (first) void speakJapanese(speechText(first), true)
    }
    if (settings.sfx) {
      playSfx('coin', true)
      const t1 = setTimeout(() => playSfx('coin', true), 300)
      const t2 = setTimeout(() => playSfx('coin', true), 600)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [pending, settings.speech, settings.sfx])

  if (!pending) return null

  const placeOf = (id: string) => rankings.find((r) => r.playerId === id)?.place ?? 4

  const singleTransfer = state.lastTransfers.length === 1 ? state.lastTransfers[0] : null

  return (
    <div className="settlement-overlay" onClick={onFinish} aria-live="polite">
      {/* 1. 桌面 4 方結算銘牌 (參照圖二、圖三：上下左右四方位) */}
      <div className="settlement-badges-layer" onClick={(e) => e.stopPropagation()}>
        {state.players.map((player) => {
          const pos = tablePosition(player.seat, mySeat)
          const delta = deltas[player.id] ?? 0
          const isWinner = player.id === pending.playerId
          const isPayer = delta < 0
          const place = placeOf(player.id)
          const initial = player.name.slice(0, 1)

          const badgeClass = [
            'settlement-badge',
            `pos-${pos}`,
            isWinner ? 'is-winner' : '',
            isPayer ? 'is-payer' : '',
            !isWinner && !isPayer ? 'is-neutral' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div key={player.id} className={badgeClass}>
              <div className="settlement-badge-avatar" aria-hidden>
                {initial}
              </div>
              <div className="settlement-badge-header">
                <span className="settlement-player-name">{player.name}</span>
                {pos === 'human' && <span className="settlement-human-tag">你</span>}
              </div>

              <div className="settlement-badge-body">
                {isWinner && delta > 0 && (
                  <div className="settlement-delta delta-win">＋{delta}</div>
                )}
                {isPayer && (
                  <div className="settlement-delta delta-loss">{delta}</div>
                )}
                {!isWinner && !isPayer && (
                  <div className="settlement-delta delta-neutral" />
                )}
              </div>

              <div className="settlement-badge-footer">
                <span className={`settlement-rank rank-${place}`}>
                  {RANK_LABELS[place] ?? `${place}th`}
                </span>
                <span className="settlement-coins">🟡 {player.gold}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. 指向性立體粗紅箭頭 (付款方 -> 贏家，放槍單條、自摸三條匯聚) */}
      <SettlementArrows transfers={state.lastTransfers} players={state.players} mySeat={mySeat} />

      {/* 3. 中央焦點成牌區 (役種名 + 分數 + 卡牌一字排開 + 繼續對局按鈕) */}
      <div className="settlement-center" onClick={(e) => e.stopPropagation()}>
        {/* 放槍 / 自摸 狀態橫幅提示 */}
        {singleTransfer && (
          <div className="settlement-deal-banner deal-ron">
            <span className="deal-tag ron">⚡ 放槍</span>
            <span className="deal-payer">
              {state.players.find((p) => p.id === singleTransfer.fromId)?.name}
            </span>
            <span className="deal-arrow">➔</span>
            <span className="deal-winner">
              {state.players.find((p) => p.id === singleTransfer.toId)?.name}
            </span>
            <span className="deal-action">和牌</span>
          </div>
        )}
        {state.lastTransfers.length > 1 && (
          <div className="settlement-deal-banner deal-tsumo">
            <span className="deal-tag tsumo">🌟 自摸</span>
            <span className="deal-winner">
              {state.players.find((p) => p.id === pending.playerId)?.name}
            </span>
            <span className="deal-action">和牌（三家支付）</span>
          </div>
        )}

        <div className="settlement-yaku-header">
          <span className="settlement-yaku-title">{pending.yaku.label}</span>
          <span className="settlement-yaku-score">+{pending.yaku.totalScore}</span>
        </div>

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

        <button
          className="btn primary lg settlement-continue-btn"
          onClick={onFinish}
          autoFocus
        >
          繼續對局
        </button>
      </div>
    </div>
  )
}
