import type { PlayerKind } from '../engine/types'
import type { RoomSlot } from './types'

/**
 * 將房間座位轉成開局用的玩家種類。
 *
 * 真人連線（Peer 仍在 / 有 peerId）永遠優先於「由 AI 補位」旗標，
 * 避免加入成功後因過期 roomState 或補位競態被標成 ai，變成「自己能出牌、Host 的 AI 也代打」。
 */
export function playerKindFromRoomSlot(
  slot: RoomSlot,
  connectedSeats: ReadonlySet<number> = new Set(),
): PlayerKind {
  if (slot.isHost) return 'human'
  if (connectedSeats.has(slot.seat) || Boolean(slot.peerId)) return 'remote'
  if (slot.kind === 'ai') return 'ai'
  if (slot.connected) return 'remote'
  // 未入座的空位：開局時改由 AI 補上，避免 Host 永遠等一個不存在的 remote
  return 'ai'
}

/** 找出可供真人加入的空位（不可搶走已標 AI、已有連線或房主座位） */
export function findFreeGuestSlotIndex(
  slots: readonly RoomSlot[],
  connectedSeats: ReadonlySet<number> = new Set(),
): number {
  return slots.findIndex(
    (slot, idx) =>
      idx > 0 &&
      !slot.isHost &&
      slot.kind !== 'ai' &&
      !slot.peerId &&
      !connectedSeats.has(slot.seat) &&
      !slot.connected,
  )
}
