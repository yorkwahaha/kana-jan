import { parseRoomCode } from './roomCode'

export interface ResumeSeat {
  playerId: string
  name: string
  seat: number
  token: string
}

function storageKey(roomCode: string): string {
  return `kana-jan-resume-${parseRoomCode(roomCode)}`
}

export function loadResume(roomCode: string): ResumeSeat | null {
  try {
    const raw = sessionStorage.getItem(storageKey(roomCode))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ResumeSeat>
    if (
      typeof parsed.playerId !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.seat !== 'number' ||
      typeof parsed.token !== 'string' ||
      !parsed.token
    ) {
      return null
    }
    return {
      playerId: parsed.playerId,
      name: parsed.name,
      seat: parsed.seat,
      token: parsed.token,
    }
  } catch {
    return null
  }
}

export function saveResume(roomCode: string, data: ResumeSeat): void {
  try {
    sessionStorage.setItem(storageKey(roomCode), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function clearResume(roomCode: string): void {
  try {
    sessionStorage.removeItem(storageKey(roomCode))
  } catch {
    // ignore
  }
}
