import type { GameState } from '../engine/types'

interface Props {
  state: GameState
  onRestart: () => void
  onLobby: () => void
}

export function GameOverModal({ state, onRestart, onLobby }: Props) {
  const reason = state.gameOverReason === 'gold' ? '有人金幣歸零' : '牌庫耗盡'
  const learned = [...new Set(state.players.flatMap((p) => p.completed.flatMap((c) => c.yaku.cards.map((card) => card.hiragana))))]
  const words = [
    ...new Set(
      state.players.flatMap((p) =>
        p.completed.flatMap((c) => c.yaku.cards.filter((card) => card.cardType === 'vocabulary').map((card) => `${card.vocabulary}（${card.meaning}）`)),
      ),
    ),
  ]
  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="over-title">
      <div className="modal over-modal">
        <header className="modal-head">
          <h2 id="over-title">對局結束</h2>
          <p>{reason}。依牌型分數排名，金幣作為平手決勝。</p>
        </header>
        <ol className="ranking">
          {state.rankings?.map((r) => {
            const player = state.players.find((p) => p.id === r.playerId)
            return (
              <li key={r.playerId} className={r.place === 1 ? 'first' : ''}>
                <span className="place">{r.place === 1 ? '1st' : r.place === 2 ? '2nd' : r.place === 3 ? '3rd' : '4th'}</span>
                <div>
                  <strong>{r.name}</strong>
                  <div className="rank-meta">
                    {r.score} 分 · {r.gold} 金幣 · 完成 {r.completedCount} 組
                  </div>
                  <div className="rank-yaku">
                    {player?.completed.map((c) => c.yaku.label).join('、') || '（尚未完成牌型）'}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        <section className="learned-box">
          <h3>本局學會</h3>
          <p>{learned.length > 0 ? learned.join('　') : '還沒完成任何同音組，再玩一局吧。'}</p>
          {words.length > 0 && <p className="learned-words">{words.join('、')}</p>}
        </section>
        <footer className="modal-foot">
          <button className="btn" onClick={onLobby}>
            回到大廳
          </button>
          <button className="btn primary" onClick={onRestart}>
            再玩一次
          </button>
        </footer>
      </div>
    </div>
  )
}
