import { describe, expect, it } from 'vitest'
import { startGame } from '../engine/game'
import { maskStateForPlayer } from './mask'
import { parseClientMessage, parseHostMessage } from './protocol'

describe('PeerJS protocol runtime validation', () => {
  it('拒絕欄位型態錯誤與非白名單 ACTION', () => {
    expect(parseClientMessage({ type: 'JOIN', name: {}, peerId: 'peer-a' })).toBeNull()
    expect(parseClientMessage({ type: 'CHAT', text: {} })).toBeNull()
    expect(parseClientMessage({ type: 'ACTION' })).toBeNull()
    expect(parseClientMessage({ type: 'ACTION', action: { type: 'START' } })).toBeNull()
    expect(parseClientMessage({ type: 'ACTION', action: { type: 'DISCARD', cardId: 123 } })).toBeNull()
  })

  it('接受合法客端動作', () => {
    expect(parseClientMessage({ type: 'ACTION', action: { type: 'DISCARD', cardId: 'a-hiragana' } })).toEqual({
      type: 'ACTION',
      action: { type: 'DISCARD', cardId: 'a-hiragana' },
    })
    expect(parseClientMessage({ type: 'ACTION', action: { type: 'PASS_CLAIM' } })).toEqual({
      type: 'ACTION',
      action: { type: 'PASS_CLAIM' },
    })
  })

  it('拒絕畸形房主同步，接受合法遮罩狀態', () => {
    expect(parseHostMessage({ type: 'GAME_SYNC', state: {} })).toBeNull()
    const state = maskStateForPlayer(startGame({ seed: 7, skipPreview: true }), 0)
    expect(parseHostMessage({ type: 'GAME_SYNC', state, spectating: false })).not.toBeNull()

    const badGold = structuredClone(state) as unknown as { players: Array<{ gold: unknown }> }
    badGold.players[0]!.gold = '1000'
    expect(parseHostMessage({ type: 'GAME_SYNC', state: badGold, spectating: false })).toBeNull()

    const badPhase = { ...state, phase: 'not-a-phase' }
    expect(parseHostMessage({ type: 'GAME_SYNC', state: badPhase, spectating: false })).toBeNull()
  })
})
