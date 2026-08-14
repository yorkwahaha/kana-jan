import { speechText, type KanaCard } from '../data/cards'
import { speakJapanese } from '../audio/speech'
import { CardView } from './CardView'
import { useMemo, useState } from 'react'

interface Props {
  cards: KanaCard[]
  label: string
  speechEnabled: boolean
  onFinish: () => void
}

export function PronunciationModal({ cards, label, speechEnabled, onFinish }: Props) {
  const [heard, setHeard] = useState<Record<string, boolean>>({})
  const allHeard = useMemo(() => cards.every((c) => heard[c.id]), [cards, heard])

  const play = async (card: KanaCard) => {
    await speakJapanese(speechText(card), speechEnabled)
    setHeard((h) => ({ ...h, [card.id]: true }))
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="pronounce-title">
      <div className="modal pronounce-modal">
        <header className="modal-head">
          <h2 id="pronounce-title">發音挑戰</h2>
          <p>完成「{label}」前，請依序點擊卡片聽讀音。</p>
        </header>
        <div className="pronounce-cards">
          {cards.map((card, i) => (
            <button
              key={card.id}
              className={`pronounce-item ${heard[card.id] ? 'heard' : ''}`}
              onClick={() => void play(card)}
            >
              <span className="step">{i + 1}</span>
              <CardView card={card} size="md" />
              <span className="listen">{heard[card.id] ? '已聽過' : '點擊播放'}</span>
            </button>
          ))}
        </div>
        <p className="hint-note">第一版不進行語音辨識，聽完即可結算。</p>
        <footer className="modal-foot">
          <button className="btn primary" disabled={!allHeard} onClick={onFinish}>
            我讀完了
          </button>
        </footer>
      </div>
    </div>
  )
}
