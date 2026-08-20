/** 從畫面下方玩家看出去，順時針為：自己 → 左 → 對家 → 右 */
export type TablePosition = 'human' | 'right' | 'top' | 'left'

export function tablePosition(seat: number): TablePosition {
  switch (seat) {
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

/** SVG viewBox 100×100 上各座位與桌心座標 */
export const TABLE_POINTS: Record<TablePosition | 'center', { x: number; y: number }> = {
  human: { x: 50, y: 90 },
  right: { x: 90, y: 48 },
  top: { x: 50, y: 10 },
  left: { x: 10, y: 48 },
  center: { x: 50, y: 48 },
}
