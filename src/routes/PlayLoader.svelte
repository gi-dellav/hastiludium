<script lang="ts">
  import type { Component } from "svelte";
  import { onMount } from "svelte";

  let view = $state<Component | undefined>(undefined);
  let failed = $state(false);

  onMount(() => {
    let cancelled = false;
    import("./Play.svelte").then(
      (mod) => {
        if (!cancelled) view = mod.default;
      },
      () => {
        if (!cancelled) failed = true;
      },
    );
    return () => {
      cancelled = true;
    };
  });
</script>

{#if view}
  {@const View = view}
  <View />
{:else if failed}
  <main class="page">
    <p class="eyebrow">Error</p>
    <h1 class="title">Could not load the game.</h1>
  </main>
{:else}
  <main class="page"><p class="lede">Loading the forge…</p></main>
{/if}
