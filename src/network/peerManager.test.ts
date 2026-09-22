import { describe, expect, it, vi } from 'vitest'
import type { DataConnection } from 'peerjs'

vi.mock('peerjs', () => ({
  Peer: class {
    on() {}
    destroy() {}
  },
}))

import { HostManager, MAX_SPECTATORS } from './peerManager'
import type { ClientMessage } from './types'

function connection(peer: string) {
  return {
    peer,
    open: true,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as DataConnection
}

type TestHost = {
  handleGuestMessage: (conn: DataConnection, msg: ClientMessage) => void
  handleGuestDisconnect: (conn: DataConnection) => void
  getRoomState: () => ReturnType<HostManager['getRoomState']>
}

function createHost(): TestHost {
  return new HostManager('KANA-7X89', '房主', 'a', {
    onRoomChange: () => undefined,
    onClientAction: () => undefined,
    onError: () => undefined,
  }) as unknown as TestHost
}

describe('HostManager connection identity', () => {
  it('同一 connection 重複 JOIN 不會再佔第二個座位', () => {
    const host = createHost()
    const conn = connection('peer-a')
    const join: ClientMessage = { type: 'JOIN', name: 'A', peerId: 'peer-a' }

    host.handleGuestMessage(conn, join)
    host.handleGuestMessage(conn, join)

    const occupied = host.getRoomState().slots.filter((slot) => slot.peerId === 'peer-a')
    expect(occupied).toHaveLength(1)
    expect(occupied[0]?.seat).toBe(1)
  })

  it('開局後觀戰連線有固定上限，超額連線會被拒絕', () => {
    const host = createHost()
    ;(host as unknown as { roomState: { started: boolean } }).roomState.started = true

    const spectators = Array.from({ length: MAX_SPECTATORS + 1 }, (_, index) => connection(`spectator-${index}`))
    spectators.forEach((conn, index) => {
      host.handleGuestMessage(conn, { type: 'JOIN', name: `S${index}`, peerId: conn.peer })
    })

    expect(spectators.at(-1)?.close).toHaveBeenCalledOnce()
    expect(spectators.at(-1)?.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'ERROR' }))
    expect(spectators.slice(0, MAX_SPECTATORS).every((conn) => !vi.mocked(conn.close).mock.calls.length)).toBe(true)
  })

  it('同一 peer 的第二條 connection 不可再佔座，斷線只清自己的 connection', () => {
    const host = createHost()
    const first = connection('peer-a')
    const duplicate = connection('peer-a')
    const other = connection('peer-b')

    host.handleGuestMessage(first, { type: 'JOIN', name: 'A', peerId: 'peer-a' })
    host.handleGuestMessage(duplicate, { type: 'JOIN', name: 'A2', peerId: 'peer-a' })
    host.handleGuestMessage(other, { type: 'JOIN', name: 'B', peerId: 'peer-b' })

    expect(duplicate.close).toHaveBeenCalledOnce()
    expect(host.getRoomState().slots.filter((slot) => slot.peerId === 'peer-a')).toHaveLength(1)
    expect(host.getRoomState().slots.find((slot) => slot.peerId === 'peer-b')?.seat).toBe(2)

    host.handleGuestDisconnect(first)
    expect(host.getRoomState().slots[1]?.connected).toBe(false)
    expect(host.getRoomState().slots[2]?.connected).toBe(true)
  })
})
