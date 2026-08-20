import { getCardById } from '../data/cards'
import { CardView } from './CardView'

interface Props {
  onClose: () => void
}

export function Tutorial({ onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="tutorial-title">
      <div className="modal tutorial-modal">
        <header className="modal-head">
          <h2 id="tutorial-title">玩法說明</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </header>
        <div className="tutorial-body">
          <section>
            <h3>1. 同音三張 · 3 分</h3>
            <p>收集同一讀音的平假名、片假名與單字圖像。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ka-katakana')} size="sm" />
              <CardView card={getCardById('ka-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>2. 同一行五張 · 6 分</h3>
            <p>同一行的五個不同讀音。卡片形式不限，但同一讀音不能重複計算。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ki-katakana')} size="sm" />
              <CardView card={getCardById('ku-vocabulary')} size="sm" />
              <CardView card={getCardById('ke-hiragana')} size="sm" />
              <CardView card={getCardById('ko-katakana')} size="sm" />
            </div>
          </section>
          <section>
            <h3>3. 同一段五張 · 8 分</h3>
            <p>例如「あ段」：あ・か・さ・た・な。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('a-hiragana')} size="sm" />
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('sa-hiragana')} size="sm" />
              <CardView card={getCardById('ta-hiragana')} size="sm" />
              <CardView card={getCardById('na-hiragana')} size="sm" />
            </div>
          </section>
          <section>
            <h3>4. 組字 · 5 分</h3>
            <p>用手牌拼出桌上 BONUS 單字的讀音，例如 ね＋こ → ねこ。</p>
          </section>
          <section>
            <h3>5. 自己抽到 vs 使用別人的棄牌</h3>
            <p>
              自己抽牌完成（自摸／できた）：其他三位玩家各支付該牌型分數。
              <br />
              使用別人剛丟出的牌完成（もらった）：只有棄牌者支付。
            </p>
          </section>
          <section>
            <h3>6. 同類型加成</h3>
            <p>「同一行」或「同一段」若五張都是同一類型：平假名 +3、片假名 +4、單字圖像 +5。</p>
          </section>
          <section>
            <h3>7. 本次登場的行</h3>
            <p>每局只出場部分行，讓同樣的假名反覆出現。少於五行時不會出現「同一段」牌型。完成牌型後會複習讀音，可選擇回想小題。</p>
          </section>
        </div>
        <footer className="modal-foot">
          <button className="btn primary" onClick={onClose}>
            開始遊玩
          </button>
        </footer>
      </div>
    </div>
  )
}
