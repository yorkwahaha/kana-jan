import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { SettlementArrows } from './SettlementArrows'
import type { PlayerState } from '../engine/types'

const PLAYERS: PlayerState[] = [
  { id: 'p0', name: 'ハヤト', kind: 'human', seat: 0, aiDifficulty: 'normal', gold: 1780, score: 0, hand: [], discards: [], completed: [] },
  { id: 'p1', name: '遊裡吟', kind: 'ai', seat: 1, aiDifficulty: 'normal', gold: 270, score: 0, hand: [], discards: [], completed: [] },
  { id: 'p2', name: 'のん', kind: 'ai', seat: 2, aiDifficulty: 'normal', gold: 1110, score: 0, hand: [], discards: [], completed: [] },
  { id: 'p3', name: 'aki', kind: 'ai', seat: 3, aiDifficulty: 'normal', gold: 840, score: 0, hand: [], discards: [], completed: [] },
]

describe('SettlementArrows (圖三重新設計)', () => {
  it('returns null when transfers is empty', () => {
    const html = renderToString(
      <SettlementArrows transfers={[]} players={PLAYERS} mySeat={0} />,
    )
    expect(html).toBe('')
  })

  it('renders all three incoming arrows for tsumo win (参照圖三：上方直箭頭、左右兩側外圍弧線箭頭)', () => {
    // p1 (left), p2 (top), p3 (right) 支付給 p0 (human)
    const transfers = [
      { fromId: 'p2', toId: 'p0', amount: 160 },
      { fromId: 'p1', toId: 'p0', amount: 160 },
      { fromId: 'p3', toId: 'p0', amount: 160 },
    ]

    const html = renderToString(
      <SettlementArrows transfers={transfers} players={PLAYERS} mySeat={0} />,
    )

    expect(html).toContain('settlement-arrows-layer')
    expect(html).toContain('settlement-svg')

    // 上方對家直向下箭頭路徑
    expect(html).toContain('M 500,118 L 500,175')
    // 左側外圍弧形箭頭路徑
    expect(html).toContain('M 240,415 Q 270,525 345,545')
    // 右側外圍弧形箭頭路徑
    expect(html).toContain('M 760,415 Q 730,525 655,545')

    // 箭頭三角形尖端與白色描邊
    expect(html).toContain('<polygon')
    expect(html).toContain('stroke="#ffffff"')
  })

  it('renders single ron arrow when only one player pays', () => {
    const transfers = [{ fromId: 'p1', toId: 'p0', amount: 480 }]
    const html = renderToString(
      <SettlementArrows transfers={transfers} players={PLAYERS} mySeat={0} />,
    )
    expect(html).toContain('M 240,415 Q 270,525 345,545')
    expect(html).not.toContain('M 500,118 L 500,175')
  })
})
