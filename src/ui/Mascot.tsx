export function Mascot({ mood = 'idle' }: { mood?: 'idle' | 'cheer' | 'think' }) {
  return (
    <svg className={`mascot mood-${mood}`} viewBox="0 0 120 120" aria-hidden>
      <ellipse cx="60" cy="108" rx="28" ry="6" fill="rgba(0,0,0,0.12)" />
      <path d="M28 58c0-24 14-42 32-42s32 18 32 42-10 40-32 40S28 82 28 58z" fill="#FFF7F2" stroke="#C45C4A" strokeWidth="3" />
      <path d="M38 28 L28 8 L48 22" fill="#E85D75" />
      <path d="M82 28 L92 8 L72 22" fill="#E85D75" />
      <circle cx="46" cy="54" r="5" fill="#3A2A28" />
      <circle cx="74" cy="54" r="5" fill="#3A2A28" />
      <circle cx="47.5" cy="52.5" r="1.6" fill="#fff" />
      <circle cx="75.5" cy="52.5" r="1.6" fill="#fff" />
      <ellipse cx="44" cy="64" rx="7" ry="4" fill="#F7B3B8" opacity="0.9" />
      <ellipse cx="76" cy="64" rx="7" ry="4" fill="#F7B3B8" opacity="0.9" />
      <path d="M54 70 Q60 76 66 70" fill="none" stroke="#C45C4A" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="60" cy="42" r="3.2" fill="#E85D75" />
      <text x="60" y="96" textAnchor="middle" fontSize="14" fontFamily="M PLUS Rounded 1c, sans-serif" fill="#C45C4A">
        かなっち
      </text>
    </svg>
  )
}
