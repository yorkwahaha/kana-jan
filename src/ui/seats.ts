import type { PlayerState } from '../engine/types'

/** 從畫面下方玩家看出去，順時針為：自己 → 左 → 對家 → 右 */
export type TablePosition = 'human' | 'right' | 'top' | 'left'

export function tablePosition(seat: number, mySeat = 0): TablePosition {
  const rel = (seat - mySeat + 4) % 4
  switch (rel) {
    case 1:
      return 'left'
    case 2:
      return 'top'
    case 3:
      return 'right'
    default:
      return 'human'
  }
}

/** 依據視角（mySeat），將 4 位玩家映射至「下（自己）、左（下家）、上（對家）、右（上家）」 */
export function playersByPerspective(players: PlayerState[], mySeat = 0): {
  human: PlayerState
  left: PlayerState
  top: PlayerState
  right: PlayerState
} {
  const byPos: Partial<Record<TablePosition, PlayerState>> = {}
  for (const p of players) {
    byPos[tablePosition(p.seat, mySeat)] = p
  }
  return {
    human: byPos.human ?? players[0]!,
    left: byPos.left ?? players[1]!,
    top: byPos.top ?? players[2]!,
    right: byPos.right ?? players[3]!,
  }
}

/** SVG viewBox 100×100 上各座位與桌心座標 */
export const TABLE_POINTS: Record<TablePosition | 'center', { x: number; y: number }> = {
  human: { x: 50, y: 90 },
  right: { x: 90, y: 48 },
  top: { x: 50, y: 10 },
  left: { x: 10, y: 48 },
  center: { x: 50, y: 48 },
}
