export const ROOM_PREFIX = 'KANA-'

/** 產生短房號，如 KANA-7X89 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 去除易混淆字元 0, 1, I, O
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${ROOM_PREFIX}${code}`
}

/** 正規化房號輸入，自動補上 KANA- 前綴並轉為大寫 */
export function parseRoomCode(input: string): string {
  let cleaned = input.trim().toUpperCase()
  if (cleaned.startsWith(ROOM_PREFIX)) {
    cleaned = cleaned.slice(ROOM_PREFIX.length)
  }
  // 移除非英數字
  cleaned = cleaned.replace(/[^A-Z0-9]/g, '')
  return `${ROOM_PREFIX}${cleaned}`
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
  return parseRoomCode(room)
}

/** 複製文字至剪貼簿 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fallback
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)
    return successful
  } catch {
    return false
  }
}
