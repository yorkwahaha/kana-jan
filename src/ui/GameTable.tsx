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
import { playersByPerspective, tablePosition } from './seats'
import { CardView } from './CardView'
import { CenterBoard } from './CenterBoard'
import { DiscardRiver } from './DiscardRiver'
import { EventLog } from './EventLog'
import { MeldArea } from './MeldArea'
import { SeatHud } from './SeatHud'
import { TurnTimer } from './TurnTimer'

interface Props {
  state: GameState
  settings: Settings
  mySeat?: number
  selectedCardId: string | null
  hoverYaku: YakuCandidate | null
  locked: boolean
  turnTimer?: {
    active: boolean
    seconds: number
    turnKey: string | number
    onTimeout: () => void
  }
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

function fanCount(n: number) {
  return Math.min(n, 8)
}

export function GameTable({
  state,
  settings,
  mySeat = 0,
  selectedCardId,
  hoverYaku,
  locked,
  turnTimer,
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
  const perspective = playersByPerspective(state.players, mySeat)
  const human = perspective.human
  const left = perspective.left
  const top = perspective.top
  const right = perspective.right
  const current = currentPlayer(state)
  const actor = state.phase === 'reaction' ? (reactionActor(state) ?? current) : current
  const actingPos = tablePosition(actor.seat, mySeat)
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
    position: tablePosition(player.seat, mySeat),
    active: actor.id === player.id && state.phase !== 'reaction',
    thinking: thinking && actor.id === player.id,
    discarder: state.phase === 'reaction' && discarder?.id === player.id,
    claiming: state.phase === 'reaction' && actor.id === player.id,
  })

  return (
    <div className={`table-shell anim-${settings.animation}`}>
      <div className="sakura-container" aria-hidden="true">
        <span className="sakura-petal p1" />
        <span className="sakura-petal p2" />
        <span className="sakura-petal p3" />
        <span className="sakura-petal p4" />
        <span className="sakura-petal p5" />
        <span className="sakura-petal p6" />
      </div>

      <button className="chrome-fab top-left" onClick={onOpenHelp} aria-label="玩法說明" title="玩法說明">
        <span className="fab-icon">📖</span>
        <span className="fab-text">說明</span>
      </button>
      <p className="table-prompt">
        {state.phase === 'reaction'
          ? reactionActor(state)?.id === human.id
            ? '有玩家棄牌，你要抄牌（もらった）嗎？'
            : `等待 ${reactionActor(state)?.name ?? '對手'} 決定是否抄牌...`
          : state.phase === 'playerAction' && humanTurn
            ? '有可完成的牌型，請選擇結算或略過'
            : state.phase === 'discard' && humanTurn
              ? '輪到你出牌，請點擊打出一張手牌'
              : !humanTurn && (state.phase === 'discard' || state.phase === 'playerAction' || state.phase === 'playerDraw')
                ? `等待 ${current.name} 行動中...`
                : '高點を取れ · かなジャン'}
      </p>
      <button className="chrome-fab top-right" onClick={onOpenSettings} aria-label="遊戲設定" title="遊戲設定">
        <span className="fab-icon">⚙️</span>
        <span className="fab-text">設定</span>
      </button>

      <div className="felt-oval" data-active-pos={actingPos}>
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

        <CenterBoard state={state} settings={settings} actingPos={actingPos} />

        {/* 自家玩家資訊角 (Bottom Left: Seat HUD) - 參照圖一獨立置於角落 */}
        <div className="human-seat-corner">
          <SeatHud {...hudFor(human)} />
        </div>

        {/* 自家手牌區 (Bottom Center: Action Bar + Responsive Hand Row) - 參照圖一水平置中自適應 */}
        <div className="human-hand-area">
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
              {turnTimer && turnTimer.active && (
                <TurnTimer
                  seconds={turnTimer.seconds}
                  turnKey={turnTimer.turnKey}
                  active={turnTimer.active}
                  onTimeout={turnTimer.onTimeout}
                  className="timer-in-action-bar"
                />
              )}
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
          {canDiscard && selectedCardId && human.hand.find((c) => c.id === selectedCardId) && (
            <div className="action-bar discard-confirm-bar">
              <button
                className="btn primary discard-btn"
                disabled={locked}
                onClick={() => onSelectCard(selectedCardId)}
              >
                打出「{displayGlyph(human.hand.find((c) => c.id === selectedCardId)!)}」
              </button>
              <span className="hint-text">（或再按一次該牌打出）</span>
            </div>
          )}
          <div className="hand-row" data-hand-origin="human">
            {human.hand.map((card, idx) => {
              const isDrawn =
                humanTurn &&
                human.hand.length === 8 &&
                (state.lastDrawnCardId === card.id || idx === human.hand.length - 1)
              const showTimer = isDrawn && !!turnTimer?.active

              return (
                <div key={card.id} className={`hand-card-slot ${isDrawn ? 'is-drawn-slot' : ''}`}>
                  {showTimer && turnTimer && (
                    <TurnTimer
                      seconds={turnTimer.seconds}
                      turnKey={turnTimer.turnKey}
                      active={turnTimer.active}
                      onTimeout={turnTimer.onTimeout}
                      label="摸牌"
                      className="timer-above-drawn"
                    />
                  )}
                  <CardView
                    card={card}
                    size="lg"
                    selected={selectedCardId === card.id}
                    hinted={nearIds.has(card.id)}
                    yakuPart={yakuHighlight.has(card.id)}
                    showHints={settings}
                    disabled={locked}
                    drawn={isDrawn}
                    hasTimer={showTimer}
                    onClick={() => {
                      if (canDiscard) onSelectCard(card.id)
                    }}
                  />
                </div>
              )
            })}
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
