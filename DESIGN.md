# DESIGN.md — Design System (current state)

Source of truth is `src/app.css`. This file documents what exists today so agents can reuse it or evolve it deliberately. You are free to expand or replace this system; if you do, update this file.

The theme is **medieval manuscript**: a dark night surround (`night-950`) framing a parchment page, Cinzel display type for headings/buttons, EB Garamond body serif, blood-red + gold accents. The game is titled **Hastiludium**.

## 1. Foundations

- **TailwindCSS 4** via `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` (provides `prose`).
- **Fonts** (`@theme` in `app.css`, loaded via Fontsource in `src/main.ts`):
  - `--font-sans: "EB Garamond Variable", "EB Garamond", Georgia, "Times New Roman", serif` (body)
  - `--font-display: "Cinzel Variable", "Cinzel", Georgia, serif` (headings, buttons, labels — use `font-display` utility)
  - `--font-mono: "Geist Mono Variable", "Geist Mono", ui-monospace, …` (numbers, logs, meta)
- **Base** (`body`, `::selection` in `app.css`):
  - Background `night-950` (`#100b07`) with a faint gold radial glow at top, text `parchment-100`, antialiased.
  - Selection: blood-700 bg, parchment-50 text.
- **Palette (`@theme` in `app.css`):**
  - `parchment-50/100/200/300` (`#fbf6e7` → `#e2cb92`) — page and card surfaces.
  - `ink-500/700/900` (`#6b543a` → `#241a10`) — body text scale on parchment.
  - `night-800/900/950` (`#241a10` → `#100b07`) — dark surround, cage frame, code blocks, toasts.
  - `gold-300…700` (`#e6c25a` → `#6b5417`) — borders, rules, prices, glows.
  - `blood-500/700/800` (`#a83232` → `#5f1414`) — primary CTAs, danger, active states.
  - `moss-100/300/700` — reachable-tile greens only.
- **Chrome sync:** PWA `theme_color` / `background_color` (`#17100a` in `vite.config.ts`) and `theme-color` meta in `index.html` match the night surround.

## 2. Layout primitives

| Class | Usage |
|---|---|
| `.page` | Parchment manuscript shell: `max-w-xl`, `min-h-dvh`, `px-6 py-24`, gold side borders, inset gold glow + outer night shadow. Use on every top-level `main`. |
| `.section` | Content section: gold hairline top border + `mt-12 pt-8`. Headed by `.h2`. |
| `.footer` / `.footnote` | Footer bar (gold hairline) / mono microcopy at page end. |
| `.actions` | Row of CTAs under a hero block (double gold rule, wraps). |
| `.meta` | Inline meta row with `.dot` (gold dot) separators. |

## 3. Type scale

| Class | Usage |
|---|---|
| `.eyebrow` | Display font, xs, uppercase, wide tracking (`0.28em`), blood-700. Kicker above `.title`. |
| `.title` | Display font, bold, `text-4xl → sm:text-5xl`, wide tracking, `text-balance`, ink-900 with light text-shadow. One per page. |
| `.lede` | EB Garamond italic paragraph: 18px/7, ink-700, `max-w-md`. |
| `.body` | Standard paragraph: 16px/7, ink-700, `max-w-md`. |
| `.h2` | Display font, bold, uppercase, `0.08em` tracking, ink-900. |
| `.link-inline` | Blood-700 body link, 2px gold decoration → blood on hover. |
| `.link-quiet` | Secondary link: sm ink-500 → blood-700 on hover. |
| `.hint` | xs ink-500 italic helper text. |

## 4. Components

**Buttons** — square-ish (`rounded-[3px]`), uppercase display type, `active:scale-[0.98]`:
- `.btn-primary` — blood-gradient seal with gold border, hard offset shadow + inset gold highlight; hover brightens.
- `.btn-small` — dark ink-gradient squire button with gold border; `.btn-primary.btn-small` variant uses the blood gradient.
- `.btn-toggle` — parchment toggle chip (Human/Bot switch).

**Code:**
- `.pre` — dark night block (gold border, inset black glow, scroll-x).
- `.code` — parchment chip with gold border. Nested reset (`.pre .code`) strips chip styling inside blocks.

**Steps / notes:**
- `.steps` + `li` + `.step-title` (display bold ink-900) / `.step-body` (ink-500).
- `.note` — gold-tinted well with blood left bar, 14px.

**Forms (minimal set — see `knowledge/frontend-patterns.md` §5):**
- `.form` — vertical stack (`max-w-md`, gap-4).
- `.field` — label + control + error column.
- `.label` — display font, sm bold uppercase ink-900; always paired with `for`/`id`.
- `.input` — vellum control (`#fffdf4`, 3px radius, gold border, inner shadow, 16px serif). `[aria-invalid="true"]` turns the border blood — set it whenever a `.form-error` is shown.
- `.form-error` — 13px medium blood-700 message with `role="alert"` + `aria-describedby` wiring.

**Overlays / toasts:**
- `.toast` (+ `.toast-text`, `.toast-btn-solid`, `.toast-btn-quiet`) — dark night proclamation bar with gold border used by `PwaUpdate.svelte`.

**GitHub footer:** `.github-link` + `.github-icon` (mono xs ink-500 → blood-700).

**Game UI (`src/game/*`, `src/routes/Play.svelte`):**
- `.page-wide` — `.page` variant (`max-w-3xl`) that gives the 12×12 cage room.
- `.setup-list` / `.setup-row` / `.setup-emoji` (parchment medallion) / `.btn-toggle` — hotseat player setup.
- `.card-grid` / `.card` (double gold frame + drop shadow) / `.card-emoji` (gold coin medallion) / `.card-body` / `.card-name` (display) / `.card-detail` (mono gold uppercase) / `.card-note` (italic serif) / `.card-foot` / `.card-price` (display gold) / `.btn-small` — shop cards.
- `.loadout-grid` / `.loadout` (vellum, gold border) / `.loadout-active` (blood ring + red glow) / `.loadout-name` (display) / `.loadout-list` (display gold `dt`) / `.chip` (parchment pill) / `.chip-active` (blood pill) / `.chip-btn` — per-player inventory.
- `.cage-status` (dark night HUD with gold border) (+ `.cage-status-main` / `.cage-status-meta` (mono gold uppercase) / `.shield` (gold)) and `.cage-controls` — turn HUD and action buttons.
- `.cage-grid` (night frame, 2px gold border) / `.tile` (parchment gradient) / `.tile-wall` (dark stone) / `.tile-pillar` (grey stone) / `.tile-hazard` (ember gradient) / `.tile-reachable` (moss green) / `.tile-target` (ember + pulsing blood ring via `target-pulse` keyframes) / `.tile-active` (gold glow) / `.tile-actor` / `.tile-badge` / `.tile-meta` / `.tile-pts` (blood) — DOM emoji grid (no canvas): reachable = moss, target = blood ring, active actor = gold ring.
- `.roster` (+ `.roster-row` (gold hairline) / `.roster-dead` / `.roster-name` (display) / `.roster-stats`) and `.log` — standings and running log.

The game deliberately stays emoji-on-DOM: tiles are `<button>`s in a CSS grid, so keyboard focus and screen readers work without a 2D library.


## 5. Markdown rendering

- Post body renders via `{@html post.html}` inside `<article class="prose max-w-none pt-8">` (`src/routes/Post.svelte`).
- `.prose` is re-themed via `--tw-prose-*` overrides (ink body, blood links, gold rules/quotes) and Cinzel headings; blockquotes are italic with a thick gold bar.
- Headings arrive with stable `id` + empty `.heading-anchor` link (see `knowledge/content-authoring.md`); anchors are gold, blood on hover.

## 6. How to change the look

1. **Re-skin:** edit `@theme` tokens (fonts, colors) — never inline ad-hoc Tailwind for layout; add/extend `@layer components` classes instead.
2. **Add a component:** define `.new-thing` with `@apply` in `@layer components`, reuse it in Svelte. Keep names semantic (`card-*`, `btn-*`), not utility dumps.
3. **Sync chrome:** after changing the dark/background color, update `theme_color`/`background_color` in `vite.config.ts` and `theme-color` in `index.html`.
4. **Prune freely:** `app.css` only keeps classes used by `src/`; delete a component class together with its last usage.

## 7. Non-goals (not yet built)

No dark-mode toggle (the chrome is permanently night + parchment), no syntax highlighting for code blocks. SEO defaults (canonical, OG/Twitter tags, `sitemap.xml`/`rss.xml`/`robots.txt`, per-route `<title>`) ship via `plugins/seo.ts` + `src/Seo.svelte` (site name **Hastiludium**). Interactive patterns (route + lazy import, `localStore`, async fetch, form + validation) live in `knowledge/frontend-patterns.md` with primitives in `src/lib/`. Agents may add any of these — document additions here.
