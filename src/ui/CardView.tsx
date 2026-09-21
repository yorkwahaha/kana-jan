import { displayGlyph, type KanaCard } from '../data/cards'
import { ROW_MARK } from '../data/kana'
import type { Settings } from './settings'

interface Props {
  card: KanaCard
  size?: 'sm' | 'md' | 'lg' | 'mini' | 'river'
  selected?: boolean
  hinted?: boolean
  yakuPart?: boolean
  disabled?: boolean
  drawn?: boolean
  hasTimer?: boolean
  showHints?: Partial<Settings>
  onClick?: () => void
  faceDown?: boolean
  revealMeaning?: boolean
  showWrittenForm?: boolean
}

export function CardView({
  card,
  size = 'md',
  selected,
  hinted,
  yakuPart,
  disabled,
  drawn,
  hasTimer,
  showHints,
  onClick,
  faceDown,
  revealMeaning,
  showWrittenForm,
}: Props) {
  const glyph = displayGlyph(card)
  const isVocab = card.cardType === 'vocabulary'
  const charLength = isVocab
    ? (showWrittenForm ? card.writtenForm.length : card.vocabulary.length)
    : glyph.length
  const isYouon = !isVocab && glyph.length >= 2

  const className = [
    'kana-card',
    `size-${size}`,
    `type-${card.cardType}`,
    `len-${Math.min(charLength, 6)}`,
    isYouon ? 'is-youon' : '',
    selected ? 'is-selected' : '',
    hinted ? 'is-near' : '',
    yakuPart ? 'is-yaku' : '',
    disabled ? 'is-disabled' : '',
    drawn ? 'is-drawn' : '',
    hasTimer ? 'has-timer' : '',
    card.confusable ? 'is-confusable' : '',
  ].filter(Boolean).join(' ')
  const style = { ['--row-color' as string]: card.color }
  const showRomaji = Boolean(showHints?.showRomaji)
  const showMeaning = Boolean(revealMeaning || showHints?.showMeaning)

  if (faceDown) {
    return (
      <div className={`kana-card size-${size} face-down`} aria-hidden>
        <span className="card-back-kana">あ</span>
      </div>
    )
  }

  const inner = (
    <>
      <span className="card-row-mark" style={{ background: card.color }}>
        {ROW_MARK[card.row]}
      </span>
      <span className="card-type-tag">
        {card.cardType === 'hiragana' ? '平' : card.cardType === 'katakana' ? '片' : '語'}
      </span>
      {card.cardType === 'vocabulary' ? (
        <span className="card-vocab">
          {showWrittenForm ? (
            <ruby className="card-written-form">
              <span className="card-word">{card.writtenForm}</span>
              {card.writtenForm !== card.vocabulary ? <rt>{card.vocabulary}</rt> : null}
            </ruby>
          ) : (
            <span className="card-word">{card.vocabulary}</span>
          )}
          {showMeaning ? <span className="card-meaning">{card.meaning}</span> : null}
        </span>
      ) : (
        <span className="card-glyph">{glyph}</span>
      )}
      {showRomaji ? <span className="card-romaji">{card.romaji}</span> : null}
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
      {hinted && <span className="card-near-sheen" aria-hidden="true" />}
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
