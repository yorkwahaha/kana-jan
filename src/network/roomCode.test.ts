import { describe, expect, it } from 'vitest'
import { generateRoomCode, getRoomFromUrl, makeRoomUrl, parseRoomCode, tryParseRoomCode } from './roomCode'

describe('roomCode utilities', () => {
  it('generateRoomCode 產生前綴為 KANA- 的房號', () => {
    const code = generateRoomCode()
    expect(code).toMatch(/^KANA-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/)
  })

  it('parseRoomCode 能正規化合法房號，且拒絕錯誤長度、符號與易混字元', () => {
    expect(parseRoomCode('kana-7x89')).toBe('KANA-7X89')
    expect(parseRoomCode('  7X89 ')).toBe('KANA-7X89')
    expect(parseRoomCode('kana-abcd')).toBe('KANA-ABCD')
    expect(tryParseRoomCode('1234')).toBeNull()
    expect(tryParseRoomCode('7X-89')).toBeNull()
    expect(tryParseRoomCode('KANA-7X8')).toBeNull()
    expect(tryParseRoomCode('KANA-7X890')).toBeNull()
    expect(() => parseRoomCode('KANA-7X8O')).toThrow()
  })

  it('makeRoomUrl 產生帶有 ?room 參數的網址', () => {
    const url = makeRoomUrl('https://example.com/play', 'KANA-7788')
    expect(url).toBe('https://example.com/play?room=KANA-7788')
  })

  it('getRoomFromUrl 正確從搜尋字串取得房號', () => {
    expect(getRoomFromUrl('?room=KANA-5566')).toBe('KANA-5566')
    expect(getRoomFromUrl('?other=1&room=kana-9999')).toBe('KANA-9999')
    expect(getRoomFromUrl('')).toBeNull()
    expect(getRoomFromUrl('?room=KANA-7X8O')).toBeNull()
  })
})
