/**
 * Simple greedy bots. They drive the same reducer actions as human players, so
 * a bot turn is just a sequence of exported `flow.ts` calls — no hidden state.
 */
import { activeWeapon } from "./combat";
import { getCard, type ArmorCard, type PotionEffect, type WeaponCard } from "./cards";
import {
  attack,
  buy,
  currentPlayer,
  endTurn,
  finishShopTurn,
  getPlayer,
  legalMoves,
  legalTargets,
  move,
  selectArmor,
  selectWeapon,
  sell,
  swapWeapons,
  usePotion,
} from "./flow";
import { distance, hazardRings, ringIndex, type Pos } from "./grid";
import type { GameState, PlayerState } from "./types";

const WEAPON_PRIORITY = ["warhammer", "longbow", "spear", "sword"];
const ARMOR_PRIORITY = ["plate", "chainmail", "leather"];
const POTION_PRIORITY = [
  "greater-healing",
  "healing-draught",
  "elixir-of-iron",
  "stoneskin",
  "rage-draught",
  "choking-smoke",
  "smoke-flask",
];
const UPGRADE_PRIORITY = [
  "second-wind",
  "vampiric-edge",
  "executioner",
  "whetstone",
  "bulwark",
  "scavenger",
  "quiver-belt",
  "iron-boots",
];

function weaponOf(id: string): WeaponCard | undefined {
  const card = getCard(id);
  return card.kind === "weapon" ? card : undefined;
}

function armorOf(id: string): ArmorCard | undefined {
  const card = getCard(id);
  return card.kind === "armor" ? card : undefined;
}

function potionIndexByEffect(player: PlayerState, effect: PotionEffect): number {
  return player.potions.findIndex((id) => {
    const card = getCard(id);
    return card.kind === "potion" && card.effect === effect;
  });
}

function bestWeaponIndex(player: PlayerState): number {
  let best = 0;
  let bestDamage = -1;
  player.weapons.forEach((id, index) => {
    const card = weaponOf(id);
    if (card && card.damage > bestDamage) {
      bestDamage = card.damage;
      best = index;
    }
  });
  return best;
}

function bestArmorIndex(player: PlayerState): number {
  let best = 0;
  let bestShield = -1;
  player.armors.forEach((id, index) => {
    const card = armorOf(id);
    if (card && card.shield > bestShield) {
      bestShield = card.shield;
      best = index;
    }
  });
  return best;
}

function weakestWeaponIndex(player: PlayerState): number {
  let worst = 0;
  let worstDamage = Number.POSITIVE_INFINITY;
  player.weapons.forEach((id, index) => {
    const card = weaponOf(id);
    if (card && card.damage < worstDamage) {
      worstDamage = card.damage;
      worst = index;
    }
  });
  return worst;
}

function weakestArmorIndex(player: PlayerState): number {
  let worst = 0;
  let worstShield = Number.POSITIVE_INFINITY;
  player.armors.forEach((id, index) => {
    const card = armorOf(id);
    if (card && card.shield < worstShield) {
      worstShield = card.shield;
      worst = index;
    }
  });
  return worst;
}

function nextWeaponToBuy(state: GameState, playerId: number): string | undefined {
  const player = getPlayer(state, playerId);
  if (!player) return undefined;
  const owned = new Set(player.weapons);
  return WEAPON_PRIORITY.find((id) => {
    if (owned.has(id)) return false;
    const card = weaponOf(id);
    return card !== undefined && player.ingots >= card.price;
  });
}

function nextArmorToBuy(state: GameState, playerId: number): string | undefined {
  const player = getPlayer(state, playerId);
  if (!player) return undefined;
  const owned = new Set(player.armors);
  return ARMOR_PRIORITY.find((id) => {
    if (owned.has(id)) return false;
    const card = armorOf(id);
    return card !== undefined && player.ingots >= card.price;
  });
}

function nextPotionToBuy(state: GameState, playerId: number): string | undefined {
  const player = getPlayer(state, playerId);
  if (!player) return undefined;
  return POTION_PRIORITY.find((id) => {
    const card = getCard(id);
    return card.kind === "potion" && player.ingots >= card.price;
  });
}

function upgradeWeapons(state: GameState, playerId: number): GameState {
  let next = state;
  let desired = nextWeaponToBuy(next, playerId);
  while (desired) {
    const player = getPlayer(next, playerId);
    const wanted = weaponOf(desired);
    if (!player || !wanted) break;
    if (player.weapons.length >= 2) {
      const worstIndex = weakestWeaponIndex(player);
      const worst = weaponOf(player.weapons[worstIndex] ?? "");
      if (!worst || wanted.damage <= worst.damage) break;
      next = sell(next, playerId, worst.id, worstIndex);
    }
    const before = next;
    next = buy(next, playerId, desired);
    if (next === before) break;
    desired = nextWeaponToBuy(next, playerId);
  }
  const current = getPlayer(next, playerId);
  if (current) next = selectWeapon(next, playerId, bestWeaponIndex(current));
  return next;
}

function upgradeArmor(state: GameState, playerId: number): GameState {
  let next = state;
  let desired = nextArmorToBuy(next, playerId);
  while (desired) {
    const player = getPlayer(next, playerId);
    const wanted = armorOf(desired);
    if (!player || !wanted) break;
    if (player.armors.length >= 2) {
      const worstIndex = weakestArmorIndex(player);
      const worst = armorOf(player.armors[worstIndex] ?? "");
      if (!worst || wanted.shield <= worst.shield) break;
      next = sell(next, playerId, worst.id, worstIndex);
    }
    const before = next;
    next = buy(next, playerId, desired);
    if (next === before) break;
    desired = nextArmorToBuy(next, playerId);
  }
  const current = getPlayer(next, playerId);
  if (current) next = selectArmor(next, playerId, bestArmorIndex(current));
  return next;
}

/** Buy greedily, equip the best gear, then close the bot's shop turn. */
export function runBotShop(state: GameState, playerId: number): GameState {
  let next = upgradeArmor(state, playerId);
  next = upgradeWeapons(next, playerId);

  let desiredPotion = nextPotionToBuy(next, playerId);
  while (desiredPotion) {
    const player = getPlayer(next, playerId);
    if (!player || player.potions.length >= 3) break;
    const before = next;
    next = buy(next, playerId, desiredPotion);
    if (next === before) break;
    desiredPotion = nextPotionToBuy(next, playerId);
  }

  for (const id of UPGRADE_PRIORITY) {
    const player = getPlayer(next, playerId);
    if (!player || player.ingots < getCard(id).price) continue;
    if (player.upgrades.includes(id as PlayerState["upgrades"][number])) continue;
    next = buy(next, playerId, id);
  }

  return finishShopTurn(next);
}

function nearestEnemy(state: GameState, playerId: number): Pos | undefined {
  const player = getPlayer(state, playerId);
  if (!player) return undefined;
  let best: { pos: Pos; dist: number } | undefined;
  for (const other of state.players) {
    if (!other.alive || other.id === playerId) continue;
    const dist = distance(player.pos, other.pos);
    if (!best || dist < best.dist) best = { pos: other.pos, dist };
  }
  return best?.pos;
}

/** One decision for the active bot; the caller re-invokes on a timer. */
export function botCageStep(state: GameState): GameState {
  const player = currentPlayer(state);
  if (!player || !player.isBot) return state;

  const enemies = state.players.filter((other) => other.alive && other.id !== player.id);
  if (enemies.length === 0) return endTurn(state);

  if (!state.hasActed && player.hp <= 2) {
    const healIndex = potionIndexByEffect(player, "heal");
    if (healIndex !== -1) return usePotion(state, player.id, healIndex);
  }

  const targets = legalTargets(state);
  if (targets.length > 0 && (!state.hasActed || state.attacksLeft > 0)) {
    const weakest = [...targets].sort((a, b) => a.hp + a.shield - (b.hp + b.shield))[0];
    if (weakest) return attack(state, player.id, weakest.id);
  }

  if (!state.hasActed && player.hp <= 3) {
    const shieldIndex = potionIndexByEffect(player, "shield");
    if (shieldIndex !== -1) return usePotion(state, player.id, shieldIndex);
  }

  if (!state.hasActed && player.weapons.length > 1) {
    const equipped = activeWeapon(player);
    const betterIndex = bestWeaponIndex(player);
    const better = weaponOf(player.weapons[betterIndex] ?? "");
    if (equipped && better && better.damage > equipped.damage) {
      // Only spend the action on a swap if we can't shoot from here.
      const canShootNow = legalTargets(state).length > 0;
      if (!canShootNow) {
        const moved = swapTo(state, player.id, betterIndex);
        if (moved !== state) return moved;
      }
    }
  }

  const target = nearestEnemy(state, player.id);
  const moves = legalMoves(state);
  if (target && moves.size > 0 && state.moveLeft > 0) {
    const rings = hazardRings(state.turn);
    let best: { pos: Pos; score: number } | undefined;
    for (const moveKey of moves.keys()) {
      const [x, y] = moveKey.split(",").map(Number);
      if (x === undefined || y === undefined) continue;
      const pos: Pos = { x, y };
      const hazardCost = ringIndex(state.arena, pos) < rings ? 100 : 0;
      const score = distance(pos, target) + hazardCost;
      if (!best || score < best.score) best = { pos, score };
    }
    if (best && best.score < distance(player.pos, target)) {
      return move(state, player.id, best.pos);
    }
  }

  return endTurn(state);
}

function swapTo(state: GameState, playerId: number, index: number): GameState {
  const player = getPlayer(state, playerId);
  if (!player) return state;
  // Re-requesting the current weapon is a no-op; otherwise swap once/twice.
  if (player.activeWeapon === index) return state;
  let next = state;
  const steps = player.weapons.length;
  for (let i = 0; i < steps && getPlayer(next, playerId)?.activeWeapon !== index; i += 1) {
    const moved = swapWeapons(next, playerId);
    if (moved === next) break;
    next = moved;
  }
  return next;
}

