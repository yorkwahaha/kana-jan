import { useEffect, useState } from 'react'
import type { GameState } from '../engine/types'
import {
  loadProfile,
  replenishGold,
  settleMatch,
  type MatchSettlementResult,
  type UserProfile,
} from './profile'

interface Props {
  state: GameState
  onRestart: () => void
  onLobby: () => void
}

export function GameOverModal({ state, onRestart, onLobby }: Props) {
  const [settlement, setSettlement] = useState<MatchSettlementResult | null>(null)
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile())

  useEffect(() => {
    const human = state.players.find((p) => p.kind === 'human') ?? state.players[0]
    const humanRank = state.rankings?.find((r) => r.playerId === human?.id)
    if (humanRank) {
      const res = settleMatch(humanRank.place)
      setSettlement(res)
      setProfile(loadProfile())
    }
  }, [state.rankings, state.players])

  const handleReplenish = () => {
    const next = replenishGold()
    setProfile({ ...next })
  }

  const reason = state.gameOverReason === 'gold' ? '有人點數歸零' : '牌庫耗盡'
  const learned = [
    ...new Set(
      state.players.flatMap((p) =>
        p.completed.flatMap((c) => c.yaku.cards.map((card) => card.hiragana)),
      ),
    ),
  ]
  const words = [
    ...new Set(
      state.players.flatMap((p) =>
        p.completed.flatMap((c) =>
          c.yaku.cards
            .filter((card) => card.cardType === 'vocabulary')
            .map((card) => `${card.vocabulary}（${card.meaning}）`),
        ),
      ),
    ),
  ]

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="over-title">
      <div className="modal over-modal">
        <header className="modal-head">
          <h2 id="over-title">對局結束</h2>
          <p>{reason}。依局內剩餘點數排定勝負！</p>
        </header>

        {settlement && (
          <section className="settlement-banner">
            <div className="settlement-card">
              <span className="settlement-place">
                {settlement.place === 1
                  ? '🏆 優勝！'
                  : settlement.place === 2
                    ? '🥈 準優勝'
                    : settlement.place === 3
                      ? '🥉 季軍'
                      : '第 4 名'}
              </span>
              <div className="settlement-details">
                <span className={settlement.netGold >= 0 ? 'delta-up' : 'delta-down'}>
                  金幣資產：{settlement.netGold >= 0 ? `+${settlement.netGold}` : settlement.netGold} 🪙
                </span>
                {settlement.streakBonus > 0 && (
                  <span className="streak-tag">🔥 {settlement.nextStreak} 連勝加成 (+{settlement.streakBonus})</span>
                )}
                <span className="total-gold-tag">總資產：{profile.gold} 🪙</span>
              </div>
              {profile.gold < 20 && (
                <button className="btn primary" onClick={handleReplenish}>
                  🪙 領取救濟補給 (+100 金幣)
                </button>
              )}
            </div>
          </section>
        )}

        <ol className="ranking">
          {state.rankings?.map((r) => {
            const player = state.players.find((p) => p.id === r.playerId)
            return (
              <li key={r.playerId} className={r.place === 1 ? 'first' : ''}>
                <span className="place">
                  {r.place === 1 ? '1st' : r.place === 2 ? '2nd' : r.place === 3 ? '3rd' : '4th'}
                </span>
                <div>
                  <strong>{r.name}</strong>
                  <div className="rank-meta">
                    剩餘 {r.gold} 點 · 得分 {r.score} 分 · 完成 {r.completedCount} 組
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
