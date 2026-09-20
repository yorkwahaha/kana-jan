import type { KanaCard } from '../data/cards'
import type { GameState } from '../engine/types'

/** 遮罩單張牌，供他人視角顯示 */
export function makeHiddenCard(id: string): KanaCard {
  return {
    id,
    sound: '?',
    romaji: '?',
    hiragana: '？',
    katakana: '？',
    row: 'a',
    column: 'a',
    rowLabel: '？',
    columnLabel: '？',
    cardType: 'hiragana',
    vocabulary: '？',
    meaning: '？',
    image: '',
    icon: '🎴',
    color: '#888',
    styleVariant: 'hiragana',
  }
}

/**
 * 針對特定座位的玩家進行防窺遮罩：
 * 1. 遮蔽牌庫內容，但保留剩餘張數（維持桌中央「あと XX」牌山數量顯示）。
 * 2. 遮蔽其他對手的手牌內容，但保留手牌數量（維持扇形牌背顯示）。
 * 3. 自己的手牌、所有人的棄牌河與已露出的和牌（副露）完全保留。
 */
export function maskStateForPlayer(state: GameState, seat: number): GameState {
  return {
    ...state,
    deck: state.deck.map((_, idx) => makeHiddenCard(`deck-hidden-${idx}`)),
    players: state.players.map((p) => {
      // seat < 0：觀戰，所有手牌都遮罩
      if (seat >= 0 && p.seat === seat) return p
      return {
        ...p,
        hand: p.hand.map((_, idx) => makeHiddenCard(`hidden-${p.seat}-${idx}`)),
      }
    }),
  }
}
