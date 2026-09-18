import { describe, expect, it } from 'vitest'
import {
  BGM_PATHS,
  getGameOverSfxKind,
  pauseBgm,
  playSfx,
  resumeBgm,
  SFX_PATHS,
  startBgm,
  stopBgm,
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
      'tick',
    ]

    for (const kind of requiredSfx) {
      expect(SFX_PATHS[kind]).toBeDefined()
      expect(SFX_PATHS[kind]).toMatch(new RegExp(`/audio/sfx/${kind}\\.mp3$`))
    }

    expect(BGM_PATHS.lobby).toMatch(/\/audio\/bgm\/bgm-lobby\.mp3$/)
    expect(BGM_PATHS.table).toMatch(/\/audio\/bgm\/bgm-table\.mp3$/)
    expect(BGM_PATHS.tension).toMatch(/\/audio\/bgm\/bgm-tension\.mp3$/)
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
    expect(() => {
      startBgm('lobby', true)
      pauseBgm()
      resumeBgm()
      startBgm('table', true)
      stopBgm()
      startBgm(false)
    }).not.toThrow()
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
})
