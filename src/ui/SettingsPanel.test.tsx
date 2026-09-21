import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  it('把一般設定、學習提示與對局操作放在同一個雙欄面板', () => {
    const html = renderToString(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onRestart={vi.fn()}
        onToLobby={vi.fn()}
      />,
    )

    expect(html).toContain('settings-column settings-general')
    expect(html).toContain('settings-learning')
    expect(html).toContain('背景音樂')
    expect(html).toContain('學習提示')
    expect(html).toContain('回到大廳')
    expect(html).toContain('重新開始')
    expect(html).toContain('完成')
  })

  it('Guest 模式可隱藏無效的重新開始操作', () => {
    const html = renderToString(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onRestart={vi.fn()}
        canRestart={false}
      />,
    )
    expect(html).not.toContain('重新開始')
  })
})
