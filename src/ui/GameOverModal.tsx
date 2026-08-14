import type { GameState } from '../engine/types'

interface Props {
  state: GameState
  onRestart: () => void
  onLobby: () => void
}

export function GameOverModal({ state, onRestart, onLobby }: Props) {
  const reason = state.gameOverReason === 'gold' ? '有人金幣歸零' : '牌庫耗盡'
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
                <span className="place">{r.place}</span>
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
