import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RoomLobby } from './RoomLobby'
import type { RoomState } from '../network/types'

const mockRoomState: RoomState = {
  roomId: 'TEST-1234',
  hostPeerId: 'peer-host',
  lessonId: 'random-4',
  aiDifficulty: 'normal',
  slots: [
    { seat: 0, playerId: 'p0', name: '房主', kind: 'human', isHost: true, connected: true },
    { seat: 1, playerId: 'p1', name: '等待玩家加入...', kind: 'remote', isHost: false, connected: false },
    { seat: 2, playerId: 'p2', name: '等待玩家加入...', kind: 'remote', isHost: false, connected: false },
    { seat: 3, playerId: 'p3', name: '等待玩家加入...', kind: 'remote', isHost: false, connected: false },
  ],
  started: false,
}

describe('RoomLobby', () => {
  it('renders deck selection select dropdown when user is host', () => {
    const html = renderToString(
      <RoomLobby
        roomState={mockRoomState}
        mySeat={0}
        isHost={true}
        onStartGame={vi.fn()}
        onLeaveRoom={vi.fn()}
        onToggleSlotAi={vi.fn()}
        onSelectLesson={vi.fn()}
      />,
    )
    expect(html).toContain('登場牌組')
    expect(html).toContain('room-lesson-select')
    expect(html).toContain('random-4')
    expect(html).toContain('seion-4')
  })

  it('renders static deck label without select dropdown when user is guest', () => {
    const html = renderToString(
      <RoomLobby
        roomState={mockRoomState}
        mySeat={1}
        isHost={false}
        onStartGame={vi.fn()}
        onLeaveRoom={vi.fn()}
        onToggleSlotAi={vi.fn()}
      />,
    )
    expect(html).toContain('登場牌組')
    expect(html).toContain('room-lesson-current')
    expect(html).not.toContain('room-lesson-select')
    expect(html).toContain('隨機 4 行')
  })
})
