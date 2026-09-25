import type { Settings } from './settings'

interface Props {
  settings: Settings
  onChange: (next: Settings) => void
  onClose: () => void
  onRestart: () => void
  canRestart?: boolean
  onToLobby?: () => void
}

export function SettingsPanel({ settings, onChange, onClose, onRestart, canRestart = true, onToLobby }: Props) {
  const toggle = (key: keyof Settings) => {
    const value = settings[key]
    if (typeof value === 'boolean') onChange({ ...settings, [key]: !value })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="settings-title">
      <div className="modal settings-modal">
        <header className="modal-head">
          <h2 id="settings-title">設定</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </header>
        <div className="settings-body">
          <div className="settings-column settings-general">
            <fieldset>
              <legend>聲音</legend>
              <label className="toggle">
                <input type="checkbox" checked={settings.bgm} onChange={() => toggle('bgm')} />
                背景音樂
              </label>
              <label className="toggle">
                <input type="checkbox" checked={settings.sfx} onChange={() => toggle('sfx')} />
                音效
              </label>
              <label className="toggle">
                <input type="checkbox" checked={settings.speech} onChange={() => toggle('speech')} />
                假名讀音
              </label>
            </fieldset>
            <fieldset>
              <legend>動畫速度</legend>
              {(['normal', 'fast', 'off'] as const).map((v) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="anim"
                    checked={settings.animation === v}
                    onChange={() => onChange({ ...settings, animation: v })}
                  />
                  {v === 'normal' ? '慢速（容易看懂）' : v === 'fast' ? '快速' : '關閉／跳過'}
                </label>
              ))}
            </fieldset>
          </div>
          <fieldset className="settings-learning">
            <legend>學習提示</legend>
            <label className="toggle">
              <input type="checkbox" checked={settings.learningHints} onChange={() => toggle('learningHints')} />
              開啟學習提示
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.showRomaji} onChange={() => toggle('showRomaji')} />
              顯示羅馬字
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.showMeaning} onChange={() => toggle('showMeaning')} />
              單字卡顯示中文
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.showPosition} onChange={() => toggle('showPosition')} />
              顯示所屬行／段
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.highlightNear} onChange={() => toggle('highlightNear')} />
              顯示聽牌提示與高亮
            </label>
            <div className="win-screen-hold-row">
              <span className="win-screen-hold-label">和牌停駐</span>
              <div className="win-screen-hold-options" role="radiogroup" aria-label="和牌畫面停駐時間">
                {(['4s', '8s', 'manual'] as const).map((v) => (
                  <label key={v}>
                    <input
                      type="radio"
                      name="win-screen-hold"
                      checked={settings.winScreenHold === v}
                      onChange={() => onChange({ ...settings, winScreenHold: v })}
                    />
                    {v === '4s' ? '4 秒' : v === '8s' ? '8 秒' : '手動跳過'}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
        </div>
        <footer className="modal-foot">
          {onToLobby && (
            <button className="btn" onClick={onToLobby}>
              回到大廳
            </button>
          )}
          {canRestart && (
            <button className="btn danger" onClick={onRestart}>
              重新開始
            </button>
          )}
          <button className="btn primary" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </div>
  )
}
