# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kenar Narayaka's personal website, hosted via GitHub Pages at `kxnar.github.io`. It is a static site: plain HTML, one shared CSS file, and one shared JS file — no build step, no bundler, no package manager, no framework, no dependencies.

## Development

There is no build/lint/test tooling in this repo. To preview changes, just open the HTML files directly in a browser, or serve the directory locally, e.g.:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/index.html` (or `about.html`, `projects.html`, `blog.html`).

Since GitHub Pages serves these files as-is, verify changes by opening the page in a browser — there is no compilation step to catch mistakes.

## Structure

- `index.html`, `about.html`, `projects.html`, `blog.html` — the four pages of the site. Each is a full standalone HTML document that repeats the same `<head>` markup, but the `<nav>` and `<footer>` are shared via JS injection (see below) rather than copy-pasted.
- `style.css` — single stylesheet for all pages, theme-aware via CSS custom properties.
- `script.js` — single script for all pages, loaded at the end of `<body>` on every page.
- `cv.pdf`, `logo.jpeg` — static assets linked directly from the HTML (CV download, favicon/profile image).

### Shared nav/footer layout

Every page has an empty `<nav id="site-nav"></nav>` and `<footer id="site-footer"></footer>` placeholder in its `<body>`. `script.js`'s `initLayout()` (called first in the `DOMContentLoaded` handler, before `initTheme()`) fills these in from a single `NAV_PAGES` list, marking the link matching the current filename (from `location.pathname`) with `active`. There is no fetch/include step, so this still works when opening the HTML files directly via `file://` — no local server required.

To add a new page: copy an existing file's `<head>` structure, add `<nav id="site-nav"></nav>` and `<footer id="site-footer"></footer>` placeholders in `<body>`, add an entry to `NAV_PAGES` in `script.js`, and load `script.js` at the end of `<body>` as usual.

### Theming

Dark/light theme is driven by a `data-theme` attribute on `<html>` (`"dark"` or `"light"`), toggled by the button wired up in `script.js`'s `initTheme()`. All theme colors are CSS custom properties defined in `:root` (dark, default) and overridden under `[data-theme="light"]` in `style.css` — new color usage should reference these variables (`--bg`, `--text`, `--accent`, etc.) rather than hardcoded colors, so both themes stay correct. The theme choice is persisted to `localStorage` and applied before paint via an IIFE at the top of `script.js` to avoid a flash of the wrong theme.

### ASCII fractal art

`script.js` renders several fractals as ASCII art directly into `<pre>` elements (no canvas/SVG):
- `renderMandelbrot` — used on the homepage (`#fractal-art`), resolution adjustable via the `#fractal-scale` range slider (`initMandelbrotSlider`).
- `renderJulia` — Julia set renderer (currently wired to a `julia-aside` element id, which does not exist in any current page's HTML — a leftover hook).
- `renderLSystemTree` — recursive branching tree renderer (currently wired to a `blog-fractal` element id, also not present in `blog.html`'s current markup).

All three are invoked unconditionally in the `DOMContentLoaded` handler; each render function no-ops safely (`if (!el) return`) when its target element is absent, so missing ids on a given page are not bugs.
