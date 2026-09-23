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
import { authorizeClientAction, generateResumeToken, restoreDisconnectedPlayer } from './network/authorize'
import type { GuestManager, HostManager } from './network/peerManager'
import { clearResume, loadResume } from './network/resume'
import { generateRoomCode, getRoomFromUrl, tryParseRoomCode } from './network/roomCode'
import type { RoomState } from './network/types'
import { CatalogModal } from './ui/CatalogModal'
import { GameTable } from './ui/GameTable'
import { Lobby } from './ui/Lobby'
import { RoomLobby } from './ui/RoomLobby'
import { RowPreview } from './ui/RowPreview'
import { ScoreReview } from './ui/ScoreReview'
import { SettingsPanel } from './ui/SettingsPanel'
import { Tutorial } from './ui/Tutorial'
import { WinAnnouncement } from './ui/WinAnnouncement'
import { tablePosition } from './ui/seats'
import { recordSounds } from './ui/mastery'
import { clearGame, initialState, loadGame } from './ui/persist'
import { forfeitGame } from './ui/profile'
import { delayFor, loadSettings, saveSettings, type Settings } from './ui/settings'
import { useGamePersistence } from './ui/useGamePersistence'
import { useTurnOrchestration, type NetworkMode } from './ui/useTurnOrchestration'

function reduceWithPresentationPause(state: GameState, action: GameAction): GameState {
  const next = reduce(state, action)
  if (action.type === 'FINISH_REVIEW') return next
  if (action.type === 'REFILL' && next.phase === 'refill') return next
  return drainAuto(next)
}

export function App() {
  const [state, setState] = useState<GameState>(initialState)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [playerName, setPlayerName] = useState('小春')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [hoverYaku, setHoverYaku] = useState<YakuCandidate | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [locked, setLocked] = useState(false)
  const lockRef = useRef(false)
  const pendingDiscardIdRef = useRef<string | null>(null)
  const committedSideEffectStateRef = useRef<GameState | null>(null)

  // 連線對戰狀態
  const [networkMode, setNetworkMode] = useState<NetworkMode>('none')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [mySeat, setMySeat] = useState<number>(0)
  const [netError, setNetError] = useState<string | null>(null)
  const [spectating, setSpectating] = useState(false)
  const hostManagerRef = useRef<HostManager | null>(null)
  const guestManagerRef = useRef<GuestManager | null>(null)

  const initialUrlRoom = useMemo(() => getRoomFromUrl(), [])
  const lastHandledEventSeqRef = useRef<number>(-1)
  const gameOverPlayedRef = useRef<boolean>(false)
  const [announcementStage, setAnnouncementStage] = useState<'idle' | 'gun' | 'cutin' | 'settlement'>('idle')
  const lastAnnouncedScoreKeyRef = useRef<string | null>(null)
  const scheduleSave = useGamePersistence()

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
    setSpectating(false)
    // 移除網址中的 room 參數
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // reducer updater 保持純函式；存檔與網路同步只在 React commit 後執行。
  const apply = useCallback(
    (updater: (s: GameState) => GameState) => {
      setState((prev) => updater(prev))
    },
    [],
  )

  useEffect(() => {
    if (committedSideEffectStateRef.current === state) return
    committedSideEffectStateRef.current = state
    const host = hostManagerRef.current
    const guest = guestManagerRef.current
    if (host) host.syncGameState(state)
    else if (!guest) scheduleSave(state)
  }, [state, scheduleSave])

  const dispatch = useCallback(
    (action: GameAction) => {
      if (networkMode === 'guest') {
        guestManagerRef.current?.sendAction(action)
      } else {
        apply((s) => reduceWithPresentationPause(s, action))
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

      if (state.lastFx === 'draw' && state.lastDrawnCardId) {
        playSfx('draw', settings.sfx)
      } else if (state.lastFx === 'discard') {
        playSfx('discard', settings.sfx)
      }
    }

    // 對局結束音效：若有和牌宣告，延遲至金幣畫面再播放
    const shouldPlayGameOverSfx =
      !spectating &&
      state.phase === 'gameOver' &&
      !gameOverPlayedRef.current &&
      (!state.pendingScore || announcementStage === 'settlement')

    if (shouldPlayGameOverSfx) {
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
    state.lastDrawnCardId,
    state.phase,
    settings.sfx,
    state.pendingScore,
    state.players,
    state.rankings,
    mySeat,
    announcementStage,
    spectating,
  ])

  // 和牌宣告時序控制：1秒放槍牌發亮 -> 2秒胡牌玩家一側彈出 KANA JAN! 宣告 -> 金幣讓渡結算
  useEffect(() => {
    const isWinEvent = (state.phase === 'review' || state.phase === 'gameOver') && !!state.pendingScore
    if (!isWinEvent || !state.pendingScore) {
      if (state.phase !== 'review' && state.phase !== 'gameOver') {
        setAnnouncementStage('idle')
        lastAnnouncedScoreKeyRef.current = null
      }
      return
    }

    const scoreKey = `${state.pendingScore.playerId}-${state.pendingScore.yaku.id}-${state.turnNumber}-${state.eventSeq}`
    if (lastAnnouncedScoreKeyRef.current === scoreKey) {
      return
    }
    lastAnnouncedScoreKeyRef.current = scoreKey

    // 1. 放槍牌／成牌發亮 1 秒（搭配 ron 放槍震撼音效或自摸提示音）
    setAnnouncementStage('gun')
    if (state.pendingScore.source === 'ron') {
      playSfx('ron', settings.sfx)
    } else {
      playSfx('ready', settings.sfx)
    }

    // 2. 1.0 秒後，從胡牌玩家一側跳出 KANA JAN! 宣告 Cut-in（持續 2.0 秒，搭配宣告音效）
    const cutinTimer = window.setTimeout(() => {
      setAnnouncementStage('cutin')
      if (state.pendingScore?.source === 'tsumo') {
        playSfx('dekita', settings.sfx)
      } else {
        playSfx('moratta', settings.sfx)
      }
    }, 1000)

    // 3. 總計 3.0 秒後，切換到金幣讓渡畫面 (settlement)
    const settlementTimer = window.setTimeout(() => {
      setAnnouncementStage('settlement')
    }, 3000)

    return () => {
      window.clearTimeout(cutinTimer)
      window.clearTimeout(settlementTimer)
    }
  }, [state.phase, state.pendingScore, state.turnNumber, state.eventSeq, settings.sfx])

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
    const pendingId = pendingDiscardIdRef.current
    if (!pendingId) return
    const player = state.players.find((candidate) => candidate.seat === mySeat)
    const authoritativeStateApplied = state.phase !== 'discard' || !player?.hand.some((card) => card.id === pendingId)
    if (!authoritativeStateApplied) return
    pendingDiscardIdRef.current = null
    lockRef.current = false
    setLocked(false)
  }, [mySeat, state.phase, state.players])

  // AI 與自動推進流程（Guest 模式下不執行本地 AI，全由 Host 統御同步）
  useEffect(() => {
    if (networkMode === 'guest') return
    if (state.phase === 'lobby' || state.phase === 'gameOver') return
    if (networkMode === 'none' && (showTutorial || showSettings)) return
    if (state.phase === 'preview') return

    if (state.phase === 'dealing') {
      const cadence = settings.animation === 'normal' ? 420 : settings.animation === 'fast' ? 200 : 0
      const dealSounds = Array.from({ length: cadence > 0 ? 7 : 1 }, (_, index) =>
        window.setTimeout(() => playSfx('draw', settings.sfx), index * cadence),
      )
      const t = window.setTimeout(() => dispatch({ type: 'DEAL_DONE' }), delayFor(settings, 'deal'))
      return () => {
        dealSounds.forEach((timer) => window.clearTimeout(timer))
        window.clearTimeout(t)
      }
    }

    if (state.phase === 'refill') {
      const refillDelay = state.pendingScore
        ? settings.animation === 'normal'
          ? 520
          : settings.animation === 'fast'
            ? 340
            : 40
        : 40
      const t = window.setTimeout(() => dispatch({ type: 'REFILL' }), refillDelay)
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

    if (state.phase === 'playerAction') {
      const p = currentPlayer(state)
      if (p.kind === 'human' || p.kind === 'remote') {
        const yakus = availableYakuFor(state, p.id)
        if (yakus.length === 0) {
          const t = window.setTimeout(() => dispatch({ type: 'SKIP_YAKU' }), 280)
          return () => window.clearTimeout(t)
        }
        return
      }
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
        const actorNow = s.phase === 'reaction' ? reactionActor(s) : currentPlayer(s)
        if (!actorNow || actorNow.kind !== 'ai') return s
        const synced = reduce(s, { type: 'SYNC_RNG', rngState: rng.getState() })
        return drainAuto(reduce(synced, action))
      })
    }, wait)
    return () => window.clearTimeout(t)
  }, [state, settings, dispatch, apply, showTutorial, showSettings, networkMode, announcementStage])

  // 單人遊戲開始
  const startSingle = (seed?: number, nextLesson = DEFAULT_LESSON_ID) => {
    playSfx('click', settings.sfx)
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
    setState(next)
  }

  // 多人連線：開房（Host）
  const handleCreateRoom = useCallback(async () => {
    playSfx('click', settings.sfx)
    cleanupNetwork()
    clearGame()
    const code = generateRoomCode()
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `?room=${code}`)
    }

    const { HostManager } = await import('./network/peerManager')
    const host = new HostManager(code, playerName, DEFAULT_LESSON_ID, {
      onRoomChange: (r) => setRoomState({ ...r }),
      onClientAction: (seat, action) => {
        apply((s) => {
          let updated = s
          const player = s.players.find((p) => p.seat === seat)
          if (player && player.kind === 'ai') {
            updated = pushEvent(restoreDisconnectedPlayer(s, seat), `玩家 ${player.name.replace(/\s*\(AI\)$/, '')} 已重新連線接管操作`)
          }
          if (!authorizeClientAction(updated, seat, action)) return updated
          return reduceWithPresentationPause(updated, action)
        })
      },
      onGuestReconnect: (seat, authoritativeState) => {
        const player = authoritativeState.players.find((p) => p.seat === seat)
        const restored = pushEvent(
          restoreDisconnectedPlayer(authoritativeState, seat),
          `玩家 ${(player?.name ?? '').replace(/\s*\(AI\)$/, '')} 已重新連線接管操作`,
        )
        committedSideEffectStateRef.current = restored
        setState(restored)
        return restored
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
  }, [playerName, cleanupNetwork, apply, settings.sfx])

  // 多人連線：加入房間（Guest）
  const handleJoinRoom = useCallback(
    async (code: string) => {
      playSfx('click', settings.sfx)
      const normalized = tryParseRoomCode(code)
      if (!normalized) {
        setNetError('房號格式不正確：請輸入 4 碼房號，並避免 0、1、I、O。')
        return
      }
      setNetError(null)
      cleanupNetwork()
      clearGame()
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `?room=${normalized}`)
      }

      const resume = loadResume(normalized)
      const { GuestManager } = await import('./network/peerManager')
      const guest = new GuestManager(
        normalized,
        playerName,
        {
          onRoomUpdate: (room, seat, isSpectating) => {
            setRoomState({ ...room })
            setSpectating(Boolean(isSpectating) || seat < 0)
            setMySeat(seat)
          },
          onGameStart: (startState, seat, isSpectating) => {
            setState(startState)
            setSpectating(Boolean(isSpectating) || seat < 0)
            setMySeat(seat)
            setNetworkMode('guest')
          },
          onGameSync: (syncedState, isSpectating) => {
            setState(syncedState)
            if (isSpectating !== undefined) setSpectating(isSpectating)
          },
          onError: (err) => setNetError(err),
        },
        resume ? { playerId: resume.playerId, token: resume.token } : undefined,
      )

      guestManagerRef.current = guest
      setNetworkMode('guest')
    },
    [playerName, cleanupNetwork, settings.sfx],
  )

  // 房主啟動多人牌局
  const handleStartMultiplayerGame = useCallback(() => {
    if (!roomState || networkMode !== 'host' || !hostManagerRef.current) return
    playSfx('click', settings.sfx)

    const playerConfigs: PlayerConfig[] = roomState.slots.map((slot) => ({
      id: slot.playerId,
      name: slot.name,
      kind: slot.isHost ? 'human' : slot.kind === 'ai' || !slot.connected ? 'ai' : 'remote',
      seat: slot.seat,
      aiDifficulty: difficulty,
    }))

    const initial = drainAuto(
      startGame({
        playerConfigs,
        matchId: generateResumeToken(),
        lessonId: roomState.lessonId,
        aiDifficulty: difficulty,
        initialGold: INITIAL_GOLD,
      }),
    )

    hostManagerRef.current.startGame(initial)
    committedSideEffectStateRef.current = initial
    setState(initial)
  }, [roomState, networkMode, difficulty, settings.sfx])

  const restartSame = () => {
    playSfx('click', settings.sfx)
    if (networkMode === 'host') {
      handleStartMultiplayerGame()
    } else if (networkMode === 'none') {
      startSingle((Date.now() ^ state.seed) >>> 0, state.lessonId)
    }
  }

  const toLobby = () => {
    playSfx('click', settings.sfx)
    if (state.phase !== 'lobby' && state.phase !== 'gameOver' && !spectating) {
      forfeitGame()
    }
    if (roomState) clearResume(roomState.roomId)
    clearGame()
    cleanupNetwork()
    setState(createLobbyState())
  }

  const discardCard = (cardId: string) => {
    if (lockRef.current) return
    lockRef.current = true
    pendingDiscardIdRef.current = cardId
    setLocked(true)
    dispatch({ type: 'DISCARD', cardId })
    window.setTimeout(() => {
      if (networkMode === 'guest' && pendingDiscardIdRef.current !== cardId) return
      pendingDiscardIdRef.current = null
      lockRef.current = false
      setLocked(false)
    }, networkMode === 'guest' ? 2000 : delayFor(settings, 'fx'))
  }

  const hasSave = useMemo(() => !roomState && !!loadGame() && state.phase === 'lobby', [state.phase, roomState])

  const { isMyTurn, isTurnActive, clockKey, handleTurnTimeout } = useTurnOrchestration({
    state, networkMode, mySeat, spectating, dispatch,
  })

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
          onSelectLesson={(newLessonId) => {
            if (hostManagerRef.current) {
              hostManagerRef.current.setLessonId(newLessonId)
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
          hasSave={hasSave}
          initialRoomCode={initialUrlRoom}
          bgmEnabled={settings.bgm}
          onToggleBgm={() => setSettings((s) => ({ ...s, bgm: !s.bgm }))}
          onName={setPlayerName}
          onDifficulty={setDifficulty}
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
      {spectating && (
        <div className="net-error-banner">
          <span>👁 觀戰中：看不到任何人的手牌，也無法操作</span>
        </div>
      )}

      <GameTable
        state={state}
        settings={settings}
        mySeat={spectating ? 0 : mySeat}
        isRonHighlight={announcementStage === 'gun' || announcementStage === 'cutin'}
        turnTimer={{
          active: isTurnActive && isMyTurn,
          seconds: state.phase === 'reaction' ? 12 : 18,
          turnKey: clockKey,
          onTimeout: handleTurnTimeout,
        }}
        selectedCardId={selectedCardId}
        hoverYaku={hoverYaku}
        locked={locked || !isMyTurn || spectating}
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
        onChooseYaku={(id) => {
          playSfx('click', settings.sfx)
          dispatch({ type: 'CHOOSE_YAKU', yakuId: id })
        }}
        onSkipYaku={() => {
          playSfx('click', settings.sfx)
          dispatch({ type: 'SKIP_YAKU' })
        }}
        onClaim={(id) => {
          playSfx('click', settings.sfx)
          dispatch({ type: 'CLAIM_YAKU', yakuId: id })
        }}
        onPassClaim={() => {
          playSfx('click', settings.sfx)
          dispatch({ type: 'PASS_CLAIM' })
        }}
        onHoverYaku={setHoverYaku}
        onOpenSettings={() => {
          playSfx('click', settings.sfx)
          setShowSettings(true)
        }}
        onOpenHelp={() => {
          playSfx('click', settings.sfx)
          setShowTutorial(true)
        }}
        onOpenCatalog={() => {
          playSfx('click', settings.sfx)
          setShowCatalog(true)
        }}
      />

      {state.phase === 'preview' && (
        <RowPreview
          state={state}
          settings={settings}
          canSkip={networkMode !== 'guest'}
          onContinue={() => {
            playSfx('click', settings.sfx)
            if (networkMode === 'none' || networkMode === 'host') {
              dispatch({ type: 'SKIP_PREVIEW' })
            }
          }}
        />
      )}

      {state.pendingScore &&
        (state.phase === 'review' || state.phase === 'gameOver') &&
        announcementStage !== 'idle' &&
        announcementStage !== 'settlement' && (
          <WinAnnouncement
            winnerPos={tablePosition(
              (
                state.players.find((p) => p.id === state.pendingScore?.playerId) ?? state.players[0]!
              ).seat,
              spectating ? 0 : mySeat,
            )}
            stage={announcementStage}
          />
        )}

      {((state.phase === 'review' && announcementStage === 'settlement') ||
        (state.phase === 'gameOver' && (!state.pendingScore || announcementStage === 'settlement'))) && (
        <ScoreReview
          state={state}
          settings={settings}
          mySeat={mySeat}
          isGameOver={state.phase === 'gameOver'}
          onRestart={restartSame}
          canRestart={networkMode !== 'guest'}
          canFinish={networkMode !== 'guest'}
          onLobby={toLobby}
          onFinish={() => {
            if (state.phase === 'review' && networkMode !== 'guest') {
              dispatch({ type: 'FINISH_REVIEW' })
            }
          }}
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
          canRestart={networkMode !== 'guest'}
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
            setShowTutorial(false)
          }}
        />
      )}
    </>
  )
}
