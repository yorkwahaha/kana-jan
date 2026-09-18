const PROFILE_KEY = 'kana-jan-profile-v1'

export interface UserProfile {
  gold: number
  streak: number
  bestStreak: number
  gamesPlayed: number
  wins: number
}

export const INITIAL_PROFILE: UserProfile = {
  gold: 100,
  streak: 0,
  bestStreak: 0,
  gamesPlayed: 0,
  wins: 0,
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return { ...INITIAL_PROFILE }
    return { ...INITIAL_PROFILE, ...JSON.parse(raw) }
  } catch {
    return { ...INITIAL_PROFILE }
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

export interface MatchSettlementResult {
  place: number
  baseGold: number
  streakBonus: number
  netGold: number
  prevGold: number
  nextGold: number
  prevStreak: number
  nextStreak: number
}

export function settleMatch(place: number): MatchSettlementResult {
  const profile = loadProfile()
  const prevGold = profile.gold
  const prevStreak = profile.streak

  let baseGold = 0
  let streakBonus = 0
  let nextStreak = 0

  if (place === 1) {
    baseGold = 50
    // 每連勝 1 場額外 +15 金幣，最高採計 5 場 (+75)
    streakBonus = Math.min(prevStreak, 5) * 15
    nextStreak = prevStreak + 1
    profile.wins += 1
  } else if (place === 2) {
    baseGold = 20
    streakBonus = 0
    nextStreak = 0
  } else if (place === 3) {
    baseGold = 0
    streakBonus = 0
    nextStreak = 0
  } else {
    // 第 4 名
    baseGold = -20
    streakBonus = 0
    nextStreak = 0
  }

  const netGold = baseGold + streakBonus
  const nextGold = Math.max(0, prevGold + netGold)

  profile.gold = nextGold
  profile.streak = nextStreak
  if (nextStreak > profile.bestStreak) profile.bestStreak = nextStreak
  profile.gamesPlayed += 1

  saveProfile(profile)

  return {
    place,
    baseGold,
    streakBonus,
    netGold,
    prevGold,
    nextGold,
    prevStreak,
    nextStreak,
  }
}

export function replenishGold(): UserProfile {
  const profile = loadProfile()
  if (profile.gold < 20) {
    profile.gold = 100
    saveProfile(profile)
  }
  return profile
}

export function forfeitGame(): void {
  const profile = loadProfile()
  profile.streak = 0
  profile.gold = Math.max(0, profile.gold - 20)
  profile.gamesPlayed += 1
  saveProfile(profile)
}
