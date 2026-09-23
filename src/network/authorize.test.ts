import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCardById } from '../data/cards'
import { drainAuto, reduce, startGame } from '../engine/game'
import { authorizeClientAction, generateResumeToken, sanitizeChatText, sanitizePlayerName } from './authorize'

afterEach(() => vi.unstubAllGlobals())

describe('authorizeClientAction', () => {
  it('拒絕重開牌局、抽牌與同步亂數', () => {
    const state = startGame({ seed: 1, skipPreview: true })
    expect(authorizeClientAction(state, 0, { type: 'START' })).toBe(false)
    expect(authorizeClientAction(state, 0, { type: 'DRAW' })).toBe(false)
    expect(authorizeClientAction(state, 0, { type: 'SYNC_RNG', rngState: 1 })).toBe(false)
  })

  it('拒絕 Guest 跳過房主控制的開局預覽', () => {
    const state = startGame({ seed: 1 })
    expect(state.phase).toBe('preview')
    expect(authorizeClientAction(state, 1, { type: 'SKIP_PREVIEW' })).toBe(false)
  })

  it('結算推進只由房主控制，拒絕所有 Guest', () => {
    const state = { ...startGame({ seed: 1, skipPreview: true }), phase: 'review' as const }
    expect(authorizeClientAction(state, 1, { type: 'FINISH_REVIEW' })).toBe(false)
    expect(authorizeClientAction(state, 3, { type: 'FINISH_REVIEW' })).toBe(false)
    expect(authorizeClientAction(state, 99, { type: 'FINISH_REVIEW' })).toBe(false)
  })

  it('棄牌必須是自己的手牌且處於 discard 階段', () => {
    let state = startGame({
      seed: 2,
      skipPreview: true,
      startPlayerIndex: 0,
      hands: [
        [
          getCardById('a-hiragana'),
          getCardById('i-hiragana'),
          getCardById('u-hiragana'),
          getCardById('e-hiragana'),
          getCardById('o-hiragana'),
          getCardById('ka-hiragana'),
          getCardById('ki-hiragana'),
        ],
        [
          getCardById('sa-hiragana'),
          getCardById('shi-hiragana'),
          getCardById('su-hiragana'),
          getCardById('se-hiragana'),
          getCardById('so-hiragana'),
          getCardById('ta-hiragana'),
          getCardById('chi-hiragana'),
        ],
        [
          getCardById('na-hiragana'),
          getCardById('ni-hiragana'),
          getCardById('nu-hiragana'),
          getCardById('ne-hiragana'),
          getCardById('no-hiragana'),
          getCardById('ha-hiragana'),
          getCardById('hi-hiragana'),
        ],
        [
          getCardById('ma-hiragana'),
          getCardById('mi-hiragana'),
          getCardById('mu-hiragana'),
          getCardById('me-hiragana'),
          getCardById('mo-hiragana'),
          getCardById('ra-hiragana'),
          getCardById('ri-hiragana'),
        ],
      ],
      deck: [getCardById('to-hiragana')],
    })
    state = drainAuto(reduce(state, { type: 'DEAL_DONE' }))
    state = drainAuto(reduce(state, { type: 'DRAW' }))
    state = drainAuto(reduce(state, { type: 'SKIP_YAKU' }))
    expect(state.phase).toBe('discard')
    expect(authorizeClientAction(state, 0, { type: 'DISCARD', cardId: 'a-hiragana' })).toBe(true)
    expect(authorizeClientAction(state, 0, { type: 'DISCARD', cardId: 'sa-hiragana' })).toBe(false)
    expect(authorizeClientAction(state, 1, { type: 'DISCARD', cardId: 'a-hiragana' })).toBe(false)
  })
})

describe('sanitize', () => {
  it('截斷過長暱稱與聊天', () => {
    expect(sanitizePlayerName('  あいうえおかきくけこさしすせそたち  ')).toHaveLength(16)
    expect(sanitizeChatText('a'.repeat(500))).toHaveLength(200)
    expect(sanitizePlayerName('   ')).toBe('玩家')
  })

  it('resume token 使用 128-bit CSPRNG，安全亂數不可用時 fail closed', () => {
    expect(generateResumeToken()).toMatch(/^[a-f0-9]{32}$/)
    vi.stubGlobal('crypto', undefined)
    expect(() => generateResumeToken()).toThrow('Secure random source unavailable')
  })
})
