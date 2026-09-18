import type { Settings } from './settings'

interface Props {
  settings: Settings
  onChange: (next: Settings) => void
  onClose: () => void
  onRestart: () => void
  onToLobby?: () => void
}

export function SettingsPanel({ settings, onChange, onClose, onRestart, onToLobby }: Props) {
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
          <fieldset>
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
              <input type="checkbox" checked={settings.showRow} onChange={() => toggle('showRow')} />
              顯示所屬行
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.showColumn} onChange={() => toggle('showColumn')} />
              顯示所屬段
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.highlightNear} onChange={() => toggle('highlightNear')} />
              高亮接近完成的牌型
            </label>
          </fieldset>
        </div>
        <footer className="modal-foot">
          {onToLobby && (
            <button className="btn" onClick={onToLobby}>
              回到大廳
            </button>
          )}
          <button className="btn danger" onClick={onRestart}>
            重新開始
          </button>
          <button className="btn primary" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </div>
  )
}
