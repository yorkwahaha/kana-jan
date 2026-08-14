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
            <h3>4. 自己抽到 vs 使用別人的棄牌</h3>
            <p>
              自己抽牌完成（自摸／できた）：其他三位玩家各支付該牌型分數。
              <br />
              使用別人剛丟出的牌完成（もらった）：只有棄牌者支付。
            </p>
          </section>
          <section>
            <h3>5. 同類型加成</h3>
            <p>「同一行」或「同一段」若五張都是同一類型：平假名 +3、片假名 +4、單字圖像 +5。</p>
          </section>
          <section>
            <h3>6. 如何抽牌與棄牌</h3>
            <p>
              回合開始會自動抽一張。若有合法牌型可選擇結算或暫不結算。
              不結算時必須選一張手牌並按「確認棄牌」。完成牌型的卡片會移到完成區，再補回 7 張。
            </p>
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
