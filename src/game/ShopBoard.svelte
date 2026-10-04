<script lang="ts">
  import { getCard, slotLimit, type CardKind } from "../lib/game/cards";
  import { currentShopper } from "../lib/game/flow";
  import type { GameState, PlayerState } from "../lib/game/types";
  import CardView from "./CardView.svelte";

  interface Props {
    game: GameState;
    onbuy: (playerId: number, cardId: string) => void;
    onsell: (playerId: number, cardId: string, index: number) => void;
    onselectweapon: (playerId: number, index: number) => void;
    onselectarmor: (playerId: number, index: number) => void;
    ondone: (playerId: number) => void;
  }

  let { game, onbuy, onsell, onselectweapon, onselectarmor, ondone }: Props = $props();

  const shopper = $derived.by(() => currentShopper(game));
  const interactive = $derived(shopper !== undefined && !shopper.isBot);

  function slotFull(player: PlayerState, kind: CardKind): boolean {
    if (kind === "weapon") return player.weapons.length >= slotLimit("weapon");
    if (kind === "armor") return player.armors.length >= slotLimit("armor");
    return false;
  }

  function canBuy(player: PlayerState, cardId: string): boolean {
    const card = getCard(cardId);
    if (player.ingots < card.price) return false;
    if (slotFull(player, card.kind)) return false;
    if (card.kind === "weapon" && player.weapons.includes(card.id)) return false;
    if (card.kind === "armor" && player.armors.includes(card.id)) return false;
    if (card.kind === "upgrade" && player.upgrades.includes(card.id)) return false;
    return true;
  }
</script>

<section class="section" aria-labelledby="market-heading">
  <div class="flex flex-wrap items-baseline justify-between gap-2">
    <h2 id="market-heading" class="h2">Market</h2>
    {#if shopper}
      <p class="hint">
        {shopper.name} shops {interactive ? "" : "(bot)"} · {shopper.ingots}🪙
      </p>
    {/if}
  </div>

  <div class="card-grid">
    {#each game.market as cardId (cardId)}
      {@const card = getCard(cardId)}
      <CardView
        {card}
        actionLabel="Buy"
        disabled={!interactive || !shopper || !canBuy(shopper, cardId)}
        onaction={() => shopper && onbuy(shopper.id, cardId)}
      />
    {/each}
    {#if game.market.length === 0}
      <p class="hint">The market is empty until next round.</p>
    {/if}
  </div>
</section>

<section class="section" aria-labelledby="loadout-heading">
  <h2 id="loadout-heading" class="h2">Loadouts</h2>
  <div class="loadout-grid">
    {#each game.players as player (player.id)}
      {@const isShopper = shopper?.id === player.id}
      <div class="loadout" class:loadout-active={isShopper}>
        <p class="loadout-name">
          <span aria-hidden="true">{player.emoji}</span>
          {player.name}
          <span class="hint">{player.points} pts · {player.ingots}🪙</span>
        </p>

        {#if interactive && isShopper}
          <div class="loadout-actions">
            <button type="button" class="btn-small" onclick={() => ondone(player.id)}>Done shopping</button>
          </div>
        {/if}

        <dl class="loadout-list">
          <dt>Weapons</dt>
          <dd>
            {#if player.weapons.length === 0}
              <span class="hint">none</span>
            {:else}
              {#each player.weapons as id, index (id)}
                {@const card = getCard(id)}
                <span class="chip" class:chip-active={player.activeWeapon === index}>
                  {card.emoji} {card.name}
                  {#if interactive && isShopper}
                    <button
                      type="button"
                      class="chip-btn"
                      title="Equip"
                      onclick={() => onselectweapon(player.id, index)}>equip</button
                    >
                    <button
                      type="button"
                      class="chip-btn"
                      title="Sell"
                      onclick={() => onsell(player.id, id, index)}>sell</button
                    >
                  {/if}
                </span>
              {/each}
            {/if}
          </dd>

          <dt>Armor</dt>
          <dd>
            {#if player.armors.length === 0}
              <span class="hint">none</span>
            {:else}
              {#each player.armors as id, index (id)}
                {@const card = getCard(id)}
                <span class="chip" class:chip-active={player.activeArmor === index}>
                  {card.emoji} {card.name}
                  {#if interactive && isShopper}
                    <button
                      type="button"
                      class="chip-btn"
                      title="Equip"
                      onclick={() => onselectarmor(player.id, index)}>equip</button
                    >
                    <button
                      type="button"
                      class="chip-btn"
                      title="Sell"
                      onclick={() => onsell(player.id, id, index)}>sell</button
                    >
                  {/if}
                </span>
              {/each}
            {/if}
          </dd>

          <dt>Potions</dt>
          <dd>
            {#if player.potions.length === 0}
              <span class="hint">none</span>
            {:else}
              {#each player.potions as id, index (`${id}-${index}`)}
                {@const card = getCard(id)}
                <span class="chip">
                  {card.emoji} {card.name}
                  {#if interactive && isShopper}
                    <button
                      type="button"
                      class="chip-btn"
                      title="Sell"
                      onclick={() => onsell(player.id, id, index)}>sell</button
                    >
                  {/if}
                </span>
              {/each}
            {/if}
          </dd>

          <dt>Upgrades</dt>
          <dd>
            {#if player.upgrades.length === 0}
              <span class="hint">none</span>
            {:else}
              {#each player.upgrades as id (id)}
                {@const card = getCard(id)}
                <span class="chip">{card.emoji} {card.name}</span>
              {/each}
            {/if}
          </dd>
        </dl>
      </div>
    {/each}
  </div>
</section>
