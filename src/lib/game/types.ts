import type { UpgradeId } from "./cards";
import type { Arena, Pos } from "./grid";

export type Phase = "shop" | "cage" | "gameover";

export interface PlayerState {
  readonly id: number;
  name: string;
  isBot: boolean;
  emoji: string;
  ingots: number;
  points: number;
  weapons: string[];
  armors: string[];
  potions: string[];
  upgrades: UpgradeId[];
  activeWeapon: number;
  activeArmor: number;
  /** Cage-scoped state, reset at the start of each Cage. */
  hp: number;
  shield: number;
  /** Bonus damage carried over to the next landed hit (Rage Draught). */
  rageBonus: number;
  pos: Pos;
  alive: boolean;
  /** Turn number until which the player cannot be targeted. */
  smokeUntil: number;
  secondWindUsed: boolean;
  survived: number;
  roundPoints: number;
}

export interface GameState {
  rngState: number;
  phase: Phase;
  round: number;
  maxRounds: number;
  players: PlayerState[];
  arena: Arena;
  market: string[];
  turnOrder: number[];
  /** Index into `turnOrder` for the active player. */
  active: number;
  /** Cage turn counter (1-based); one "turn" = every alive player acts once. */
  turn: number;
  moveLeft: number;
  attacksLeft: number;
  hasActed: boolean;
  log: string[];
  winnerId: number | null;
  /** Shop phase ordering + cursor. */
  shopOrder: number[];
  shopIndex: number;
}

export const MAX_HP = 5;
export const CAGE_MAX_TURNS = 10;
export const DEFAULT_ROUNDS = 6;
export const START_INGOTS = 10;
