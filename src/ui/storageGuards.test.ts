import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadMastery, recordSounds } from './mastery'
import { DEFAULT_SETTINGS, loadSettings } from './settings'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('localStorage runtime guards', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('設定只接受合法 boolean 與 animation enum', () => {
    localStorage.setItem('kana-jan-settings-v1', JSON.stringify({
      bgm: 'yes', sfx: false, animation: 'warp', showRomaji: true,
    }))
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, sfx: false, showRomaji: true })
  })

  it('舊版行／段設定會合併遷移，並接受合法和牌停駐時間', () => {
    localStorage.setItem('kana-jan-settings-v1', JSON.stringify({
      showRow: false,
      showColumn: true,
      winScreenHold: '10s',
    }))
    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      showPosition: true,
      winScreenHold: '8s',
    })
  })

  it('前一版 5 秒停駐設定會遷移為新的 4 秒', () => {
    localStorage.setItem('kana-jan-settings-v1', JSON.stringify({ winScreenHold: '5s' }))
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, winScreenHold: '4s' })
  })

  it('熟練度會丟棄未知音與非法 counter，損壞 shape 不會讓 recordSounds crash', () => {
    localStorage.setItem('kana-jan-mastery-v1', JSON.stringify({ sounds: { a: 2, bad: 99, i: -1, u: 1.5 } }))
    expect(loadMastery()).toEqual({ sounds: { a: 2 } })

    localStorage.setItem('kana-jan-mastery-v1', JSON.stringify({ sounds: 'corrupt' }))
    expect(() => recordSounds(['a'])).not.toThrow()
    expect(loadMastery()).toEqual({ sounds: { a: 1 } })
  })
})
