import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { startGame } from '../engine/game'
import { GameTable } from './GameTable'
import { DEFAULT_SETTINGS } from './settings'

const cards = (...ids: string[]) => ids.map(getCardById)
const noop = () => undefined

describe('GameTable 聽牌提示', () => {
  it('顯示目標牌型與真正缺少的假名', () => {
    const state = startGame({
      seed: 7,
      skipPreview: true,
      activeRows: ['ka', 'sa', 'ta', 'na'],
      hands: [
        cards('ka-hiragana', 'ki-hiragana', 'ku-katakana', 'ke-vocabulary'),
        cards('sa-hiragana'),
        cards('ta-hiragana'),
        cards('na-hiragana'),
      ],
    })

    const html = renderToString(
      <GameTable
        state={state}
        settings={DEFAULT_SETTINGS}
        selectedCardId={null}
        hoverYaku={null}
        locked={false}
        onSelectCard={noop}
        onChooseYaku={noop}
        onSkipYaku={noop}
        onClaim={noop}
        onPassClaim={noop}
        onHoverYaku={noop}
        onOpenSettings={noop}
        onOpenHelp={noop}
        onOpenCatalog={noop}
      />,
    )

    expect(html).toContain('聽牌：')
    expect(html).toContain('か行揃い 等 こ')
  })
})
