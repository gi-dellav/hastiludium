<script lang="ts">
  import { onMount } from "svelte";
  import PwaUpdate from "./PwaUpdate.svelte";
  import Post from "./routes/Post.svelte";
  import PlayLoader from "./routes/PlayLoader.svelte";
  import Seo from "./Seo.svelte";
  import { getPost } from "./lib/posts";
  import {
    currentRoute,
    handleLinkClick,
    withBase,
    type Route,
  } from "./lib/router";

  let route = $state<Route>({ name: "home" });
  let activePost = $derived(route.name === "post" ? getPost(route.slug) : undefined);

  onMount(() => {
    route = currentRoute();
    const onPopState = () => {
      route = currentRoute();
      window.scrollTo({ top: 0 });
    };
    const onClick = (event: MouseEvent) => handleLinkClick(event);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
    };
  });

  const gameTitle = "Hastiludium";
  const gameDescription =
    "Build a loadout, brawl on a shrinking 12×12 cage, and earn Ingots for finishing with few Points. Most Points after 6 rounds wins.";
</script>

{#if route.name === "post"}
  {#if activePost}
    <Seo
      title={activePost.metadata.title}
      description={activePost.metadata.description}
      path={`/post/${activePost.slug}/`}
    />
    <Post post={activePost} />
  {:else}
    <Seo title="Post not found" path="/" noindex={true} />
    <main class="page">
      <p class="eyebrow">404</p>
      <h1 class="title">Post not found.</h1>
      <div class="actions">
        <a href={withBase("/")} class="btn-primary">Back home</a>
      </div>
    </main>
  {/if}
{:else if route.name === "play"}
  <Seo title={gameTitle} description={gameDescription} path="/play/" />
  <PlayLoader />
{:else if route.name === "not-found"}
  {@const missingPath = route.path}
  <Seo title="Page not found" path={missingPath} noindex={true} />
  <main class="page">
    <p class="eyebrow">404</p>
    <h1 class="title">Page not found.</h1>
    <p class="lede">No page at <code class="code">{missingPath}</code>.</p>
    <div class="actions">
      <a href={withBase("/")} class="btn-primary">Back home</a>
    </div>
  </main>
{:else}
  <Seo title={gameTitle} description={gameDescription} path="/" />
  <PlayLoader />
{/if}

<PwaUpdate />
