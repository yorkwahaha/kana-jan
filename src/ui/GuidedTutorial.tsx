export const GUIDED_TUTORIAL_STEPS = [
  '每回合先摸一張牌，剛摸到的牌會放在手牌最右邊。',
  '點手牌一次可聽發音，再點同一張就把它打出。',
  '左下「聽牌」會提示你還差哪些牌能完成牌型。',
  '出現「和牌」時按下它得分，不想使用就按「跳過」。',
  '別人的棄牌也能幫你和牌，看到提示時再決定要不要拿。',
  '入門雀士沒有倒數，接下來就照自己的節奏慢慢玩。',
] as const

interface Props {
  step: number
  onNext: () => void
  onExit: () => void
}

export function GuidedTutorial({ step, onNext, onExit }: Props) {
  const safeStep = Math.min(Math.max(step, 0), GUIDED_TUTORIAL_STEPS.length - 1)
  const isLast = safeStep === GUIDED_TUTORIAL_STEPS.length - 1

  return (
    <aside className="guided-tutorial" role="region" aria-live="polite" aria-label="新手教學">
      <div className="guided-tutorial-progress">
        {`新手教學 ${safeStep + 1} / ${GUIDED_TUTORIAL_STEPS.length}`}
      </div>
      <p>{GUIDED_TUTORIAL_STEPS[safeStep]}</p>
      <div className="guided-tutorial-actions">
        {!isLast && (
          <button type="button" className="guided-tutorial-skip" onClick={onExit}>
            跳過教學
          </button>
        )}
        <button
          type="button"
          className="btn primary guided-tutorial-next"
          onClick={isLast ? onExit : onNext}
        >
          {isLast ? '開始自由遊玩' : '下一步'}
        </button>
      </div>
    </aside>
  )
}
