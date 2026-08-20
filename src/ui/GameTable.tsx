import { useState } from 'react'
import { displayGlyph } from '../data/cards'
import {
  availableYakuFor,
  currentPlayer,
  currentReactionYakus,
  reactionActor,
} from '../engine/game'
import { computeRankings } from '../engine/scoring'
import { findNearYaku } from '../engine/yaku'
import type { GameState, YakuCandidate } from '../engine/types'
import type { Settings } from './settings'
import { tablePosition } from './seats'
import { CardView } from './CardView'
import { CenterBoard } from './CenterBoard'
import { DiscardRiver } from './DiscardRiver'
import { EventLog } from './EventLog'
import { Mascot } from './Mascot'
import { MeldArea } from './MeldArea'
import { SeatHud } from './SeatHud'

interface Props {
  state: GameState
  settings: Settings
  selectedCardId: string | null
  hoverYaku: YakuCandidate | null
  locked: boolean
  onSelectCard: (id: string) => void
  onChooseYaku: (id: string) => void
  onSkipYaku: () => void
  onClaim: (yakuId: string) => void
  onPassClaim: () => void
  onHoverYaku: (yaku: YakuCandidate | null) => void
  onOpenSettings: () => void
  onOpenHelp: () => void
  onOpenCatalog: () => void
}

function phaseText(state: GameState): string {
  if (state.phase === 'preview') return '查看本次登場的行'
  const current = currentPlayer(state)
  const discarder = state.players.find((p) => p.id === state.lastDiscardPlayerId)
  const glyph = state.currentDiscard ? displayGlyph(state.currentDiscard) : ''
  switch (state.phase) {
    case 'dealing':
      return '正在發牌…'
    case 'playerDraw':
      return `${current.name} 抽牌中`
    case 'playerAction':
      return `${current.name} 選擇是否結算牌型`
    case 'discard':
      return `${current.name} 正在出牌`
    case 'reaction': {
      const actor = reactionActor(state)
      if (actor && discarder && glyph) {
        return `${actor.name} 要不要抄 ${discarder.name} 的「${glyph}」？`
      }
      return `${actor?.name ?? ''} 可以宣告もらった？`
    }
    case 'review':
      return '複習剛才的牌型'
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

function fanCount(n: number) {
  return Math.min(n, 8)
}

export function GameTable({
  state,
  settings,
  selectedCardId,
  hoverYaku,
  locked,
  onSelectCard,
  onChooseYaku,
  onSkipYaku,
  onClaim,
  onPassClaim,
  onHoverYaku,
  onOpenSettings,
  onOpenHelp,
  onOpenCatalog,
}: Props) {
  const human = state.players[0]!
  const left = state.players[1]!
  const top = state.players[2]!
  const right = state.players[3]!
  const current = currentPlayer(state)
  const actor = state.phase === 'reaction' ? (reactionActor(state) ?? current) : current
  const discarder = state.players.find((p) => p.id === state.lastDiscardPlayerId)
  const humanTurn = current.id === human.id
  const yakus = humanTurn && state.phase === 'playerAction' ? availableYakuFor(state, human.id) : []
  const reactionYakus =
    state.phase === 'reaction' && reactionActor(state)?.id === human.id ? currentReactionYakus(state) : []
  const nearIds = new Set(
    settings.highlightNear && settings.learningHints
      ? findNearYaku(human.hand, state.activeRows).flatMap((n) => n.cardIds)
      : [],
  )
  const yakuHighlight = new Set((hoverYaku?.cards ?? []).map((c) => c.id))
  const canDiscard = state.phase === 'discard' && humanTurn && !locked
  const thinking =
    actor.kind === 'ai' && ['playerAction', 'discard', 'playerDraw', 'reaction'].includes(state.phase)
  const rankings = computeRankings(state.players)
  const placeOf = (id: string) => rankings.find((r) => r.playerId === id)?.place ?? 4
  const [showLog, setShowLog] = useState(false)
  const hudFor = (player: typeof human) => ({
    player,
    place: placeOf(player.id),
    position: tablePosition(player.seat),
    active: actor.id === player.id && state.phase !== 'reaction',
    thinking: thinking && actor.id === player.id,
    discarder: state.phase === 'reaction' && discarder?.id === player.id,
    claiming: state.phase === 'reaction' && actor.id === player.id,
  })

  return (
    <div className={`table-shell anim-${settings.animation}`}>
      <button className="chrome-fab top-left" onClick={onOpenHelp} aria-label="玩法說明">
        説
      </button>
      <p className="table-prompt">高點を取れ</p>
      <button className="chrome-fab top-right" onClick={onOpenSettings} aria-label="設定">
        設
      </button>

      <div className="felt-oval">
        <p className="clockwise-hint" aria-hidden>
          出牌方向 ↻
        </p>
        <SeatHud {...hudFor(top)} />
        <SeatHud {...hudFor(left)} />
        <SeatHud {...hudFor(right)} />

        <div className="hand-fan pos-top" data-hand-origin="top" aria-hidden>
          {Array.from({ length: fanCount(top.hand.length) }).map((_, i) => (
            <i key={i} className="mini-back" />
          ))}
        </div>
        <div className="hand-fan pos-left" data-hand-origin="left" aria-hidden>
          {Array.from({ length: fanCount(left.hand.length) }).map((_, i) => (
            <i key={i} className="mini-back" />
          ))}
        </div>
        <div className="hand-fan pos-right" data-hand-origin="right" aria-hidden>
          {Array.from({ length: fanCount(right.hand.length) }).map((_, i) => (
            <i key={i} className="mini-back" />
          ))}
        </div>

        <MeldArea player={top} position="top" />
        <MeldArea player={left} position="left" />
        <MeldArea player={right} position="right" />
        <MeldArea player={human} position="human" />

        <DiscardRiver player={top} position="top" liveCardId={state.currentDiscard?.id} settings={settings} />
        <DiscardRiver player={left} position="left" liveCardId={state.currentDiscard?.id} settings={settings} />
        <DiscardRiver player={right} position="right" liveCardId={state.currentDiscard?.id} settings={settings} />
        <DiscardRiver player={human} position="human" liveCardId={state.currentDiscard?.id} settings={settings} />

        <CenterBoard state={state} settings={settings} />
        <p className="turn-status">{phaseText(state)}</p>

        <div className="human-on-table">
          <div className="human-side">
            <Mascot mood={state.lastFx === 'dekita' || state.lastFx === 'moratta' ? 'cheer' : thinking ? 'think' : 'idle'} />
            <SeatHud {...hudFor(human)} />
          </div>
          <div className="human-main">
            {yakus.length > 0 && (
              <div className="action-bar">
                <p>有可完成的牌型。選一組結算，或暫不結算繼續收集。</p>
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
              <div className="action-bar">
                <p>
                  {discarder ? `${discarder.name} 丟出了「${state.currentDiscard ? displayGlyph(state.currentDiscard) : ''}」。` : ''}
                  你要抄走這張牌來完成牌型嗎？
                </p>
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
            <div className="hand-row" data-hand-origin="human">
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
        </div>
      </div>

      <div className="table-chrome-br">
        <button className="chrome-fab" onClick={onOpenCatalog} aria-label="五十音圖鑑">
          図
        </button>
        <button className="chrome-fab" onClick={() => setShowLog((v) => !v)} aria-label="對局記錄">
          記
        </button>
      </div>

      {showLog && (
        <div className="log-drawer">
          <EventLog state={state} />
        </div>
      )}
    </div>
  )
}
