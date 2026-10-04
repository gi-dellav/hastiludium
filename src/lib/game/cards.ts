/** Card catalogue for *Ingots & Iron*. Pure data + lookups; no DOM. */

export type CardKind = "weapon" | "armor" | "potion" | "upgrade";

export interface WeaponCard {
  readonly id: string;
  readonly kind: "weapon";
  readonly name: string;
  readonly emoji: string;
  readonly price: number;
  readonly damage: number;
  readonly range: number;
  readonly note: string;
  /** Attacks granted per Fight action. */
  readonly attacks: number;
  /** Longbow: cannot hit adjacent (distance 1) targets. */
  readonly noAdjacent: boolean;
  /** Warhammer: points of shield ignored. */
  readonly ignoresArmor: number;
  /** Warhammer: attacking ends your Move for the turn. */
  readonly endsMove: boolean;
}

export interface ArmorCard {
  readonly id: string;
  readonly kind: "armor";
  readonly name: string;
  readonly emoji: string;
  readonly price: number;
  readonly shield: number;
  readonly movePenalty: number;
  readonly note: string;
}

export type PotionEffect = "heal" | "shield" | "smoke" | "rage";

export interface PotionCard {
  readonly id: string;
  readonly kind: "potion";
  readonly name: string;
  readonly emoji: string;
  readonly price: number;
  readonly effect: PotionEffect;
  readonly amount: number;
  readonly note: string;
}

export type UpgradeId =
  | "whetstone"
  | "iron-boots"
  | "quiver-belt"
  | "second-wind"
  | "bulwark"
  | "executioner"
  | "vampiric-edge"
  | "scavenger";

export interface UpgradeCard {
  readonly id: UpgradeId;
  readonly kind: "upgrade";
  readonly name: string;
  readonly emoji: string;
  readonly price: number;
  readonly note: string;
}

export type Card = WeaponCard | ArmorCard | PotionCard | UpgradeCard;

export const WEAPONS: readonly WeaponCard[] = [
  {
    id: "dagger",
    kind: "weapon",
    name: "Rusty Dagger",
    emoji: "🗡️",
    price: 2,
    damage: 1,
    range: 1,
    note: "Fight twice per Action turn.",
    attacks: 2,
    noAdjacent: false,
    ignoresArmor: 0,
    endsMove: false,
  },
  {
    id: "sword",
    kind: "weapon",
    name: "Sword",
    emoji: "⚔️",
    price: 5,
    damage: 2,
    range: 1,
    note: "Reliable.",
    attacks: 1,
    noAdjacent: false,
    ignoresArmor: 0,
    endsMove: false,
  },
  {
    id: "spear",
    kind: "weapon",
    name: "Spear",
    emoji: "🔱",
    price: 6,
    damage: 2,
    range: 2,
    note: "Hits past one tile.",
    attacks: 1,
    noAdjacent: false,
    ignoresArmor: 0,
    endsMove: false,
  },
  {
    id: "longbow",
    kind: "weapon",
    name: "Longbow",
    emoji: "🏹",
    price: 7,
    damage: 2,
    range: 5,
    note: "Can't attack adjacent targets.",
    attacks: 1,
    noAdjacent: true,
    ignoresArmor: 0,
    endsMove: false,
  },
  {
    id: "warhammer",
    kind: "weapon",
    name: "Warhammer",
    emoji: "🔨",
    price: 9,
    damage: 3,
    range: 1,
    note: "Ignores 1 armor; ends your Move.",
    attacks: 1,
    noAdjacent: false,
    ignoresArmor: 1,
    endsMove: true,
  },
];

export const ARMORS: readonly ArmorCard[] = [
  {
    id: "leather",
    kind: "armor",
    name: "Leather",
    emoji: "🥋",
    price: 3,
    shield: 1,
    movePenalty: 0,
    note: "Light and free to move in.",
  },
  {
    id: "chainmail",
    kind: "armor",
    name: "Chainmail",
    emoji: "⛓️",
    price: 6,
    shield: 2,
    movePenalty: 1,
    note: "Heavier, −1 move.",
  },
  {
    id: "plate",
    kind: "armor",
    name: "Plate",
    emoji: "🛡️",
    price: 9,
    shield: 3,
    movePenalty: 2,
    note: "Tanky, −2 move.",
  },
];

export const POTIONS: readonly PotionCard[] = [
  {
    id: "healing-draught",
    kind: "potion",
    name: "Healing Draught",
    emoji: "🧪",
    price: 3,
    effect: "heal",
    amount: 2,
    note: "+2 HP (max 5).",
  },
  {
    id: "stoneskin",
    kind: "potion",
    name: "Stoneskin",
    emoji: "🪨",
    price: 3,
    effect: "shield",
    amount: 2,
    note: "+2 temporary shield.",
  },
  {
    id: "smoke-flask",
    kind: "potion",
    name: "Smoke Flask",
    emoji: "💨",
    price: 4,
    effect: "smoke",
    amount: 1,
    note: "Untargetable until your next turn.",
  },
  {
    id: "greater-healing",
    kind: "potion",
    name: "Greater Healing",
    emoji: "⚗️",
    price: 6,
    effect: "heal",
    amount: 4,
    note: "+4 HP (max 5).",
  },
  {
    id: "elixir-of-iron",
    kind: "potion",
    name: "Elixir of Iron",
    emoji: "🧴",
    price: 5,
    effect: "shield",
    amount: 4,
    note: "+4 temporary shield.",
  },
  {
    id: "rage-draught",
    kind: "potion",
    name: "Rage Draught",
    emoji: "🔴",
    price: 5,
    effect: "rage",
    amount: 2,
    note: "+2 damage on your next hit.",
  },
  {
    id: "choking-smoke",
    kind: "potion",
    name: "Choking Smoke",
    emoji: "🌫️",
    price: 5,
    effect: "smoke",
    amount: 2,
    note: "Untargetable for 2 turns.",
  },
];

export const UPGRADES: readonly UpgradeCard[] = [
  {
    id: "whetstone",
    kind: "upgrade",
    name: "Whetstone",
    emoji: "⚒️",
    price: 6,
    note: "+1 damage on every attack.",
  },
  {
    id: "iron-boots",
    kind: "upgrade",
    name: "Iron Boots",
    emoji: "🥾",
    price: 5,
    note: "+1 move.",
  },
  {
    id: "quiver-belt",
    kind: "upgrade",
    name: "Quiver Belt",
    emoji: "🎯",
    price: 5,
    note: "+1 weapon range.",
  },
  {
    id: "second-wind",
    kind: "upgrade",
    name: "Second Wind",
    emoji: "💗",
    price: 8,
    note: "Once per Cage, revive at 1 HP.",
  },
  {
    id: "bulwark",
    kind: "upgrade",
    name: "Bulwark",
    emoji: "🧱",
    price: 5,
    note: "+1 shield at the start of every Cage.",
  },
  {
    id: "executioner",
    kind: "upgrade",
    name: "Executioner",
    emoji: "🪓",
    price: 6,
    note: "+2 damage against foes at 2 HP or less.",
  },
  {
    id: "vampiric-edge",
    kind: "upgrade",
    name: "Vampiric Edge",
    emoji: "🩸",
    price: 7,
    note: "Heal 1 HP whenever you land a killing blow.",
  },
  {
    id: "scavenger",
    kind: "upgrade",
    name: "Scavenger",
    emoji: "💰",
    price: 6,
    note: "+2 ingots after every Cage.",
  },
];

export const ALL_CARDS: readonly Card[] = [...WEAPONS, ...ARMORS, ...POTIONS, ...UPGRADES];

const BY_ID: ReadonlyMap<string, Card> = new Map(ALL_CARDS.map((card) => [card.id, card]));

/** Look up a card definition; throws on unknown ids (catalogue is code-owned). */
export function getCard(id: string): Card {
  const card = BY_ID.get(id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

export function weapon(id: string): WeaponCard {
  const card = getCard(id);
  if (card.kind !== "weapon") throw new Error(`Not a weapon: ${id}`);
  return card;
}

export function armor(id: string): ArmorCard {
  const card = getCard(id);
  if (card.kind !== "armor") throw new Error(`Not armor: ${id}`);
  return card;
}

export function potion(id: string): PotionCard {
  const card = getCard(id);
  if (card.kind !== "potion") throw new Error(`Not a potion: ${id}`);
  return card;
}

export const BASE_WEAPON = "dagger";
export const MAX_WEAPON_SLOTS = 2;
export const MAX_ARMOR_SLOTS = 2;

/** Slot capacity per kind; potions/upgrades have no cap. */
export function slotLimit(kind: CardKind): number {
  if (kind === "weapon") return MAX_WEAPON_SLOTS;
  if (kind === "armor") return MAX_ARMOR_SLOTS;
  return Number.POSITIVE_INFINITY;
}
