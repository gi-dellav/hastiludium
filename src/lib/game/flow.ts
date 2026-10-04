/**
 * Game reducer for *Ingots & Iron*. Every exported action takes a `GameState`,
 * returns a new one, and never touches its input (players are deep-cloned).
 * Deterministic given `rngState`, so `bun test` can drive whole matches.
 */
import {
  ALL_CARDS,
  BASE_WEAPON,
  getCard,
  potion as potionCard,
  slotLimit,
} from "./cards";
import {
  activeWeapon,
  applyDamage,
  canAttack,
  hasUpgrade,
  moveAllowance,
  resetCageStats,
  startingShield,
  weaponDamage,
} from "./combat";
import {
  genArena,
  hazardRings,
  isHazard,
  key,
  reachable,
  spawnPositions,
  type Pos,
} from "./grid";
import { nextInt, randomSeed, shuffle } from "./rng";
import {
  CAGE_MAX_TURNS,
  DEFAULT_ROUNDS,
  MAX_HP,
  START_INGOTS,
  type GameState,
  type PlayerState,
} from "./types";

export interface PlayerConfig {
  readonly name: string;
  readonly isBot: boolean;
  readonly emoji: string;
}

const MARKET_SIZE = 6;
const MAX_LOG = 80;

export function createGame(configs: readonly PlayerConfig[], seed: number = randomSeed()): GameState {
  const arena = genArena();
  const spawns = spawnPositions(configs.length);
  const players: PlayerState[] = configs.map((config, index) => {
    const spawn = spawns[index] ?? { x: 1, y: 1 };
    return {
      id: index,
      name: config.name,
      isBot: config.isBot,
      emoji: config.emoji,
      ingots: START_INGOTS,
      points: 0,
      weapons: [BASE_WEAPON],
      armors: [],
      potions: [],
      upgrades: [],
      activeWeapon: 0,
      activeArmor: 0,
      hp: MAX_HP,
      shield: 0,
      rageBonus: 0,
      pos: spawn,
      alive: true,
      smokeUntil: 0,
      secondWindUsed: false,
      survived: 0,
      roundPoints: 0,
    };
  });

  const state: GameState = {
    rngState: seed | 0,
    phase: "shop",
    round: 1,
    maxRounds: DEFAULT_ROUNDS,
    players,
    arena,
    market: [],
    turnOrder: players.map((p) => p.id),
    active: 0,
    turn: 1,
    moveLeft: 0,
    attacksLeft: 0,
    hasActed: false,
    log: ["The forge is lit. Round 1 — shops are open."],
    winnerId: null,
    shopOrder: players.map((p) => p.id),
    shopIndex: 0,
  };
  beginShop(state);
  return state;
}

function cloneGame(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      weapons: [...player.weapons],
      armors: [...player.armors],
      potions: [...player.potions],
      upgrades: [...player.upgrades],
      pos: { ...player.pos },
    })),
    arena: state.arena,
    market: [...state.market],
    turnOrder: [...state.turnOrder],
    shopOrder: [...state.shopOrder],
    log: [...state.log],
  };
}

function log(state: GameState, text: string): void {
  state.log.push(text);
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

export function getPlayer(state: GameState, id: number): PlayerState | undefined {
  return state.players.find((player) => player.id === id);
}

export function currentPlayer(state: GameState): PlayerState | undefined {
  if (state.phase !== "cage") return undefined;
  const id = state.turnOrder[state.active];
  if (id === undefined) return undefined;
  return getPlayer(state, id);
}

export function currentShopper(state: GameState): PlayerState | undefined {
  if (state.phase !== "shop") return undefined;
  const id = state.shopOrder[state.shopIndex];
  if (id === undefined) return undefined;
  return getPlayer(state, id);
}

export function aliveCount(state: GameState): number {
  return state.players.filter((player) => player.alive).length;
}

export function cardCount(player: PlayerState): number {
  return player.weapons.length + player.armors.length + player.potions.length + player.upgrades.length;
}

// ---------------------------------------------------------------------------
// Market / shop
// ---------------------------------------------------------------------------

function drawMarket(state: GameState): void {
  const shuffled = shuffle(ALL_CARDS.map((card) => card.id), state.rngState);
  state.rngState = shuffled.state;
  state.market = shuffled.items.slice(0, MARKET_SIZE);
}

interface ShopOrderEntry {
  readonly id: number;
  readonly tiebreak: number;
}

function beginShop(state: GameState): void {
  state.phase = "shop";
  state.shopIndex = 0;
  state.attacksLeft = 0;
  state.moveLeft = 0;
  state.hasActed = false;
  drawMarket(state);

  const entries: ShopOrderEntry[] = state.players.map((player) => {
    const roll = nextInt(state.rngState, 1000);
    state.rngState = roll.state;
    return { id: player.id, tiebreak: player.points * 10_000 + roll.value };
  });
  entries.sort((a, b) => a.tiebreak - b.tiebreak);
  state.shopOrder = entries.map((entry) => entry.id);
  log(state, `Round ${state.round}: ${MARKET_SIZE} cards hit the market.`);
}

function slotList(player: PlayerState, kind: string): string[] | undefined {
  if (kind === "weapon") return player.weapons;
  if (kind === "armor") return player.armors;
  return undefined;
}

export function buy(state: GameState, playerId: number, cardId: string): GameState {
  const next = cloneGame(state);
  if (next.phase !== "shop") return state;
  const player = getPlayer(next, playerId);
  const marketIndex = next.market.indexOf(cardId);
  if (!player || marketIndex === -1) return state;
  const card = getCard(cardId);
  if (player.ingots < card.price) return state;
  const slots = slotList(player, card.kind);
  if (slots && slots.length >= slotLimit(card.kind)) return state;
  if (card.kind === "upgrade" && player.upgrades.includes(card.id)) return state;
  if (card.kind === "weapon" && player.weapons.includes(card.id)) return state;
  if (card.kind === "armor" && player.armors.includes(card.id)) return state;

  player.ingots -= card.price;
  next.market.splice(marketIndex, 1);
  if (card.kind === "weapon") player.weapons.push(card.id);
  else if (card.kind === "armor") player.armors.push(card.id);
  else if (card.kind === "potion") player.potions.push(card.id);
  else player.upgrades.push(card.id);
  log(next, `${player.name} bought ${card.name} for ${card.price} ingots.`);
  return next;
}

export function sell(state: GameState, playerId: number, cardId: string, index: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "shop") return state;
  const player = getPlayer(next, playerId);
  if (!player) return state;
  const card = getCard(cardId);
  if (card.kind === "upgrade") return state;
  const slots = slotList(player, card.kind);
  if (!slots || slots[index] !== card.id) return state;

  const refund = Math.floor(card.price / 2);
  slots.splice(index, 1);
  player.ingots += refund;
  if (card.kind === "weapon" && player.activeWeapon >= player.weapons.length) {
    player.activeWeapon = Math.max(0, player.weapons.length - 1);
  }
  if (card.kind === "armor" && player.activeArmor >= player.armors.length) {
    player.activeArmor = Math.max(0, player.armors.length - 1);
  }
  log(next, `${player.name} sold ${card.name} for ${refund} ingots.`);
  return next;
}

/** Choose the active weapon during the shop (free; bots use it to equip upgrades). */
export function selectWeapon(state: GameState, playerId: number, index: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "shop") return state;
  const player = getPlayer(next, playerId);
  if (!player || player.weapons[index] === undefined) return state;
  player.activeWeapon = index;
  return next;
}

/** Choose the active armor during the shop. */
export function selectArmor(state: GameState, playerId: number, index: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "shop") return state;
  const player = getPlayer(next, playerId);
  if (!player || player.armors[index] === undefined) return state;
  player.activeArmor = index;
  return next;
}

export function finishShopTurn(state: GameState): GameState {
  const next = cloneGame(state);
  if (next.phase !== "shop") return state;
  next.shopIndex += 1;
  if (next.shopIndex >= next.shopOrder.length) {
    beginCage(next);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Cage
// ---------------------------------------------------------------------------

function beginCage(state: GameState): void {
  state.phase = "cage";
  state.turn = 1;
  for (const player of state.players) resetCageStats(player);
  const spawns = spawnPositions(state.players.length);
  state.players.forEach((player, index) => {
    const spawn = spawns[index];
    if (spawn) player.pos = { ...spawn };
  });
  const shuffled = shuffle(state.turnOrder, state.rngState);
  state.rngState = shuffled.state;
  state.turnOrder = shuffled.items;
  const firstAlive = state.turnOrder.findIndex((id) => getPlayer(state, id)?.alive);
  state.active = firstAlive === -1 ? 0 : firstAlive;
  startTurn(state);
  log(state, `Round ${state.round}: the Cage opens. Turn order: ${describeOrder(state)}.`);
}

function describeOrder(state: GameState): string {
  return state.turnOrder
    .map((id) => getPlayer(state, id)?.name ?? `#${id}`)
    .join(" → ");
}

function startTurn(state: GameState): void {
  const player = currentPlayer(state);
  if (!player) return;
  state.moveLeft = moveAllowance(player);
  state.attacksLeft = 0;
  state.hasActed = false;
  log(state, `${player.name}'s turn (turn ${state.turn}).`);
}

function completeTurn(state: GameState): void {
  for (const player of state.players) {
    if (player.alive) player.survived = Math.min(player.survived + 1, CAGE_MAX_TURNS);
  }
  state.turn += 1;
}

function advanceTurn(state: GameState): void {
  if (state.phase !== "cage") return;
  if (aliveCount(state) <= 1) {
    endCage(state);
    return;
  }
  const length = state.turnOrder.length;
  let index = state.active;
  for (let step = 0; step < length; step += 1) {
    index = (index + 1) % length;
    if (index === 0) {
      completeTurn(state);
      if (state.turn > CAGE_MAX_TURNS) {
        endCage(state);
        return;
      }
    }
    const id = state.turnOrder[index];
    const player = id === undefined ? undefined : getPlayer(state, id);
    if (player?.alive) {
      state.active = index;
      startTurn(state);
      return;
    }
  }
  endCage(state);
}

export function legalMoves(state: GameState): Map<string, number> {
  const player = currentPlayer(state);
  if (!player || !player.alive) return new Map();
  const occupied = new Set(
    state.players.filter((other) => other.alive && other.id !== player.id).map((other) => key(other.pos)),
  );
  return reachable(state.arena, player.pos, state.moveLeft, (pos) => occupied.has(key(pos)));
}

export function legalTargets(state: GameState): PlayerState[] {
  const player = currentPlayer(state);
  if (!player) return [];
  const card = activeWeapon(player);
  if (!card) return [];
  if (state.hasActed && state.attacksLeft <= 0) return [];
  return state.players.filter(
    (other) => other.id !== player.id && canAttack(state.arena, player, other, card, state.turn).ok,
  );
}

export function move(state: GameState, playerId: number, to: Pos): GameState {
  const next = cloneGame(state);
  if (next.phase !== "cage") return state;
  const player = currentPlayer(next);
  if (!player || player.id !== playerId) return state;
  const moves = legalMoves(next);
  const cost = moves.get(key(to));
  if (cost === undefined) return state;
  player.pos = { ...to };
  next.moveLeft = Math.max(0, next.moveLeft - cost);
  return next;
}

export function attack(state: GameState, playerId: number, targetId: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "cage") return state;
  const player = currentPlayer(next);
  if (!player || player.id !== playerId) return state;
  const card = activeWeapon(player);
  if (!card) return state;
  if (next.hasActed && next.attacksLeft <= 0) return state;
  const target = getPlayer(next, targetId);
  if (!target) return state;
  const check = canAttack(next.arena, player, target, card, next.turn);
  if (!check.ok) return state;

  if (next.attacksLeft <= 0) next.attacksLeft = card.attacks;
  const executioner = hasUpgrade(player, "executioner") && target.hp <= 2 ? 2 : 0;
  const result = applyDamage(
    target,
    weaponDamage(player, card) + executioner,
    card.ignoresArmor,
  );
  player.rageBonus = 0;
  next.attacksLeft -= 1;
  if (card.endsMove) next.moveLeft = 0;
  if (next.attacksLeft <= 0) next.hasActed = true;

  const bits = [`${player.name} hits ${target.name} with ${card.name}`];
  if (executioner > 0) bits.push("Executioner");
  if (result.absorbed > 0) bits.push(`${result.absorbed} absorbed`);
  if (result.hpLost > 0) bits.push(`${result.hpLost} damage`);
  if (result.revived) bits.push("Second Wind!");
  if (result.died && hasUpgrade(player, "vampiric-edge") && player.hp < MAX_HP) {
    player.hp += 1;
    bits.push("Vampiric Edge +1 HP");
  }
  if (result.died) bits.push(`${target.name} is down`);
  log(next, `${bits.join(", ")}.`);

  if (target.alive === false && aliveCount(next) <= 1) endCage(next);
  return next;
}

export function usePotion(state: GameState, playerId: number, potionIndex: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "cage") return state;
  const player = currentPlayer(next);
  if (!player || player.id !== playerId || next.hasActed) return state;
  const id = player.potions[potionIndex];
  if (id === undefined) return state;
  const card = potionCard(id);
  player.potions.splice(potionIndex, 1);

  if (card.effect === "heal") {
    player.hp = Math.min(MAX_HP, player.hp + card.amount);
    log(next, `${player.name} drinks ${card.name} (+${card.amount} HP).`);
  } else if (card.effect === "shield") {
    player.shield += card.amount;
    log(next, `${player.name} drinks ${card.name} (+${card.amount} shield).`);
  } else if (card.effect === "rage") {
    player.rageBonus += card.amount;
    log(next, `${player.name} drinks ${card.name} (+${card.amount} damage next hit).`);
  } else {
    player.smokeUntil = next.turn + card.amount;
    log(next, `${player.name} vanishes in smoke for ${card.amount} turn(s).`);
  }
  next.hasActed = true;
  next.attacksLeft = 0;
  return next;
}

export function swapWeapons(state: GameState, playerId: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "cage") return state;
  const player = currentPlayer(next);
  if (!player || player.id !== playerId || next.hasActed) return state;
  if (player.weapons.length < 2) return state;
  player.activeWeapon = (player.activeWeapon + 1) % player.weapons.length;
  next.hasActed = true;
  next.attacksLeft = 0;
  log(next, `${player.name} switches weapons.`);
  return next;
}

export function swapArmor(state: GameState, playerId: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "cage") return state;
  const player = currentPlayer(next);
  if (!player || player.id !== playerId || next.hasActed) return state;
  if (player.armors.length < 2) return state;
  player.activeArmor = (player.activeArmor + 1) % player.armors.length;
  player.shield = startingShield(player);
  next.hasActed = true;
  next.attacksLeft = 0;
  log(next, `${player.name} changes armor.`);
  return next;
}

export function endTurn(state: GameState, playerId?: number): GameState {
  const next = cloneGame(state);
  if (next.phase !== "cage") return state;
  const player = currentPlayer(next);
  if (!player) return state;
  if (playerId !== undefined && player.id !== playerId) return state;

  if (isHazard(next.arena, player.pos, hazardRings(next.turn))) {
    const result = applyDamage(player, 1, 0);
    log(next, `${player.name} is caught by the closing Cage${result.died ? "!" : "."}`);
    if (!player.alive && aliveCount(next) <= 1) {
      endCage(next);
      return next;
    }
  }
  advanceTurn(next);
  return next;
}

function computeWinner(state: GameState): number | null {
  const ranked = [...state.players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.ingots !== a.ingots) return b.ingots - a.ingots;
    return cardCount(b) - cardCount(a);
  });
  return ranked[0]?.id ?? null;
}

export function endCage(state: GameState): void {
  if (state.phase !== "cage") return;
  state.phase = "gameover";
  const survivors = state.players.filter((player) => player.alive);
  const lastStanding = survivors.length === 1 ? survivors[0] : undefined;

  for (const player of state.players) {
    let earned = Math.min(player.survived, CAGE_MAX_TURNS);
    const parts = [`${earned} survival`];
    if (lastStanding && player.id === lastStanding.id) {
      earned += 3;
      parts.push("last standing (+3)");
    }
    if (player.alive && player.hp >= 3) {
      earned += 1;
      parts.push("healthy (+1)");
    }
    player.roundPoints = earned;
    player.points += earned;
    let income = Math.max(3, 12 - earned);
    if (hasUpgrade(player, "scavenger")) {
      income += 2;
      parts.push("Scavenger (+2)");
    }
    player.ingots += income;
    log(state, `${player.name}: ${earned} points (${parts.join(", ")}) → +${income} ingots.`);
  }

  if (state.round >= state.maxRounds) {
    state.phase = "gameover";
    state.winnerId = computeWinner(state);
    const winner = state.winnerId === null ? undefined : getPlayer(state, state.winnerId);
    log(state, `${winner ? winner.name : "Nobody"} wins with ${winner?.points ?? 0} points!`);
    return;
  }

  state.phase = "shop";
  state.round += 1;
  beginShopAfterRound(state);
}

function beginShopAfterRound(state: GameState): void {
  state.phase = "shop";
  state.shopIndex = 0;
  state.attacksLeft = 0;
  state.moveLeft = 0;
  state.hasActed = false;
  drawMarket(state);
  const entries: ShopOrderEntry[] = state.players.map((player) => {
    const roll = nextInt(state.rngState, 1000);
    state.rngState = roll.state;
    return { id: player.id, tiebreak: player.points * 10_000 + roll.value };
  });
  entries.sort((a, b) => a.tiebreak - b.tiebreak);
  state.shopOrder = entries.map((entry) => entry.id);
  state.phase = "shop";
  log(state, `Round ${state.round}: ${MARKET_SIZE} cards hit the market.`);
}
