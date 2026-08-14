import type { GameState } from '../engine/types'

export function EventLog({ state }: { state: GameState }) {
  const events = [...state.events].reverse()
  return (
    <aside className="event-log" aria-label="對局記錄">
      <h2>記錄</h2>
      <ol>
        {events.map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ol>
    </aside>
  )
}
