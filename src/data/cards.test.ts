import { describe, expect, it } from 'vitest'
import { getCardById } from './cards'

describe('getCardById', () => {
  it('可解析只有小課程 -$ 複本後綴的卡牌 ID', () => {
    expect(getCardById('a-hiragana-$0').sound).toBe('a')
    expect(getCardById('a-hiragana-$0').id).toBe('a-hiragana-$0')
  })
})
