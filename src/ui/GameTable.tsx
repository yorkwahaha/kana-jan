import { useEffect, useState } from 'react'
import { displayGlyph } from '../data/cards'
import {
  availableYakuFor,
  currentPlayer,
  currentReactionYakus,
  reactionActor,
} from '../engine/game'
import { findNearYaku } from '../engine/yaku'
import type { GameState, YakuCandidate } from '../engine/types'
import type { Settings } from './settings'
import { CardView } from './CardView'
import { EventLog } from './EventLog'
import { Mascot } from './Mascot'
import { PlayerPanel } from './PlayerPanel'

interface Props {
  state: GameState
  settings: Settings
  selectedCardId: string | null
  hoverYaku: YakuCandidate | null
  locked: boolean
  onSelectCard: (id: string) => void
  onConfirmDiscard: () => void
  onChooseYaku: (id: string) => void
  onSkipYaku: () => void
  onClaim: (yakuId: string) => void
  onPassClaim: () => void
  onHoverYaku: (yaku: YakuCandidate | null) => void
  onOpenSettings: () => void
  onOpenHelp: () => void
}

function phaseText(state: GameState): string {
  const name = currentPlayer(state).name
  switch (state.phase) {
    case 'dealing':
      return '正在發牌…'
    case 'playerDraw':
      return `${name} 抽牌中`
    case 'playerAction':
      return `${name} 選擇是否結算牌型`
    case 'discard':
      return `${name} 選擇要丟出的牌`
    case 'reaction':
      return `${reactionActor(state)?.name ?? ''} 可以宣告もらった？`
    case 'pronunciation':
      return '發音挑戰'
    case 'scoring':
      return '結算金幣'
    case 'refill':
      return '補牌中'
    case 'nextTurn':
      return '準備下一回合'
    case 'gameOver':
      return '對局結束'
    default:
      return ''
  }
}

export function GameTable({
  state,
  settings,
  selectedCardId,
  hoverYaku,
  locked,
  onSelectCard,
  onConfirmDiscard,
  onChooseYaku,
  onSkipYaku,
  onClaim,
  onPassClaim,
  onHoverYaku,
  onOpenSettings,
  onOpenHelp,
}: Props) {
  const human = state.players[0]!
  const p1 = state.players[1]!
  const p2 = state.players[2]!
  const p3 = state.players[3]!
  const current = currentPlayer(state)
  const humanTurn = current.id === human.id
  const yakus = humanTurn && state.phase === 'playerAction' ? availableYakuFor(state, human.id) : []
  const reactionYakus =
    state.phase === 'reaction' && reactionActor(state)?.id === human.id ? currentReactionYakus(state) : []
  const nearIds = new Set(
    settings.highlightNear && settings.learningHints
      ? findNearYaku(human.hand).flatMap((n) => n.cardIds)
      : [],
  )
  const yakuHighlight = new Set((hoverYaku?.cards ?? []).map((c) => c.id))
  const canDiscard = state.phase === 'discard' && humanTurn && !locked
  const thinking = current.kind === 'ai' && ['playerAction', 'discard', 'playerDraw', 'reaction'].includes(state.phase)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    if (state.lastFx === 'dekita' || state.lastFx === 'moratta') {
      setBanner(state.lastFx)
      const t = window.setTimeout(() => setBanner(null), settings.animation === 'off' ? 200 : 1000)
      return () => window.clearTimeout(t)
    }
    return
  }, [state.lastFx, state.eventSeq, settings.animation])

  return (
    <div className={`table-shell anim-${settings.animation}`}>
      <div className="petals" aria-hidden />
      <header className="topbar">
        <div>
          <p className="eyebrow">かなジャン！</p>
          <h1>Kana Jan</h1>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={onOpenHelp}>
            玩法說明
          </button>
          <button className="btn ghost" onClick={onOpenSettings}>
            設定
          </button>
        </div>
      </header>

      <div className="table-grid">
        <div className="area-top">
          <PlayerPanel player={p1} active={current.id === p1.id} thinking={thinking && current.id === p1.id} position="top" />
        </div>
        <div className="area-left">
          <PlayerPanel player={p2} active={current.id === p2.id} thinking={thinking && current.id === p2.id} position="left" />
        </div>
        <div className="area-center">
          <div className="felt">
            <Mascot mood={state.lastFx === 'dekita' || state.lastFx === 'moratta' ? 'cheer' : thinking ? 'think' : 'idle'} />
            <div className="bonus-banner">
              <span>本局 Bonus</span>
              <strong>{state.bonus.label} ＋{state.bonus.points}</strong>
              <small>{state.bonus.detail}</small>
            </div>
            <div className="center-piles">
              <div className="deck-pile">
                <div className="kana-card face-down size-md">
                  <span className="card-back-kana">あ</span>
                </div>
                <span>牌庫 {state.deck.length}</span>
              </div>
              <div className="discard-pile">
                {state.currentDiscard ? (
                  <CardView card={state.currentDiscard} size="md" showHints={settings} />
                ) : (
                  <div className="discard-empty">棄牌</div>
                )}
                <span>
                  {state.currentDiscard ? `最新：${displayGlyph(state.currentDiscard)}` : '尚無棄牌'}
                </span>
              </div>
            </div>
            <p className="turn-status">{phaseText(state)}</p>
            {banner === 'dekita' && <div className="fx-banner dekita">できた！</div>}
            {banner === 'moratta' && <div className="fx-banner moratta">もらった！</div>}
            {state.lastTransfers.length > 0 && (
              <div className="coin-fx" aria-hidden>
                {state.lastTransfers.map((t) => (
                  <span key={`${t.fromId}-${t.toId}-${t.amount}`}>🪙 {t.amount}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="area-right">
          <PlayerPanel player={p3} active={current.id === p3.id} thinking={thinking && current.id === p3.id} position="right" />
        </div>
        <div className="area-human">
          <PlayerPanel player={human} active={humanTurn} position="human" />
          {yakus.length > 0 && (
            <div className="action-row">
              <p>有可完成的牌型，請選擇一組結算，或暫不結算繼續收集。</p>
              {yakus.map((y) => (
                <button
                  key={y.id}
                  className="btn yaku"
                  disabled={locked}
                  onMouseEnter={() => onHoverYaku(y)}
                  onMouseLeave={() => onHoverYaku(null)}
                  onFocus={() => onHoverYaku(y)}
                  onBlur={() => onHoverYaku(null)}
                  onClick={() => onChooseYaku(y.id)}
                >
                  できた！{y.label}（{y.totalScore} 分）
                </button>
              ))}
              <button className="btn" disabled={locked} onClick={onSkipYaku}>
                暫不結算
              </button>
            </div>
          )}
          {reactionYakus.length > 0 && (
            <div className="action-row">
              <p>你可以用這張棄牌完成牌型！</p>
              {reactionYakus.map((y) => (
                <button
                  key={y.id}
                  className="btn yaku"
                  disabled={locked}
                  onMouseEnter={() => onHoverYaku(y)}
                  onMouseLeave={() => onHoverYaku(null)}
                  onClick={() => onClaim(y.id)}
                >
                  もらった！{y.label}（{y.totalScore} 分）
                </button>
              ))}
              <button className="btn" disabled={locked} onClick={onPassClaim}>
                讓過
              </button>
            </div>
          )}
          {canDiscard && (
            <div className="action-row">
              <p>請點選一張手牌，再按確認棄牌。棄牌後無法收回。</p>
              <button className="btn primary" disabled={!selectedCardId || locked} onClick={onConfirmDiscard}>
                確認棄牌
                {selectedCardId ? `：${displayGlyph(human.hand.find((c) => c.id === selectedCardId)!)}` : ''}
              </button>
            </div>
          )}
          <div className="hand-row">
            {human.hand.map((card) => (
              <CardView
                key={card.id}
                card={card}
                size="lg"
                selected={selectedCardId === card.id}
                hinted={nearIds.has(card.id)}
                yakuPart={yakuHighlight.has(card.id)}
                showHints={settings}
                disabled={locked}
                onClick={() => {
                  if (canDiscard) onSelectCard(card.id)
                }}
              />
            ))}
          </div>
        </div>
        <EventLog state={state} />
      </div>
    </div>
  )
}
