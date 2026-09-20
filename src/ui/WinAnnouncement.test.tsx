import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { WinAnnouncement } from './WinAnnouncement'

describe('WinAnnouncement', () => {
  it('does not render when stage is idle or settlement', () => {
    const htmlIdle = renderToString(
      <WinAnnouncement winnerPos="human" stage="idle" />,
    )
    expect(htmlIdle).toBe('')

    const htmlSettlement = renderToString(
      <WinAnnouncement winnerPos="human" stage="settlement" />,
    )
    expect(htmlSettlement).toBe('')
  })

  it('renders KANA JAN! title and sparkles during cutin stage without extra portrait or Chinese text', () => {
    const html = renderToString(
      <WinAnnouncement winnerPos="human" stage="cutin" />,
    )
    expect(html).toContain('win-announcement-overlay')
    expect(html).toContain('pos-human')
    expect(html).toContain('is-visible')
    expect(html).toContain('KANA')
    expect(html).toContain('JAN!')
    // 驗證已刪除人物、多餘中文字與標籤列
    expect(html).not.toContain('POKA')
    expect(html).not.toContain('anime-cutin-portrait')
    expect(html).not.toContain('announcement-tag-bar')
    expect(html.match(/cutin-star/g)).toHaveLength(6)
    expect(html).not.toContain('top-center')
    expect(html).not.toContain('bottom-center')
  })

  it('supports different seat positions', () => {
    const htmlLeft = renderToString(
      <WinAnnouncement winnerPos="left" stage="cutin" />,
    )
    expect(htmlLeft).toContain('pos-left')
  })
})
