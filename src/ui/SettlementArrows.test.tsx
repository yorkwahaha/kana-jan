import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import {
  SettlementArrows,
  getCoinMotionParams,
  getSettlementArrowGeom,
  settlementAssetUrl,
} from './SettlementArrows'
import type { PlayerState } from '../engine/types'

const PLAYERS: PlayerState[] = [
  { id: 'p0', name: 'ハヤト', kind: 'human', seat: 0, aiDifficulty: 'normal', gold: 1780, score: 0, hand: [], discards: [], completed: [] },
  { id: 'p1', name: '遊裡吟', kind: 'ai', seat: 1, aiDifficulty: 'normal', gold: 270, score: 0, hand: [], discards: [], completed: [] },
  { id: 'p2', name: 'のん', kind: 'ai', seat: 2, aiDifficulty: 'normal', gold: 1110, score: 0, hand: [], discards: [], completed: [] },
  { id: 'p3', name: 'aki', kind: 'ai', seat: 3, aiDifficulty: 'normal', gold: 840, score: 0, hand: [], discards: [], completed: [] },
]

function firstLinePoint(path: string): { x: number; y: number } {
  const match = path.match(/^M\s+([\d.]+),([\d.]+)/)
  if (!match) throw new Error(`Cannot parse path ${path}`)
  return { x: Number(match[1]), y: Number(match[2]) }
}

function lastLinePoint(path: string): { x: number; y: number } {
  const match = path.match(/([\d.]+),([\d.]+)\s*$/)
  if (!match) throw new Error(`Cannot parse path end ${path}`)
  return { x: Number(match[1]), y: Number(match[2]) }
}

describe('SettlementArrows (圖三重新設計)', () => {
  it('結算箭頭資源會套用 Vite 子路徑前綴', () => {
    expect(settlementAssetUrl('/assets/ui/settlement-arrow-straight.svg', '/kana-jan/')).toBe(
      '/kana-jan/assets/ui/settlement-arrow-straight.svg',
    )
  })

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

    const top = getSettlementArrowGeom('top', 'human')!
    const left = getSettlementArrowGeom('left', 'human')!
    const right = getSettlementArrowGeom('right', 'human')!
    expect(html).toContain(top.coinPath)
    expect(html).toContain(left.coinPath)
    expect(html).toContain(right.coinPath)
    expect(html).toContain('/assets/ui/settlement-arrow-straight.svg')
    expect(html).toContain('/assets/ui/settlement-arrow-curve.svg')
    expect(html.match(/class="settlement-arrow-art"/g)).toHaveLength(3)
    expect(html).not.toContain('<marker')
    expect(html).not.toContain('<polygon')
    expect(html.match(/class="flying-coin-item"/g)).toHaveLength(15)
    expect(html.match(/class="flying-coin-aura"/g)).toHaveLength(15)
  })

  it('renders single ron arrow when only one player pays', () => {
    const transfers = [{ fromId: 'p1', toId: 'p0', amount: 480 }]
    const html = renderToString(
      <SettlementArrows transfers={transfers} players={PLAYERS} mySeat={0} />,
    )
    const left = getSettlementArrowGeom('left', 'human')!
    const top = getSettlementArrowGeom('top', 'human')!
    expect(html).toContain(left.coinPath)
    expect(html).not.toContain(top.coinPath)
    expect(html).toContain('data-coin-count="7"')
    expect(html.match(/class="flying-coin-item"/g)).toHaveLength(7)
  })

  it('uses full payer-to-winner coin arcs beside the center island', () => {
    const top = getSettlementArrowGeom('top', 'human')!
    const left = getSettlementArrowGeom('left', 'human')!
    const across = getSettlementArrowGeom('right', 'left')!

    const topStart = firstLinePoint(top.coinPath)
    const topEnd = lastLinePoint(top.coinPath)
    expect(top.coinPath).toContain(' C ')
    expect(topStart).toEqual({ x: 500, y: 154 })
    expect(topEnd).toEqual({ x: 500, y: 546 })
    expect(Math.abs(topEnd.y - topStart.y)).toBeGreaterThan(350)

    const leftStart = firstLinePoint(left.coinPath)
    const leftEnd = lastLinePoint(left.coinPath)
    expect(leftStart).toEqual({ x: 286, y: 350 })
    expect(leftEnd).toEqual({ x: 456, y: 548 })

    const acrossStart = firstLinePoint(across.coinPath)
    const acrossEnd = lastLinePoint(across.coinPath)
    expect(across.coinPath).toContain(' C ')
    expect(acrossStart).toEqual({ x: 714, y: 350 })
    expect(acrossEnd).toEqual({ x: 286, y: 350 })
    expect(across.arrowAsset).toBe('/assets/ui/settlement-arrow-arc.svg')
  })

  it('keeps top/bottom-to-side arrows in the outer corridors', () => {
    const topToLeft = getSettlementArrowGeom('top', 'left')!
    const humanToLeft = getSettlementArrowGeom('human', 'left')!
    const topToRight = getSettlementArrowGeom('top', 'right')!
    const humanToRight = getSettlementArrowGeom('human', 'right')!

    // The center result window occupies roughly x=380..620 in the 1000-unit viewBox.
    // 左側圖稿經 translate(570) + scale(-1) 翻轉，顯示後右緣為 570 - x。
    expect(570 - topToLeft.arrowBox.x).toBeLessThanOrEqual(380)
    expect(570 - humanToLeft.arrowBox.x).toBeLessThanOrEqual(380)
    expect(topToRight.arrowBox.x).toBeGreaterThanOrEqual(620)
    expect(humanToRight.arrowBox.x).toBeGreaterThanOrEqual(620)

    expect(topToLeft.arrowAsset).toBe('/assets/ui/settlement-arrow-outer-corner.svg')
    expect(humanToLeft.arrowAsset).toBe('/assets/ui/settlement-arrow-outer-corner.svg')
    expect(topToRight.arrowAsset).toBe('/assets/ui/settlement-arrow-outer-corner.svg')
    expect(humanToRight.arrowAsset).toBe('/assets/ui/settlement-arrow-outer-corner.svg')

    expect(firstLinePoint(topToLeft.coinPath).x).toBeLessThan(500)
    expect(firstLinePoint(humanToLeft.coinPath).x).toBeLessThan(500)
    expect(firstLinePoint(topToRight.coinPath).x).toBeGreaterThan(500)
    expect(firstLinePoint(humanToRight.coinPath).x).toBeGreaterThan(500)

    // Top and bottom routes enter each side vertically from opposite outer edges.
    expect(lastLinePoint(topToLeft.coinPath)).toEqual({ x: 225, y: 315 })
    expect(lastLinePoint(humanToLeft.coinPath)).toEqual({ x: 225, y: 385 })
    expect(lastLinePoint(topToRight.coinPath)).toEqual({ x: 775, y: 315 })
    expect(lastLinePoint(humanToRight.coinPath)).toEqual({ x: 775, y: 385 })
    expect(topToRight.arrowBox.transform).toBeUndefined()
    expect(humanToRight.arrowBox.transform).toBe('translate(0 950) scale(1 -1)')
  })

  it('shrinks the four outer-corner arrows by 20% and moves them toward their corners', () => {
    const topLeft = getSettlementArrowGeom('top', 'left')!
    const bottomLeft = getSettlementArrowGeom('human', 'left')!
    const topRight = getSettlementArrowGeom('top', 'right')!
    const bottomRight = getSettlementArrowGeom('human', 'right')!

    for (const geom of [topLeft, bottomLeft, topRight, bottomRight]) {
      expect(geom.arrowBox.width).toBe(152)
      expect(geom.arrowBox.height).toBe(144)
    }

    // 1000-unit viewBox 在參考圖寬度下，20 units 約等於 30 CSS px。
    expect(topLeft.arrowBox).toMatchObject({ x: 248, y: 115 })
    expect(bottomLeft.arrowBox).toMatchObject({ x: 248, y: 401 })
    expect(topRight.arrowBox).toMatchObject({ x: 640, y: 115 })
    expect(bottomRight.arrowBox).toMatchObject({ x: 640, y: 401 })
  })

  it('uses one-piece SVG artwork instead of a stroked line plus marker head', () => {
    const html = renderToString(
      <SettlementArrows
        transfers={[{ fromId: 'p2', toId: 'p0', amount: 160 }]}
        players={PLAYERS}
        mySeat={0}
      />,
    )

    expect(html).toContain('<image')
    expect(html).toContain('class="settlement-arrow-art"')
    expect(html).toContain('href="/assets/ui/settlement-arrow-straight.svg"')
    expect(html).not.toContain('<marker')
    expect(html).not.toContain('marker-end')
    expect(html).not.toContain('<polygon')
    expect(html).not.toContain('settlement-arrow-body')
  })

  it('renders larger coins with heterogeneous deterministic motion metadata', () => {
    const html = renderToString(
      <SettlementArrows
        transfers={[{ fromId: 'p1', toId: 'p0', amount: 480 }]}
        players={PLAYERS}
        mySeat={0}
      />,
    )

    expect(html).toContain('rx="26"')
    expect(html).toContain('ry="19.5"')
    expect(html).toContain('r="40"')

    const delays = [...html.matchAll(/data-coin-delay="([^"]+)"/g)].map((m) => m[1])
    const durations = [...html.matchAll(/data-coin-duration="([^"]+)"/g)].map((m) => m[1])
    const scales = [...html.matchAll(/data-coin-scale="([^"]+)"/g)].map((m) => m[1])
    const wobbles = [...html.matchAll(/data-coin-wobble="([^"]+)"/g)].map((m) => m[1])
    const spins = [...html.matchAll(/data-coin-spin="([^"]+)"/g)].map((m) => m[1])
    const glows = [...html.matchAll(/data-coin-glow="([^"]+)"/g)].map((m) => m[1])

    expect(delays).toHaveLength(7)
    expect(new Set(delays).size).toBeGreaterThan(1)
    expect(new Set(durations).size).toBeGreaterThan(1)
    expect(new Set(scales).size).toBeGreaterThan(1)
    expect(new Set(wobbles).size).toBeGreaterThan(1)
    expect(new Set(spins).size).toBeGreaterThan(1)
    expect(new Set(glows).size).toBeGreaterThan(1)

    const first = getCoinMotionParams(0, 480)
    const second = getCoinMotionParams(1, 480)
    expect(getCoinMotionParams(0, 480)).toEqual(first)
    expect(second).not.toEqual(first)
    expect(html).toContain(`data-coin-delay="${first.delay}"`)
    expect(html).toContain(`data-coin-wobble="${first.wobble}"`)
  })
})
