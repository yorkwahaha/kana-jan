import { describe, expect, it } from 'vitest'
import { BGM_PATHS, playSfx, SFX_PATHS, startBgm, stopBgm, type SfxKind } from './sfx'

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
      startBgm('table', true)
      stopBgm()
      startBgm(false)
    }).not.toThrow()
  })
})
