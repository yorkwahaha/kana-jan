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

    // 上方對家直向下箭頭從面板外緣開始
    expect(html).toContain('M 500,152 L 500,216')
    // 左右兩側箭頭從面板內緣之外走外圍弧線
    expect(html).toContain('M 286,414 Q 306,508 365,536')
    expect(html).toContain('M 714,414 Q 694,508 635,536')

    // 箭頭三角形尖端與白色描邊
    expect(html).toContain('<polygon')
    expect(html).toContain('stroke="#ffffff"')
    expect(html.match(/class="flying-coin-item"/g)).toHaveLength(15)
    expect(html.match(/class="flying-coin-aura"/g)).toHaveLength(15)
  })

  it('renders single ron arrow when only one player pays', () => {
    const transfers = [{ fromId: 'p1', toId: 'p0', amount: 480 }]
    const html = renderToString(
      <SettlementArrows transfers={transfers} players={PLAYERS} mySeat={0} />,
    )
    expect(html).toContain('M 286,414 Q 306,508 365,536')
    expect(html).not.toContain('M 500,152 L 500,216')
    expect(html).toContain('data-coin-count="7"')
    expect(html.match(/class="flying-coin-item"/g)).toHaveLength(7)
  })
})
