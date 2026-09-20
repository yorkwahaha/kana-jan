import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { startGame } from '../engine/game'
import { DEFAULT_SETTINGS } from './settings'
import { CenterBoard } from './CenterBoard'

describe('CenterBoard Bonus 資訊', () => {
  it('只顯示單一 Bonus 假名，不再顯示組字提示', () => {
    const state = startGame({
      seed: 3,
      activeRows: ['a', 'ka', 'sa', 'ma'],
    })
    const html = renderToString(<CenterBoard state={state} settings={DEFAULT_SETTINGS} />)

    expect(html).toContain('BONUS')
    expect(html).toContain('牌型含該讀音即加分')
    expect(html).not.toContain('可組字')
  })
})
