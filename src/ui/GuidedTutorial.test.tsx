import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GuidedTutorial, GUIDED_TUTORIAL_STEPS } from './GuidedTutorial'

const noop = () => undefined

describe('GuidedTutorial', () => {
  it('每一步只顯示目前的一句教學文字', () => {
    const html = renderToString(<GuidedTutorial step={0} onNext={noop} onExit={noop} />)

    expect(html).toContain('新手教學 1 / 6')
    expect(html).toContain(GUIDED_TUTORIAL_STEPS[0])
    expect(html).not.toContain(GUIDED_TUTORIAL_STEPS[1])
    expect(html).toContain('下一步')
  })

  it('最後一步改成自由遊玩按鈕', () => {
    const html = renderToString(
      <GuidedTutorial step={GUIDED_TUTORIAL_STEPS.length - 1} onNext={noop} onExit={noop} />,
    )

    expect(html).toContain('開始自由遊玩')
    expect(html).not.toContain('跳過教學')
  })
})
