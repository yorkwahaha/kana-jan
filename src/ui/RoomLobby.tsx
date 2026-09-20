import { useState } from 'react'
import { copyToClipboard, makeRoomUrl } from '../network/roomCode'
import type { RoomState } from '../network/types'

interface Props {
  roomState: RoomState
  mySeat: number
  isHost: boolean
  onStartGame: () => void
  onLeaveRoom: () => void
  onToggleSlotAi: (seat: number) => void
}

export function RoomLobby({
  roomState,
  mySeat,
  isHost,
  onStartGame,
  onLeaveRoom,
  onToggleSlotAi,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const shareUrl = makeRoomUrl(window.location.href, roomState.roomId)
    const ok = await copyToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // 判斷是否可開局：4 個座位都已準備（不論是真人已連線或設為 AI）
  const allReady = roomState.slots.every((s) => s.connected || s.kind === 'ai')

  return (
    <div className="room-lobby">
      <section className="room-lobby-sheet">
        <header className="room-header">
          <h2>🌸 連線對戰室 🌸</h2>
          <div className="room-code-badge-wrap">
            <span className="room-code-label">房間號碼</span>
            <span className="room-code-val">{roomState.roomId}</span>
            <button className={`btn sm copy-link-btn ${copied ? 'copied' : 'primary'}`} onClick={handleCopy}>
              {copied ? '✅ 已複製連結！' : '📋 複製邀請連結'}
            </button>
          </div>
          <p className="room-subtext">將連結分享給好友，朋友點開即可直接加入！</p>
        </header>

        <div className="slots-grid">
          {roomState.slots.map((slot) => {
            const isMe = slot.seat === mySeat
            return (
              <div
                key={slot.seat}
                className={`slot-card ${slot.connected ? 'is-connected' : 'is-empty'} ${slot.kind === 'ai' ? 'is-ai' : ''} ${isMe ? 'is-me' : ''}`}
              >
                <div className="slot-avatar">
                  {slot.isHost ? '👑' : slot.kind === 'ai' ? '🤖' : slot.connected ? '🎴' : '⏳'}
                </div>
                <div className="slot-info">
                  <div className="slot-header-line">
                    <span className="slot-seat-label">座位 {slot.seat + 1}</span>
                    {slot.isHost && <span className="badge host">房主</span>}
                    {isMe && <span className="badge me">你</span>}
                    {slot.kind === 'ai' && <span className="badge ai">電腦 AI</span>}
                  </div>
                  <span className="slot-name">{slot.name}</span>
                  <span className="slot-status">
                    {slot.connected
                      ? slot.isHost
                        ? '房主就緒'
                        : '已連線就緒'
                      : slot.kind === 'ai'
                        ? 'AI 待命'
                        : '等待玩家加入...'}
                  </span>
                </div>

                {isHost && !slot.isHost && (
                  <div className="slot-action">
                    {slot.kind === 'ai' ? (
                      <button
                        className="btn xs"
                        onClick={() => onToggleSlotAi(slot.seat)}
                        title="切換為開放真人玩家加入"
                      >
                        改為等待真人
                      </button>
                    ) : (
                      <button
                        className="btn xs"
                        onClick={() => onToggleSlotAi(slot.seat)}
                        title="人數不足時可切換由電腦 AI 補位"
                      >
                        由 AI 補位
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="room-footer-actions">
          {isHost ? (
            <>
              <button
                className="btn primary lg start-room-btn"
                disabled={!allReady}
                onClick={onStartGame}
              >
                {allReady ? '開始遊戲！' : '等待所有座位就緒（或點擊由 AI 補位）'}
              </button>
              <button className="btn ghost" onClick={onLeaveRoom}>
                解散房間
              </button>
            </>
          ) : (
            <>
              <p className="guest-waiting-tip">⏳ 等待房主開始對局...</p>
              <button className="btn ghost" onClick={onLeaveRoom}>
                退出房間
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
