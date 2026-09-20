import { useState } from 'react'
import { LESSONS } from '../data/lessons'
import { Mascot } from './Mascot'
import type { AiDifficulty } from '../engine/types'
import { loadProfile, replenishGold, type UserProfile } from './profile'

interface Props {
  playerName: string
  difficulty: AiDifficulty
  lessonId?: string
  hasSave: boolean
  initialRoomCode?: string | null
  bgmEnabled?: boolean
  onToggleBgm?: () => void
  onName: (v: string) => void
  onDifficulty: (v: AiDifficulty) => void
  onLesson?: (id: string) => void
  onStart: () => void
  onContinue: () => void
  onHelp: () => void
  onCreateRoom?: () => void
  onJoinRoom?: (roomCode: string) => void
}

export function Lobby({
  playerName,
  difficulty,
  lessonId,
  hasSave,
  initialRoomCode,
  bgmEnabled = true,
  onToggleBgm,
  onName,
  onDifficulty,
  onLesson,
  onStart,
  onContinue,
  onHelp,
  onCreateRoom,
  onJoinRoom,
}: Props) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile())
  const [tab, setTab] = useState<'single' | 'multi'>(() => (initialRoomCode ? 'multi' : 'single'))
  const [joinCode, setJoinCode] = useState(initialRoomCode ?? '')

  const handleReplenish = () => {
    const next = replenishGold()
    setProfile({ ...next })
  }

  return (
    <div className="lobby">
      <div className="lobby-atmosphere" aria-hidden>
        <span className="ghost-kana">あ</span>
      </div>

      <section className="lobby-sheet">
        <header className="lobby-brand">
          <Mascot mood="idle" />
          <div className="brand-heading-group">
            <p className="eyebrow">五十音かるた</p>
            <div className="brand-title-wrap">
              <h1>かなジャン！</h1>
              <span className="brand-seal" aria-hidden="true">牌</span>
            </div>
            <p className="lobby-kana">KANA JAN</p>
          </div>
          <div className="lobby-profile-bar">
            <span className="profile-chip gold-pouch">🪙 {profile.gold} 金幣</span>
            {profile.streak > 0 && <span className="profile-chip streak">🔥 {profile.streak} 連勝</span>}
            {profile.gold < 20 && (
              <button className="btn sm primary replenish-btn" onClick={handleReplenish}>
                領取補給 (+100)
              </button>
            )}
            {onToggleBgm && (
              <button
                type="button"
                className={`profile-chip audio-toggle ${bgmEnabled ? 'is-on' : 'is-muted'}`}
                onClick={onToggleBgm}
                title={bgmEnabled ? '點擊靜音背景音樂' : '點擊開啟背景音樂'}
              >
                {bgmEnabled ? '🔊 音樂：開' : '🔇 靜音中'}
              </button>
            )}
          </div>
          <p className="lede">
            收集同音、同一行，並善用本局 Bonus 假名加分。每局隨機抽取四行，沉浸於和風五十音牌局之美。
          </p>
        </header>

        <div className="lobby-form">
          {/* 模式切換頁籤 */}
          <div className="lobby-tabs">
            <button
              type="button"
              className={`tab-btn ${tab === 'single' ? 'is-active' : ''}`}
              onClick={() => setTab('single')}
            >
              🎴 單人對局（練習）
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === 'multi' ? 'is-active' : ''}`}
              onClick={() => setTab('multi')}
            >
              🌐 4人連線對戰
            </button>
          </div>

          <label className="field">
            <span className="field-label">牌士名號</span>
            <input
              value={playerName}
              maxLength={12}
              placeholder="請輸入你的名號"
              onChange={(e) => onName(e.target.value)}
            />
          </label>

          {onLesson && (
            <label className="field">
              <span className="field-label">登場牌組</span>
              <select
                className="lesson-select"
                value={lessonId}
                onChange={(event) => onLesson(event.target.value)}
              >
                {LESSONS.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.label}：{lesson.detail}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tab === 'single' ? (
            <>
              <fieldset className="diff">
                <legend>對手難度</legend>
                <div className="diff-row">
                  <label className={`diff-card ${difficulty === 'easy' ? 'is-on' : ''}`}>
                    <input
                      type="radio"
                      name="diff"
                      checked={difficulty === 'easy'}
                      onChange={() => onDifficulty('easy')}
                    />
                    <span className="diff-title">🌱 入門雀士</span>
                    <span className="diff-desc">出牌較寬鬆，適合初學練習</span>
                  </label>
                  <label className={`diff-card ${difficulty === 'normal' ? 'is-on' : ''}`}>
                    <input
                      type="radio"
                      name="diff"
                      checked={difficulty === 'normal'}
                      onChange={() => onDifficulty('normal')}
                    />
                    <span className="diff-title">⚔️ 一般雀士</span>
                    <span className="diff-desc">會盯牌防守，具備基本牌效</span>
                  </label>
                </div>
              </fieldset>
              <div className="lobby-actions">
                <button className="btn ghost" onClick={onHelp}>
                  玩法說明
                </button>
                {hasSave && (
                  <button className="btn lg" onClick={onContinue}>
                    繼續上次
                  </button>
                )}
                <button className="btn primary lg" onClick={onStart}>
                  開始對局
                </button>
              </div>
              <p className="seats-note">對戰 さくら、ひなた、あおい（牌局隨機四行登場）。</p>
            </>
          ) : (
            <div className="multiplayer-panel">
              <div className="multi-cards-grid">
                <div className="multi-section host-section">
                  <div className="multi-section-body">
                    <h3>🏠 建立新房間（當房主）</h3>
                    <p className="section-desc">生成專屬房號與邀請連結，朋友直接連線！</p>
                  </div>
                  <button
                    type="button"
                    className="btn primary multi-action-btn"
                    onClick={() => onCreateRoom?.()}
                  >
                    建立房間
                  </button>
                </div>

                <div className="multi-section join-section">
                  <div className="multi-section-body">
                    <h3>🚪 加入好友房間</h3>
                    <p className="section-desc">輸入好友分享的 4 碼房號加入牌局：</p>
                  </div>
                  <div className="join-input-group">
                    <input
                      className="room-code-input"
                      value={joinCode}
                      placeholder="例如 KANA-7821"
                      maxLength={10}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && joinCode.trim()) onJoinRoom?.(joinCode)
                      }}
                    />
                    <button
                      type="button"
                      className="btn primary multi-action-btn"
                      disabled={!joinCode.trim()}
                      onClick={() => onJoinRoom?.(joinCode)}
                    >
                      加入對局
                    </button>
                  </div>
                </div>
              </div>

              <div className="lobby-actions">
                <button className="btn ghost" onClick={onHelp}>
                  玩法說明
                </button>
              </div>
              <p className="seats-note">
                支援 2～4 位真人玩家同樂；空缺位置由房主指派電腦 AI 補位。
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
