import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playSfx, startBgm, stopBgm } from './audio/sfx'
import { speakJapanese } from './audio/speech'
import { speechText } from './data/cards'
import { decideAi, needsHumanInput } from './engine/ai'
import {
  availableYakuFor,
  createLobbyState,
  currentPlayer,
  drainAuto,
  reactionActor,
  reduce,
  startGame,
  type GameAction,
} from './engine/game'
import { createRngFromExactState } from './engine/rng'
import type { AiDifficulty, GameState, YakuCandidate } from './engine/types'
import { DEFAULT_LESSON_ID } from './data/lessons'
import { CatalogModal } from './ui/CatalogModal'
import { GameOverModal } from './ui/GameOverModal'
import { GameTable } from './ui/GameTable'
import { Lobby } from './ui/Lobby'
import { RowPreview } from './ui/RowPreview'
import { ScoreReview } from './ui/ScoreReview'
import { SettingsPanel } from './ui/SettingsPanel'
import { Tutorial } from './ui/Tutorial'
import { recordSounds } from './ui/mastery'
import { clearGame, hasSeenTutorial, initialState, loadGame, markTutorialSeen, saveGame } from './ui/persist'
import { delayFor, loadSettings, saveSettings, type Settings } from './ui/settings'

export function App() {
  const [state, setState] = useState<GameState>(initialState)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [playerName, setPlayerName] = useState('小春')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')
  const [lessonId, setLessonId] = useState(DEFAULT_LESSON_ID)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [hoverYaku, setHoverYaku] = useState<YakuCandidate | null>(null)
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial())
  const [showSettings, setShowSettings] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [locked, setLocked] = useState(false)
  const lockRef = useRef(false)

  const apply = useCallback((updater: (s: GameState) => GameState) => {
    setState((prev) => {
      const next = updater(prev)
      saveGame(next)
      return next
    })
  }, [])

  const dispatch = useCallback(
    (action: GameAction) => {
      apply((s) => drainAuto(reduce(s, action)))
    },
    [apply],
  )

  useEffect(() => {
    saveSettings(settings)
    document.body.dataset.anim = settings.animation
    if (settings.bgm) startBgm(true)
    else stopBgm()
    return () => stopBgm()
  }, [settings])

  useEffect(() => {
    if (state.lastFx === 'draw') playSfx('draw', settings.sfx)
    if (state.lastFx === 'discard') playSfx('discard', settings.sfx)
    if (state.lastFx === 'dekita' || state.lastFx === 'moratta') playSfx('yaku', settings.sfx)
    if (state.lastTransfers.length > 0) playSfx('coin', settings.sfx)
    if (state.phase === 'gameOver') playSfx('win', settings.sfx)
  }, [state.lastFx, state.lastTransfers, state.phase, settings.sfx, state.eventSeq])

  useEffect(() => {
    if (state.phase === 'review' && state.pendingScore) {
      recordSounds([...new Set(state.pendingScore.yaku.cards.map((c) => c.sound))])
    }
  }, [state.phase, state.eventSeq, state.pendingScore])

  useEffect(() => {
    setSelectedCardId(null)
    setHoverYaku(null)
  }, [state.phase, state.currentPlayerIndex, state.turnNumber])

  useEffect(() => {
    if (state.phase === 'lobby' || state.phase === 'gameOver' || showTutorial || showSettings) return
    if (state.phase === 'preview' || state.phase === 'review') return

    if (state.phase === 'dealing') {
      const t = window.setTimeout(() => dispatch({ type: 'DEAL_DONE' }), delayFor(settings, 'deal'))
      return () => window.clearTimeout(t)
    }

    if (state.phase === 'playerDraw') {
      const wait =
        currentPlayer(state).kind === 'ai' && state.lastFx === 'discard'
          ? delayFor(settings, 'hold')
          : delayFor(settings, 'draw')
      const t = window.setTimeout(() => dispatch({ type: 'DRAW' }), wait)
      return () => window.clearTimeout(t)
    }

    if (state.phase === 'playerAction' && currentPlayer(state).kind === 'human') {
      const yakus = availableYakuFor(state, currentPlayer(state).id)
      if (yakus.length === 0) {
        const t = window.setTimeout(() => dispatch({ type: 'SKIP_YAKU' }), 280)
        return () => window.clearTimeout(t)
      }
      return
    }

    if (needsHumanInput(state)) return

    const rng = createRngFromExactState(state.rngState)
    const action = decideAi(state, rng)
    if (!action) return
    const actor = state.phase === 'reaction' ? reactionActor(state) : currentPlayer(state)
    const wait = delayFor(
      settings,
      actor?.kind === 'ai'
        ? state.phase === 'discard' || state.phase === 'playerAction' || state.phase === 'reaction'
          ? 'think'
          : 'hold'
        : 'draw',
    )
    const t = window.setTimeout(() => {
      apply((s) => {
        const synced = reduce(s, { type: 'SYNC_RNG', rngState: rng.getState() })
        return drainAuto(reduce(synced, action))
      })
    }, wait)
    return () => window.clearTimeout(t)
  }, [state, settings, dispatch, apply, showTutorial, showSettings])

  const start = (seed?: number, nextLesson = lessonId) => {
    clearGame()
    const next = drainAuto(
      startGame({
        seed,
        playerName,
        aiDifficulty: difficulty,
        lessonId: nextLesson,
      }),
    )
    saveGame(next)
    setState(next)
  }

  const restartSame = () => start((Date.now() ^ state.seed) >>> 0, state.lessonId)

  const toLobby = () => {
    clearGame()
    setState(createLobbyState())
  }

  const discardCard = (cardId: string) => {
    if (lockRef.current) return
    lockRef.current = true
    setLocked(true)
    dispatch({ type: 'DISCARD', cardId })
    window.setTimeout(() => {
      lockRef.current = false
      setLocked(false)
    }, delayFor(settings, 'fx'))
  }

  const hasSave = useMemo(() => !!loadGame() && state.phase === 'lobby', [state.phase])

  if (state.phase === 'lobby') {
    return (
      <>
        <Lobby
          playerName={playerName}
          difficulty={difficulty}
          lessonId={lessonId}
          hasSave={hasSave}
          onName={setPlayerName}
          onDifficulty={setDifficulty}
          onLesson={setLessonId}
          onStart={() => start()}
          onContinue={() => {
            const saved = loadGame()
            if (saved) setState(saved)
          }}
          onHelp={() => setShowTutorial(true)}
        />
        {showTutorial && (
          <Tutorial
            onClose={() => {
              markTutorialSeen()
              setShowTutorial(false)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <GameTable
        state={state}
        settings={settings}
        selectedCardId={selectedCardId}
        hoverYaku={hoverYaku}
        locked={locked}
        onSelectCard={(id) => {
          if (locked) return
          playSfx('click', settings.sfx)
          if (selectedCardId === id) {
            discardCard(id)
            return
          }
          setSelectedCardId(id)
          const card = state.players[0]?.hand.find((c) => c.id === id)
          if (card) void speakJapanese(speechText(card), settings.speech)
        }}
        onChooseYaku={(id) => dispatch({ type: 'CHOOSE_YAKU', yakuId: id })}
        onSkipYaku={() => dispatch({ type: 'SKIP_YAKU' })}
        onClaim={(id) => dispatch({ type: 'CLAIM_YAKU', yakuId: id })}
        onPassClaim={() => dispatch({ type: 'PASS_CLAIM' })}
        onHoverYaku={setHoverYaku}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowTutorial(true)}
        onOpenCatalog={() => setShowCatalog(true)}
      />
      {state.phase === 'preview' && (
        <RowPreview state={state} onContinue={() => dispatch({ type: 'SKIP_PREVIEW' })} />
      )}
      {state.phase === 'review' && state.pendingScore && (
        <ScoreReview state={state} settings={settings} onFinish={() => dispatch({ type: 'FINISH_REVIEW' })} />
      )}
      {state.phase === 'gameOver' && (
        <GameOverModal state={state} onRestart={restartSame} onLobby={toLobby} />
      )}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          onRestart={() => {
            setShowSettings(false)
            restartSame()
          }}
        />
      )}
      {showCatalog && <CatalogModal onClose={() => setShowCatalog(false)} />}
      {showTutorial && (
        <Tutorial
          onClose={() => {
            markTutorialSeen()
            setShowTutorial(false)
          }}
        />
      )}
    </>
  )
}
