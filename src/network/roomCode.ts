export const ROOM_PREFIX = 'KANA-'
export const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const ROOM_CODE_LENGTH = 6
const ROOM_BODY_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/
const LEGACY_ROOM_BODY_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/

function randomIndex(max: number): number {
  if (max <= 0) return 0
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0]! % max
  }
  throw new Error('Secure random source unavailable')
}

/** 產生短房號，如 KANA-7X89AB（必須使用 CSPRNG）。 */
export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(randomIndex(ROOM_CODE_CHARS.length))
  }
  return `${ROOM_PREFIX}${code}`
}

/** 正規化並嚴格驗證房號。只接受 6 碼、且排除 0/1/I/O。 */
export function tryParseRoomCode(input: string): string | null {
  let body = input.trim().toUpperCase()
  if (body.startsWith(ROOM_PREFIX)) body = body.slice(ROOM_PREFIX.length)
  if (!ROOM_BODY_RE.test(body)) return null
  return `${ROOM_PREFIX}${body}`
}

export function tryParseLegacyRoomCode(input: string): string | null {
  let body = input.trim().toUpperCase()
  if (body.startsWith(ROOM_PREFIX)) body = body.slice(ROOM_PREFIX.length)
  return LEGACY_ROOM_BODY_RE.test(body) ? `${ROOM_PREFIX}${body}` : null
}

export function parseRoomCode(input: string): string {
  const parsed = tryParseRoomCode(input)
  if (!parsed) throw new Error('Invalid Kana Jan room code')
  return parsed
}

/** 取得完整的房間分享網址 */
export function makeRoomUrl(baseUrl: string, roomCode: string): string {
  const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
  url.searchParams.set('room', parseRoomCode(roomCode))
  return url.toString()
}

/** 從 URL search 參數（如 window.location.search）解析房號 */
export function getRoomFromUrl(search: string = typeof window !== 'undefined' ? window.location.search : ''): string | null {
  if (!search) return null
  const params = new URLSearchParams(search)
  const room = params.get('room')
  if (!room) return null
  return tryParseRoomCode(room)
}

export function getLegacyRoomFromUrl(search: string = typeof window !== 'undefined' ? window.location.search : ''): string | null {
  if (!search) return null
  const room = new URLSearchParams(search).get('room')
  return room ? tryParseLegacyRoomCode(room) : null
}

/** 複製文字至剪貼簿。失敗時回傳 false，不拋出例外。 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
