# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kenar Narayaka's personal website, hosted via GitHub Pages at `kxnar.github.io`. It is a static site styled as a **terminal emulator**: plain HTML, one stylesheet, three scripts — no build step, no bundler, no package manager, no framework, no dependencies.

## Development

There is no build/lint/test tooling. To preview:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. Opening `index.html` directly over `file://` also works and is worth checking — that constraint is why the scripts are plain `<script defer>` rather than ES modules (module loading is blocked by CORS on `file://`).

Since GitHub Pages serves these files as-is, verify changes by opening the page in a browser — there is no compilation step to catch mistakes.

Note when testing locally: `python -m http.server` sends no `Cache-Control`, so browsers apply heuristic caching and a just-edited `.js` may be served stale for a few seconds. Hard-reload, or wait a moment, before concluding a change didn't work.

## Structure

Single page, hash-routed. `index.html` holds all five sections; there is no per-page HTML any more.

- `index.html` — the whole site: terminal chrome plus `<section class="page">` blocks with ids `home`, `education`, `projects`, `blog`, `interactive`.
- `about.html`, `projects.html`, `blog.html` — three-line redirect stubs pointing at `index.html#…`, kept so old inbound links still resolve.
- `style.css` — single stylesheet, theme-aware via CSS custom properties.
- `script.js` — the shell: router, typing engine, vim cursor, command line, theme, education module list.
- `fractals.js` — ASCII fractal renderers and the carousel (`window.KX.fractals`).
- `region.js` — the region map: terrain, towns, pathfinding, and the ASCII renderer (`window.KX.region`).
- `region-tiles.js` — the pixel-art renderer for that map (`window.KX.regionTiles`).
- `cv.pdf`, `logo.jpeg` — static assets.

All four scripts attach to a single `window.KX` namespace and are wrapped in IIFEs. Load order in `index.html` matters: `fractals.js`, `region-tiles.js` and `region.js` define their APIs, then `script.js` boots and calls into them. `region-tiles.js` must come before `region.js`, which reads `KX.regionTiles` when it picks a renderer.

### Routing

`ROUTES` in `script.js` is the single source of truth for sections — id, path (`~/education`), and label. It drives the tab bar, the `PS1` string, the window title, the vim statusline, and the `cd` command. Adding a section means adding a `<section class="page" id="…">` to `index.html` and an entry to `ROUTES`.

Navigation is `location.hash` → `hashchange` → `show(id)`, so browser back/forward and deep links work. `show()` also nudges the widgets that need a visible box to measure (`KX.fractals.refresh()`, `KX.region.boot()`).

### Typing engine

`typeIn(root, done)` reveals text as if typed. Each text node is split into a shown span plus a `visibility:hidden` remainder span, and characters move from one to the other — so every element occupies its final box from the first frame and **nothing reflows**. On completion each pair collapses back to a plain text node, leaving the DOM as it started.

- Elements carrying `data-type="char"` type character-by-character; everything else fills in on a frame budget so any section lands in ~500ms.
- `data-no-type` on an ancestor opts a subtree out entirely (used for the fractal frame, the region map, and the Umbreon art). `<pre>` is always skipped.
- Sections type once per session; revisits are instant.
- Bails immediately under `prefers-reduced-motion: reduce` **and** when `document.hidden` — rAF is paused in a background tab, and a run started there would leave text stuck behind `visibility:hidden`.

Anywhere a CSS transition needs to start, force layout synchronously (`void el.offsetHeight`) rather than waiting on `requestAnimationFrame`; rAF never fires in a background tab and the element would stay parked.

### Vim cursor

A single fixed-position block (`#vim-cursor`) follows the pointer and snaps to the character under it, using `document.caretPositionFromPoint` (falling back to `caretRangeFromPoint`) and a one-character `Range` rect. Where there is no text it falls back to a monospace grid measured from a hidden probe. `mix-blend-mode: difference` inverts the glyph beneath, so it reads correctly in both themes with no per-theme colour. Hidden under `(hover: none)`/`(pointer: coarse)`.

### Command line

A real `<input>` at the bottom. Commands live in the `COMMANDS` map in `script.js`; argument completions in `ARG_HINTS`. History persists to `localStorage` (`kx-history`). `Esc` blurs the input into "normal mode", where `1`-`5` switch section, `i`/`:` return to the prompt, and arrows/`hjkl` drive the carousel and the region map — that split is why the carousel and map key handlers bail when `e.target` is an `INPUT`.

### Theming

Dark/light via a `data-theme` attribute on `<html>`. All colours are CSS custom properties in `:root` (dark) overridden under `[data-theme="light"]` — new colour usage must reference these variables, never hardcoded values, so both themes stay correct. The choice persists to `localStorage` and is applied by a small **inline script in `<head>`**; it has to stay inline and in the head to beat first paint.

### ASCII fractal carousel

`fractals.js` exposes a `FRACTALS` array of `{ id, name, formula, render(el, cols, rows) }`. Adding one means writing a `render` and appending an entry — the carousel, the counter, the `fractal` command and the detail slider all pick it up automatically.

Swaps are deliberately **synchronous and instant** — no cross-fade, no hover preview of the next item. `cols`/`rows` are derived from the frame's measured size and the current font size using `CHAR_W`/`CHAR_H`; **`CHAR_H` must match `#frac-art`'s `line-height` in `style.css`** or the art won't fill its box.

### Region map

`region.js` builds a 96×34 tile grid: land/sea from value noise, mountains from ridge segments, forest scatter, then routes carved as orthogonal polylines and towns stamped last. `TOWNS` maps towns to sections — that array is the map's navigation. The sprite walks via uniform-cost search where routes are cheaper than open grass, so it prefers roads. Booted lazily on first visit to `#interactive`.

A town is `{ id, x, y, name, role }` plus two optional fields. `url` makes it an **external** target: its panel links out (`cv.pdf`, new tab) instead of routing to `#id`, which matters because an id with no matching `ROUTES` entry would otherwise bounce to `home` via `currentId()`. `build` picks which building the pixel renderer stamps (`center`, the default, or `gate`). A new town needs a `BLURB` entry too, and `ARG_HINTS.map` in `script.js` is a hardcoded list that has to be kept in step.

Town footprints are a 5×3 stamp minus the corners, so towns must clear each other by more than 5 in x and 3 in y. Placing one on an existing `ROUTES` waypoint is what makes it reachable — pathfinding needs a road to it.

**Two renderers, one map.** The terrain array, towns, pathfinding, drawer and encounters are renderer-agnostic; a renderer is only a way of drawing them:

```js
{ id, mount(regionEl) -> rootEl, unmount(), draw(MAP),
  layout(budgetW, availH, MAP) -> { cellW, cellH, width, height },
  sprite(el, dir, frame), critter(el, index) }
```

`MAP` is the read-only view they get (`W`, `H`, `at`, `inside`, `routeMask`, `hash2`, `TOWNS`, `codes`) — neither renderer owns the data, so editing `TOWNS` or `ROUTES` changes both views at once. `asciiRenderer` lives in `region.js`; the pixel one is `region-tiles.js`. Adding a third means implementing that interface and adding it to `setMode`.

Autotiling is single-sourced in `routeMask(x, y)`, a 4-bit `N|S|E|W` mask: the ascii renderer looks a box-drawing glyph up from it, the pixel renderer indexes its 16 path sprites with it. `region-tiles.js` reuses the same idea locally in `maskOf(MAP, x, y, code)` for coastlines, forest canopies and mountains — the dark outline is drawn only on edges with no matching neighbour, so a block of forest merges into one canopy instead of a field of identical bumps, and the trunk appears only where the canopy stops. Off-map counts as a match, so nothing outlines itself against the edge of the world.

Which renderer is live is `localStorage['kx-map-mode']` (`tiles`, the default, or `ascii`), switched by the `#map-mode-toggle` button in the section header or the `toggle ascii|graphics` command (bare `toggle` flips). That command calls `KX.region.setMode` — note `script.js` has its own unrelated local `setMode(insert)` for the vim statusline. Visibility is the `mode-tiles`/`mode-ascii` class on `.region`, **not** the `hidden` attribute — both renderer roots set `display`, which would beat `[hidden]`.

Cell geometry comes back from `layout()` and is written to `--cell-w`/`--cell-h` on `.region`; the sprite, critter and town buttons position themselves off those variables and so need no per-mode maths. `fit()` owns the stage split — it hands the renderer a width budget and gives the leftover to the umbreon. Square pixel tiles fill the stage where the ascii grid leaves slack, so `fit()` will shrink the tile map by up to 25% to keep the umbreon column.

**Pixel art is generated, never loaded.** `region-tiles.js` draws every tile and both sprite sheets at runtime with `fillRect` over character-grid patterns (8 source px per tile, upscaled by CSS with `image-rendering: pixelated`) — no image files, so `file://` still works and `toDataURL` can't taint. Its colours are the `--px-*` custom properties, read off `:root` at draw time. Every key in `PX_KEYS` must have a matching `--px-*` token or the tile paints magenta — that is the intended tell.

The `--px-*` block is the one part of the stylesheet that is **deliberately theme-independent**: it lives only in `:root`, with no `[data-theme="light"]` override, because these are Pokémon overworld colours and grass is green and Ash's cap is red whichever terminal theme is on. `KX.region.repaint()` still exists for a palette change at runtime, but nothing calls it, and a theme switch is intentionally not a repaint.

**The trainer sheet's dimensions are coupled across three files.** He is 10×14 source px — 1.25 tiles wide, 1.75 tall — in a sheet of `FRAMES` columns by 4 directions. Changing the frame count or the sprite size means changing all of: `SPRITE_W`/`SPRITE_H`/`FRAMES` in `region-tiles.js`, the `backgroundPosition` maths in its `sprite()`, and `background-size` plus the width/height/margin multipliers on `.mode-tiles .region-sprite` in `style.css`. Get one out of step and the sprite tears or floats off its tile. `region.js` bumps `frame` once per tile step, so `STEP_MS` there is both the walk speed and the animation rate.

Stepping into tall grass occasionally announces a wild `WILD[i]`. It's flavour — nothing blocks, there's no battle, and it's suppressed under `prefers-reduced-motion` (unlike walking, which runs regardless because teleporting would make the map pointless). `CRITTERS` in `region-tiles.js` is indexed by the same `i`, so the two arrays have to stay the same length and order or the art and the name disagree.

### Education notes

`MODULES` in `script.js` drives the education section, grouped by `term`. `NOTES_BASE` points at the Quartz-published Obsidian vault and `NOTES_LIVE` gates it: while false, every module renders `$ cat notes/<slug> → no such file (yet)` instead of a link, `open notes` refuses, and `graph` refuses. Publishing the vault is a one-line change.

`NOTES_LIVE` is a **single global gate**, not per-module — flipping it turns every module carrying a `notes` slug into a live link at once, so a module whose note isn't written yet should have its `notes` key removed rather than left dangling.

### Notes graph

`notes-graph.js` (`KX.notesGraph`) draws the whole vault as a force-directed graph on a canvas in the side terminal. Interface: `mount(hostEl, { base, onReady, onError })`, `unmount()`, `fit()`, `repaint()`, `reset()`. The simulation is hand-rolled spring-repulsion with a cooling `alpha` — no d3, in keeping with the no-dependencies rule.

Its data is Quartz's `static/contentIndex.json`, an object keyed by slug whose entries carry `title` and an outgoing `links` array. **This is the only `fetch()` in the codebase.** It works on the deployed site because `kxnar.github.io/notes` and `kxnar.github.io` are the same origin, and it cannot work over `file://` or from localhost — every failure (unpublished, offline, 404, bad JSON, empty vault) funnels through `onError` and prints a terminal line rather than throwing. Link targets are normalised for stray slashes, self-links and links to non-existent notes are dropped, and a mutual link collapses to one edge.

Two things it must survive, because the side pane is not its own: `sideClose()` (Escape, the pane's `×`, **and** `clear`) wipes `#side-log`'s `innerHTML` out from under the canvas — so the rAF tick bails on `!host.isConnected`, and the `window` resize listener is bound **once at module scope**, never per mount, or every open leaks another one. The loop also parks itself once `alpha` decays, so an idle graph costs nothing.

The `[view obsidian graph]` button in the education header is a shortcut for `clear` then `graph`, **in that order** — `clear` closes the side pane and wipes it, so it has to run before the graph mounts. `graph` must stay out of `INLINE_CMDS`: that's what makes `runCommand` set `outTarget = 'side'`, which is the only thing that causes `print()` to open the side pane at all. Unlike the map's `--px-*` palette, the graph is drawn from the terminal tokens, so `setTheme` does call `KX.notesGraph.repaint()`.
