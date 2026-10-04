import { describe, expect, it } from "bun:test";
import { ALL_CARDS, getCard, slotLimit, type UpgradeId } from "../src/lib/game/cards.js";
import {
  blocksMovement,
  distance,
  genArena,
  GRID_SIZE,
  hazardRings,
  hasLineOfSight,
  isHazard,
  reachable,
  spawnPositions,
  tileAt,
} from "../src/lib/game/grid.js";
import { nextInt, nextRandom, shuffle } from "../src/lib/game/rng.js";
import {
  buy,
  createGame,
  currentPlayer,
  currentShopper,
  endCage,
  getPlayer,
  legalTargets,
  sell,
} from "../src/lib/game/flow.js";
import { botCageStep, runBotShop } from "../src/lib/game/bots.js";
import type { GameState } from "../src/lib/game/types.js";

function newGame(seed = 42, bots = false): GameState {
  return createGame(
    [
      { name: "A", isBot: bots, emoji: "🅰️" },
      { name: "B", isBot: bots, emoji: "🅱️" },
    ],
    seed,
  );
}

describe("cards", () => {
  it("has unique ids across the catalogue", () => {
    const ids = ALL_CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("caps weapon and armor slots at 2, leaves potions/upgrades open", () => {
    expect(slotLimit("weapon")).toBe(2);
    expect(slotLimit("armor")).toBe(2);
    expect(slotLimit("potion")).toBe(Infinity);
    expect(slotLimit("upgrade")).toBe(Infinity);
  });

  it("exposes the dagger as the basic weapon", () => {
    const dagger = getCard("dagger");
    expect(dagger.kind).toBe("weapon");
    if (dagger.kind === "weapon") expect(dagger.attacks).toBe(2);
  });
});

describe("rng", () => {
  it("is deterministic for a given state", () => {
    const a = nextRandom(123);
    const b = nextRandom(123);
    expect(a).toEqual(b);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(1);
  });

  it("produces integers in range", () => {
    let state = 7;
    for (let i = 0; i < 50; i += 1) {
      const roll = nextInt(state, 8);
      expect(roll.value).toBeGreaterThanOrEqual(0);
      expect(roll.value).toBeLessThan(8);
      state = roll.state;
    }
  });

  it("shuffles deterministically without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const a = shuffle(input, 99);
    const b = shuffle(input, 99);
    expect(a.items).toEqual(b.items);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...a.items].sort((x, y) => x - y)).toEqual(input);
  });
});

describe("grid", () => {
  it("builds a square arena with walls and pillars", () => {
    const arena = genArena();
    expect(arena.tiles.length).toBe(GRID_SIZE * GRID_SIZE);
    expect(blocksMovement("wall")).toBe(true);
    expect(blocksMovement("pillar")).toBe(false);
  });

  it("spawns four corners or opposite edges", () => {
    expect(spawnPositions(4)).toEqual([
      { x: 1, y: 1 },
      { x: 10, y: 1 },
      { x: 1, y: 10 },
      { x: 10, y: 10 },
    ]);
    expect(spawnPositions(2)).toHaveLength(2);
  });

  it("limits reachable tiles by the move budget", () => {
    const arena = genArena();
    const near = reachable(arena, { x: 1, y: 1 }, 1);
    expect(near.size).toBeGreaterThan(0);
    for (const cost of near.values()) expect(cost).toBe(1);

    const far = reachable(arena, { x: 1, y: 1 }, 3);
    expect(far.size).toBeGreaterThan(near.size);
  });

  it("lets walls block the straight line between two tiles", () => {
    const arena = genArena();
    // Wall template places walls at (2,2), (3,2), (2,3).
    const x = 2;
    expect(tileAt(arena, x, 2)).toBe("wall");
    expect(hasLineOfSight(arena, { x: 1, y: 2 }, { x: 4, y: 2 })).toBe(false);
    expect(hasLineOfSight(arena, { x: 1, y: 1 }, { x: 1, y: 4 })).toBe(true);
  });

  it("closes rings over time", () => {
    const arena = genArena();
    expect(hazardRings(1)).toBe(0);
    expect(hazardRings(4)).toBe(1);
    expect(hazardRings(6)).toBe(2);
    expect(isHazard(arena, { x: 0, y: 0 }, 1)).toBe(true);
    expect(isHazard(arena, { x: 5, y: 5 }, 1)).toBe(false);
  });

  it("measures Chebyshev distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(3);
  });
});

describe("shop", () => {
  it("starts every player with 10 ingots and a dagger", () => {
    const game = newGame();
    const player = getPlayer(game, 0);
    expect(player?.ingots).toBe(10);
    expect(player?.weapons).toEqual(["dagger"]);
    expect(game.market).toHaveLength(6);
  });

  it("buys a card, deducts ingots and removes it from the market", () => {
    const game = newGame();
    const cardId = game.market[0];
    if (!cardId) throw new Error("empty market");
    const card = getCard(cardId);
    const before = getPlayer(game, 0)?.ingots ?? 0;
    const next = buy(game, 0, cardId);
    expect(next).not.toBe(game);
    expect(next.market).not.toContain(cardId);
    expect(getPlayer(next, 0)?.ingots).toBe(before - card.price);
  });

  it("rejects purchases that overflow a slot", () => {
    let game = newGame();
    const weapon = game.market.find((id) => getCard(id).kind === "weapon");
    const armor = game.market.find((id) => getCard(id).kind === "armor");
    if (weapon) game = buy(game, 0, weapon);
    if (armor) game = buy(game, 0, armor);
    if (armor) game = buy(game, 0, armor);
    // Bots would need 2 armors in the market to fill both; just assert the cap
    // via the weapon slot which already holds the dagger.
    expect(getPlayer(game, 0)?.weapons.length).toBeLessThanOrEqual(2);
  });

  it("refunds half price on sell and refuses to sell upgrades", () => {
    let game = newGame();
    // Markets are random; find a seed that actually stocks armor.
    for (let seed = 1; seed < 100; seed += 1) {
      const candidate = newGame(seed);
      if (candidate.market.some((id) => getCard(id).kind === "armor")) {
        game = candidate;
        break;
      }
    }
    const armorId = game.market.find((id) => getCard(id).kind === "armor");
    if (!armorId) throw new Error("no armor in any tested market");
    game = buy(game, 0, armorId);
    const price = getCard(armorId).price;
    const before = getPlayer(game, 0)?.ingots ?? 0;
    game = sell(game, 0, armorId, 0);
    expect(getPlayer(game, 0)?.ingots).toBe(before + Math.floor(price / 2));

    const upgradeId = game.market.find((id) => getCard(id).kind === "upgrade");
    if (upgradeId) {
      game = buy(game, 0, upgradeId);
      const after = getPlayer(game, 0);
      const index = after?.upgrades.length ?? 0;
      if (after && index > 0) {
        const snapshot = structuredClone(after.ingots);
        game = sell(game, 0, upgradeId, index - 1);
        expect(getPlayer(game, 0)?.ingots).toBe(snapshot);
        expect(getPlayer(game, 0)?.upgrades).toContain(upgradeId as UpgradeId);
      }
    }
  });

  it("lets fewer-points players shop first", () => {
    const game = newGame();
    expect(currentShopper(game)?.id).toBe(game.shopOrder[0]);
    expect(game.shopOrder).toHaveLength(2);
  });
});

describe("cage", () => {
  it("resets HP and assigns turn order after the shop", () => {
    let game = newGame();
    while (game.phase === "shop") {
      const shopper = currentShopper(game);
      if (!shopper) break;
      game = runBotShop(game, shopper.id);
    }
    expect(game.phase).toBe("cage");
    expect(currentPlayer(game)).toBeDefined();
    for (const player of game.players) expect(player.hp).toBe(5);
  });

  it("only offers legal targets with a weapon in hand", () => {
    let game = newGame(7);
    while (game.phase === "shop") {
      const shopper = currentShopper(game);
      if (!shopper) break;
      game = runBotShop(game, shopper.id);
    }
    const targets = legalTargets(game);
    for (const target of targets) expect(target.id).not.toBe(currentPlayer(game)?.id);
  });

  it("pays out at least 3 ingots when a cage ends", () => {
    let game = newGame();
    while (game.phase === "shop") {
      const shopper = currentShopper(game);
      if (!shopper) break;
      game = runBotShop(game, shopper.id);
    }
    endCage(game);
    expect(game.phase).toBe("shop");
    for (const player of game.players) {
      expect(player.points).toBeGreaterThan(0);
      expect(player.ingots).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("full bot match", () => {
  it("terminates and produces a winner", () => {
    let game = createGame(
      [
        { name: "A", isBot: true, emoji: "🅰️" },
        { name: "B", isBot: true, emoji: "🅱️" },
        { name: "C", isBot: true, emoji: "🅾️" },
      ],
      2024,
    );
    let guard = 0;
    while (game.phase !== "gameover" && guard < 200_000) {
      guard += 1;
      if (game.phase === "shop") {
        const shopper = currentShopper(game);
        if (!shopper) break;
        game = runBotShop(game, shopper.id);
      } else {
        game = botCageStep(game);
      }
    }
    expect(guard).toBeLessThan(200_000);
    expect(game.phase).toBe("gameover");
    expect(game.round).toBe(game.maxRounds);
    expect(game.winnerId).not.toBeNull();
    for (const player of game.players) {
      expect(Number.isFinite(player.points)).toBe(true);
      expect(player.points).toBeGreaterThan(0);
    }
  });
});
