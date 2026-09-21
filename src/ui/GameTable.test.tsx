import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { drainAuto, reduce, startGame } from '../engine/game'
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

    expect(html).not.toContain('還聽哪些牌')
    expect(html).not.toContain('か行揃い')
    expect(html).toContain('aria-label="こ 等待牌')
    expect(html).toContain('tenpai-score')
    expect(html).toContain('aria-label="收合聽牌提示"')
  })

  it('有多組聽牌時只高亮目前輪播的一組，面板仍列出全部等待牌', () => {
    const state = startGame({
      seed: 9,
      skipPreview: true,
      activeRows: ['ka', 'sa', 'ta', 'na'],
      hands: [
        cards('ka-hiragana', 'ka-katakana', 'ki-hiragana', 'ku-katakana', 'ke-vocabulary', 'sa-hiragana', 'ta-hiragana'),
        cards('sa-katakana'),
        cards('ta-katakana'),
        cards('na-katakana'),
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

    expect(html).not.toContain('か同音組')
    expect(html).not.toContain('か行揃い')
    expect(html.match(/card-near-sheen/g)).toHaveLength(2)
    expect(html.match(/tenpai-wait-item/g)).toHaveLength(2)
    expect(html).toContain('aria-label="か 等待牌，和牌 120–480 點"')
  })

  it('自摸可和牌時只顯示決策列倒數，且和牌按鈕不顯示牌型名稱', () => {
    let state = startGame({
      seed: 3,
      startPlayerIndex: 0,
      skipPreview: true,
      hands: [
        cards('ka-hiragana', 'ka-katakana', 'ka-vocabulary', 'sa-hiragana', 'ta-hiragana', 'na-hiragana', 'ha-hiragana'),
        cards('sa-katakana'),
        cards('ta-katakana'),
        cards('na-katakana'),
      ],
      deck: cards('o-hiragana'),
    })
    state = drainAuto(reduce(state, { type: 'DEAL_DONE' }))
    state = drainAuto(reduce(state, { type: 'DRAW' }))

    const html = renderToString(
      <GameTable
        state={state}
        settings={DEFAULT_SETTINGS}
        selectedCardId={null}
        hoverYaku={null}
        locked={false}
        turnTimer={{ active: true, seconds: 18, turnKey: 'self-draw-yaku', onTimeout: noop }}
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

    expect(html.match(/compact-timer-display/g)).toHaveLength(1)
    expect(html).not.toContain('timer-above-drawn')
    expect(html).toContain('compact-claim-title">和牌</span>')
    expect(html).not.toContain('compact-claim-title">か同音組</span>')
  })
})
