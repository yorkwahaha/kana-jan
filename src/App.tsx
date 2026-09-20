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
import { authorizeClientAction, restoreDisconnectedPlayer } from './network/authorize'
import { GuestManager, HostManager } from './network/peerManager'
import { clearResume, loadResume } from './network/resume'
import { generateRoomCode, getRoomFromUrl, parseRoomCode } from './network/roomCode'
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
import { clearGame, initialState, loadGame, markTutorialSeen, saveGame } from './ui/persist'
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
  const [showTutorial, setShowTutorial] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [locked, setLocked] = useState(false)
  const lockRef = useRef(false)

  // 連線對戰狀態
  const [networkMode, setNetworkMode] = useState<'none' | 'host' | 'guest'>('none')
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
      }
    }

    // 對局結束音效：若有和牌宣告，延遲至金幣畫面再播放
    const shouldPlayGameOverSfx =
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
    state.phase,
    settings.sfx,
    state.pendingScore,
    state.players,
    state.rankings,
    mySeat,
    announcementStage,
  ])

  // 和牌宣告時序控制：1秒放槍牌發亮 -> 2秒胡牌玩家一側彈出 POKA JAN! 宣告 -> 金幣讓渡結算
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

    // 2. 1.0 秒後，從胡牌玩家一側跳出 POKA JAN! 宣告 Cut-in（持續 2.0 秒，搭配宣告音效）
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

  // AI 與自動推進流程（Guest 模式下不執行本地 AI，全由 Host 統御同步）
  useEffect(() => {
    if (networkMode === 'guest') return
    if (state.phase === 'lobby' || state.phase === 'gameOver' || showTutorial || showSettings) return
    if (state.phase === 'preview') return

    // 1. 牌型結算展示畫面：在進入 settlement（金幣讓渡）畫面後等待 2.8 秒自動進入下一回合，無需手動點擊
    if (state.phase === 'review' && state.pendingScore && announcementStage === 'settlement') {
      const t = window.setTimeout(() => {
        dispatch({ type: 'FINISH_REVIEW' })
      }, 2800)
      return () => window.clearTimeout(t)
    }

    if (state.phase === 'dealing') {
      playSfx('draw', settings.sfx)
      const t1 = window.setTimeout(() => playSfx('draw', settings.sfx), 160)
      const t = window.setTimeout(() => dispatch({ type: 'DEAL_DONE' }), delayFor(settings, 'deal'))
      return () => {
        window.clearTimeout(t1)
        window.clearTimeout(t)
      }
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
        const synced = reduce(s, { type: 'SYNC_RNG', rngState: rng.getState() })
        return drainAuto(reduce(synced, action))
      })
    }, wait)
    return () => window.clearTimeout(t)
  }, [state, settings, dispatch, apply, showTutorial, showSettings, networkMode, announcementStage])

  // 單人遊戲開始
  const startSingle = (seed?: number, nextLesson = lessonId) => {
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
    saveGame(next)
    setState(next)
  }

  // 多人連線：開房（Host）
  const handleCreateRoom = useCallback(() => {
    playSfx('click', settings.sfx)
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
          let updated = s
          const player = s.players.find((p) => p.seat === seat)
          if (player && player.kind === 'ai') {
            updated = pushEvent(restoreDisconnectedPlayer(s, seat), `玩家 ${player.name.replace(/\s*\(AI\)$/, '')} 已重新連線接管操作`)
          }
          if (!authorizeClientAction(updated, seat, action)) return updated
          return drainAuto(reduce(updated, action))
        })
      },
      onGuestReconnect: (seat) => {
        let restored: GameState | undefined
        apply((s) => {
          const player = s.players.find((p) => p.seat === seat)
          const next = pushEvent(
            restoreDisconnectedPlayer(s, seat),
            `玩家 ${(player?.name ?? '').replace(/\s*\(AI\)$/, '')} 已重新連線接管操作`,
          )
          restored = next
          return next
        })
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
  }, [playerName, lessonId, cleanupNetwork, apply, settings.sfx])

  // 多人連線：加入房間（Guest）
  const handleJoinRoom = useCallback(
    (code: string) => {
      playSfx('click', settings.sfx)
      cleanupNetwork()
      clearGame()
      const normalized = parseRoomCode(code)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `?room=${normalized}`)
      }

      const resume = loadResume(normalized)
      const guest = new GuestManager(
        normalized,
        playerName,
        {
          onRoomUpdate: (room, seat, isSpectating) => {
            setRoomState({ ...room })
            setSpectating(Boolean(isSpectating) || seat < 0)
            setMySeat(seat >= 0 ? seat : 0)
          },
          onGameStart: (startState, seat, isSpectating) => {
            setState(startState)
            setSpectating(Boolean(isSpectating) || seat < 0)
            setMySeat(seat >= 0 ? seat : 0)
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
  }, [roomState, networkMode, difficulty, settings.sfx])

  const restartSame = () => {
    playSfx('click', settings.sfx)
    if (networkMode === 'host') {
      handleStartMultiplayerGame()
    } else {
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
  const isMyTurn = !spectating && currentActor ? currentActor.seat === mySeat : false
  const isTurnActive =
    !spectating &&
    (state.phase === 'playerAction' || state.phase === 'discard' || state.phase === 'reaction')

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

  // 房主統御權威回合計時器：防範遠端真人玩家背景化或網路封包遺失卡住牌局（執行單次回合摸切／略過，絕不將玩家篡改為 AI）
  useEffect(() => {
    if (networkMode !== 'host') return
    if (state.phase !== 'playerAction' && state.phase !== 'discard' && state.phase !== 'reaction') return

    const actor = state.phase === 'reaction' ? reactionActor(state) : currentPlayer(state)
    if (!actor || actor.kind !== 'remote') return

    // 客端畫面倒數計時為出牌 18 秒、抄牌 12 秒。房主給予額外 2 秒網路寬限（20 秒／14 秒），若客端未送出動作則由房主執行單次回合摸切處置
    const timeoutMs = state.phase === 'reaction' ? 14000 : 20000
    const timer = window.setTimeout(() => {
      handleTurnTimeout()
    }, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [networkMode, state, handleTurnTimeout])

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
      {spectating && (
        <div className="net-error-banner">
          <span>👁 觀戰中：看不到任何人的手牌，也無法操作</span>
        </div>
      )}

      <GameTable
        state={state}
        settings={settings}
        mySeat={mySeat}
        isRonHighlight={announcementStage === 'gun' || announcementStage === 'cutin'}
        turnTimer={{
          active: isTurnActive,
          seconds: state.phase === 'reaction' ? 12 : 18,
          turnKey: `${state.turnNumber}-${state.phase}-${currentActor?.id}-${state.comboCount}`,
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
            winner={
              state.players.find((p) => p.id === state.pendingScore?.playerId) ?? state.players[0]!
            }
            winnerPos={tablePosition(
              (
                state.players.find((p) => p.id === state.pendingScore?.playerId) ?? state.players[0]!
              ).seat,
              mySeat,
            )}
            yakuLabel={state.pendingScore.yaku.label}
            totalScore={state.pendingScore.yaku.totalScore}
            isRon={state.pendingScore.source === 'ron'}
            payerName={state.players.find((p) => p.id === state.pendingScore?.fromPlayerId)?.name}
            stage={announcementStage}
            comboCount={state.comboCount}
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
          onLobby={toLobby}
          onFinish={() => {
            if (state.phase === 'review') {
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
