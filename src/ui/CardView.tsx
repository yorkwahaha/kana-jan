import { displayGlyph, type KanaCard } from '../data/cards'
import type { Settings } from './settings'

interface Props {
  card: KanaCard
  size?: 'sm' | 'md' | 'lg' | 'mini'
  selected?: boolean
  hinted?: boolean
  yakuPart?: boolean
  disabled?: boolean
  showHints?: Settings
  onClick?: () => void
  faceDown?: boolean
}

export function CardView({
  card,
  size = 'md',
  selected,
  hinted,
  yakuPart,
  disabled,
  showHints,
  onClick,
  faceDown,
}: Props) {
  const glyph = displayGlyph(card)
  const className = [
    'kana-card',
    `size-${size}`,
    `type-${card.cardType}`,
    selected ? 'is-selected' : '',
    hinted ? 'is-near' : '',
    yakuPart ? 'is-yaku' : '',
    disabled ? 'is-disabled' : '',
    card.confusable ? 'is-confusable' : '',
  ].join(' ')
  const style = { ['--row-color' as string]: card.color }

  if (faceDown) {
    return (
      <div className={`kana-card size-${size} face-down`} aria-hidden>
        <span className="card-back-kana">あ</span>
      </div>
    )
  }

  const inner = (
    <>
      <span className="card-row-bar" />
      <span className="card-type-tag">
        {card.cardType === 'hiragana' ? '平' : card.cardType === 'katakana' ? '片' : '語'}
      </span>
      {card.cardType === 'vocabulary' ? (
        <span className="card-vocab">
          <span className="card-icon" aria-hidden>
            {card.icon}
          </span>
          <span className="card-word">{card.vocabulary}</span>
          <span className="card-meaning">{card.meaning}</span>
        </span>
      ) : (
        <span className="card-glyph">{glyph}</span>
      )}
      {showHints?.showRomaji || showHints?.learningHints ? (
        <span className="card-romaji">{card.romaji}</span>
      ) : null}
      {(showHints?.showRow || showHints?.showColumn) && (
        <span className="card-meta">
          {showHints.showRow ? card.rowLabel : ''}
          {showHints.showRow && showHints.showColumn ? ' · ' : ''}
          {showHints.showColumn ? card.columnLabel : ''}
        </span>
      )}
      {card.confusable && card.cardType === 'katakana' && (
        <span className="card-warn" title={card.confusable === 'shi-tsu' ? '注意シ與ツ' : '注意ソ與ン'}>
          !
        </span>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${glyph} ${card.romaji} ${card.rowLabel} ${card.columnLabel}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={className} style={style} aria-label={`${glyph} ${card.romaji}`}>
      {inner}
    </div>
  )
}
