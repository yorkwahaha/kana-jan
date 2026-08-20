export function Mascot({ mood = 'idle' }: { mood?: 'idle' | 'cheer' | 'think' }) {
  const mouth =
    mood === 'think'
      ? 'M56 72 H64'
      : mood === 'cheer'
        ? 'M52 70 Q60 80 68 70'
        : 'M54 72 Q60 76 66 72'
  return (
    <svg className={`mascot mood-${mood}`} viewBox="0 0 120 120" aria-hidden>
      <ellipse cx="60" cy="110" rx="22" ry="5" fill="rgba(0,0,0,0.16)" />
      <path d="M34 78c0-26 10-48 26-48s26 22 26 48c0 16-8 26-26 26s-26-10-26-26z" fill="#f7f1e8" stroke="#5c4033" strokeWidth="2.2" />
      <path d="M40 36 L28 12 L52 32" fill="#b42318" />
      <path d="M80 36 L92 12 L68 32" fill="#b42318" />
      <path d="M42 34 L34 18 L50 32" fill="#f7f1e8" />
      <path d="M78 34 L86 18 L70 32" fill="#f7f1e8" />
      <circle cx="48" cy="62" r="3.4" fill="#2a1c16" />
      <circle cx="72" cy="62" r="3.4" fill="#2a1c16" />
      <path d={mouth} fill="none" stroke="#5c4033" strokeWidth="2.2" strokeLinecap="round" />
      <text x="60" y="54" textAnchor="middle" fontSize="13" fontFamily="Shippori Mincho, serif" fill="#b42318">
        あ
      </text>
    </svg>
  )
}
