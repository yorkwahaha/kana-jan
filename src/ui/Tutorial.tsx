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
            <p>收集同一讀音的任意三張卡即可成牌。若湊齊平假名＋片假名＋單字圖像（三位相和）享 <strong>＋3 全彩加成（共 6 分）</strong>！全同類型亦享純色加成。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ka-katakana')} size="sm" />
              <CardView card={getCardById('ka-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>2. 拗音揃い · 4 分</h3>
            <p>同一拗音行的 3 個不同讀音（如 きゃ・きゅ・きょ）。三張全同類型享 <strong>＋2 純色加成</strong>。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('kya-hiragana')} size="sm" />
              <CardView card={getCardById('kyu-katakana')} size="sm" />
              <CardView card={getCardById('kyo-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>3. 同一行五張 · 6 分</h3>
            <p>清音／濁音同一行的 5 個不同讀音。卡片形式不限，但同一讀音不能重複計算。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ki-katakana')} size="sm" />
              <CardView card={getCardById('ku-vocabulary')} size="sm" />
              <CardView card={getCardById('ke-hiragana')} size="sm" />
              <CardView card={getCardById('ko-katakana')} size="sm" />
            </div>
          </section>
          <section>
            <h3>4. 同一段揃い · 8 分</h3>
            <p>出場行中同一段的不同讀音（至少 3～4 音，例如あ・か・さ・た）。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('a-hiragana')} size="sm" />
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('sa-hiragana')} size="sm" />
              <CardView card={getCardById('ta-hiragana')} size="sm" />
            </div>
          </section>
          <section>
            <h3>5. 組字 · 5 分</h3>
            <p>用手牌拼出桌上 BONUS 單字的讀音，例如 ね＋こ → ねこ。</p>
          </section>
          <section>
            <h3>6. 自己抽到 vs 使用別人的棄牌</h3>
            <p>
              自己抽牌完成（自摸／できた）：其他三位玩家各支付該牌型分數。
              <br />
              使用別人剛丟出的牌完成（もらった）：只有棄牌者支付。
            </p>
          </section>
          <section>
            <h3>7. 同類型純色加成</h3>
            <p>牌型內若全為同類型：純平假名 +3、純片假名 +4、純單字圖像 +5（拗音全同類型 +2）。</p>
          </section>
          <section>
            <h3>8. 本次登場的行與結算</h3>
            <p>每局從五十音中抽出 4 行登場對局，讓學習焦點清晰集中。遊戲以剩餘金幣多寡排定勝負，牌型累計得分為平手第一決勝！</p>
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
