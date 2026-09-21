import type { BonusMission } from '../data/bonuses'
import type { CardType, KanaCard } from '../data/cards'
import type { RowId } from '../data/kana'

export type Phase =
  | 'lobby'
  | 'preview'
  | 'dealing'
  | 'playerDraw'
  | 'playerAction'
  | 'discard'
  | 'reaction'
  | 'scoring'
  | 'review'
  | 'refill'
  | 'nextTurn'
  | 'gameOver'

export type PlayerKind = 'human' | 'ai' | 'remote'
export type AiDifficulty = 'easy' | 'normal'
export type YakuKind = 'sameSound' | 'sameRow' | 'sameYoon'
export type ScoreSource = 'tsumo' | 'ron'

export interface YakuCandidate {
  id: string
  kind: YakuKind
  cards: KanaCard[]
  sound?: string
  row?: RowId
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
  discards: KanaCard[]
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
  claimedCard?: KanaCard
}

export interface ReactionOption {
  playerId: string
}

export interface GameState {
  phase: Phase
  /** 公開的對局識別碼；連線局不應由 seed 推導。 */
  matchId?: string
  seed: number
  rngState: number
  players: PlayerState[]
  deck: KanaCard[]
  discardPile: KanaCard[]
  currentDiscard: KanaCard | null
  currentPlayerIndex: number
  startPlayerIndex: number
  bonus: BonusMission
  lessonId: string
  activeRows: RowId[]
  pendingScore: PendingScore | null
  reactionOptions: ReactionOption[]
  reactionIndex: number
  events: GameEvent[]
  eventSeq: number
  turnNumber: number
  lastDrawnCardId: string | null
  gameOverReason: 'gold' | 'deck' | null
  rankings: Ranking[] | null
  lastFx: 'dekita' | 'moratta' | 'draw' | 'discard' | 'coin' | null
  lastTransfers: { fromId: string; toId: string; amount: number; paid?: number; systemTopUp?: number }[]
  lastDiscardPlayerId: string | null
  comboCount: number
  /** 本回合擁有者（棄牌者）。抄牌連鎖時 currentPlayerIndex 會暫時換成抄牌者；換人時仍從棄牌者往下一家，但下家若就是抄牌者則再順延一家。 */
  turnOwnerIndex: number
  /** 開局牌組中各讀音／型態的實際張數，不含牌序。 */
  deckManifest?: Record<string, number>
}

export interface Ranking {
  playerId: string
  name: string
  score: number
  gold: number
  completedCount: number
  place: number
}

export interface PlayerConfig {
  id: string
  name: string
  kind: PlayerKind
  seat: number
  aiDifficulty?: AiDifficulty
}

export interface StartConfig {
  seed?: number
  matchId?: string
  playerName?: string
  aiDifficulty?: AiDifficulty
  aiNames?: string[]
  lessonId?: string
  activeRows?: RowId[]
  /** 測試用：略過「本次登場」預覽 */
  skipPreview?: boolean
  /** 測試用：指定起始玩家 */
  startPlayerIndex?: number
  /** 測試用：指定 bonus */
  bonus?: BonusMission
  /**
   * 指定抽牌順序（index 0 先抽）。
   * 未提供 hands 時這是完整牌庫，會從中發牌。
   * 同時提供 hands 時這是發牌後的牌山；張數清單會把手牌與牌山相加，同一張牌不要放進兩邊。
   */
  deck?: KanaCard[]
  /** 測試用：指定各玩家起始手牌，略過發牌 */
  hands?: KanaCard[][]
  initialGold?: number
  /** 連線或自訂牌局：指定 4 個座位的詳細配置 */
  playerConfigs?: PlayerConfig[]
}

export const HAND_SIZE = 7
export const PLAYER_COUNT = 4
export const INITIAL_GOLD = 1000
export const DEFAULT_AI_NAMES = ['さくら', 'ひなた', 'あおい']
