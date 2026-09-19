import type { KanaCard } from '../data/cards'
import type { GameState, YakuCandidate } from '../engine/types'

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

function maskYakuCards(yaku: YakuCandidate): YakuCandidate {
  return {
    ...yaku,
    cards: yaku.cards.map((_, idx) => makeHiddenCard(`hidden-yaku-${idx}`)),
  }
}

/**
 * 針對特定座位的玩家進行防窺遮罩：
 * 1. 遮蔽牌庫內容，但保留剩餘張數（維持桌中央「あと XX」牌山數量顯示）。
 * 2. 遮蔽其他對手的手牌內容，但保留手牌數量（維持扇形牌背顯示）。
 * 3. 自己的手牌、所有人的棄牌河與已露出的和牌（副露）完全保留。
 * 4. 只保留屬於自己的「剛抽入的牌」提示；他人抽牌的實際卡 id 不外洩。
 * 5. 宣告候選（reactionOptions）僅保留自己那組的實際內容，他人的可抄牌型以牌背遮蔽，
 *    避免從候選卡片反推對手手牌；playerId 與順序保留以維持宣告優先權判定。
 */
export function maskStateForPlayer(state: GameState, seat: number): GameState {
  const ownPlayer = state.players.find((p) => p.seat === seat)
  const ownCardIds = new Set(ownPlayer?.hand.map((c) => c.id) ?? [])

  return {
    ...state,
    deck: state.deck.map((_, idx) => makeHiddenCard(`deck-hidden-${idx}`)),
    lastDrawnCardId:
      state.lastDrawnCardId && ownCardIds.has(state.lastDrawnCardId) ? state.lastDrawnCardId : null,
    reactionOptions: state.reactionOptions.map((opt) => {
      const optSeat = state.players.find((p) => p.id === opt.playerId)?.seat
      if (optSeat === seat) return opt
      return { ...opt, yaku: maskYakuCards(opt.yaku) }
    }),
    players: state.players.map((p) => {
      if (p.seat === seat) return p
      return {
        ...p,
        hand: p.hand.map((_, idx) => makeHiddenCard(`hidden-${p.seat}-${idx}`)),
      }
    }),
  }
}
