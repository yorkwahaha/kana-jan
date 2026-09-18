import { Peer, type DataConnection } from 'peerjs'
import type { GameAction } from '../engine/game'
import type { GameState } from '../engine/types'
import { maskStateForPlayer } from './mask'
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
  onError: (err: string) => void
  onChat?: (senderName: string, text: string) => void
}

export interface GuestCallbacks {
  onRoomUpdate: (room: RoomState, yourSeat: number) => void
  onGameStart: (state: GameState, yourSeat: number) => void
  onGameSync: (state: GameState) => void
  onError: (err: string) => void
  onChat?: (senderName: string, text: string) => void
}

export class HostManager {
  private peer: Peer | null = null
  private connections: Map<number, DataConnection> = new Map() // seat -> connection
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
      if (this.roomState.started) {
        conn.send({ type: 'ERROR', message: '對局已在進行中，無法加入！' } satisfies HostMessage)
        conn.close()
        return
      }

      // 尋找可用的空位（優先找尚未連線的 slot）
      const freeSlotIndex = this.roomState.slots.findIndex((s, idx) => idx > 0 && !s.connected)
      if (freeSlotIndex === -1) {
        conn.send({ type: 'ERROR', message: '房間已滿員！' } satisfies HostMessage)
        conn.close()
        return
      }

      const slot = this.roomState.slots[freeSlotIndex]!
      slot.connected = true
      slot.peerId = conn.peer
      slot.name = msg.name.trim() || `玩家${slot.seat + 1}`
      slot.kind = 'remote'

      this.connections.set(slot.seat, conn)
      this.broadcastRoomUpdate()
      return
    }

    if (msg.type === 'ACTION') {
      // 找出此連線對應的座位
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
      let senderName = '玩家'
      for (const s of this.roomState.slots) {
        if (s.peerId === conn.peer) {
          senderName = s.name
          break
        }
      }
      this.broadcastMessage({ type: 'CHAT', senderName, text: msg.text })
      this.callbacks.onChat?.(senderName, msg.text)
    }
  }

  private handleGuestDisconnect(conn: DataConnection) {
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

  public setLessonId(id: string) {
    this.roomState.lessonId = id
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
  private yourSeat: number = -1

  constructor(roomCode: string, guestName: string, callbacks: GuestCallbacks) {
    this.callbacks = callbacks
    this.guestName = guestName.trim() || '訪客'
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
      this.callbacks.onRoomUpdate(msg.roomState, msg.yourSeat)
      return
    }

    if (msg.type === 'GAME_START') {
      this.yourSeat = msg.yourSeat
      this.callbacks.onGameStart(msg.state, msg.yourSeat)
      return
    }

    if (msg.type === 'GAME_SYNC') {
      this.callbacks.onGameSync(msg.state)
      return
    }

    if (msg.type === 'CHAT') {
      this.callbacks.onChat?.(msg.senderName, msg.text)
    }
  }

  public sendAction(action: GameAction) {
    if (this.hostConn?.open) {
      this.hostConn.send({ type: 'ACTION', action } satisfies ClientMessage)
    }
  }

  public sendChat(text: string) {
    if (this.hostConn?.open) {
      this.hostConn.send({ type: 'CHAT', text } satisfies ClientMessage)
    }
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
