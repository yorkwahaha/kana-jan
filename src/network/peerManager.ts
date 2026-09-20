import { Peer, type DataConnection } from 'peerjs'
import { pushEvent, type GameAction } from '../engine/game'
import type { GameState } from '../engine/types'
import {
  generateResumeToken,
  restoreDisconnectedPlayer,
  sanitizeChatText,
  sanitizePlayerName,
} from './authorize'
import { maskStateForPlayer } from './mask'
import { saveResume } from './resume'
import { parseRoomCode } from './roomCode'
import type { ClientMessage, HostMessage, RoomSlot, RoomState } from './types'

export function roomToPeerId(roomCode: string): string {
  const norm = parseRoomCode(roomCode).toLowerCase().replace(/[^a-z0-9]/g, '')
  return `kanajan-v1-${norm}`
}

/** 跨網路 / 跨 Wi-Fi NAT 穿透 STUN 伺服器配置 */
export const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  },
}

export interface HostCallbacks {
  onRoomChange: (room: RoomState) => void
  onClientAction: (seat: number, action: GameAction) => void
  onGuestDisconnect?: (seat: number) => void
  /** 回傳更新後的對局狀態，供立刻同步給重連玩家 */
  onGuestReconnect?: (seat: number, authoritativeState: GameState) => GameState | void
  onError: (err: string) => void
  onChat?: (senderName: string, text: string) => void
}

export interface GuestCallbacks {
  onRoomUpdate: (room: RoomState, yourSeat: number, spectating?: boolean) => void
  onGameStart: (state: GameState, yourSeat: number, spectating?: boolean) => void
  onGameSync: (state: GameState, spectating?: boolean) => void
  onError: (err: string) => void
  onChat?: (senderName: string, text: string) => void
}

export class HostManager {
  private peer: Peer | null = null
  private connections: Map<number, DataConnection> = new Map() // seat -> connection
  private spectators: Map<string, { conn: DataConnection; name: string }> = new Map()
  private resumeTokens = new Map<number, string>()
  private roomState: RoomState
  private callbacks: HostCallbacks
  private currentGameState: GameState | null = null

  constructor(roomCode: string, hostName: string, lessonId: string, callbacks: HostCallbacks) {
    this.callbacks = callbacks
    const peerId = roomToPeerId(roomCode)

    const initialSlots: RoomSlot[] = [
      {
        seat: 0,
        playerId: 'p0',
        name: hostName.trim() || '房主',
        kind: 'human',
        isHost: true,
        connected: true,
      },
      {
        seat: 1,
        playerId: 'p1',
        name: '等待玩家加入...',
        kind: 'remote',
        isHost: false,
        connected: false,
      },
      {
        seat: 2,
        playerId: 'p2',
        name: '等待玩家加入...',
        kind: 'remote',
        isHost: false,
        connected: false,
      },
      {
        seat: 3,
        playerId: 'p3',
        name: '等待玩家加入...',
        kind: 'remote',
        isHost: false,
        connected: false,
      },
    ]

    this.roomState = {
      roomId: parseRoomCode(roomCode),
      hostPeerId: peerId,
      lessonId,
      aiDifficulty: 'normal',
      slots: initialSlots,
      started: false,
    }

    this.initPeer(peerId)
  }

  private initPeer(peerId: string) {
    try {
      this.peer = new Peer(peerId, PEER_CONFIG)

      this.peer.on('open', () => {
        this.callbacks.onRoomChange(this.roomState)
      })

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          this.callbacks.onError('此房號已有其他玩家正在使用中，請嘗試其他房號！')
        } else {
          this.callbacks.onError(`連線錯誤：${err.message || err.type}`)
        }
      })

      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          conn.on('data', (data) => {
            this.handleGuestMessage(conn, data as ClientMessage)
          })
        })

        conn.on('close', () => {
          this.handleGuestDisconnect(conn)
        })

        conn.on('error', () => {
          this.handleGuestDisconnect(conn)
        })
      })
    } catch (e: unknown) {
      this.callbacks.onError(`無法啟動連線服務：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  private handleGuestMessage(conn: DataConnection, msg: ClientMessage) {
    if (!msg || typeof msg !== 'object') return

    if (msg.type === 'JOIN') {
      const name = sanitizePlayerName(msg.name, '玩家')
      if (this.roomState.started) {
        if (this.tryReconnect(conn, msg.resumePlayerId, msg.resumeToken)) return
        this.addSpectator(conn, name)
        return
      }

      const freeSlotIndex = this.roomState.slots.findIndex(
        (s, idx) => idx > 0 && !s.connected && s.kind !== 'ai',
      )
      if (freeSlotIndex === -1) {
        conn.send({ type: 'ERROR', message: '房間已滿員！' } satisfies HostMessage)
        conn.close()
        return
      }

      const slot = this.roomState.slots[freeSlotIndex]!
      slot.connected = true
      slot.peerId = conn.peer
      slot.name = name
      slot.kind = 'remote'
      this.resumeTokens.set(slot.seat, generateResumeToken())

      this.connections.set(slot.seat, conn)
      this.broadcastRoomUpdate()
      return
    }

    if (msg.type === 'LEAVE') {
      this.handleGuestDisconnect(conn)
      conn.close()
      return
    }

    if (msg.type === 'ACTION') {
      let senderSeat = -1
      for (const [seat, c] of this.connections.entries()) {
        if (c.peer === conn.peer) {
          senderSeat = seat
          break
        }
      }
      if (senderSeat !== -1) {
        this.callbacks.onClientAction(senderSeat, msg.action)
      }
      return
    }

    if (msg.type === 'CHAT') {
      const text = sanitizeChatText(msg.text)
      if (!text) return
      let senderName = '玩家'
      const spectator = this.spectators.get(conn.peer)
      if (spectator) {
        senderName = `${spectator.name}（觀戰）`
      } else {
        for (const s of this.roomState.slots) {
          if (s.peerId === conn.peer) {
            senderName = s.name
            break
          }
        }
      }
      this.broadcastMessage({ type: 'CHAT', senderName, text })
      this.callbacks.onChat?.(senderName, text)
    }
  }

  private tryReconnect(conn: DataConnection, resumePlayerId?: string, resumeToken?: string): boolean {
    if (!resumePlayerId || !resumeToken) return false
    const slot = this.roomState.slots.find(
      (s) => !s.isHost && s.kind !== 'ai' && s.playerId === resumePlayerId,
    )
    if (!slot) return false
    if (this.resumeTokens.get(slot.seat) !== resumeToken) return false

    const old = this.connections.get(slot.seat)
    if (old && old !== conn) {
      this.connections.delete(slot.seat)
      try {
        old.close()
      } catch {
        // ignore
      }
    }

    slot.connected = true
    slot.peerId = conn.peer
    slot.kind = 'remote'
    this.connections.set(slot.seat, conn)

    if (this.currentGameState) {
      const restored = this.callbacks.onGuestReconnect?.(slot.seat, this.currentGameState)
      let next = restored ?? restoreDisconnectedPlayer(this.currentGameState, slot.seat)
      if (!restored) {
        next = pushEvent(next, `玩家 ${slot.name} 已重新連線接管操作`)
      }
      this.currentGameState = next
    }

    this.broadcastRoomUpdate()
    const game = this.currentGameState
    if (game) {
      conn.send({
        type: 'GAME_START',
        state: maskStateForPlayer(game, slot.seat),
        yourSeat: slot.seat,
        spectating: false,
        resumeToken: this.resumeTokens.get(slot.seat),
      } satisfies HostMessage)
    }
    return true
  }

  private addSpectator(conn: DataConnection, name: string) {
    this.spectators.set(conn.peer, { conn, name })
    const game = this.currentGameState
    if (game) {
      conn.send({
        type: 'GAME_START',
        state: maskStateForPlayer(game, -1),
        yourSeat: -1,
        spectating: true,
      } satisfies HostMessage)
    } else {
      conn.send({
        type: 'ROOM_UPDATE',
        roomState: this.roomState,
        yourSeat: -1,
        spectating: true,
      } satisfies HostMessage)
    }
  }

  private handleGuestDisconnect(conn: DataConnection) {
    if (this.spectators.has(conn.peer)) {
      this.spectators.delete(conn.peer)
      return
    }

    let disconnectedSeat = -1
    for (const [seat, c] of this.connections.entries()) {
      if (c.peer === conn.peer) {
        disconnectedSeat = seat
        break
      }
    }
    if (disconnectedSeat !== -1) {
      this.connections.delete(disconnectedSeat)
      const slot = this.roomState.slots[disconnectedSeat]
      if (slot) {
        slot.connected = false
        if (!this.roomState.started) {
          slot.name = '等待玩家加入...'
          slot.peerId = undefined
        }
      }
      this.broadcastRoomUpdate()
      if (this.roomState.started) {
        this.callbacks.onGuestDisconnect?.(disconnectedSeat)
      }
    }
  }

  public setSlotType(seat: number, type: 'remote' | 'ai', aiName?: string) {
    const slot = this.roomState.slots[seat]
    if (!slot || slot.isHost || this.roomState.started) return

    if (type === 'ai') {
      const existingConn = this.connections.get(seat)
      if (existingConn) {
        existingConn.send({ type: 'ERROR', message: '房主已將該座位切換為電腦 AI' } satisfies HostMessage)
        existingConn.close()
        this.connections.delete(seat)
      }
      slot.kind = 'ai'
      slot.name = aiName ?? `電腦（座${seat + 1}）`
      slot.connected = true
      slot.peerId = undefined
    } else {
      slot.kind = 'remote'
      slot.name = '等待玩家加入...'
      slot.connected = false
      slot.peerId = undefined
    }
    this.broadcastRoomUpdate()
  }

  public broadcastRoomUpdate() {
    this.callbacks.onRoomChange({ ...this.roomState, slots: [...this.roomState.slots] })
    for (const [seat, conn] of this.connections.entries()) {
      if (conn.open) {
        conn.send({
          type: 'ROOM_UPDATE',
          roomState: this.roomState,
          yourSeat: seat,
          resumeToken: this.resumeTokens.get(seat),
        } satisfies HostMessage)
      }
    }
  }

  public startGame(initialState: GameState) {
    this.roomState.started = true
    this.currentGameState = initialState
    for (const [seat, conn] of this.connections.entries()) {
      if (conn.open) {
        conn.send({
          type: 'GAME_START',
          state: maskStateForPlayer(initialState, seat),
          yourSeat: seat,
          spectating: false,
          resumeToken: this.resumeTokens.get(seat),
        } satisfies HostMessage)
      }
    }
    for (const spectator of this.spectators.values()) {
      if (spectator.conn.open) {
        spectator.conn.send({
          type: 'GAME_START',
          state: maskStateForPlayer(initialState, -1),
          yourSeat: -1,
          spectating: true,
        } satisfies HostMessage)
      }
    }
  }

  public syncGameState(state: GameState) {
    this.currentGameState = state
    for (const [seat, conn] of this.connections.entries()) {
      if (conn.open) {
        conn.send({
          type: 'GAME_SYNC',
          state: maskStateForPlayer(state, seat),
          spectating: false,
        } satisfies HostMessage)
      }
    }
    for (const spectator of this.spectators.values()) {
      if (spectator.conn.open) {
        spectator.conn.send({
          type: 'GAME_SYNC',
          state: maskStateForPlayer(state, -1),
          spectating: true,
        } satisfies HostMessage)
      }
    }
  }

  private broadcastMessage(msg: HostMessage) {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg)
      }
    }
    for (const spectator of this.spectators.values()) {
      if (spectator.conn.open) {
        spectator.conn.send(msg)
      }
    }
  }

  public getRoomState(): RoomState {
    return this.roomState
  }

  public getCurrentGameState(): GameState | null {
    return this.currentGameState
  }

  public destroy() {
    for (const conn of this.connections.values()) {
      try {
        conn.close()
      } catch {
        // ignore
      }
    }
    this.connections.clear()
    for (const spectator of this.spectators.values()) {
      try {
        spectator.conn.close()
      } catch {
        // ignore
      }
    }
    this.spectators.clear()
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {
        // ignore
      }
      this.peer = null
    }
  }
}

export class GuestManager {
  private peer: Peer | null = null
  private hostConn: DataConnection | null = null
  private callbacks: GuestCallbacks
  private guestName: string
  private roomCode: string
  private resumePlayerId?: string
  private resumeToken?: string
  private spectating = false
  private yourSeat: number = -1

  constructor(
    roomCode: string,
    guestName: string,
    callbacks: GuestCallbacks,
    resume?: { playerId: string; token: string },
  ) {
    this.callbacks = callbacks
    this.guestName = sanitizePlayerName(guestName, '訪客')
    this.roomCode = parseRoomCode(roomCode)
    this.resumePlayerId = resume?.playerId
    this.resumeToken = resume?.token
    const hostPeerId = roomToPeerId(roomCode)

    this.initPeer(hostPeerId)
  }

  private initPeer(hostPeerId: string) {
    try {
      this.peer = new Peer(PEER_CONFIG)

      this.peer.on('open', () => {
        this.connectToHost(hostPeerId)
      })

      this.peer.on('error', (err) => {
        this.callbacks.onError(`連線中斷或錯誤：${err.message || err.type}`)
      })
    } catch (e: unknown) {
      this.callbacks.onError(`無法建立連線：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  private connectToHost(hostPeerId: string) {
    if (!this.peer) return

    const conn = this.peer.connect(hostPeerId, { reliable: true })
    this.hostConn = conn

    conn.on('open', () => {
      conn.send({
        type: 'JOIN',
        name: this.guestName,
        peerId: this.peer?.id ?? '',
        resumePlayerId: this.resumePlayerId,
        resumeToken: this.resumeToken,
      } satisfies ClientMessage)
    })

    conn.on('data', (data) => {
      this.handleHostMessage(data as HostMessage)
    })

    conn.on('close', () => {
      this.callbacks.onError('與房主的連線已中斷。')
    })

    conn.on('error', (err) => {
      this.callbacks.onError(`連線錯誤：${err.message}`)
    })
  }

  private handleHostMessage(msg: HostMessage) {
    if (!msg || typeof msg !== 'object') return

    if (msg.type === 'ERROR') {
      this.callbacks.onError(msg.message)
      return
    }

    if (msg.type === 'ROOM_UPDATE') {
      this.yourSeat = msg.yourSeat
      this.spectating = Boolean(msg.spectating)
      this.rememberResume(msg.yourSeat, msg.resumeToken, this.spectating)
      this.callbacks.onRoomUpdate(msg.roomState, msg.yourSeat, this.spectating)
      return
    }

    if (msg.type === 'GAME_START') {
      this.yourSeat = msg.yourSeat
      this.spectating = Boolean(msg.spectating)
      this.rememberResume(msg.yourSeat, msg.resumeToken, this.spectating)
      this.callbacks.onGameStart(msg.state, msg.yourSeat, this.spectating)
      return
    }

    if (msg.type === 'GAME_SYNC') {
      if (msg.spectating !== undefined) this.spectating = msg.spectating
      this.callbacks.onGameSync(msg.state, this.spectating)
      return
    }

    if (msg.type === 'CHAT') {
      this.callbacks.onChat?.(msg.senderName, msg.text)
    }
  }

  public sendAction(action: GameAction) {
    if (this.spectating) return
    if (this.hostConn?.open) {
      this.hostConn.send({ type: 'ACTION', action } satisfies ClientMessage)
    }
  }

  public sendChat(text: string) {
    const cleaned = sanitizeChatText(text)
    if (!cleaned || !this.hostConn?.open) return
    this.hostConn.send({ type: 'CHAT', text: cleaned } satisfies ClientMessage)
  }

  public isSpectating(): boolean {
    return this.spectating
  }

  private rememberResume(seat: number, token: string | undefined, spectating: boolean) {
    if (spectating || seat < 0 || !token) return
    this.resumeToken = token
    this.resumePlayerId = `p${seat}`
    saveResume(this.roomCode, {
      playerId: this.resumePlayerId,
      name: this.guestName,
      seat,
      token,
    })
  }

  public getSeat(): number {
    return this.yourSeat
  }

  public destroy() {
    if (this.hostConn) {
      try {
        this.hostConn.close()
      } catch {
        // ignore
      }
      this.hostConn = null
    }
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {
        // ignore
      }
      this.peer = null
    }
  }
}
