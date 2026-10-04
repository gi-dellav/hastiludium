/**
 * Combat maths. Helpers here mutate the `PlayerState` they are handed; callers
 * (the `flow.ts` reducer) always pass freshly-cloned players, so the exported
 * reducers stay pure from the outside.
 */
import { armor, getCard, weapon, type WeaponCard } from "./cards";
import { distance, hasLineOfSight, type Arena } from "./grid";
import { MAX_HP, type PlayerState } from "./types";

export function hasUpgrade(player: PlayerState, id: PlayerState["upgrades"][number]): boolean {
  return player.upgrades.includes(id);
}

export function activeWeapon(player: PlayerState): WeaponCard | undefined {
  const id = player.weapons[player.activeWeapon];
  if (!id) return undefined;
  const card = getCard(id);
  return card.kind === "weapon" ? card : undefined;
}

export function activeArmor(player: PlayerState): { shield: number; movePenalty: number } {
  const id = player.armors[player.activeArmor];
  if (!id) return { shield: 0, movePenalty: 0 };
  const card = getCard(id);
  if (card.kind !== "armor") return { shield: 0, movePenalty: 0 };
  return { shield: card.shield, movePenalty: card.movePenalty };
}

/** Shield granted at the start of a Cage: active armor plus the Bulwark upgrade. */
export function startingShield(player: PlayerState): number {
  return activeArmor(player).shield + (hasUpgrade(player, "bulwark") ? 1 : 0);
}

/** Move budget: base 3, minus active armor penalty, plus Iron Boots, floored at 1. */
export function moveAllowance(player: PlayerState): number {
  const base = 3 - activeArmor(player).movePenalty + (hasUpgrade(player, "iron-boots") ? 1 : 0);
  return Math.max(1, base);
}

/** Effective weapon range, including the Quiver Belt upgrade. */
export function weaponRange(player: PlayerState, card: WeaponCard): number {
  return card.range + (hasUpgrade(player, "quiver-belt") ? 1 : 0);
}

/** Effective per-hit damage, including the Whetstone upgrade and Rage Draught. */
export function weaponDamage(player: PlayerState, card: WeaponCard): number {
  return card.damage + (hasUpgrade(player, "whetstone") ? 1 : 0) + player.rageBonus;
}

export interface TargetCheck {
  readonly ok: boolean;
  readonly reason?: string;
}

/** Whether `attacker` can currently hit `target` with `card`. */
export function canAttack(
  arena: Arena,
  attacker: PlayerState,
  target: PlayerState,
  card: WeaponCard,
  turn: number,
): TargetCheck {
  if (!attacker.alive) return { ok: false, reason: "Not alive." };
  if (!target.alive) return { ok: false, reason: "Target already down." };
  if (attacker.id === target.id) return { ok: false, reason: "Can't target yourself." };
  if (target.smokeUntil > turn) return { ok: false, reason: "Target is hidden by smoke." };
  const dist = distance(attacker.pos, target.pos);
  if (dist > weaponRange(attacker, card)) return { ok: false, reason: "Out of range." };
  if (card.noAdjacent && dist <= 1) return { ok: false, reason: "Can't target adjacent." };
  if (weaponRange(attacker, card) > 1 && !hasLineOfSight(arena, attacker.pos, target.pos)) {
    return { ok: false, reason: "No line of sight." };
  }
  return { ok: true };
}

export interface DamageResult {
  readonly absorbed: number;
  readonly hpLost: number;
  readonly died: boolean;
  readonly revived: boolean;
}

/**
 * Apply `damage` to `target` (mutating): shield absorbs first (reduced by
 * `ignoresArmor`), then HP. Second Wind revives once at 1 HP instead of dying.
 */
export function applyDamage(
  target: PlayerState,
  damage: number,
  ignoresArmor: number,
): DamageResult {
  const absorbable = Math.max(0, damage - ignoresArmor);
  const absorbed = Math.min(target.shield, absorbable);
  target.shield -= absorbed;
  const hpLost = damage - absorbed;
  target.hp -= hpLost;

  if (target.hp > 0) {
    return { absorbed, hpLost, died: false, revived: false };
  }

  if (hasUpgrade(target, "second-wind") && !target.secondWindUsed) {
    target.secondWindUsed = true;
    target.hp = 1;
    return { absorbed, hpLost, died: false, revived: true };
  }

  target.hp = 0;
  target.alive = false;
  return { absorbed, hpLost, died: true, revived: false };
}

export function resetCageStats(player: PlayerState): void {
  player.hp = MAX_HP;
  player.shield = startingShield(player);
  player.alive = true;
  player.smokeUntil = 0;
  player.secondWindUsed = false;
  player.survived = 0;
  player.roundPoints = 0;
  player.rageBonus = 0;
}

/** Convenience accessor used by shop and UI to describe a weapon slot. */
export function weaponCard(id: string): WeaponCard {
  return weapon(id);
}

/** Convenience accessor used by shop and UI to describe an armor slot. */
export function armorCard(id: string): ReturnType<typeof armor> {
  return armor(id);
}
