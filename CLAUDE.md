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

**Two renderers, one map.** The terrain array, towns, pathfinding, drawer and encounters are renderer-agnostic; a renderer is only a way of drawing them:

```js
{ id, mount(regionEl) -> rootEl, unmount(), draw(MAP),
  layout(budgetW, availH, MAP) -> { cellW, cellH, width, height },
  sprite(el, dir, frame), critter(el, index) }
```

`MAP` is the read-only view they get (`W`, `H`, `at`, `inside`, `routeMask`, `hash2`, `TOWNS`, `codes`) — neither renderer owns the data, so editing `TOWNS` or `ROUTES` changes both views at once. `asciiRenderer` lives in `region.js`; the pixel one is `region-tiles.js`. Adding a third means implementing that interface and adding it to `setMode`.

Autotiling is single-sourced in `routeMask(x, y)`, a 4-bit `N|S|E|W` mask: the ascii renderer looks a box-drawing glyph up from it, the pixel renderer indexes its 16 path sprites with it.

Which renderer is live is `localStorage['kx-map-mode']` (`tiles`, the default, or `ascii`), switched by the `#map-mode-toggle` button in the section header or `map ascii|graphics`. Visibility is the `mode-tiles`/`mode-ascii` class on `.region`, **not** the `hidden` attribute — both renderer roots set `display`, which would beat `[hidden]`.

Cell geometry comes back from `layout()` and is written to `--cell-w`/`--cell-h` on `.region`; the sprite, critter and town buttons position themselves off those variables and so need no per-mode maths. `fit()` owns the stage split — it hands the renderer a width budget and gives the leftover to the umbreon. Square pixel tiles fill the stage where the ascii grid leaves slack, so `fit()` will shrink the tile map by up to 25% to keep the umbreon column.

**Pixel art is generated, never loaded.** `region-tiles.js` draws every tile and both sprite sheets at runtime with `fillRect` over character-grid patterns (8 source px per tile, upscaled by CSS with `image-rendering: pixelated`) — no image files, so `file://` still works and `toDataURL` can't taint. Its colours are the `--px-*` custom properties, read off `:root` at draw time, which is why a theme switch is a repaint (`KX.region.repaint()`, called from `setTheme`) rather than a code branch. Adding a colour there means adding a `--px-*` token to **both** themes.

Stepping into tall grass occasionally announces a wild `WILD[i]`. It's flavour — nothing blocks, there's no battle, and it's suppressed under `prefers-reduced-motion` (unlike walking, which runs regardless because teleporting would make the map pointless).

### Education notes

`MODULES` in `script.js` drives the education section, grouped by `term`. `NOTES_BASE` points at the Quartz-published Obsidian vault and `NOTES_LIVE` gates it: while false, every module renders `$ cat notes/<slug> → no such file (yet)` instead of a link, and `open notes` refuses. Publishing the vault is a one-line change.
