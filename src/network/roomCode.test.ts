import { describe, expect, it } from 'vitest'
import { generateRoomCode, getLegacyRoomFromUrl, getRoomFromUrl, makeRoomUrl, parseRoomCode, tryParseLegacyRoomCode, tryParseRoomCode } from './roomCode'

describe('roomCode utilities', () => {
  it('generateRoomCode 產生前綴為 KANA- 的房號', () => {
    const code = generateRoomCode()
    expect(code).toMatch(/^KANA-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  })

  it('parseRoomCode 能正規化合法房號，且拒絕錯誤長度、符號與易混字元', () => {
    expect(parseRoomCode('kana-7x89ab')).toBe('KANA-7X89AB')
    expect(parseRoomCode('  7X89AB ')).toBe('KANA-7X89AB')
    expect(parseRoomCode('kana-abcd23')).toBe('KANA-ABCD23')
    expect(tryParseRoomCode('123456')).toBeNull()
    expect(tryParseRoomCode('7X-89AB')).toBeNull()
    expect(tryParseRoomCode('KANA-7X89A')).toBeNull()
    expect(tryParseRoomCode('KANA-7X89ABC')).toBeNull()
    expect(() => parseRoomCode('KANA-7X89AO')).toThrow()
  })

  it('辨識舊版 4 碼房號，但不把它當成目前可加入房號', () => {
    expect(tryParseLegacyRoomCode('kana-7x89')).toBe('KANA-7X89')
    expect(tryParseRoomCode('KANA-7X89')).toBeNull()
    expect(getLegacyRoomFromUrl('?room=KANA-7X89')).toBe('KANA-7X89')
    expect(getRoomFromUrl('?room=KANA-7X89')).toBeNull()
  })

  it('makeRoomUrl 產生帶有 ?room 參數的網址', () => {
    const url = makeRoomUrl('https://example.com/play', 'KANA-7788AB')
    expect(url).toBe('https://example.com/play?room=KANA-7788AB')
  })

  it('getRoomFromUrl 正確從搜尋字串取得房號', () => {
    expect(getRoomFromUrl('?room=KANA-5566AB')).toBe('KANA-5566AB')
    expect(getRoomFromUrl('?other=1&room=kana-9999ab')).toBe('KANA-9999AB')
    expect(getRoomFromUrl('')).toBeNull()
    expect(getRoomFromUrl('?room=KANA-7X89AO')).toBeNull()
  })
})
