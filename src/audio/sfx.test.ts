import { describe, expect, it } from 'vitest'
import {
  BGM_PATHS,
  BGM_STARTUP_GRACE_MS,
  getGameOverSfxKind,
  pauseBgm,
  playSfx,
  resumeBgm,
  SFX_PATHS,
  startBgm,
  stopBgm,
  shouldWaitForBgmGesture,
  type SfxKind,
} from './sfx'

describe('audio/sfx', () => {
  it('defines all required SFX and BGM file paths', () => {
    const requiredSfx: SfxKind[] = [
      'click',
      'draw',
      'discard',
      'dekita',
      'moratta',
      'ron',
      'coin',
      'win',
      'lose',
      'ready',
    ]

    for (const kind of requiredSfx) {
      expect(SFX_PATHS[kind]).toBeDefined()
      expect(SFX_PATHS[kind]).toMatch(new RegExp(`/audio/sfx/${kind}\\.mp3$`))
    }

    expect(BGM_PATHS.lobby).toMatch(/\/audio\/bgm\/bgm-lobby\.mp3$/)
    expect(BGM_PATHS.table).toMatch(/\/audio\/bgm\/bgm-table\.mp3$/)
  })

  it('safely handles playSfx without throwing when audio files or AudioContext are absent', () => {
    expect(() => {
      playSfx('dekita', true)
      playSfx('ron', true)
      playSfx('moratta', true)
      playSfx('draw', true)
      playSfx('discard', true)
      playSfx('coin', false)
    }).not.toThrow()
  })

  it('safely starts and stops BGM without throwing', () => {
    expect(BGM_STARTUP_GRACE_MS).toBeGreaterThanOrEqual(5000)
    expect(() => {
      startBgm('lobby', true)
      pauseBgm()
      resumeBgm()
      startBgm('table', true)
      stopBgm()
      startBgm(false)
    }).not.toThrow()
  })

  it('keeps the real BGM available when autoplay waits for a user gesture', () => {
    const blocked = new Error('Autoplay blocked')
    blocked.name = 'NotAllowedError'
    const aborted = new Error('Track changed')
    aborted.name = 'AbortError'
    const missing = new Error('Missing file')
    missing.name = 'NotSupportedError'

    expect(shouldWaitForBgmGesture(blocked)).toBe(true)
    expect(shouldWaitForBgmGesture(aborted)).toBe(true)
    expect(shouldWaitForBgmGesture({ name: 'NotAllowedError' })).toBe(true)
    expect(shouldWaitForBgmGesture(missing)).toBe(false)
  })

  it('correctly resolves game over SFX based on placement', () => {
    // 4 人局正常情況
    expect(getGameOverSfxKind(1, 4)).toBe('win')
    expect(getGameOverSfxKind(2, 4)).toBeNull()
    expect(getGameOverSfxKind(3, 4)).toBeNull()
    expect(getGameOverSfxKind(4, 4)).toBe('lose')

    // 2 人局
    expect(getGameOverSfxKind(1, 2)).toBe('win')
    expect(getGameOverSfxKind(2, 2)).toBe('lose')

    // 並列最後一名
    expect(getGameOverSfxKind(3, 3)).toBe('lose')

    // 全員平手第 1 名
    expect(getGameOverSfxKind(1, 1)).toBe('win')
  })

  it('does not permanently blacklist audio on NotAllowedError (autoplay policy)', async () => {
    let playCount = 0
    const mockAudio = {
      play: () => {
        playCount++
        const err = new Error('Autoplay blocked')
        err.name = 'NotAllowedError'
        return Promise.reject(err)
      },
      addEventListener: () => {},
      volume: 1,
      currentTime: 0,
      paused: true,
      ended: false,
    }
    const originalAudio = globalThis.Audio
    // @ts-expect-error mock audio
    globalThis.Audio = function () {
      return mockAudio
    }

    try {
      playSfx('draw', true)
      playSfx('draw', true)
      expect(playCount).toBe(2)
    } finally {
      globalThis.Audio = originalAudio
    }
  })
})
