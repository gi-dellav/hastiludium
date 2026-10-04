<script lang="ts">
  import { getCard } from "../lib/game/cards";
  import {
    attack,
    buy,
    createGame,
    currentPlayer,
    currentShopper,
    endTurn,
    finishShopTurn,
    move,
    selectArmor,
    selectWeapon,
    sell,
    swapArmor,
    swapWeapons,
    usePotion,
  } from "../lib/game/flow";
  import { botCageStep, runBotShop } from "../lib/game/bots";
  import { MAX_HP, type GameState, type PlayerState } from "../lib/game/types";
  import type { Pos } from "../lib/game/grid";
  import CageGrid from "../game/CageGrid.svelte";
  import ShopBoard from "../game/ShopBoard.svelte";

  const EMOJIS = ["🧑‍🌾", "🧙", "🤺", "🧛"];

  interface SetupPlayer {
    name: string;
    isBot: boolean;
  }

  let playerCount = $state(3);
  let setup = $state<SetupPlayer[]>([
    { name: "You", isBot: false },
    { name: "Bot I", isBot: true },
    { name: "Bot II", isBot: true },
    { name: "Bot III", isBot: true },
  ]);

  let game = $state<GameState | null>(null);

  const active = $derived(game ? currentPlayer(game) : undefined);
  const lastLog = $derived(game ? game.log.slice(-6).reverse() : []);

  // Drive bot turns one step at a time so the board stays visible.
  $effect(() => {
    const current = game;
    if (!current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (current.phase === "shop") {
      const actor = currentShopper(current);
      if (actor?.isBot) {
        timer = setTimeout(() => {
          game = runBotShop(current, actor.id);
        }, 550);
      }
    } else if (current.phase === "cage") {
      const actor = currentPlayer(current);
      if (actor?.isBot) {
        timer = setTimeout(() => {
          game = botCageStep(current);
        }, 600);
      }
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  });

  function start() {
    const configs = setup.slice(0, playerCount).map((player, index) => ({
      name: player.name.trim() === "" ? `P${index + 1}` : player.name.trim(),
      isBot: player.isBot,
      emoji: EMOJIS[index] ?? "🎲",
    }));
    game = createGame(configs);
  }

  function act(step: (state: GameState) => GameState) {
    if (game) game = step(game);
  }

  function onmove(pos: Pos) {
    if (active) act((state) => move(state, active.id, pos));
  }

  function onattack(playerId: number) {
    if (active) act((state) => attack(state, active.id, playerId));
  }

  function onbuy(playerId: number, cardId: string) {
    act((state) => buy(state, playerId, cardId));
  }

  function onsell(playerId: number, cardId: string, index: number) {
    act((state) => sell(state, playerId, cardId, index));
  }

  function onselectweapon(playerId: number, index: number) {
    act((state) => selectWeapon(state, playerId, index));
  }

  function onselectarmor(playerId: number, index: number) {
    act((state) => selectArmor(state, playerId, index));
  }

  function ondone(_playerId: number) {
    act((state) => finishShopTurn(state));
  }

  function hearts(player: PlayerState): string {
    return "❤️".repeat(Math.max(0, player.hp)) + "🖤".repeat(Math.max(0, MAX_HP - player.hp));
  }

  function isSmoke(id: string): boolean {
    const card = getCard(id);
    return card.kind === "potion" && card.effect === "smoke";
  }

  function standings(state: GameState): PlayerState[] {
    return [...state.players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.ingots !== a.ingots) return b.ingots - a.ingots;
      return b.weapons.length + b.armors.length + b.potions.length + b.upgrades.length
        - (a.weapons.length + a.armors.length + a.potions.length + a.upgrades.length);
    });
  }
</script>

<main class="page page-wide">
  {#if !game}
    <p class="eyebrow">Hotseat prototype</p>
    <h1 class="title">Hastiludium</h1>
    <p class="lede">
      Build a loadout in the shop, brawl on a shrinking 12×12 cage, and earn Ingots for finishing
      with few Points. Most total Points after 6 rounds wins.
    </p>

    <section class="section" aria-labelledby="setup-heading">
      <h2 id="setup-heading" class="h2">Players</h2>
      <div class="field">
        <label class="label" for="player-count">How many?</label>
        <select id="player-count" class="input" bind:value={playerCount}>
          <option value={2}>2 players</option>
          <option value={3}>3 players</option>
          <option value={4}>4 players</option>
        </select>
      </div>

      <ul class="setup-list">
        {#each setup.slice(0, playerCount) as player, index (index)}
          <li class="setup-row">
            <span class="setup-emoji" aria-hidden="true">{EMOJIS[index]}</span>
            <input
              class="input"
              type="text"
              aria-label={`Player ${index + 1} name`}
              bind:value={player.name}
            />
            <button
              type="button"
              class="btn-toggle"
              aria-pressed={player.isBot}
              onclick={() => (player.isBot = !player.isBot)}
            >
              {player.isBot ? "Bot" : "Human"}
            </button>
          </li>
        {/each}
      </ul>

      <div class="actions">
        <button type="button" class="btn-primary" onclick={start}>Start match</button>
      </div>
    </section>
  {:else if game.phase === "gameover"}
    {@const ranked = standings(game)}
    {@const champion = ranked[0]}
    <p class="eyebrow">After {game.maxRounds} rounds</p>
    <h1 class="title">{champion ? champion.name : "Nobody"} wins!</h1>
    <p class="lede">Final standings — most Points, then most Ingots, then most cards.</p>

    <ol class="steps">
      {#each ranked as player, index (player.id)}
        <li>
          <span class="step-title"
            >{index + 1}. {player.emoji} {player.name} — {player.points} pts</span
          >
          <span class="step-body">
            {player.ingots}🪙 · {player.weapons.length + player.armors.length + player.potions.length +
              player.upgrades.length} cards
          </span>
        </li>
      {/each}
    </ol>

    <section class="section" aria-labelledby="history-heading">
      <h2 id="history-heading" class="h2">Match log</h2>
      <ul class="log">
        {#each game.log.slice(-24).reverse() as line, index (index)}
          <li>{line}</li>
        {/each}
      </ul>
    </section>

    <div class="actions">
      <button type="button" class="btn-primary" onclick={() => (game = null)}>New match</button>
    </div>
  {:else if game.phase === "shop"}
    <p class="eyebrow">Round {game.round} of {game.maxRounds} · Shops</p>
    <h1 class="title">Spend it or save it.</h1>
    <ShopBoard
      {game}
      onbuy={onbuy}
      onsell={onsell}
      onselectweapon={onselectweapon}
      onselectarmor={onselectarmor}
      ondone={ondone}
    />
  {:else}
    <p class="eyebrow">Round {game.round} of {game.maxRounds} · Cage · Turn {game.turn}</p>
    <h1 class="title">
      {#if active && !active.isBot}
        {active.emoji} {active.name}, your move.
      {:else if active}
        {active.emoji} {active.name} is thinking…
      {:else}
        The Cage
      {/if}
    </h1>

    <section class="cage-status" aria-label="Status">
      <div class="cage-status-main">
        <span class="hp" aria-label={`${active?.hp ?? 0} of ${MAX_HP} HP`}>{active ? hearts(active) : ""}</span>
        {#if active && active.shield > 0}<span class="shield">🛡️ {active.shield}</span>{/if}
        {#if active && active.potions.some((id) => isSmoke(id)) && active.smokeUntil > game.turn}
          <span class="shield">💨 hidden</span>
        {/if}
      </div>
      <div class="cage-status-meta">
        <span>Move {game.moveLeft}</span>
        <span>Attacks {game.attacksLeft}</span>
        {#if active}
          {#each active.weapons as id, index (id)}
            <span class="chip" class:chip-active={active.activeWeapon === index}>
              {getCard(id).emoji} {getCard(id).name}
            </span>
          {/each}
        {/if}
      </div>
    </section>

    <CageGrid {game} onmove={onmove} onattack={onattack} />

    <section class="cage-controls" aria-label="Actions">
      {#if active && !active.isBot}
        {#each active.potions as id, index (`${id}-${index}`)}
          <button
            type="button"
            class="btn-small"
            disabled={game.hasActed}
            onclick={() => act((state) => usePotion(state, active.id, index))}
          >
            Use {getCard(id).emoji} {getCard(id).name}
          </button>
        {/each}
        {#if active.weapons.length > 1}
          <button
            type="button"
            class="btn-small"
            disabled={game.hasActed}
            onclick={() => act((state) => swapWeapons(state, active.id))}>Swap weapon</button
          >
        {/if}
        {#if active.armors.length > 1}
          <button
            type="button"
            class="btn-small"
            disabled={game.hasActed}
            onclick={() => act((state) => swapArmor(state, active.id))}>Swap armor</button
          >
        {/if}
        <button
          type="button"
          class="btn-primary btn-small"
          onclick={() => act((state) => endTurn(state, active.id))}>End turn</button
        >
      {/if}
    </section>

    <section class="section" aria-labelledby="roster-heading">
      <h2 id="roster-heading" class="h2">Standings</h2>
      <ul class="roster">
        {#each standings(game) as player (player.id)}
          <li class="roster-row" class:roster-dead={!player.alive}>
            <span class="roster-name">{player.emoji} {player.name}</span>
            <span class="roster-stats">
              {player.points} pts · {player.ingots}🪙 ·
              {#if player.alive}
                <span class="hp" aria-label={`${player.hp} of ${MAX_HP} HP`}>{hearts(player)}</span>
                {#if player.shield > 0}<span class="shield">🛡️ {player.shield}</span>{/if}
              {:else}
                down
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="section" aria-labelledby="log-heading">
      <h2 id="log-heading" class="h2">Log</h2>
      <ul class="log">
        {#each lastLog as line, index (index)}
          <li>{line}</li>
        {/each}
      </ul>
    </section>
  {/if}
</main>
