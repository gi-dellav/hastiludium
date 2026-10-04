<script lang="ts">
  import { currentPlayer, legalMoves, legalTargets } from "../lib/game/flow";
  import {
    GRID_SIZE,
    hazardRings,
    isHazard,
    key,
    tileAt,
    type Pos,
    type Tile,
  } from "../lib/game/grid";
  import type { GameState, PlayerState } from "../lib/game/types";

  interface Props {
    game: GameState;
    onmove: (pos: Pos) => void;
    onattack: (playerId: number) => void;
  }

  let { game, onmove, onattack }: Props = $props();

  const active = $derived(currentPlayer(game));
  const interactive = $derived(active !== undefined && !active.isBot);
  const moves = $derived(interactive ? legalMoves(game) : new Map<string, number>());
  const targetIds = $derived.by(() => {
    if (!interactive) return new Set<number>();
    return new Set(legalTargets(game).map((player) => player.id));
  });

  interface Cell {
    pos: Pos;
    tile: Tile;
    occupant: PlayerState | undefined;
    hazard: boolean;
    reachable: boolean;
    target: boolean;
    isActive: boolean;
  }

  function tileEmoji(tile: Tile): string {
    if (tile === "wall") return "🧱";
    if (tile === "pillar") return "🗿";
    return "";
  }

  const cells = $derived.by(() => {
    const rings = hazardRings(game.turn);
    const out: Cell[] = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const pos: Pos = { x, y };
        const tile = tileAt(game.arena, x, y) ?? "floor";
        const occupant = game.players.find(
          (player) => player.alive && player.pos.x === x && player.pos.y === y,
        );
        out.push({
          pos,
          tile,
          occupant,
          hazard: isHazard(game.arena, pos, rings),
          reachable: moves.has(key(pos)),
          target: occupant !== undefined && targetIds.has(occupant.id),
          isActive: occupant !== undefined && occupant.id === active?.id,
        });
      }
    }
    return out;
  });

  function label(cell: Cell): string {
    const parts: string[] = [`(${cell.pos.x + 1}, ${cell.pos.y + 1})`];
    if (cell.occupant) {
      parts.push(cell.occupant.name);
      parts.push(`${cell.occupant.hp} HP`);
      parts.push(`${cell.occupant.points} points`);
      if (cell.occupant.shield > 0) parts.push(`${cell.occupant.shield} shield`);
    } else if (cell.tile === "wall") parts.push("wall");
    else if (cell.tile === "pillar") parts.push("pillar");
    if (cell.hazard) parts.push("hazard");
    if (cell.target) parts.push("target");
    if (cell.reachable) parts.push("reachable");
    return parts.join(", ");
  }

  function onclick(cell: Cell) {
    if (!interactive) return;
    if (cell.occupant && targetIds.has(cell.occupant.id)) {
      onattack(cell.occupant.id);
      return;
    }
    if (cell.reachable) onmove(cell.pos);
  }
</script>

<div class="cage-grid" role="grid" aria-label="Cage">
  {#each cells as cell (key(cell.pos))}
    <button
      type="button"
      class="tile"
      class:tile-wall={cell.tile === "wall"}
      class:tile-pillar={cell.tile === "pillar"}
      class:tile-hazard={cell.hazard}
      class:tile-reachable={cell.reachable}
      class:tile-target={cell.target}
      class:tile-active={cell.isActive}
      disabled={!interactive || (!cell.reachable && !cell.target)}
      aria-label={label(cell)}
      onclick={() => onclick(cell)}
    >
      {#if cell.occupant}
        <span class="tile-actor" aria-hidden="true">{cell.occupant.emoji}</span>
        <span class="tile-meta" aria-hidden="true">
          <span class="tile-hp">{cell.occupant.hp}❤</span>
          <span class="tile-pts">{cell.occupant.points}★</span>
        </span>
        {#if cell.hazard}<span class="tile-badge" aria-hidden="true">🔥</span>{/if}
      {:else if cell.hazard}
        <span aria-hidden="true">🔥</span>
      {:else}
        <span aria-hidden="true">{tileEmoji(cell.tile)}</span>
      {/if}
    </button>
  {/each}
</div>
