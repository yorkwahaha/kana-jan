import type { PlayerState } from '../engine/types'
import { CardView } from './CardView'

interface Props {
  player: PlayerState
  position: 'top' | 'left' | 'right' | 'human'
}

export function MeldArea({ player, position }: Props) {
  if (player.completed.length === 0) return null
  return (
    <div className={`meld-area pos-${position}`}>
      {player.completed.map((c, i) => (
        <div key={`${c.yaku.id}-${i}`} className="meld-set" title={c.yaku.label}>
          {c.yaku.cards.map((card) => (
            <CardView key={card.id} card={card} size="mini" />
          ))}
        </div>
      ))}
    </div>
  )
}
