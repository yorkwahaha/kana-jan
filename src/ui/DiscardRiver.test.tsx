import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { getCardById } from '../data/cards'
import type { PlayerState } from '../engine/types'
import { DiscardRiver } from './DiscardRiver'
import { DEFAULT_SETTINGS } from './settings'

describe('DiscardRiver 四欄堆疊', () => {
  it('第 5 張回到第 1 欄並標記為第 2 層', () => {
    const player: PlayerState = {
      id: 'p0',
      name: '小春',
      kind: 'human',
      seat: 0,
      aiDifficulty: 'normal',
      gold: 1000,
      score: 0,
      hand: [],
      discards: ['a', 'i', 'u', 'e', 'o'].map((sound) => getCardById(`${sound}-hiragana`)),
      completed: [],
    }

    const html = renderToString(
      <DiscardRiver player={player} position="human" settings={DEFAULT_SETTINGS} />,
    )

    expect(html.match(/class="river-column"/g)).toHaveLength(4)
    expect(html.match(/class="river-slot"/g)).toHaveLength(5)
    expect(html).toContain('--river-layer:1')
  })
})
