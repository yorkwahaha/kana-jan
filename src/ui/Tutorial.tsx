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
            <p>收集同一讀音的任意三張卡即可成牌（120 點）。若湊齊平假名＋片假名＋單字圖像（三位相和），總計 <strong>480 點（+360）</strong>！三張全同類型則總計 <strong>840 點（+720）</strong>。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ka-katakana')} size="sm" />
              <CardView card={getCardById('ka-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>2. 三音揃い（拗音／や行／わ・を・ん組） · 180 / 480 點</h3>
            <p>同一拗音行的 3 個不同讀音（如 きゃ・きゅ・きょ，180 點）。<strong>や行（やゆよ）與遊戲用的 わ・を・ん組</strong>同樣是三音揃い；「ん」不是一般五十音的わ行成員。三張全同類型總計 <strong>480 點（+300）</strong>。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('kya-hiragana')} size="sm" />
              <CardView card={getCardById('kyu-katakana')} size="sm" />
              <CardView card={getCardById('kyo-vocabulary')} size="sm" />
            </div>
          </section>
          <section>
            <h3>3. 一行揃い（滿貫大牌 5 張）· 480 / 1800 點</h3>
            <p>清音／濁音／半濁音同一五音行的 5 個不同讀音（480 點）。全同類型享有高達 <strong>1,800 點純色滿貫大牌</strong>！單行或兩行教學關會依登場行數調降（單行 180／480、兩行 300／960），實際點數以牌況面板為準。</p>
            <div className="tutorial-cards">
              <CardView card={getCardById('ka-hiragana')} size="sm" />
              <CardView card={getCardById('ki-katakana')} size="sm" />
              <CardView card={getCardById('ku-vocabulary')} size="sm" />
              <CardView card={getCardById('ke-hiragana')} size="sm" />
              <CardView card={getCardById('ko-katakana')} size="sm" />
            </div>
          </section>
          <section>
            <h3>4. Bonus 與連鎖（Combo）</h3>
            <p>牌型中只要包含 BONUS 讀音的平假名、片假名或單字牌，都額外 +90 點。</p>
            <p>完成牌型並補滿 7 張後，若手牌仍有合法牌型，可繼續宣告自摸直到無法成牌或主動略過。抄牌後同樣可以連鎖。連鎖結束後輪到原棄牌者的下一家；若下家就是抄牌者，則再順延一家，避免抄牌後立刻再摸打一次。</p>
            <p>「できた！」判定看的是抽牌後的整副手牌：合法牌型<strong>不必包含剛摸到的那張牌</strong>。這是本遊戲的明確規則，不採麻將必須以進張完成牌型的限制。</p>
          </section>
          <section>
            <h3>5. 自己抽到 vs 使用別人的棄牌</h3>
            <p>
              自己抽牌完成（自摸／できた）：由其他三位玩家共同分攤該牌型點數（例如 480 點每人分攤 160 點、840 點每人分攤 280 點）。
              <br />
              使用別人剛丟出的牌完成（もらった／抄牌）：由棄牌放銃者單獨全額支付該牌型分數。
            </p>
          </section>
          <section>
            <h3>6. 開局點數與勝負結算</h3>
            <p>每位雀士以 1,000 點開局。登場行依課程而定；隨機課程會從五十音中抽出 4 行。遊戲以剩餘點數多寡排定勝負。有人點數歸零時，得分者仍取得完整役值，不足額由系統補足；有人歸零或牌庫耗盡即結算。</p>
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
