import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { startGame } from '../engine/game'
import { ReferenceDrawer } from './ReferenceDrawer'

describe('ReferenceDrawer 一行揃い', () => {
  it('や・わ行課程沒有五音行時不顯示滿貫 480／1800', () => {
    const state = startGame({ seed: 1, lessonId: 'ya-wa', skipPreview: true })
    const html = renderToString(
      <ReferenceDrawer state={state} isOpen initialTab="yaku" onClose={() => {}} />,
    )
    expect(html).toContain('本局沒有五音行')
    expect(html).toContain('本局不成役')
    expect(html).not.toContain('1800')

    const bonus = renderToString(
      <ReferenceDrawer state={state} isOpen initialTab="bonus" onClose={() => {}} />,
    )
    expect(bonus).toContain('本局沒有五音行，無法成役')
    expect(bonus).not.toContain('1800')
  })

  it('單行五音課程顯示調降後的 180／480', () => {
    const state = startGame({ seed: 1, lessonId: 'a', skipPreview: true })
    const html = renderToString(
      <ReferenceDrawer state={state} isOpen initialTab="yaku" onClose={() => {}} />,
    )
    expect(html).toContain('混色 180 / 純色 480')
    expect(html).toContain('分數已調降')
  })
})
