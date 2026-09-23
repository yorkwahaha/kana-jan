import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadResume, saveResume } from './resume'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('resume storage guard', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', new MemoryStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('只接受合法 seat 與 128-bit hex token', () => {
    saveResume('7X89', { playerId: 'p1', name: 'A', seat: 1, token: 'a'.repeat(32) })
    expect(loadResume('7X89')?.seat).toBe(1)

    const key = sessionStorage.key(0)!
    sessionStorage.setItem(key, JSON.stringify({ playerId: 'p1', name: 'A', seat: 9, token: 'x' }))
    expect(loadResume('7X89')).toBeNull()
  })
})
