import { describe, expect, it } from 'vitest'
import { startGame } from '../engine/game'
import { isPersistentGameState } from '../engine/stateValidation'
import { makeHiddenCard, maskStateForPlayer } from './mask'
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
    expect(state.deck).toHaveLength(0)
    const parsed = parseHostMessage({ type: 'GAME_SYNC', state, spectating: false })
    expect(parsed).not.toBeNull()
    if (parsed?.type === 'GAME_SYNC') expect(parsed.state.deck).toHaveLength(state.deckCount)

    const badGold = structuredClone(state) as unknown as { players: Array<{ gold: unknown }> }
    badGold.players[0]!.gold = '1000'
    expect(parseHostMessage({ type: 'GAME_SYNC', state: badGold, spectating: false })).toBeNull()

    const badPhase = { ...state, phase: 'not-a-phase' }
    expect(parseHostMessage({ type: 'GAME_SYNC', state: badPhase, spectating: false })).toBeNull()

    const duplicateCard = structuredClone(state)
    duplicateCard.players[0]!.hand[1] = duplicateCard.players[0]!.hand[0]!
    expect(parseHostMessage({ type: 'GAME_SYNC', state: duplicateCard, spectating: false })).toBeNull()

    const oversizedHand = structuredClone(state)
    oversizedHand.players[0]!.hand.push(
      makeHiddenCard('hidden-0-7'),
      makeHiddenCard('hidden-0-8'),
    )
    expect(parseHostMessage({ type: 'GAME_SYNC', state: oversizedHand, spectating: false })).toBeNull()

    const badBonus = structuredClone(state)
    badBonus.bonus.cardId = 'not-a-real-card'
    expect(parseHostMessage({ type: 'GAME_SYNC', state: badBonus, spectating: false })).toBeNull()

    const stuckReview = structuredClone(state)
    stuckReview.phase = 'review'
    stuckReview.pendingScore = null
    expect(parseHostMessage({ type: 'GAME_SYNC', state: stuckReview, spectating: false })).toBeNull()
  })

  it('抄牌階段：本人、其他三席及觀戰者都能通過完整 GAME_SYNC 驗證', () => {
    const game = startGame({ seed: 123, skipPreview: true })
    game.phase = 'reaction'
    game.reactionOptions = [{ playerId: game.players[1]!.id }]
    game.reactionIndex = 0
    for (const seat of [0, 1, 2, 3, -1]) {
      const masked = maskStateForPlayer(game, seat)
      // 模擬真正走網路 JSON 序列化後，接收端的 parseHostMessage。
      const wire = JSON.parse(JSON.stringify({
        type: 'GAME_SYNC',
        state: masked,
        spectating: seat < 0,
      }))
      const parsed = parseHostMessage(wire)
      expect(parsed?.type, `seat ${seat} 不能被忽略`).toBe('GAME_SYNC')
      if (parsed?.type !== 'GAME_SYNC') continue
      expect(parsed.state.phase).toBe('reaction')
      expect(parsed.state.reactionOptions[0]?.playerId).toBe(
        seat === 1 ? game.players[1]!.id : '__private_reaction__',
      )
    }
  })

  it('佔位 ID 只能用在網路 reaction 階段，仍拒絕任意假玩家身分', () => {
    const game = startGame({ seed: 123, skipPreview: true })
    game.phase = 'reaction'
    game.reactionOptions = [{ playerId: game.players[1]!.id }]
    const masked = maskStateForPlayer(game, 0)
    const invalid = { ...masked, reactionOptions: [{ playerId: 'unknown_player' }] }
    expect(parseHostMessage({ type: 'GAME_SYNC', state: invalid, spectating: false })).toBeNull()
    const invalidPhase = { ...masked, phase: 'playerDraw' }
    expect(parseHostMessage({ type: 'GAME_SYNC', state: invalidPhase, spectating: false })).toBeNull()
    const mixed = { ...masked, reactionOptions: [
      { playerId: '__private_reaction__' }, { playerId: game.players[2]!.id },
    ] }
    expect(parseHostMessage({ type: 'GAME_SYNC', state: mixed, spectating: false })).toBeNull()
    const invalidSave = { ...game, reactionOptions: [{ playerId: '__private_reaction__' }] }
    expect(isPersistentGameState(invalidSave)).toBe(false)
  })
})
