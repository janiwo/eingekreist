import type { Circle, Player } from './types'

/** What scoring needs to know about a turn. */
export interface ScoredTurn {
  playerId: string
  circle: Circle | null
}

/**
 * The round's winners (spec §1): whoever hit with the smallest circle. Players tied on the
 * smallest radius all win; nobody wins if no circle hit. `hitIds` are the players who hit.
 * Radii are stored rounded, so a tie is plain equality.
 */
export function roundWinners(turns: readonly ScoredTurn[], hitIds: readonly string[]): string[] {
  const hits = turns.filter((t) => t.circle && hitIds.includes(t.playerId))
  if (hits.length === 0) return []
  const smallest = Math.min(...hits.map((t) => t.circle!.radiusKm))
  return hits.filter((t) => t.circle!.radiusKm === smallest).map((t) => t.playerId)
}

/** Players with the most points (all of them while tied). */
export function leaders<P extends Pick<Player, 'score'>>(players: readonly P[]): P[] {
  const top = Math.max(...players.map((p) => p.score))
  return players.filter((p) => p.score === top)
}

/**
 * The game's winner: the single leader once the target score is reached. Several players
 * on top at or above the target means sudden death: play goes on until one leads alone.
 */
export function gameWinner<P extends Pick<Player, 'score'>>(players: readonly P[], targetScore: number): P | null {
  const top = leaders(players)
  return top.length === 1 && top[0].score >= targetScore ? top[0] : null
}

/** Whether the game is in sudden death: several players tied on top at or above the target. */
export function isSuddenDeath(players: readonly Pick<Player, 'score'>[], targetScore: number): boolean {
  const top = leaders(players)
  return top.length > 1 && top[0].score >= targetScore
}

/**
 * Players by score, highest first, with their rank (1-based). Tied players share a rank and
 * the next rank is skipped (1, 1, 3); within a tie the original order is kept.
 */
export function ranking<P extends Pick<Player, 'score'>>(players: readonly P[]): { player: P; rank: number }[] {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return sorted.map((player) => ({ player, rank: sorted.findIndex((p) => p.score === player.score) + 1 }))
}
