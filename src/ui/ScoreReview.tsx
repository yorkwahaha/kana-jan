import { useEffect, useMemo, useState } from 'react'
import { speechText } from '../data/cards'
import { pickRecallCard, recallOptions } from '../data/recall'
import { speakJapanese } from '../audio/speech'
import type { GameState } from '../engine/types'
import { computeRankings } from '../engine/scoring'
import { CardView } from './CardView'
import { SeatHud } from './SeatHud'
import { TransferFlights } from './TransferFlights'
import { tablePosition } from './seats'
import type { Settings } from './settings'

interface Props {
  state: GameState
  settings: Settings
  onFinish: () => void
}

export function ScoreReview({ state, settings, onFinish }: Props) {
  const pending = state.pendingScore
  const rankings = useMemo(() => computeRankings(state.players), [state.players])
  const [step, setStep] = useState<'result' | 'review' | 'quiz'>('result')
  const [picked, setPicked] = useState<string | null>(null)

  const deltas = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of state.lastTransfers) {
      map[t.toId] = (map[t.toId] ?? 0) + t.amount
      map[t.fromId] = (map[t.fromId] ?? 0) - t.amount
    }
    return map
  }, [state.lastTransfers])

  const quizCard = pending ? pickRecallCard(pending.yaku.cards) : null
  const options = useMemo(() => {
    if (!quizCard) return []
    return recallOptions(quizCard, state.activeRows)
  }, [quizCard, state.activeRows])
  const afterResult = settings.recallQuiz && quizCard ? 'quiz' : 'review'

  const winnerName = state.players.find((p) => p.id === pending?.playerId)?.name ?? ''
  const discarderName = state.players.find((p) => p.id === pending?.fromPlayerId)?.name

  useEffect(() => {
    if (step !== 'result') return
    const ms = settings.animation === 'off' ? 400 : settings.animation === 'fast' ? 1400 : 2800
    const t = window.setTimeout(() => setStep(afterResult), ms)
    return () => window.clearTimeout(t)
  }, [step, settings.animation, afterResult])

  useEffect(() => {
    if (step !== 'review' || !pending) return
    if (settings.speech) {
      const first = pending.yaku.cards[0]
      if (first) void speakJapanese(speechText(first), true)
    }
    return
  }, [step, pending, settings.speech])

  if (!pending) return null

  const placeOf = (id: string) => rankings.find((r) => r.playerId === id)?.place ?? 4
  const correct = quizCard?.romaji ?? ''
  const resolved = picked !== null

  if (step === 'result') {
    return (
      <div className="score-overlay" aria-live="polite">
        {state.players.map((player) => (
          <SeatHud
            key={player.id}
            player={player}
            place={placeOf(player.id)}
            goldDelta={deltas[player.id] ?? 0}
            position={tablePosition(player.seat)}
            claiming={player.id === pending.playerId}
            discarder={pending.source === 'ron' && player.id === pending.fromPlayerId}
          />
        ))}
        <TransferFlights transfers={state.lastTransfers} players={state.players} />
        <div className="score-center">
          <p className="score-verb">{pending.source === 'tsumo' ? 'できた！' : 'もらった！'}</p>
          <p className="score-who">
            {pending.source === 'tsumo'
              ? `${winnerName} 自己湊成了牌型`
              : `${winnerName} 抄了 ${discarderName ?? '對手'} 的棄牌`}
          </p>
          <div className="score-cards">
            {pending.yaku.cards.map((card) => (
              <CardView key={card.id} card={card} size="md" revealMeaning />
            ))}
          </div>
          <p className="score-label">
            {pending.yaku.label} {pending.yaku.totalScore} 分
          </p>
          <ul className="transfer-list">
            {state.lastTransfers.map((t) => {
              const from = state.players.find((p) => p.id === t.fromId)?.name ?? t.fromId
              const to = state.players.find((p) => p.id === t.toId)?.name ?? t.toId
              return (
                <li key={`${t.fromId}-${t.toId}`}>
                  <span className="delta-down">{from} −{t.amount}</span>
                  <span className="transfer-arrow">→</span>
                  <span className="delta-up">{to} ＋{t.amount}</span>
                </li>
              )
            })}
          </ul>
          <button className="btn primary" onClick={() => setStep(afterResult)}>
            {afterResult === 'quiz' ? '這是什麼音？' : '看牌型'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'quiz' && quizCard) {
    return (
      <div className="review-overlay" role="dialog">
        <div className="review-panel">
          <h2>這是什麼音？</h2>
          <CardView
            card={quizCard}
            size="lg"
            showHints={resolved ? { ...settings, showRomaji: true } : undefined}
          />
          <div className="quiz-options">
            {options.map((opt) => (
              <button
                key={opt}
                className={`btn ${resolved && opt === correct ? 'primary' : ''} ${resolved && opt === picked && opt !== correct ? 'danger' : ''}`}
                disabled={resolved}
                onClick={() => {
                  setPicked(opt)
                  void speakJapanese(speechText(quizCard), settings.speech)
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {resolved && (
            <button className="btn primary" onClick={onFinish}>
              {picked === correct ? '答對了' : `答案是 ${correct}`}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="review-overlay" role="dialog">
      <div className="review-panel">
        <p className="review-who">
          {winnerName} 完成了「{pending.yaku.label}」
        </p>
        <div className="score-cards">
          {pending.yaku.cards.map((card) => (
            <CardView key={card.id} card={card} size="md" revealMeaning showHints={{ ...settings, showRomaji: true }} />
          ))}
        </div>
        <p className="review-meaning">
          {pending.yaku.cards
            .filter((c) => c.cardType === 'vocabulary')
            .map((c) => `${c.vocabulary}（${c.meaning}）`)
            .join(' · ') || pending.yaku.cards[0]?.romaji}
        </p>
        <div className="review-actions">
          <button className="btn primary" onClick={onFinish}>
            繼續
          </button>
        </div>
      </div>
    </div>
  )
}
