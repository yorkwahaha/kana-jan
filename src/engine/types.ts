import type { BonusMission } from '../data/bonuses'
import type { CardType, KanaCard } from '../data/cards'
import type { ColumnId, RowId } from '../data/kana'

export type Phase =
  | 'lobby'
  | 'dealing'
  | 'playerDraw'
  | 'playerAction'
  | 'discard'
  | 'reaction'
  | 'pronunciation'
  | 'scoring'
  | 'refill'
  | 'nextTurn'
  | 'gameOver'

export type PlayerKind = 'human' | 'ai' | 'local' | 'remote'
export type AiDifficulty = 'easy' | 'normal'
export type YakuKind = 'sameSound' | 'sameRow' | 'sameColumn'
export type ScoreSource = 'tsumo' | 'ron'

export interface YakuCandidate {
  id: string
  kind: YakuKind
  cards: KanaCard[]
  sound?: string
  row?: RowId
  column?: ColumnId
  uniformType?: CardType
  baseScore: number
  typeBonus: number
  missionBonus: number
  totalScore: number
  label: string
}

export interface CompletedYaku {
  yaku: YakuCandidate
  source: ScoreSource
  fromPlayerId?: string
}

export interface PlayerState {
  id: string
  name: string
  kind: PlayerKind
  seat: number
  aiDifficulty: AiDifficulty
  gold: number
  score: number
  hand: KanaCard[]
  completed: CompletedYaku[]
}

export interface GameEvent {
  id: string
  text: string
}

export interface PendingScore {
  playerId: string
  yaku: YakuCandidate
  source: ScoreSource
  fromPlayerId?: string
}

export interface ReactionOption {
  playerId: string
  yaku: YakuCandidate
}

export interface GameState {
  phase: Phase
  seed: number
  rngState: number
  players: PlayerState[]
  deck: KanaCard[]
  discardPile: KanaCard[]
  currentDiscard: KanaCard | null
  currentPlayerIndex: number
  startPlayerIndex: number
  bonus: BonusMission
  pendingScore: PendingScore | null
  reactionOptions: ReactionOption[]
  reactionIndex: number
  events: GameEvent[]
  eventSeq: number
  turnNumber: number
  drewThisTurn: boolean
  declaredThisTurn: boolean
  lastDrawnCardId: string | null
  gameOverReason: 'gold' | 'deck' | null
  rankings: Ranking[] | null
  lastFx: 'dekita' | 'moratta' | 'draw' | 'discard' | 'coin' | null
  lastTransfers: { fromId: string; toId: string; amount: number }[]
}

export interface Ranking {
  playerId: string
  name: string
  score: number
  gold: number
  completedCount: number
  place: number
}

export interface StartConfig {
  seed?: number
  playerName?: string
  aiDifficulty?: AiDifficulty
  aiNames?: string[]
  /** 測試用：指定起始玩家 */
  startPlayerIndex?: number
  /** 測試用：指定 bonus */
  bonus?: BonusMission
  /** 測試用：指定完整牌庫順序（由上往下抽，index 0 先抽） */
  deck?: KanaCard[]
  /** 測試用：指定各玩家起始手牌，略過發牌 */
  hands?: KanaCard[][]
  initialGold?: number
}

export const HAND_SIZE = 7
export const PLAYER_COUNT = 4
export const INITIAL_GOLD = 20
export const DEFAULT_AI_NAMES = ['さくら', 'ひなた', 'あおい']
