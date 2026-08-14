import { Mascot } from './Mascot'
import type { AiDifficulty } from '../engine/types'

interface Props {
  playerName: string
  difficulty: AiDifficulty
  hasSave: boolean
  onName: (v: string) => void
  onDifficulty: (v: AiDifficulty) => void
  onStart: () => void
  onContinue: () => void
  onHelp: () => void
}

export function Lobby({
  playerName,
  difficulty,
  hasSave,
  onName,
  onDifficulty,
  onStart,
  onContinue,
  onHelp,
}: Props) {
  return (
    <div className="lobby">
      <div className="petals" aria-hidden />
      <div className="lobby-card">
        <Mascot mood="cheer" />
        <p className="eyebrow">五十音卡牌學習遊戲</p>
        <h1>
          かなジャン！
          <span>Kana Jan</span>
        </h1>
        <p className="lede">
          收集同音、同一行、同一段的假名牌型。辨識平假名與片假名，觀察對手，成為教室裡的五十音達人。
        </p>
        <label className="field">
          你的名字
          <input value={playerName} maxLength={12} onChange={(e) => onName(e.target.value)} />
        </label>
        <fieldset className="diff">
          <legend>電腦難度</legend>
          <label>
            <input
              type="radio"
              name="diff"
              checked={difficulty === 'easy'}
              onChange={() => onDifficulty('easy')}
            />
            簡單
          </label>
          <label>
            <input
              type="radio"
              name="diff"
              checked={difficulty === 'normal'}
              onChange={() => onDifficulty('normal')}
            />
            普通
          </label>
        </fieldset>
        <div className="lobby-actions">
          <button className="btn primary lg" onClick={onStart}>
            開始對局
          </button>
          {hasSave && (
            <button className="btn lg" onClick={onContinue}>
              繼續上次
            </button>
          )}
          <button className="btn ghost" onClick={onHelp}>
            玩法說明
          </button>
        </div>
        <p className="seats-note">你將與 さくら、ひなた、あおい 三位同學對戰。</p>
      </div>
    </div>
  )
}
