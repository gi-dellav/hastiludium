<script lang="ts">
  import type { Card } from "../lib/game/cards";

  interface Props {
    card: Card;
    actionLabel?: string;
    disabled?: boolean;
    onaction?: () => void;
  }

  let { card, actionLabel, disabled = false, onaction }: Props = $props();

  const detail = $derived.by(() => {
    if (card.kind === "weapon") return `DMG ${card.damage} · RNG ${card.range}`;
    if (card.kind === "armor") {
      const penalty = card.movePenalty === 0 ? "0" : `−${card.movePenalty}`;
      return `SHIELD ${card.shield} · MOVE ${penalty}`;
    }
    if (card.kind === "potion") return "Potion";
    return "Upgrade · permanent";
  });
</script>

<article class="card">
  <div class="card-emoji" aria-hidden="true">{card.emoji}</div>
  <div class="card-body">
    <p class="card-name">{card.name}</p>
    <p class="card-detail">{detail}</p>
    <p class="card-note">{card.note}</p>
  </div>
  <div class="card-foot">
    <span class="card-price">{card.price}🪙</span>
    {#if actionLabel && onaction}
      <button type="button" class="btn-small" {disabled} onclick={onaction}>{actionLabel}</button>
    {/if}
  </div>
</article>
