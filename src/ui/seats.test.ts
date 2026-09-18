import { describe, expect, it } from 'vitest'
import { tablePosition, playersByPerspective } from './seats'
import type { PlayerState } from '../engine/types'

function mockPlayer(seat: number, name: string): PlayerState {
  return {
    id: `p${seat}`,
    name,
    kind: 'human',
    seat,
    aiDifficulty: 'normal',
    gold: 25,
    score: 0,
    hand: [],
    discards: [],
    completed: [],
  }
}

describe('seats perspective', () => {
  it('預設 mySeat=0 時保持原有方位', () => {
    expect(tablePosition(0)).toBe('human')
    expect(tablePosition(1)).toBe('left')
    expect(tablePosition(2)).toBe('top')
    expect(tablePosition(3)).toBe('right')
  })

  it('當自己是 seat 1 時，自己居中（human），下家 2 在左側，上家 0 在右側', () => {
    expect(tablePosition(1, 1)).toBe('human')
    expect(tablePosition(2, 1)).toBe('left')
    expect(tablePosition(3, 1)).toBe('top')
    expect(tablePosition(0, 1)).toBe('right')
  })

  it('當自己是 seat 2 時，旋轉視角', () => {
    expect(tablePosition(2, 2)).toBe('human')
    expect(tablePosition(3, 2)).toBe('left')
    expect(tablePosition(0, 2)).toBe('top')
    expect(tablePosition(1, 2)).toBe('right')
  })

  it('playersByPerspective 正確按視角排列玩家', () => {
    const players = [mockPlayer(0, 'P0'), mockPlayer(1, 'P1'), mockPlayer(2, 'P2'), mockPlayer(3, 'P3')]
    const viewForP2 = playersByPerspective(players, 2)
    expect(viewForP2.human.name).toBe('P2')
    expect(viewForP2.left.name).toBe('P3')
    expect(viewForP2.top.name).toBe('P0')
    expect(viewForP2.right.name).toBe('P1')
  })
})
