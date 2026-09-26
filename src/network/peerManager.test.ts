import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DataConnection } from 'peerjs'
import { startGame } from '../engine/game'

vi.mock('peerjs', () => ({
  Peer: class {
    on() {}
    destroy() {}
  },
}))

import { GuestManager, HostManager, MAX_SPECTATORS } from './peerManager'
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
  resumeTokens: Map<number, string>
  roomState: { started: boolean }
  startGame: HostManager['startGame']
}

function createHost(): TestHost {
  return new HostManager('KANA-7X89AB', '房主', 'a', {
    onRoomChange: () => undefined,
    onClientAction: () => undefined,
    onError: () => undefined,
  }) as unknown as TestHost
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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
    host.roomState.started = true

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

  it('成功重連後會旋轉 resume token，舊 token 不再是現行憑證', () => {
    const host = createHost()
    const first = connection('peer-a')
    host.handleGuestMessage(first, { type: 'JOIN', name: 'A', peerId: 'peer-a' })
    const oldToken = host.resumeTokens.get(1)
    expect(oldToken).toMatch(/^[a-f0-9]{32}$/)

    host.roomState.started = true
    host.handleGuestDisconnect(first)
    const reconnected = connection('peer-a-new')
    host.handleGuestMessage(reconnected, {
      type: 'JOIN',
      name: 'A',
      peerId: 'peer-a-new',
      resumePlayerId: 'p1',
      resumeToken: oldToken,
    })

    const rotated = host.resumeTokens.get(1)
    expect(rotated).toMatch(/^[a-f0-9]{32}$/)
    expect(rotated).not.toBe(oldToken)
  })

  it('安全亂數失敗時 startGame 不會清掉既有 token 或半啟動房間', () => {
    const host = createHost()
    const conn = connection('peer-a')
    host.handleGuestMessage(conn, { type: 'JOIN', name: 'A', peerId: 'peer-a' })
    const oldToken = host.resumeTokens.get(1)
    const state = startGame({ seed: 21, skipPreview: true })

    vi.stubGlobal('crypto', {})
    expect(host.startGame(state)).toBe(false)
    expect(host.roomState.started).toBe(false)
    expect(host.resumeTokens.get(1)).toBe(oldToken)
  })

  it('重連 token 旋轉失敗時保留舊憑證且不接管座位', () => {
    const host = createHost()
    const first = connection('peer-a')
    host.handleGuestMessage(first, { type: 'JOIN', name: 'A', peerId: 'peer-a' })
    const oldToken = host.resumeTokens.get(1)!
    host.roomState.started = true
    host.handleGuestDisconnect(first)

    vi.stubGlobal('crypto', {})
    const reconnect = connection('peer-new')
    host.handleGuestMessage(reconnect, {
      type: 'JOIN',
      name: 'A',
      peerId: 'peer-new',
      resumePlayerId: 'p1',
      resumeToken: oldToken,
    })

    expect(reconnect.close).toHaveBeenCalled()
    expect(host.resumeTokens.get(1)).toBe(oldToken)
    expect(host.getRoomState().slots[1]?.connected).toBe(false)
  })

  it('guest 端也限制房主短時間大量訊息', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    const guest = new GuestManager('KANA-7X89AB', 'A', {
      onRoomUpdate: () => undefined,
      onGameStart: () => undefined,
      onGameSync: () => undefined,
      onError: () => undefined,
    }) as unknown as { allowHostInboundMessage: () => boolean }

    for (let i = 0; i < 40; i++) expect(guest.allowHostInboundMessage()).toBe(true)
    expect(guest.allowHostInboundMessage()).toBe(false)
  })
})

