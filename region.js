/* ===========================================================
   region.js — ASCII pokemon-style region map
   Towns are the navigation; the sprite walks routes between
   them. Booted lazily the first time #interactive is shown.
   Attaches to window.KX.region.
   =========================================================== */

window.KX = window.KX || {};

(function () {
  'use strict';

  var W = 96;   // tiles across
  var H = 34;   // tiles down
  var SEED = 70707;

  /* -----------------------------------------------------
     Terrain
     ----------------------------------------------------- */

  var SEA = 0, SAND = 1, GRASS = 2, TALL = 3, TREE = 4,
      PEAK = 5, ROUTE = 6, TOWN = 7, CAVE = 8;

  var GLYPH = ['≈', '·', '.', '"', '♣', '▲', '═', '⌂', '▓'];
  var CLS = ['t-sea', 't-sand', 't-grass', 't-tall', 't-tree',
             't-peak', 't-route', 't-town', 't-cave'];
  var LABEL = ['sea', 'shore', 'grass', 'tall grass', 'forest',
               'mountain', 'route', 'town', 'cave'];

  // movement cost per terrain; Infinity means impassable.
  // routes are cheapest, so the sprite prefers roads over cutting country.
  var COST = [Infinity, 3, 3, 4, Infinity, Infinity, 1, 1, 2];

  /* -----------------------------------------------------
     Towns — these are the navigation
     ----------------------------------------------------- */

  /* A town's `id` is a section id and its panel links to `#id` — except
     where it carries a `url`, which makes it an external target instead
     (the cv opens as a pdf; there is no #cv route to land on). `build`
     picks which building the pixel renderer stamps; it defaults to the
     pokémon centre. */
  var TOWNS = [
    { id: 'home',      x: 13, y: 26, name: 'pallet town',   role: 'about me' },
    { id: 'projects',  x: 41, y: 17, name: 'forge town',  role: 'projects' },
    { id: 'education', x: 69, y: 24, name: 'oxford city', role: 'education' },
    { id: 'blog',      x: 79, y: 7,  name: 'mt. silver', role: 'blog' },
    { id: 'cv',        x: 62, y: 15, name: 'league gate', role: 'cv',
      url: 'cv.pdf', build: 'gate' }
  ];

  // route spines, as orthogonal waypoint chains between towns
  var ROUTES = [
    [[13, 26], [13, 21], [26, 21], [26, 17], [41, 17]],
    [[41, 17], [52, 17], [52, 24], [69, 24]],
    [[69, 24], [79, 24], [79, 15], [79, 7]],
    [[41, 17], [41, 11], [62, 11], [62, 15]]
  ];

  // mountain ridges, as thick segments
  var RIDGES = [
    { ax: 72, ay: 4, bx: 86, by: 8, r: 2.2 },
    { ax: 82, ay: 9, bx: 89, by: 16, r: 1.8 },
    { ax: 33, ay: 3, bx: 45, by: 6, r: 1.6 },
    { ax: 11, ay: 8, bx: 19, by: 5, r: 1.4 }
  ];

  /* -----------------------------------------------------
     Noise
     ----------------------------------------------------- */

  function hash2(ix, iy) {
    var h = (ix * 374761393 + iy * 668265263 + SEED * 69069) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  function vnoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var a = hash2(ix, iy), b = hash2(ix + 1, iy);
    var c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    var u = smooth(fx), v = smooth(fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, oct) {
    var sum = 0, amp = 0.5, f = 1;
    for (var o = 0; o < oct; o++) {
      sum += amp * vnoise(x * f, y * f);
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  }

  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  /* -----------------------------------------------------
     Build the map
     ----------------------------------------------------- */

  var tiles = null;   // Uint8Array of terrain codes, row-major

  function at(x, y) { return tiles[y * W + x]; }
  function set(x, y, v) { tiles[y * W + x] = v; }
  function inside(x, y) { return x >= 0 && x < W && y >= 0 && y < H; }

  function isLand(x, y) {
    var u = x / W, v = y / H;
    // inset blob, then wobble the coastline with noise
    var d = Math.min(u - 0.075, 0.955 - u, v - 0.07, 0.93 - v);
    d += (fbm(u * 5.5 + 3.1, v * 5.5 + 8.7, 3) - 0.5) * 0.13;
    return d > 0;
  }

  function build() {
    tiles = new Uint8Array(W * H);

    // 1. land / sea
    var x, y;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        set(x, y, isLand(x, y) ? GRASS : SEA);
      }
    }

    // 2. shoreline — land adjacent to sea
    var shore = [];
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        if (at(x, y) !== GRASS) continue;
        var touches = false;
        for (var dy = -1; dy <= 1 && !touches; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (inside(x + dx, y + dy) && at(x + dx, y + dy) === SEA) { touches = true; break; }
          }
        }
        if (touches) shore.push(y * W + x);
      }
    }
    for (var s = 0; s < shore.length; s++) tiles[shore[s]] = SAND;

    // 3. mountains
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        if (at(x, y) !== GRASS) continue;
        for (var r = 0; r < RIDGES.length; r++) {
          var g = RIDGES[r];
          var d = segDist(x, y, g.ax, g.ay, g.bx, g.by);
          var jitter = (fbm(x * 0.35, y * 0.35, 2) - 0.5) * 1.1;
          if (d + jitter < g.r) { set(x, y, PEAK); break; }
        }
      }
    }

    // 4. forest + tall grass scatter
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        if (at(x, y) !== GRASS) continue;
        var n = fbm(x * 0.16 + 11.3, y * 0.16 + 4.9, 4);
        if (n > 0.60) set(x, y, TREE);
        else if (n > 0.52) set(x, y, TALL);
      }
    }

    // 5. a cave mouth at the foot of the northern range
    if (inside(72, 12)) set(72, 12, CAVE);

    // 6. routes carved over everything
    for (var i = 0; i < ROUTES.length; i++) carveRoute(ROUTES[i]);

    // 7. towns last, so nothing overwrites them
    for (var t = 0; t < TOWNS.length; t++) stampTown(TOWNS[t]);
  }

  /** Draw an orthogonal polyline of ROUTE tiles through the given waypoints. */
  function carveRoute(points) {
    for (var i = 0; i < points.length - 1; i++) {
      var a = points[i], b = points[i + 1];
      var x = a[0], y = a[1];
      var sx = Math.sign(b[0] - x), sy = Math.sign(b[1] - y);

      while (x !== b[0]) { paveTile(x, y); x += sx; }
      while (y !== b[1]) { paveTile(x, y); y += sy; }
      paveTile(b[0], b[1]);
    }
  }

  function paveTile(x, y) {
    if (!inside(x, y)) return;
    if (at(x, y) === TOWN) return;
    set(x, y, ROUTE);
  }

  /** A small cluster of buildings marking a town. */
  function stampTown(town) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var x = town.x + dx, y = town.y + dy;
        if (!inside(x, y)) continue;
        if (at(x, y) === SEA) continue;
        // hollow-ish cluster so it reads as buildings, not a solid block
        if (Math.abs(dx) === 2 && dy !== 0) continue;
        set(x, y, TOWN);
      }
    }
  }

  /* -----------------------------------------------------
     Route autotiling — pick the box-drawing glyph from
     which neighbours are also route/town tiles
     ----------------------------------------------------- */

  var JOIN = {
    'NS': '║', 'EW': '═',
    'NE': '╚', 'NW': '╝', 'SE': '╔', 'SW': '╗',
    'NSE': '╠', 'NSW': '╣', 'NEW': '╩', 'SEW': '╦',
    'NSEW': '╬',
    'N': '║', 'S': '║', 'E': '═', 'W': '═', '': '═'
  };

  function connects(x, y) {
    if (!inside(x, y)) return false;
    var t = at(x, y);
    return t === ROUTE || t === TOWN || t === CAVE;
  }

  /**
   * Which sides of this tile carry the route on, as a 4-bit N|S|E|W mask.
   * Both renderers autotile off this one function, so editing the ROUTES
   * waypoints keeps the ascii box-drawing joins and the pixel path sprites
   * in agreement for free.
   */
  function routeMask(x, y) {
    var m = 0;
    if (connects(x, y - 1)) m |= 1;
    if (connects(x, y + 1)) m |= 2;
    if (connects(x + 1, y)) m |= 4;
    if (connects(x - 1, y)) m |= 8;
    return m;
  }

  function routeGlyph(x, y) {
    var m = routeMask(x, y);
    // key order must be N,S,E,W to match the table
    var k = (m & 1 ? 'N' : '') + (m & 2 ? 'S' : '') +
            (m & 4 ? 'E' : '') + (m & 8 ? 'W' : '');
    return JOIN[k] || '═';
  }

  /* -----------------------------------------------------
     Render to HTML (runs of same-class chars => few spans)
     ----------------------------------------------------- */

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderGrid(el) {
    var html = '';
    for (var y = 0; y < H; y++) {
      var runCls = null, runTxt = '';
      for (var x = 0; x < W; x++) {
        var t = at(x, y);
        var ch = t === ROUTE ? routeGlyph(x, y) : GLYPH[t];
        var cls = CLS[t];
        if (cls !== runCls) {
          if (runCls !== null) html += '<span class="' + runCls + '">' + escapeHtml(runTxt) + '</span>';
          runCls = cls;
          runTxt = ch;
        } else {
          runTxt += ch;
        }
      }
      html += '<span class="' + runCls + '">' + escapeHtml(runTxt) + '</span>';
      if (y < H - 1) html += '\n';
    }
    el.innerHTML = html;
  }

  /* -----------------------------------------------------
     Renderers

     The terrain, the towns, the pathfinding and the sprite
     state machine above are renderer-agnostic; everything
     below the MAP view is just a way of drawing them. A
     renderer is { id, mount, unmount, draw, layout, sprite }
     — see region-tiles.js for the pixel one.
     ----------------------------------------------------- */

  // the read-only view renderers get; neither of them owns the data
  var MAP = {
    W: W,
    H: H,
    at: at,
    inside: inside,
    routeMask: routeMask,
    hash2: hash2,
    TOWNS: TOWNS,
    codes: {
      SEA: SEA, SAND: SAND, GRASS: GRASS, TALL: TALL, TREE: TREE,
      PEAK: PEAK, ROUTE: ROUTE, TOWN: TOWN, CAVE: CAVE
    }
  };

  var FACE = {
    up:    ['▲', '△'],
    down:  ['▼', '▽'],
    left:  ['◀', '◁'],
    right: ['▶', '▷']
  };

  var asciiRenderer = {
    id: 'ascii',

    mount: function () { return gridEl; },
    unmount: function () {},

    draw: function () { renderGrid(gridEl); },

    /**
     * Size by font-size, then measure the result — JetBrains Mono's advance
     * ratio is only approximately CHAR_W, and the cell size has to be exact
     * or the sprite and town markers drift off their tiles.
     */
    layout: function (budgetW, availH) {
      var fs = Math.min(availH / (H * LINE_H), budgetW / (W * CHAR_W));
      gridEl.style.fontSize = fs + 'px';

      var rect = gridEl.getBoundingClientRect();
      var w = rect.width || W * CHAR_W * fs;
      var h = rect.height || H * LINE_H * fs;
      return { cellW: w / W, cellH: h / H, width: w, height: h };
    },

    sprite: function (el, dir, frame) {
      el.style.backgroundImage = '';
      el.textContent = FACE[dir][frame & 1];
    }
  };

  var MODE_KEY = 'kx-map-mode';
  var DEFAULT_MODE = 'tiles';

  var mode = null, active = asciiRenderer, viewEl = null;

  function storedMode() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      if (m === 'ascii' || m === 'tiles') return m;
    } catch (e) { /* private mode */ }
    return DEFAULT_MODE;
  }

  /** Swap renderers, redraw, and re-fit. `mode` is persisted. */
  function setMode(next, opts) {
    // region-tiles.js is a separate script; if it didn't load, ascii is all
    // there is, and silently staying on it beats a blank box
    if (next === 'tiles' && !KX.regionTiles) next = 'ascii';
    if (next !== 'ascii' && next !== 'tiles') return false;
    if (mode === next) return true;

    if (mode) active.unmount();
    mode = next;
    active = next === 'tiles' ? KX.regionTiles : asciiRenderer;
    if (!(opts && opts.silent)) {
      try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* private mode */ }
    }

    if (booted) {
      viewEl = active.mount(regionEl) || gridEl;
      regionEl.classList.toggle('mode-tiles', mode === 'tiles');
      regionEl.classList.toggle('mode-ascii', mode === 'ascii');
      active.draw(MAP);
      fit();
      if (sprite) placeSprite(sprite.x, sprite.y);   // boot places it later
    }
    updateModeLabel();
    return true;
  }

  /** Re-draw the current renderer — the theme switch calls this. */
  function repaint() {
    if (!booted) return;
    active.draw(MAP);
    if (sprite) placeSprite(sprite.x, sprite.y);
  }

  function updateModeLabel() {
    var btn = document.getElementById('map-mode-toggle');
    if (!btn) return;
    var label = btn.querySelector('.map-mode-label');
    // the button names the mode it would switch to, like the theme toggle
    if (label) label.textContent = mode === 'tiles' ? 'toggle ascii' : 'toggle graphics';
    btn.setAttribute('aria-pressed', mode === 'tiles' ? 'true' : 'false');
  }

  /* -----------------------------------------------------
     Pathfinding — uniform-cost search over tile costs
     ----------------------------------------------------- */

  function findPath(sx, sy, tx, ty) {
    var n = W * H;
    var dist = new Float64Array(n);
    var prev = new Int32Array(n);
    var done = new Uint8Array(n);
    for (var i = 0; i < n; i++) { dist[i] = Infinity; prev[i] = -1; }

    var start = sy * W + sx, goal = ty * W + tx;
    dist[start] = 0;

    // binary min-heap of [priority, node]
    var heap = [[0, start]];
    function push(p, v) {
      heap.push([p, v]);
      var i = heap.length - 1;
      while (i > 0) {
        var par = (i - 1) >> 1;
        if (heap[par][0] <= heap[i][0]) break;
        var tmp = heap[par]; heap[par] = heap[i]; heap[i] = tmp;
        i = par;
      }
    }
    function pop() {
      var top = heap[0];
      var last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        var i = 0;
        for (;;) {
          var l = 2 * i + 1, r = l + 1, m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          var tmp = heap[m]; heap[m] = heap[i]; heap[i] = tmp;
          i = m;
        }
      }
      return top;
    }

    var DX = [0, 0, 1, -1], DY = [-1, 1, 0, 0];

    while (heap.length) {
      var cur = pop();
      var u = cur[1];
      if (done[u]) continue;
      done[u] = 1;
      if (u === goal) break;

      var ux = u % W, uy = (u / W) | 0;
      for (var d = 0; d < 4; d++) {
        var nx = ux + DX[d], ny = uy + DY[d];
        if (!inside(nx, ny)) continue;
        var c = COST[at(nx, ny)];
        if (!isFinite(c)) continue;
        var v = ny * W + nx;
        var nd = dist[u] + c;
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push(nd, v); }
      }
    }

    if (!isFinite(dist[goal])) return null;

    var path = [];
    for (var at_ = goal; at_ !== -1; at_ = prev[at_]) path.push([at_ % W, (at_ / W) | 0]);
    path.reverse();
    return path;
  }

  /* -----------------------------------------------------
     Sprite
     ----------------------------------------------------- */

  var sprite, spriteEl, walkTimer = null, frame = 0;

  // ms per tile. `frame` ticks once per step, so this is also the animation
  // rate — much below ~40 and the pixel renderer's walk cycle is a blur.
  var STEP_MS = 55;

  function placeSprite(x, y, dir) {
    sprite.x = x;
    sprite.y = y;
    if (dir) sprite.dir = dir;
    spriteEl.style.setProperty('--sx', x);
    spriteEl.style.setProperty('--sy', y);
    // each renderer reads `frame` its own way; only the look differs
    active.sprite(spriteEl, sprite.dir, frame);
  }

  function stopWalk() {
    if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
  }

  function walkTo(tx, ty, onArrive) {
    stopWalk();
    closeDrawerIfAwayFromTown();
    var path = findPath(sprite.x, sprite.y, tx, ty);
    if (!path || path.length < 2) {
      if (onArrive) onArrive();
      return;
    }

    // Walking is the feature, not decoration, so this runs regardless of
    // prefers-reduced-motion — teleporting to the town makes the map pointless.
    var i = 1;
    walkTimer = setInterval(function () {
      var step = path[i];
      var dx = step[0] - sprite.x, dy = step[1] - sprite.y;
      var dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      frame++;
      placeSprite(step[0], step[1], dir);
      updateReadout(step[0], step[1]);
      maybeEncounter(step[0], step[1]);
      i++;
      if (i >= path.length) {
        stopWalk();
        if (onArrive) onArrive();
      }
    }, STEP_MS);
  }

  /** One tile of manual movement; opens a panel if it lands on a town. */
  function stepBy(dx, dy) {
    stopWalk();
    var nx = sprite.x + dx, ny = sprite.y + dy;
    if (!inside(nx, ny)) return;
    if (!isFinite(COST[at(nx, ny)])) return;

    var dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    frame++;
    placeSprite(nx, ny, dir);
    updateReadout(nx, ny);
    maybeEncounter(nx, ny);

    var town = townNear(nx, ny, 0);
    if (town) openDrawer(town);
    else closeDrawerIfAwayFromTown();
  }

  function townNear(x, y, slack) {
    var pad = slack === undefined ? 1 : slack;
    for (var i = 0; i < TOWNS.length; i++) {
      var t = TOWNS[i];
      if (Math.abs(t.x - x) <= 2 + pad && Math.abs(t.y - y) <= 1 + pad) return t;
    }
    return null;
  }

  function reduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* -----------------------------------------------------
     Readout
     ----------------------------------------------------- */

  var readoutEl;

  function updateReadout(x, y) {
    if (!readoutEl || !inside(x, y)) return;
    var t = at(x, y);
    var town = townNear(x, y, 0);
    var place = town ? town.name : LABEL[t];
    readoutEl.innerHTML =
      '<span class="ro-key">' + place.toUpperCase() + '</span> · (' +
      x + ',' + y + ') · ' + LABEL[t];
  }

  /* -----------------------------------------------------
     Wild encounters

     Flavour, not a mechanic — stepping through tall grass
     occasionally announces something. Nothing blocks input
     and there is no battle; the readout flash is the whole
     feature, so it's suppressed under reduced motion.
     ----------------------------------------------------- */

  var WILD = ['umbreon', 'zubat', 'oddish', 'rattata', 'ponyta', 'gastly'];

  var ENCOUNTER_CHANCE = 0.12;
  var ENCOUNTER_COOLDOWN = 2000;   // ms — crossing a big patch shouldn't spam
  var ENCOUNTER_SHOWN = 1600;

  var flashEl, critterEl, flashTimer = null, lastEncounter = 0;

  function maybeEncounter(x, y) {
    if (!flashEl || at(x, y) !== TALL || reduceMotion()) return;

    var now = Date.now();
    if (now - lastEncounter < ENCOUNTER_COOLDOWN) return;
    if (Math.random() > ENCOUNTER_CHANCE) return;
    lastEncounter = now;

    var i = Math.floor(Math.random() * WILD.length);
    flashEl.innerHTML = 'a wild <span class="fl-key">' + WILD[i] + '</span> appeared!';
    flashEl.classList.add('on');

    if (critterEl && active.critter) {
      active.critter(critterEl, i);
      critterEl.style.setProperty('--sx', x + 1);
      critterEl.style.setProperty('--sy', y);
      critterEl.classList.add('on');
    }

    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      flashEl.classList.remove('on');
      if (critterEl) critterEl.classList.remove('on');
    }, ENCOUNTER_SHOWN);
  }

  /* -----------------------------------------------------
     Drawer
     ----------------------------------------------------- */

  var drawer, drawerTitle, drawerBody, lastFocus = null, openTown = null;

  var BLURB = {
    home: 'me!',
    education: "notes on modules i've taken",
    projects: 'various projects, not many so far but im trying',
    blog: 'not written yet. oxford first year in summary is first in the queue.',
    cv: 'my cv! work in progress.'
  };

  function openDrawer(town) {
    if (!drawer) return;
    lastFocus = document.activeElement;
    openTown = town;

    // an external town links out; the rest route to their section
    var go = town.url
      ? '<a class="drawer-go" href="' + town.url + '" target="_blank" rel="noopener">' +
          '[ open ' + town.url + ' ]</a>'
      : '<a class="drawer-go" href="#' + town.id + '">[ open ~/' + town.id + ' ]</a>';

    drawerTitle.textContent = '~/' + town.id;
    drawerBody.innerHTML =
      '<p class="drawer-intro">' + town.name + ' · ' + town.role + '</p>' +
      '<p>' + (BLURB[town.id] || '') + '</p>' + go;

    drawer.hidden = false;
    // Flush layout so the transition starts from the closed transform.
    // Deliberately not requestAnimationFrame: in a background tab rAF is
    // paused, and the drawer would stay parked off-screen.
    void drawer.offsetHeight;
    drawer.classList.add('open');

    var towns = document.getElementById('region-towns');
    if (towns) {
      Array.prototype.forEach.call(towns.children, function (b) {
        b.classList.toggle('here', b.dataset.town === town.id);
        b.setAttribute('aria-expanded', b.dataset.town === town.id ? 'true' : 'false');
      });
    }
  }

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('open');
    var t = setTimeout(function () { drawer.hidden = true; }, 180);
    if (reduceMotion()) { clearTimeout(t); drawer.hidden = true; }

    var towns = document.getElementById('region-towns');
    if (towns) {
      Array.prototype.forEach.call(towns.children, function (b) {
        b.classList.remove('here');
        b.setAttribute('aria-expanded', 'false');
      });
    }
    openTown = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();

    if (window.KX && window.KX.shell && window.KX.shell.sideClose) {
      window.KX.shell.sideClose();
    }
  }

  function closeDrawerIfAwayFromTown() {
    if (!openTown) return;
    var town = townNear(sprite.x, sprite.y, 0);
    if (!town || town.id !== openTown.id) {
      closeDrawer();
    }
  }

  /* -----------------------------------------------------
     Boot
     ----------------------------------------------------- */

  var booted = false;
  var gridEl, regionEl, stageEl, umbreonEl;

  // must match .region-grid's line-height, and JetBrains Mono's advance ratio
  var CHAR_W = 0.6;
  var LINE_H = 1.05;

  // below this the umbreon column isn't worth keeping
  var UMBREON_MIN = 600;

  /**
   * Size the map to fill its container, then give whatever width is left over
   * to the umbreon. The renderer decides how it fills the budget it's handed
   * (font-size for ascii, an integer tile scale for pixels) and reports back
   * the cell geometry the sprite and town overlays position off.
   * Re-run on resize and whenever the side terminal opens or closes.
   */
  function fit() {
    if (!booted || !stageEl || !gridEl) return;

    var page = document.getElementById('interactive');
    if (!page || !page.classList.contains('active')) return;   // unmeasurable

    var stageW = stageEl.clientWidth;
    var stageH = stageEl.clientHeight;
    if (!stageW || !stageH) return;

    // the .region box's own padding and border sit between the stage and the
    // map, so they come off both budgets
    var rcs = getComputedStyle(regionEl);
    var chrome = (parseFloat(rcs.paddingLeft) || 0) + (parseFloat(rcs.paddingRight) || 0) +
                 (parseFloat(rcs.borderLeftWidth) || 0) + (parseFloat(rcs.borderRightWidth) || 0);
    var chromeV = (parseFloat(rcs.paddingTop) || 0) + (parseFloat(rcs.paddingBottom) || 0) +
                  (parseFloat(rcs.borderTopWidth) || 0) + (parseFloat(rcs.borderBottomWidth) || 0);

    var availH = Math.max(160, stageH - chromeV);

    // provisional: fill the stage, and see what's left for the umbreon
    var GAP = 24;                                        // the stage gap
    var reserved = stageW - UMBREON_MIN - GAP - chrome;
    var geo = active.layout(stageW - chrome, availH, MAP);
    var showUmb = false;

    if (umbreonEl) {
      if (stageW - (geo.width + chrome) - GAP >= UMBREON_MIN) {
        showUmb = true;
        geo = active.layout(reserved, availH, MAP);
      } else {
        // Square pixel tiles fill the stage edge to edge where the ascii grid
        // leaves slack, which would cost the umbreon its column on any normal
        // window. Give a little of the map back instead — but not so much that
        // the map itself becomes the compromise.
        var geoUmb = active.layout(reserved, availH, MAP);
        if (geoUmb.width > 0 && geoUmb.cellH >= geo.cellH * 0.75) {
          showUmb = true;
          geo = geoUmb;
        } else {
          geo = active.layout(stageW - chrome, availH, MAP);
        }
      }
    }

    regionEl.style.setProperty('--cell-w', geo.cellW + 'px');
    regionEl.style.setProperty('--cell-h', geo.cellH + 'px');

    if (umbreonEl) {
      umbreonEl.hidden = !showUmb;
      if (showUmb) {
        var actualLeft = stageW - (geo.width + chrome) - GAP;
        // 29 columns wide, 23 rows tall — fit it to the narrower of the two
        var ufs = Math.min(actualLeft / (29 * CHAR_W), availH / (23 * LINE_H));
        umbreonEl.style.fontSize = ufs + 'px';
      }
    }
  }

  /** Pointer event -> map tile, measured off whichever renderer is live. */
  function tileAt(e) {
    var el = viewEl || gridEl;
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var x = Math.floor((e.clientX - rect.left) / (rect.width / W));
    var y = Math.floor((e.clientY - rect.top) / (rect.height / H));
    return inside(x, y) ? [x, y] : null;
  }

  function buildTownButtons() {
    var wrap = document.getElementById('region-towns');
    if (!wrap) return;
    wrap.innerHTML = '';

    TOWNS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'town';
      b.dataset.town = t.id;
      b.style.setProperty('--x', t.x);
      b.style.setProperty('--y', t.y);
      b.setAttribute('aria-expanded', 'false');
      // The name lives in .town-plate, which the mobile breakpoint hides —
      // and in tiles mode .town-marker is hidden too, so without this the
      // button has neither visible content nor an accessible name there.
      b.setAttribute('aria-label', t.name + ' — ' + t.role);
      b.innerHTML =
        '<span class="town-marker" aria-hidden="true">◈</span>' +
        '<span class="town-plate">' +
          '<span class="town-name">' + t.name + '</span>' +
          '<span class="town-role">' + t.role + '</span>' +
        '</span>';
      b.addEventListener('click', function () {
        walkTo(t.x, t.y, function () { openDrawer(t); });
      });
      wrap.appendChild(b);
    });
  }

  function boot() {
    if (booted) return;

    regionEl = document.getElementById('region');
    gridEl = document.getElementById('region-grid');
    stageEl = document.getElementById('region-stage');
    spriteEl = document.getElementById('region-sprite');
    readoutEl = document.getElementById('region-readout');
    flashEl = document.getElementById('region-flash');
    critterEl = document.getElementById('region-critter');
    drawer = document.getElementById('drawer');
    drawerTitle = document.getElementById('drawer-title');
    drawerBody = document.getElementById('drawer-body');
    if (!regionEl || !gridEl) return;

    booted = true;

    build();

    // pick the renderer before the first draw so we only ever paint once
    mode = null;
    setMode(storedMode(), { silent: true });

    buildTownButtons();

    // borrow the umbreon from the blog section rather than duplicating
    // 23 lines of braille in the markup
    var source = document.querySelector('#blog .umbreon');
    if (source && stageEl) {
      umbreonEl = source.cloneNode(true);
      umbreonEl.removeAttribute('id');
      umbreonEl.className = 'ascii-art umbreon region-umbreon';
      umbreonEl.hidden = true;
      stageEl.appendChild(umbreonEl);
    }

    fit();

    // start the trainer just south of the home town
    sprite = { x: TOWNS[0].x, y: TOWNS[0].y + 2, dir: 'down' };
    placeSprite(sprite.x, sprite.y);
    updateReadout(sprite.x, sprite.y);

    // hovering a tile updates the readout
    regionEl.addEventListener('mousemove', function (e) {
      var p = tileAt(e);
      if (p) updateReadout(p[0], p[1]);
    });
    regionEl.addEventListener('mouseleave', function () {
      updateReadout(sprite.x, sprite.y);
    });

    // click a tile to walk there — bound to .region rather than to a
    // renderer's root, so it survives a mode swap
    regionEl.addEventListener('click', function (e) {
      var p = tileAt(e);
      if (!p) return;
      var x = p[0], y = p[1];
      if (!isFinite(COST[at(x, y)])) return;
      walkTo(x, y, function () {
        var town = townNear(x, y, 0);
        if (town) openDrawer(town);
      });
    });

    var modeBtn = document.getElementById('map-mode-toggle');
    if (modeBtn) {
      modeBtn.addEventListener('click', function () {
        setMode(mode === 'tiles' ? 'ascii' : 'tiles');
      });
    }

    var closeBtn = document.getElementById('drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    window.addEventListener('resize', fit);

    // fonts can land after first paint and change the cell size
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit);
    }
  }

  /** Arrow keys / wasd — only while the map section is showing. */
  function onKey(e) {
    var page = document.getElementById('interactive');
    if (!page || !page.classList.contains('active')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var k = e.key.toLowerCase();
    if (k === 'escape') { closeDrawer(); return; }

    var dx = 0, dy = 0;
    if (k === 'arrowup' || k === 'w') dy = -1;
    else if (k === 'arrowdown' || k === 's') dy = 1;
    else if (k === 'arrowleft' || k === 'a') dx = -1;
    else if (k === 'arrowright' || k === 'd') dx = 1;
    else return;

    e.preventDefault();
    stepBy(dx, dy);
  }

  document.addEventListener('keydown', onKey);

  KX.region = {
    boot: boot,
    /** Re-size the grid to its container. Safe to call before boot. */
    fit: fit,
    refresh: fit,
    closeDrawer: closeDrawer,
    /** 'tiles' (pixel art, the default) or 'ascii'. Persisted. */
    setMode: function (id) { boot(); return setMode(id); },
    mode: function () { return mode || storedMode(); },
    /** Re-draw in the current palette — the theme toggle calls this. */
    repaint: repaint,
    towns: function () {
      return TOWNS.map(function (t) {
        return { id: t.id, name: t.name, role: t.role, url: t.url || null };
      });
    },
    /** Walk to a named town and open its panel — used by the `goto` command. */
    visit: function (id) {
      boot();
      for (var i = 0; i < TOWNS.length; i++) {
        if (TOWNS[i].id === id) {
          var t = TOWNS[i];
          walkTo(t.x, t.y, function () { openDrawer(t); });
          return true;
        }
      }
      return false;
    }
  };
})();
