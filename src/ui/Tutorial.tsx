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
            <h3>1. 同音三張 · 120 / 840 點</h3>
            <p>收集同一讀音的任意三張卡即可成牌（120 點）。若湊齊平假名＋片假名＋單字圖像（三位相和）享 <strong>480 點全彩加成</strong>！三張全同類型享 <strong>840 點純色加成</strong>。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ka-katakana')} size="sm" />
              <CardView card={getCardById('ka-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>2. 拗音揃い · 180 / 480 點</h3>
            <p>同一拗音行的 3 個不同讀音（如 きゃ・きゅ・きょ，180 點）。三張全同類型享 <strong>480 點純色加成</strong>。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('kya-hiragana')} size="sm" />
              <CardView card={getCardById('kyu-katakana')} size="sm" />
              <CardView card={getCardById('kyo-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>3. 一行揃い（滿貫大牌 5 張）· 480 / 1800 點</h3>
            <p>清音／濁音同一行的 5 個不同讀音（480 點）。全同類型享有高達 <strong>1,800 點純色滿貫大牌</strong>！</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ki-katakana')} size="sm" />
              <CardView card={getCardById('ku-vocabulary')} size="sm" />
              <CardView card={getCardById('ke-hiragana')} size="sm" />
              <CardView card={getCardById('ko-katakana')} size="sm" />
            </div>
          </section>
          <section>
            <h3>4. 組字 · 240～360 點 ＋ Bonus</h3>
            <p>用手牌拼出桌上 BONUS 單字的讀音，例如 ね＋こ → ねこ，享單字基礎分與 +90 點 Bonus 加成。</p>
          </section>
          <section>
            <h3>6. 自己抽到 vs 使用別人的棄牌</h3>
            <p>
              自己抽牌完成（自摸／できた）：其他三位玩家各支付該牌型點數。
              <br />
              使用別人剛丟出的牌完成（もらった）：只有棄牌者單獨全額支付。
            </p>
          </section>
          <section>
            <h3>7. 開局點數與勝負結算</h3>
            <p>每位雀士以 2,000 點開局。每局從五十音中抽出 4 行登場，遊戲以剩餘點數多寡排定勝負，有人點數歸零或牌庫耗盡即結算！</p>
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
