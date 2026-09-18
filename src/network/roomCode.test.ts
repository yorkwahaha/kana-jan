import { describe, expect, it } from 'vitest'
import { generateRoomCode, getRoomFromUrl, makeRoomUrl, parseRoomCode } from './roomCode'

describe('roomCode utilities', () => {
  it('generateRoomCode 產生前綴為 KANA- 的房號', () => {
    const code = generateRoomCode()
    expect(code).toMatch(/^KANA-[A-Z0-9]{4}$/)
  })

  it('parseRoomCode 能夠正規化房號輸入（大寫、去空白）', () => {
    expect(parseRoomCode('kana-1234')).toBe('KANA-1234')
    expect(parseRoomCode('  1234 ')).toBe('KANA-1234')
    expect(parseRoomCode('kana-abcd')).toBe('KANA-ABCD')
  })

  it('makeRoomUrl 產生帶有 ?room 參數的網址', () => {
    const url = makeRoomUrl('https://example.com/play', 'KANA-7788')
    expect(url).toBe('https://example.com/play?room=KANA-7788')
  })

  it('getRoomFromUrl 正確從搜尋字串取得房號', () => {
    expect(getRoomFromUrl('?room=KANA-5566')).toBe('KANA-5566')
    expect(getRoomFromUrl('?other=1&room=kana-9999')).toBe('KANA-9999')
    expect(getRoomFromUrl('')).toBeNull()
  })
})
