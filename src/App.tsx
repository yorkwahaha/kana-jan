import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getGameOverSfxKind, playSfx, startBgm, stopBgm, type BgmTrack } from './audio/sfx'
import { speakJapanese } from './audio/speech'
import { speechText } from './data/cards'
import { decideAi, needsHumanInput } from './engine/ai'
import {
  availableYakuFor,
  createLobbyState,
  currentPlayer,
  drainAuto,
  pushEvent,
  reactionActor,
  reduce,
  startGame,
  type GameAction,
} from './engine/game'
import { createRngFromExactState } from './engine/rng'
import { INITIAL_GOLD, type AiDifficulty, type GameState, type PlayerConfig, type YakuCandidate } from './engine/types'
import { DEFAULT_LESSON_ID } from './data/lessons'
import { GuestManager, HostManager } from './network/peerManager'
import { generateRoomCode, getRoomFromUrl, parseRoomCode } from './network/roomCode'
import type { RoomState } from './network/types'
import { CatalogModal } from './ui/CatalogModal'
import { GameOverModal } from './ui/GameOverModal'
import { GameTable } from './ui/GameTable'
import { Lobby } from './ui/Lobby'
import { RoomLobby } from './ui/RoomLobby'
import { RowPreview } from './ui/RowPreview'
import { ScoreReview } from './ui/ScoreReview'
import { SettingsPanel } from './ui/SettingsPanel'
import { Tutorial } from './ui/Tutorial'
import { recordSounds } from './ui/mastery'
import { clearGame, hasSeenTutorial, initialState, loadGame, markTutorialSeen, saveGame } from './ui/persist'
import { forfeitGame } from './ui/profile'
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

  // 連線對戰狀態
  const [networkMode, setNetworkMode] = useState<'none' | 'host' | 'guest'>('none')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [mySeat, setMySeat] = useState<number>(0)
  const [netError, setNetError] = useState<string | null>(null)
  const hostManagerRef = useRef<HostManager | null>(null)
  const guestManagerRef = useRef<GuestManager | null>(null)

  const initialUrlRoom = useMemo(() => getRoomFromUrl(), [])
  const lastHandledEventSeqRef = useRef<number>(-1)
  const gameOverPlayedRef = useRef<boolean>(false)

  // 清理 Peer 連線
  const cleanupNetwork = useCallback(() => {
    if (hostManagerRef.current) {
      hostManagerRef.current.destroy()
      hostManagerRef.current = null
    }
    if (guestManagerRef.current) {
      guestManagerRef.current.destroy()
      guestManagerRef.current = null
    }
    setNetworkMode('none')
    setRoomState(null)
    setMySeat(0)
    // 移除網址中的 room 參數
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // 狀態更新並存檔／同步廣播至所有 Guest
  const apply = useCallback(
    (updater: (s: GameState) => GameState) => {
      setState((prev) => {
        const next = updater(prev)
        if (networkMode === 'none') {
          saveGame(next)
        }
        if (networkMode === 'host' && hostManagerRef.current) {
          hostManagerRef.current.syncGameState(next)
        }
        return next
      })
    },
    [networkMode],
  )

  const dispatch = useCallback(
    (action: GameAction) => {
      if (networkMode === 'guest') {
        guestManagerRef.current?.sendAction(action)
      } else {
        apply((s) => drainAuto(reduce(s, action)))
      }
    },
    [apply, networkMode],
  )

  useEffect(() => {
    saveSettings(settings)
    document.body.dataset.anim = settings.animation
  }, [settings])

  // BGM 播放管理：僅在「大廳」與「牌桌」切換時更新曲目，出牌／換人／抽牌等回合事件中保持不中斷連續播放
  const inLobby = state.phase === 'lobby'
  useEffect(() => {
    if (settings.bgm) {
      const track: BgmTrack = inLobby ? 'lobby' : 'table'
      startBgm(track, true)
    } else {
      stopBgm()
    }
  }, [settings.bgm, inLobby])

  // 離開網頁時完全停止 BGM
  useEffect(() => {
    return () => {
      stopBgm()
    }
  }, [])

  useEffect(() => {
    if (state.phase !== 'gameOver') {
      gameOverPlayedRef.current = false
    }

    if (state.eventSeq !== lastHandledEventSeqRef.current) {
      lastHandledEventSeqRef.current = state.eventSeq

      if (state.lastFx === 'draw') {
        playSfx('draw', settings.sfx)
      } else if (state.lastFx === 'discard') {
        playSfx('discard', settings.sfx)
      } else if (state.lastFx === 'dekita') {
        const myPlayer = state.players.find((p) => p.seat === mySeat) ?? state.players[0]
        const isMe = state.pendingScore?.playerId === myPlayer?.id
        if (isMe) {
          playSfx('dekita', settings.sfx)
        }
      } else if (state.lastFx === 'moratta') {
        const myPlayer = state.players.find((p) => p.seat === mySeat) ?? state.players[0]
        const isVictim = state.pendingScore?.fromPlayerId === myPlayer?.id
        const isMe = state.pendingScore?.playerId === myPlayer?.id
        if (isVictim) {
          playSfx('ron', settings.sfx)
        } else if (isMe) {
          playSfx('moratta', settings.sfx)
        }
      }
    }

    if (state.phase === 'gameOver' && !gameOverPlayedRef.current) {
      gameOverPlayedRef.current = true
      const myPlayer = state.players.find((p) => p.seat === mySeat) ?? state.players[0]
      const rankings = state.rankings ?? []
      const myRanking = rankings.find((r) => r.playerId === myPlayer?.id)
      const maxPlace = Math.max(...rankings.map((r) => r.place), 1)
      if (myRanking) {
        const sfx = getGameOverSfxKind(myRanking.place, maxPlace)
        if (sfx) playSfx(sfx, settings.sfx)
      }
    }
  }, [
    state.eventSeq,
    state.lastFx,
    state.phase,
    settings.sfx,
    state.pendingScore,
    state.players,
    state.rankings,
    mySeat,
  ])

  useEffect(() => {
    if (state.phase === 'review' && state.pendingScore) {
      recordSounds([...new Set(state.pendingScore.yaku.cards.map((c) => c.sound))])
    }
  }, [state.phase, state.eventSeq, state.pendingScore])

  useEffect(() => {
    setSelectedCardId(null)
    setHoverYaku(null)
  }, [state.phase, state.currentPlayerIndex, state.turnNumber])

  // AI 與自動推進流程（Guest 模式下不執行本地 AI，全由 Host 統御同步）
  useEffect(() => {
    if (networkMode === 'guest') return
    if (state.phase === 'lobby' || state.phase === 'gameOver' || showTutorial || showSettings) return
    if (state.phase === 'preview') return

    // 1. 牌型結算展示畫面：等待 2.6 秒（金幣聲 0.6s + 停留 2s）自動進入下一回合，無需手動點擊
    if (state.phase === 'review' && state.pendingScore) {
      const t = window.setTimeout(() => {
        dispatch({ type: 'FINISH_REVIEW' })
      }, 2600)
      return () => window.clearTimeout(t)
    }

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

    const actor = state.phase === 'reaction' ? reactionActor(state) : currentPlayer(state)
    // 若當前行動者不是 AI（例如遠端真人玩家），則 Host 等待該玩家操作，不跑 AI
    if (actor && actor.kind !== 'ai') return

    const rng = createRngFromExactState(state.rngState)
    const action = decideAi(state, rng)
    if (!action) return

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
  }, [state, settings, dispatch, apply, showTutorial, showSettings, networkMode])

  // 單人遊戲開始
  const startSingle = (seed?: number, nextLesson = lessonId) => {
    cleanupNetwork()
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

  // 多人連線：開房（Host）
  const handleCreateRoom = useCallback(() => {
    cleanupNetwork()
    clearGame()
    const code = generateRoomCode()
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `?room=${code}`)
    }

    const host = new HostManager(code, playerName, lessonId, {
      onRoomChange: (r) => setRoomState({ ...r }),
      onClientAction: (seat, action) => {
        apply((s) => {
          if (action.type === 'FINISH_REVIEW') {
            const scoringPlayer = s.players.find((p) => p.id === s.pendingScore?.playerId)
            if (scoringPlayer?.seat === seat || currentPlayer(s).seat === seat) {
              return drainAuto(reduce(s, action))
            }
            return s
          }
          const current = s.phase === 'reaction' ? reactionActor(s) : currentPlayer(s)
          if (current?.seat !== seat) return s
          return drainAuto(reduce(s, action))
        })
      },
      onGuestDisconnect: (seat) => {
        apply((s) => {
          const player = s.players.find((p) => p.seat === seat)
          if (!player || player.kind === 'ai') return s

          const nextPlayers = s.players.map((p) =>
            p.seat === seat
              ? {
                  ...p,
                  kind: 'ai' as const,
                  name: p.name.includes('(AI)') ? p.name : `${p.name} (AI)`,
                }
              : p,
          )
          let next: GameState = {
            ...s,
            players: nextPlayers,
          }
          next = pushEvent(next, `玩家 ${player.name} 斷線，已由電腦 AI 接管對局`)
          return next
        })
      },
      onError: (err) => setNetError(err),
    })

    hostManagerRef.current = host
    setNetworkMode('host')
    setMySeat(0)
    setRoomState(host.getRoomState())
  }, [playerName, lessonId, cleanupNetwork, apply])

  // 多人連線：加入房間（Guest）
  const handleJoinRoom = useCallback(
    (code: string) => {
      cleanupNetwork()
      clearGame()
      const normalized = parseRoomCode(code)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `?room=${normalized}`)
      }

      const guest = new GuestManager(normalized, playerName, {
        onRoomUpdate: (room, seat) => {
          setRoomState({ ...room })
          setMySeat(seat)
        },
        onGameStart: (startState, seat) => {
          setState(startState)
          setMySeat(seat)
          setNetworkMode('guest')
        },
        onGameSync: (syncedState) => {
          setState(syncedState)
        },
        onError: (err) => setNetError(err),
      })

      guestManagerRef.current = guest
      setNetworkMode('guest')
    },
    [playerName, cleanupNetwork],
  )

  // 房主啟動多人牌局
  const handleStartMultiplayerGame = useCallback(() => {
    if (!roomState || networkMode !== 'host' || !hostManagerRef.current) return

    const playerConfigs: PlayerConfig[] = roomState.slots.map((slot) => ({
      id: slot.playerId,
      name: slot.name,
      kind: slot.isHost ? 'human' : slot.kind === 'ai' ? 'ai' : 'remote',
      seat: slot.seat,
      aiDifficulty: difficulty,
    }))

    const initial = drainAuto(
      startGame({
        playerConfigs,
        lessonId: roomState.lessonId,
        aiDifficulty: difficulty,
        initialGold: INITIAL_GOLD,
      }),
    )

    hostManagerRef.current.startGame(initial)
    setState(initial)
  }, [roomState, networkMode, difficulty])

  const restartSame = () => {
    if (networkMode === 'host') {
      handleStartMultiplayerGame()
    } else {
      startSingle((Date.now() ^ state.seed) >>> 0, state.lessonId)
    }
  }

  const toLobby = () => {
    if (state.phase !== 'lobby' && state.phase !== 'gameOver') {
      forfeitGame()
    }
    clearGame()
    cleanupNetwork()
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

  const hasSave = useMemo(() => !roomState && !!loadGame() && state.phase === 'lobby', [state.phase, roomState])

  // 判斷當前輪到操作的玩家
  const currentActor =
    state.phase === 'lobby' || state.players.length === 0
      ? null
      : state.phase === 'reaction'
        ? (reactionActor(state) ?? state.players[state.currentPlayerIndex] ?? null)
        : (state.players[state.currentPlayerIndex] ?? null)
  const isMyTurn = currentActor ? currentActor.seat === mySeat : false
  const isTurnActive =
    state.phase === 'playerAction' || state.phase === 'discard' || state.phase === 'reaction'

  // 回合思考超時自動託管
  const handleTurnTimeout = useCallback(() => {
    if (!isTurnActive || !currentActor) return

    // 只有輪到自己（或房主代管）才送出超時處置
    if (isMyTurn || (networkMode === 'host' && currentActor?.kind === 'remote')) {
      if (state.phase === 'playerAction') {
        dispatch({ type: 'SKIP_YAKU' })
      } else if (state.phase === 'discard') {
        const actorPlayer = state.players.find((p) => p.seat === currentActor.seat)
        if (actorPlayer && actorPlayer.hand.length > 0) {
          const cardToDiscard = actorPlayer.hand[actorPlayer.hand.length - 1]!
          dispatch({ type: 'DISCARD', cardId: cardToDiscard.id })
        }
      } else if (state.phase === 'reaction') {
        dispatch({ type: 'PASS_CLAIM' })
      }
    }
  }, [isTurnActive, isMyTurn, networkMode, currentActor, state.phase, state.players, dispatch])

  // 房主統御權威回合計時器：防範遠端真人玩家斷線、背景化或掛網發呆卡住牌局
  useEffect(() => {
    if (networkMode !== 'host') return
    if (state.phase !== 'playerAction' && state.phase !== 'discard' && state.phase !== 'reaction') return

    const actor = state.phase === 'reaction' ? reactionActor(state) : currentPlayer(state)
    if (!actor || actor.kind !== 'remote') return

    // 思考時間上限：出牌 12 秒、抄牌 8 秒。超時自動由 AI 接管，並推進牌局
    const timeoutMs = state.phase === 'reaction' ? 8000 : 12000
    const timer = window.setTimeout(() => {
      apply((s) => {
        const player = s.players.find((p) => p.id === actor.id)
        if (!player || player.kind === 'ai') return s

        const nextPlayers = s.players.map((p) =>
          p.id === actor.id
            ? { ...p, kind: 'ai' as const, name: p.name.includes('(AI)') ? p.name : `${p.name} (AI)` }
            : p,
        )
        let next: GameState = { ...s, players: nextPlayers }
        next = pushEvent(next, `${player.name} 逾時未出牌，已切換為電腦 AI 自動接管`)
        return next
      })
    }, timeoutMs)

    return () => window.clearTimeout(timer)
  }, [networkMode, state, apply])

  // 1. 若處於房間等待大廳且牌局尚未開始
  if (networkMode !== 'none' && roomState && !roomState.started && state.phase === 'lobby') {
    return (
      <>
        {netError && (
          <div className="net-error-banner">
            <span>⚠️ {netError}</span>
            <button onClick={() => setNetError(null)}>確定</button>
          </div>
        )}
        <RoomLobby
          roomState={roomState}
          mySeat={mySeat}
          isHost={networkMode === 'host'}
          onStartGame={handleStartMultiplayerGame}
          onLeaveRoom={toLobby}
          onToggleSlotAi={(seat) => {
            if (hostManagerRef.current) {
              const currentSlot = roomState.slots[seat]
              const nextType = currentSlot?.kind === 'ai' ? 'remote' : 'ai'
              hostManagerRef.current.setSlotType(seat, nextType)
            }
          }}
          onLessonChange={(id) => {
            if (hostManagerRef.current) {
              hostManagerRef.current.setLessonId(id)
            }
          }}
        />
      </>
    )
  }

  // 2. 主選單大廳
  if (state.phase === 'lobby') {
    return (
      <>
        {netError && (
          <div className="net-error-banner">
            <span>⚠️ {netError}</span>
            <button onClick={() => setNetError(null)}>確定</button>
          </div>
        )}
        <Lobby
          playerName={playerName}
          difficulty={difficulty}
          lessonId={lessonId}
          hasSave={hasSave}
          initialRoomCode={initialUrlRoom}
          bgmEnabled={settings.bgm}
          onToggleBgm={() => setSettings((s) => ({ ...s, bgm: !s.bgm }))}
          onName={setPlayerName}
          onDifficulty={setDifficulty}
          onLesson={setLessonId}
          onStart={() => startSingle()}
          onContinue={() => {
            const saved = loadGame()
            if (saved) setState(saved)
          }}
          onHelp={() => setShowTutorial(true)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
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

  // 3. 牌桌進行中
  const myPlayer = state.players.find((p) => p.seat === mySeat) ?? state.players[0]!

  return (
    <>
      {netError && (
        <div className="net-error-banner">
          <span>⚠️ {netError}</span>
          <button onClick={() => setNetError(null)}>確定</button>
        </div>
      )}

      <GameTable
        state={state}
        settings={settings}
        mySeat={mySeat}
        turnTimer={{
          active: isTurnActive,
          seconds: state.phase === 'reaction' ? 12 : 18,
          turnKey: `${state.turnNumber}-${state.phase}-${currentActor?.id}`,
          onTimeout: handleTurnTimeout,
        }}
        selectedCardId={selectedCardId}
        hoverYaku={hoverYaku}
        locked={locked || !isMyTurn}
        onSelectCard={(id) => {
          if (locked || !isMyTurn) return
          playSfx('click', settings.sfx)
          if (selectedCardId === id) {
            discardCard(id)
            return
          }
          setSelectedCardId(id)
          const card = myPlayer.hand.find((c) => c.id === id)
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
        <RowPreview
          state={state}
          onContinue={() => {
            if (networkMode === 'none' || networkMode === 'host') {
              dispatch({ type: 'SKIP_PREVIEW' })
            }
          }}
        />
      )}

      {state.phase === 'review' && state.pendingScore && (
        <ScoreReview
          state={state}
          settings={settings}
          mySeat={mySeat}
          onFinish={() => {
            dispatch({ type: 'FINISH_REVIEW' })
          }}
        />
      )}

      {state.phase === 'gameOver' && (
        <GameOverModal
          state={state}
          onRestart={restartSame}
          onLobby={toLobby}
        />
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
          onToLobby={() => {
            setShowSettings(false)
            toLobby()
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
