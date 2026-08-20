import { useState } from 'react'
import { ROW_COLOR, ROW_MARK, ROW_ORDER, soundsForRows } from '../data/kana'
import { isMastered, loadMastery } from './mastery'

interface Props {
  onClose: () => void
}

export function CatalogModal({ onClose }: Props) {
  const [mastery] = useState(() => loadMastery())
  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="catalog-title">
      <div className="modal catalog-modal">
        <header className="modal-head">
          <h2 id="catalog-title">五十音圖鑑</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </header>
        <div className="catalog-grid">
          {ROW_ORDER.map((row) => (
            <div key={row} className="catalog-row">
              <span className="gojuon-mark" style={{ background: ROW_COLOR[row] }}>
                {ROW_MARK[row]}
              </span>
              {soundsForRows([row]).map((kana) => {
                const lit = isMastered(kana.sound, mastery)
                return (
                  <span key={kana.sound} className={`catalog-cell ${lit ? 'is-lit' : ''}`} title={kana.romaji}>
                    <strong>{kana.hiragana}</strong>
                    <em>{kana.katakana}</em>
                    {lit ? <small>{kana.vocabulary}</small> : <small>？</small>}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
        <footer className="modal-foot">
          <button className="btn primary" onClick={onClose}>
            關閉
          </button>
        </footer>
      </div>
    </div>
  )
}
