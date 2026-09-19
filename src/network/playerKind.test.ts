import { describe, expect, it } from 'vitest'
import { findFreeGuestSlotIndex, playerKindFromRoomSlot } from './playerKind'
import type { RoomSlot } from './types'

function slot(partial: Partial<RoomSlot> & Pick<RoomSlot, 'seat'>): RoomSlot {
  return {
    playerId: `p${partial.seat}`,
    name: partial.name ?? `座位${partial.seat}`,
    kind: 'remote',
    isHost: false,
    connected: false,
    ...partial,
  }
}

describe('playerKindFromRoomSlot', () => {
  it('房主永遠是 human', () => {
    expect(
      playerKindFromRoomSlot(
        slot({ seat: 0, isHost: true, kind: 'human', connected: true, name: '房主' }),
      ),
    ).toBe('human')
  })

  it('已連線的真人（有 peerId）即使 slot.kind 誤標為 ai，也必須是 remote', () => {
    const guest = slot({
      seat: 1,
      kind: 'ai',
      connected: true,
      peerId: 'guest-peer-1',
      name: '朋友A',
    })
    expect(playerKindFromRoomSlot(guest)).toBe('remote')
    expect(playerKindFromRoomSlot(guest, new Set([1]))).toBe('remote')
  })

  it('HostManager 連線表裡的座位視為 remote', () => {
    const guest = slot({ seat: 2, kind: 'ai', connected: true, name: '朋友B' })
    expect(playerKindFromRoomSlot(guest, new Set([2]))).toBe('remote')
  })

  it('無真人連線的 AI 補位維持 ai', () => {
    expect(
      playerKindFromRoomSlot(slot({ seat: 3, kind: 'ai', connected: true, name: '電腦' })),
    ).toBe('ai')
  })

  it('無人加入的空位開局時改由 AI 補上，避免永遠等待幽靈 remote', () => {
    expect(playerKindFromRoomSlot(slot({ seat: 2, kind: 'remote', connected: false }))).toBe('ai')
  })
})

describe('findFreeGuestSlotIndex', () => {
  const slots: RoomSlot[] = [
    slot({ seat: 0, isHost: true, kind: 'human', connected: true, name: '房主' }),
    slot({ seat: 1, kind: 'ai', connected: true, name: '電腦' }),
    slot({ seat: 2, kind: 'remote', connected: false, name: '等待玩家加入...' }),
    slot({ seat: 3, kind: 'remote', connected: false, name: '等待玩家加入...' }),
  ]

  it('不會把已標 AI 的座位分給加入的真人', () => {
    expect(findFreeGuestSlotIndex(slots)).toBe(2)
  })

  it('已有連線的座位不可再分配', () => {
    expect(findFreeGuestSlotIndex(slots, new Set([2]))).toBe(3)
  })

  it('沒有空位時回傳 -1', () => {
    const full = slots.map((s, i) => (i === 0 ? s : { ...s, kind: 'ai' as const, connected: true }))
    expect(findFreeGuestSlotIndex(full)).toBe(-1)
  })
})
