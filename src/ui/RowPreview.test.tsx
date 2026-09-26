import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { startGame } from '../engine/game'
import { RowPreview } from './RowPreview'
import { DEFAULT_SETTINGS } from './settings'

afterEach(cleanup)

describe('RowPreview', () => {
  it('連線訪客不顯示無權操作的略過按鈕', () => {
    const state = startGame({ seed: 4 })
    const guestHtml = renderToString(
      <RowPreview state={state} canSkip={false} onContinue={() => undefined} />,
    )
    const hostHtml = renderToString(
      <RowPreview state={state} canSkip onContinue={() => undefined} />,
    )

    expect(guestHtml).not.toContain('preview-skip-btn')
    expect(hostHtml).toContain('preview-skip-btn')
  })

  it('Bonus 預覽顯示假名牌而不是單字牌', () => {
    const state = startGame({ seed: 4, activeRows: ['a', 'ka', 'sa', 'ta'] })
    const html = renderToString(<RowPreview state={state} onContinue={() => undefined} />)

    expect(state.bonus.cardId).toMatch(/-hiragana$/)
    expect(html).toContain('type-hiragana')
  })

  it('DOM mount 會實際執行 matchMedia 路徑而不缺瀏覽器 API', () => {
    const state = startGame({ seed: 4 })
    const view = render(
      <RowPreview
        state={state}
        settings={{ ...DEFAULT_SETTINGS, animation: 'off' }}
        canSkip={false}
        onContinue={() => undefined}
      />,
    )
    expect(view.getByText(/等待房主開始/)).toBeTruthy()
  })

  it('訪客關閉動畫時會看到等待房主提示', () => {
    const state = startGame({ seed: 4 })
    const html = renderToString(
      <RowPreview
        state={state}
        settings={{ ...DEFAULT_SETTINGS, animation: 'off' }}
        canSkip={false}
        onContinue={() => undefined}
      />,
    )

    expect(html).toContain('等待房主開始')
  })
})
