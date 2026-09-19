import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { WinAnnouncement } from './WinAnnouncement'
import type { PlayerState } from '../engine/types'

const MOCK_PLAYER: PlayerState = {
  id: 'p1',
  name: 'ハヤト',
  kind: 'human',
  seat: 0,
  aiDifficulty: 'normal',
  gold: 1500,
  score: 0,
  hand: [],
  discards: [],
  completed: [],
}

describe('WinAnnouncement', () => {
  it('does not render when stage is idle or settlement', () => {
    const htmlIdle = renderToString(
      <WinAnnouncement
        winner={MOCK_PLAYER}
        winnerPos="human"
        yakuLabel="同音三連"
        totalScore={400}
        isRon={false}
        stage="idle"
      />,
    )
    expect(htmlIdle).toBe('')

    const htmlSettlement = renderToString(
      <WinAnnouncement
        winner={MOCK_PLAYER}
        winnerPos="human"
        yakuLabel="同音三連"
        totalScore={400}
        isRon={false}
        stage="settlement"
      />,
    )
    expect(htmlSettlement).toBe('')
  })

  it('renders KANA JAN! title and sparkles during cutin stage without extra portrait or Chinese text', () => {
    const html = renderToString(
      <WinAnnouncement
        winner={MOCK_PLAYER}
        winnerPos="human"
        yakuLabel="五段"
        totalScore={600}
        isRon={true}
        payerName="遊裡吟"
        stage="cutin"
      />,
    )
    expect(html).toContain('win-announcement-overlay')
    expect(html).toContain('pos-human')
    expect(html).toContain('is-visible')
    expect(html).toContain('KANA')
    expect(html).toContain('JAN!')
    // 驗證已刪除人物、多餘中文字與標籤列
    expect(html).not.toContain('POKA')
    expect(html).not.toContain('ハヤト')
    expect(html).not.toContain('五段')
    expect(html).not.toContain('600')
    expect(html).not.toContain('遊裡吟')
    expect(html).not.toContain('anime-cutin-portrait')
    expect(html).not.toContain('announcement-tag-bar')
  })

  it('supports different seat positions', () => {
    const htmlLeft = renderToString(
      <WinAnnouncement
        winner={MOCK_PLAYER}
        winnerPos="left"
        yakuLabel="三段"
        totalScore={300}
        isRon={false}
        stage="cutin"
      />,
    )
    expect(htmlLeft).toContain('pos-left')
  })
})
