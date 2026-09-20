import type { GameAction } from '../engine/game'
import type { AiDifficulty, GameState } from '../engine/types'

export interface RoomSlot {
  seat: number
  playerId: string
  peerId?: string
  name: string
  kind: 'human' | 'remote' | 'ai'
  isHost: boolean
  connected: boolean
}

export interface RoomState {
  roomId: string
  hostPeerId: string
  lessonId: string
  aiDifficulty: AiDifficulty
  slots: RoomSlot[]
  started: boolean
}

export type ClientMessage =
  | { type: 'JOIN'; name: string; peerId: string; resumePlayerId?: string; resumeToken?: string }
  | { type: 'LEAVE' }
  | { type: 'ACTION'; action: GameAction }
  | { type: 'CHAT'; text: string }

export type HostMessage =
  | { type: 'ROOM_UPDATE'; roomState: RoomState; yourSeat: number; spectating?: boolean; resumeToken?: string }
  | { type: 'GAME_START'; state: GameState; yourSeat: number; spectating?: boolean; resumeToken?: string }
  | { type: 'GAME_SYNC'; state: GameState; spectating?: boolean }
  | { type: 'ERROR'; message: string }
  | { type: 'CHAT'; senderName: string; text: string }
