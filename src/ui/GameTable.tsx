import { useState } from 'react'
import {
  availableYakuFor,
  currentPlayer,
  currentReactionYakus,
  reactionActor,
} from '../engine/game'
import { computeRankings } from '../engine/scoring'
import { findNearYaku } from '../engine/yaku'
import type { GameState, YakuCandidate } from '../engine/types'
import { getSound } from '../data/kana'
import type { Settings } from './settings'
import { playersByPerspective, tablePosition } from './seats'
import { CardDrawFlight } from './CardDrawFlight'
import { InitialDealFlight } from './InitialDealFlight'
import { CardView } from './CardView'
import { CenterBoard } from './CenterBoard'
import { DiscardRiver } from './DiscardRiver'
import { EventLog } from './EventLog'
import { ReferenceDrawer } from './ReferenceDrawer'
import { SeatHud } from './SeatHud'
import { CompactTurnTimer, TurnTimer } from './TurnTimer'

interface Props {
  state: GameState
  settings: Settings
  mySeat?: number
  selectedCardId: string | null
  hoverYaku: YakuCandidate | null
  locked: boolean
  isRonHighlight?: boolean
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
  isRonHighlight = false,
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
  const nearHints =
    settings.highlightNear && settings.learningHints
      ? findNearYaku(human.hand, state.activeRows)
      : []
  const nearIds = new Set(nearHints.flatMap((hint) => hint.cardIds))
  const availableClaimYakus = yakus.length > 0 ? yakus : reactionYakus
  const hasClaimDecision = availableClaimYakus.length > 0
  const targetClaimYaku = hoverYaku ?? availableClaimYakus[0] ?? null
  const yakuHighlight = new Set((targetClaimYaku?.cards ?? []).map((c) => c.id))
  const canDiscard = state.phase === 'discard' && humanTurn && !locked
  const thinking =
    actor.kind === 'ai' && ['playerAction', 'discard', 'playerDraw', 'reaction'].includes(state.phase)
  const rankings = computeRankings(state.players)
  const placeOf = (id: string) => rankings.find((r) => r.playerId === id)?.place ?? 4
  const [showLog, setShowLog] = useState(false)
  const [showReference, setShowReference] = useState(false)
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

      <div className="table-chrome-top-left">
        <button className="chrome-fab" onClick={onOpenHelp} aria-label="玩法說明" title="玩法說明">
          <span className="fab-icon">📖</span>
          <span className="fab-text">說明</span>
        </button>
        <button
          className="chrome-fab highlight-fab"
          onClick={() => setShowReference((v) => !v)}
          aria-label="牌況與役種"
          title="牌況與役種"
        >
          <span className="fab-icon">🎴</span>
          <span className="fab-text">牌況</span>
        </button>
      </div>
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
      {nearHints.length > 0 && (
        <p className="near-yaku-hint" aria-live="polite">
          聽牌：{nearHints.slice(0, 2).map((hint) =>
            `${hint.label} 等 ${hint.missingSounds.map((sound) => getSound(sound).hiragana).join('・')}`,
          ).join('／')}
        </p>
      )}
      <button className="chrome-fab top-right" onClick={onOpenSettings} aria-label="遊戲設定" title="遊戲設定">
        <span className="fab-icon">⚙️</span>
        <span className="fab-text">設定</span>
      </button>

      <div
        className={`felt-oval ${state.phase === 'dealing' ? 'is-initial-dealing' : ''}`}
        data-active-pos={actingPos}
      >
        <SeatHud {...hudFor(top)} />
        <SeatHud {...hudFor(left)} />
        <SeatHud {...hudFor(right)} />

        <div className="hand-fan pos-top" data-hand-origin="top" aria-hidden>
          {Array.from({ length: fanCount(top.hand.length) }).map((_, i) => (
            <i
              key={i}
              className={`mini-back ${i === top.hand.length - 1 && top.hand.length === 8 ? 'is-drawn-mini' : ''}`}
            />
          ))}
        </div>
        <div className="hand-fan pos-left" data-hand-origin="left" aria-hidden>
          {Array.from({ length: fanCount(left.hand.length) }).map((_, i) => (
            <i
              key={i}
              className={`mini-back ${i === left.hand.length - 1 && left.hand.length === 8 ? 'is-drawn-mini' : ''}`}
            />
          ))}
        </div>
        <div className="hand-fan pos-right" data-hand-origin="right" aria-hidden>
          {Array.from({ length: fanCount(right.hand.length) }).map((_, i) => (
            <i
              key={i}
              className={`mini-back ${i === right.hand.length - 1 && right.hand.length === 8 ? 'is-drawn-mini' : ''}`}
            />
          ))}
        </div>

        {/* 湊到的牌組不在牌桌常駐，僅在結算時展示 */}

        {(() => {
          const pending = state.pendingScore
          const isRon = pending?.source === 'ron'
          const ronGunCard = isRon ? (pending?.claimedCard ?? null) : null
          const ronPayerId = isRon ? (pending?.fromPlayerId ?? null) : null
          return (
            <>
              <DiscardRiver
                player={top}
                position="top"
                liveCardId={state.currentDiscard?.id}
                settings={settings}
                ronGunCard={top.id === ronPayerId ? ronGunCard : null}
                isRonHighlight={top.id === ronPayerId ? isRonHighlight : false}
              />
              <DiscardRiver
                player={left}
                position="left"
                liveCardId={state.currentDiscard?.id}
                settings={settings}
                ronGunCard={left.id === ronPayerId ? ronGunCard : null}
                isRonHighlight={left.id === ronPayerId ? isRonHighlight : false}
              />
              <DiscardRiver
                player={right}
                position="right"
                liveCardId={state.currentDiscard?.id}
                settings={settings}
                ronGunCard={right.id === ronPayerId ? ronGunCard : null}
                isRonHighlight={right.id === ronPayerId ? isRonHighlight : false}
              />
              <DiscardRiver
                player={human}
                position="human"
                liveCardId={state.currentDiscard?.id}
                settings={settings}
                ronGunCard={human.id === ronPayerId ? ronGunCard : null}
                isRonHighlight={human.id === ronPayerId ? isRonHighlight : false}
              />
            </>
          )
        })()}

        <CenterBoard state={state} settings={settings} actingPos={actingPos} />
        {state.phase === 'dealing' && (
          <InitialDealFlight state={state} settings={settings} mySeat={mySeat} />
        )}
        <CardDrawFlight state={state} settings={settings} mySeat={mySeat} />

        <div className="human-seat-corner">
          <SeatHud {...hudFor(human)} />
        </div>

        {hasClaimDecision && (
          <div
            className="compact-claim-dock"
            role="region"
            aria-label={yakus.length > 0 ? '自摸和牌決策' : '和牌決策'}
          >
            {turnTimer && turnTimer.active && (
              <CompactTurnTimer
                seconds={turnTimer.seconds}
                turnKey={turnTimer.turnKey}
                active={turnTimer.active}
                onTimeout={turnTimer.onTimeout}
              />
            )}
            <div className="compact-claim-buttons">
              <button
                type="button"
                className="btn-compact-skip"
                disabled={locked}
                onClick={yakus.length > 0 ? onSkipYaku : onPassClaim}
              >
                <span className="btn-skip-icon">🔄</span> 跳過
              </button>
              {(yakus.length > 0 ? yakus : reactionYakus).map((y) => (
                <button
                  key={y.id}
                  type="button"
                  className="btn-compact-claim"
                  disabled={locked}
                  onMouseEnter={() => onHoverYaku(y)}
                  onMouseLeave={() => onHoverYaku(null)}
                  onFocus={() => onHoverYaku(y)}
                  onBlur={() => onHoverYaku(null)}
                  onClick={() => (yakus.length > 0 ? onChooseYaku(y.id) : onClaim(y.id))}
                  aria-label={`和牌 ${y.label} ${y.totalScore} 點`}
                >
                  <span className="compact-claim-badge">🪙 {y.totalScore}</span>
                  <span className="compact-claim-title">和牌</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="human-hand-area">
          <div className="hand-row" data-hand-origin="human">
            {human.hand.map((card, idx) => {
              const isDrawn =
                humanTurn &&
                human.hand.length === 8 &&
                (state.lastDrawnCardId === card.id || idx === human.hand.length - 1)
              // 和牌決策列已有同一回合的倒數；避免自摸時同時渲染兩個計時器，
              // 也避免兩份 countdown 各自觸發一次 onTimeout。
              const showTimer = isDrawn && !!turnTimer?.active && !hasClaimDecision

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

      {showReference && (
        <ReferenceDrawer
          state={state}
          myPlayerId={human.id}
          isOpen
          onClose={() => setShowReference(false)}
        />
      )}
    </div>
  )
}
