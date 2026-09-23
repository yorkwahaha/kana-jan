import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getCardById } from '../data/cards'
import { CardView } from './CardView'

describe('CardView vocabulary review', () => {
  it('renders standard writing, furigana, and a visible Chinese meaning', () => {
    const html = renderToString(
      <CardView
        card={getCardById('a-vocabulary')}
        size="md"
        showWrittenForm
        revealMeaning
      />,
    )

    expect(html).toContain('<ruby')
    expect(html).toContain('雨')
    expect(html).toContain('<rt>あめ</rt>')
    expect(html).toContain('card-meaning')
    expect(html).not.toContain('card-romaji')
  })
})
