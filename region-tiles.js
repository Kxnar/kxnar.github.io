/* ===========================================================
   region-tiles.js — pixel-art renderer for the region map
   The map data lives in region.js; this is one of two views
   over it (the other is the ascii grid). Every tile is drawn
   here at runtime — there are no image files, so the whole
   thing still works over file://.
   Attaches to window.KX.regionTiles.
   =========================================================== */

window.KX = window.KX || {};

(function () {
  'use strict';

  var TILE = 8;          // source pixels per map tile (classic GB cell)
  var SPRITE_H = 12;     // the trainer is a tile and a half tall
  var MIN_CELL = 3;
  var MAX_CELL = 24;

  /* -----------------------------------------------------
     Palette

     Colours come from --px-* on :root rather than literals,
     so light and dark each get their own palette and a
     theme switch is just a repaint.
     ----------------------------------------------------- */

  var PX_KEYS = [
    'sea', 'sea-lit', 'sand', 'sand-lit', 'grass', 'grass-lit',
    'tall', 'tall-lit', 'tree', 'tree-lit', 'trunk', 'rock', 'rock-lit',
    'path', 'path-lit', 'roof', 'roof-alt', 'wall', 'door', 'cave',
    'ink', 'skin', 'cloth'
  ];

  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    var p = {};
    for (var i = 0; i < PX_KEYS.length; i++) {
      var k = PX_KEYS[i];
      p[k] = (cs.getPropertyValue('--px-' + k) || '').trim() || '#ff00ff';
    }
    return p;
  }

  /* -----------------------------------------------------
     Tile art

     Each pattern is 8 rows of 8 characters; the character
     maps to a palette key, '.' leaves the pixel clear.
     ----------------------------------------------------- */

  var CH = {
    s: 'sea',   l: 'sea-lit',
    a: 'sand',  A: 'sand-lit',
    g: 'grass', G: 'grass-lit',
    t: 'tall',  T: 'tall-lit',
    c: 'tree',  C: 'tree-lit',  k: 'trunk',
    r: 'rock',  R: 'rock-lit',
    p: 'path',  P: 'path-lit',
    d: 'cave',
    w: 'wall',  o: 'door',
    f: 'roof',  F: 'roof-alt'
  };

  var ART = {
    sea: [
      ['ssssssss',
       'ssllssss',
       'ssssssss',
       'ssssssss',
       'ssssslls',
       'ssssssss',
       'ssssssss',
       'llssssss'],
      ['ssssssss',
       'ssssssss',
       'sllsssss',
       'ssssssss',
       'ssssssss',
       'ssssslls',
       'ssssssss',
       'ssssssss']
    ],

    sand: [
      ['aaaaaaaa',
       'aaAaaaaa',
       'aaaaaaaa',
       'aaaaaAaa',
       'aaaaaaaa',
       'aAaaaaaa',
       'aaaaaaaa',
       'aaaaaaAa'],
      ['aaaaaaaa',
       'aaaaaaAa',
       'aAaaaaaa',
       'aaaaaaaa',
       'aaaAaaaa',
       'aaaaaaaa',
       'aaaaaAaa',
       'aaaaaaaa']
    ],

    grass: [
      ['gggggggg',
       'ggGggggg',
       'gggggggg',
       'ggggggGg',
       'gGgggggg',
       'gggggggg',
       'ggggGggg',
       'gggggggg'],
      ['gggggggg',
       'ggggggGg',
       'gGgggggg',
       'gggggggg',
       'gggGgggg',
       'gggggggg',
       'ggggggGg',
       'gGgggggg']
    ],

    // clumps of blades, the classic wild-encounter patch
    tall: [
      ['tttttttt',
       'ttttttTt',
       'tTtttTTt',
       'TTTttTTT',
       'tttttttt',
       'tttTtttt',
       'ttTTTttt',
       'tttttttt'],
      ['tttttttt',
       'tTtttttt',
       'TTTtttTt',
       'ttttttTT',
       'tttttttt',
       'tttttTtt',
       'ttttTTTt',
       'tttttttt']
    ],

    tree: [
      ['ggccccgg',
       'gcCCCCcg',
       'cCCccCCc',
       'cCccccCc',
       'gccccccg',
       'ggckkcgg',
       'gggkkggg',
       'gggggggg']
    ],

    peak: [
      ['rrrRRrrr',
       'rrRRRRrr',
       'rRRRRRRr',
       'RRRRRRRR',
       'rrrrrrrr',
       'rrRrrrrr',
       'rrrrrRrr',
       'rrrrrrrr']
    ],

    cave: [
      ['rrrrrrrr',
       'rrrddrrr',
       'rrddddrr',
       'rddddddr',
       'rddddddr',
       'rddddddr',
       'rddddddr',
       'rrrrrrrr']
    ],

    // town pieces — the 5x3 stamp in region.js is read as buildings
    roof: [
      ['ffffffff',
       'fFFFFFFf',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'oooooooo']
    ],
    roofAlt: [
      ['FFFFFFFF',
       'FffffffF',
       'FFFFFFFF',
       'FFFFFFFF',
       'FFFFFFFF',
       'FFFFFFFF',
       'FFFFFFFF',
       'oooooooo']
    ],
    wall: [
      ['wwwwwwww',
       'wwoowwww',
       'wwoowwww',
       'wwwwwwww',
       'wwwwwwww',
       'wwwwoowo',
       'wwwwwwww',
       'oooooooo']
    ],
    door: [
      ['wwwwwwww',
       'wwwwwwww',
       'woooooow',
       'woooooow',
       'wooooPow',
       'woooooow',
       'woooooow',
       'woooooow']
    ],
    // low fence either side of the buildings
    post: [
      ['gggggggg',
       'gggggggg',
       'gggggggg',
       'gkgggkgg',
       'kkkkkkkk',
       'gkgggkgg',
       'gkgggkgg',
       'gggggggg']
    ]
  };

  /* -----------------------------------------------------
     Sprites

     The trainer is 8x12 and drawn side-on once, then
     mirrored for the other facing — half the art, and the
     two directions stay in step by construction.
     ----------------------------------------------------- */

  var SCH = { i: 'ink', n: 'skin', c: 'cloth', h: 'sand-lit' };

  var TRAINER = {
    down: [
      '..iiii..',
      '.iiiiii.',
      '.innnni.',
      '.nnnnnn.',
      '.ninnin.',
      '..nnnn..',
      '.cccccc.',
      'nccccccn',
      '.cccccc.',
      '..cccc..',
      '.cc..cc.',
      '.ii..ii.'
    ],
    // seen from behind: all hair, so it needs the cap brim to read as a head
    up: [
      '..iiii..',
      '.iiiiii.',
      '.iiiiii.',
      '.ihhhhi.',
      '.iiiiii.',
      '..iiii..',
      '.cccccc.',
      'nccccccn',
      '.cccccc.',
      '..cccc..',
      '.cc..cc.',
      '.ii..ii.'
    ],
    side: [
      '..iiii..',
      '.iiiiii.',
      '.iinnni.',
      '..nnnni.',
      '..ninnn.',
      '...nnn..',
      '..cccc..',
      '..ccccn.',
      '..cccc..',
      '..cccc..',
      '..cc.cc.',
      '..ii.ii.'
    ]
  };

  // frame 1 brings the legs together; rows 10 and 11 are legs and feet
  var LEGS = {
    down: ['..cccc..', '..iiii..'],
    up:   ['..cccc..', '..iiii..'],
    side: ['..cccc..', '..iiii..']
  };

  var DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  // four small originals for the tall-grass encounters
  var CRITTERS = [
    ['.c....c.',
     '.cc..cc.',
     '.cccccc.',
     'cciccicc',
     'cccccccc',
     '.cccccc.',
     '..c..c..',
     '........'],
    ['...cc...',
     '..cccc..',
     '.ciccic.',
     'cccccccc',
     '.cccccc.',
     '..cccc..',
     '..c..c..',
     '........'],
    ['........',
     '..cccc..',
     '.ciccic.',
     'cccccccc',
     'cccccccc',
     '.cccccc.',
     '.c.cc.c.',
     '........'],
    ['........',
     '...cc...',
     '..cccc..',
     '.ciccic.',
     'cccccccc',
     'cccccccc',
     '.cccccc.',
     '........']
  ];

  /* -----------------------------------------------------
     Raster helpers
     ----------------------------------------------------- */

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /** Paint one character-grid pattern at (ox,oy) on a context. */
  function paint(g, rows, chars, pal, ox, oy) {
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y];
      for (var x = 0; x < row.length; x++) {
        var key = chars[row.charAt(x)];
        if (!key) continue;                       // '.' and anything unmapped
        g.fillStyle = pal[key];
        g.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  function stamp(rows, chars, pal) {
    var c = mk(TILE, TILE);
    paint(c.getContext('2d'), rows, chars, pal, 0, 0);
    return c;
  }

  function stampSet(name, pal) {
    return ART[name].map(function (rows) { return stamp(rows, CH, pal); });
  }

  /* -----------------------------------------------------
     Tile cache — rebuilt whenever the palette changes
     ----------------------------------------------------- */

  var cache = null;

  function buildCache(pal) {
    var c = {
      sea: stampSet('sea', pal),
      sand: stampSet('sand', pal),
      grass: stampSet('grass', pal),
      tall: stampSet('tall', pal),
      tree: stampSet('tree', pal),
      peak: stampSet('peak', pal),
      cave: stampSet('cave', pal),
      roof: stampSet('roof', pal)[0],
      roofAlt: stampSet('roofAlt', pal)[0],
      wall: stampSet('wall', pal)[0],
      door: stampSet('door', pal)[0],
      post: stampSet('post', pal)[0],
      shore: [],
      route: []
    };

    // shore: sand with a wet edge on whichever sides face the sea
    for (var m = 0; m < 16; m++) {
      var sc = mk(TILE, TILE);
      var sg = sc.getContext('2d');
      sg.drawImage(c.sand[m & 1], 0, 0);
      sg.fillStyle = pal['sea-lit'];
      if (m & 1) sg.fillRect(0, 0, TILE, 1);              // N
      if (m & 2) sg.fillRect(0, TILE - 1, TILE, 1);       // S
      if (m & 4) sg.fillRect(TILE - 1, 0, 1, TILE);       // E
      if (m & 8) sg.fillRect(0, 0, 1, TILE);              // W
      c.shore.push(sc);
    }

    // route: a path blob with an arm toward each connected neighbour, so the
    // 4-bit mask that picks the ascii box-drawing glyph picks this too
    for (var r = 0; r < 16; r++) {
      var rc = mk(TILE, TILE);
      var rg = rc.getContext('2d');
      rg.drawImage(c.grass[r & 1], 0, 0);
      rg.fillStyle = pal.path;
      rg.fillRect(2, 2, 4, 4);
      if (r & 1) rg.fillRect(2, 0, 4, 3);
      if (r & 2) rg.fillRect(2, 5, 4, 3);
      if (r & 4) rg.fillRect(5, 2, 3, 4);
      if (r & 8) rg.fillRect(0, 2, 3, 4);
      rg.fillStyle = pal['path-lit'];
      rg.fillRect(3, 3, 1, 1);
      rg.fillRect(5, 4, 1, 1);
      c.route.push(rc);
    }

    // plain paved tile for the ground in front of the buildings
    var yc = mk(TILE, TILE);
    var yg = yc.getContext('2d');
    yg.fillStyle = pal.path;
    yg.fillRect(0, 0, TILE, TILE);
    yg.fillStyle = pal['path-lit'];
    yg.fillRect(1, 2, 1, 1);
    yg.fillRect(5, 5, 1, 1);
    c.yard = yc;

    return c;
  }

  /* -----------------------------------------------------
     Sprite sheets — generated once per palette, handed to
     CSS as data URLs so the walk cycle stays a background
     -position swap (no per-frame drawing).
     ----------------------------------------------------- */

  var trainerUrl = null, critterUrl = null, sheetSig = null;

  function palSig(pal) {
    return pal.ink + pal.skin + pal.cloth + pal['sand-lit'];
  }

  function buildSheets(pal) {
    var sheet = mk(TILE * 2, SPRITE_H * 4);
    var g = sheet.getContext('2d');

    Object.keys(DIR_ROW).forEach(function (dir) {
      var src = dir === 'left' || dir === 'right' ? 'side' : dir;
      var rows = TRAINER[src];
      var row = DIR_ROW[dir];

      for (var f = 0; f < 2; f++) {
        var body = rows.slice(0, 10).concat(f ? LEGS[src] : rows.slice(10, 12));
        if (dir === 'left') {
          // draw the side pose mirrored rather than authoring it twice
          var tmp = mk(TILE, SPRITE_H);
          paint(tmp.getContext('2d'), body, SCH, pal, 0, 0);
          g.save();
          g.translate(f * TILE + TILE, row * SPRITE_H);
          g.scale(-1, 1);
          g.drawImage(tmp, 0, 0);
          g.restore();
        } else {
          paint(g, body, SCH, pal, f * TILE, row * SPRITE_H);
        }
      }
    });

    trainerUrl = sheet.toDataURL();

    var cs = mk(TILE * CRITTERS.length, TILE);
    var cg = cs.getContext('2d');
    CRITTERS.forEach(function (rows, i) {
      paint(cg, rows, SCH, pal, i * TILE, 0);
    });
    critterUrl = cs.toDataURL();
    sheetSig = palSig(pal);
  }

  /** Sheets are data URLs, so only regenerate them when the palette moves. */
  function ensureSheets(pal) {
    if (sheetSig !== palSig(pal)) buildSheets(pal);
  }

  /* -----------------------------------------------------
     Renderer
     ----------------------------------------------------- */

  var canvas = null, cellPx = 8;

  function seaMask(MAP, x, y) {
    var SEA = MAP.codes.SEA;
    var m = 0;
    if (!MAP.inside(x, y - 1) || MAP.at(x, y - 1) === SEA) m |= 1;
    if (!MAP.inside(x, y + 1) || MAP.at(x, y + 1) === SEA) m |= 2;
    if (!MAP.inside(x + 1, y) || MAP.at(x + 1, y) === SEA) m |= 4;
    if (!MAP.inside(x - 1, y) || MAP.at(x - 1, y) === SEA) m |= 8;
    return m;
  }

  /** Which piece of a town's building cluster this tile is. */
  function townTile(MAP, c, x, y) {
    for (var i = 0; i < MAP.TOWNS.length; i++) {
      var t = MAP.TOWNS[i];
      var dx = x - t.x, dy = y - t.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 1) continue;
      if (dy === -1) return dx === 0 ? c.roof : c.roofAlt;
      if (dy === 0) {
        if (Math.abs(dx) === 2) return c.post;
        return dx === 0 ? c.door : c.wall;
      }
      return c.yard;
    }
    return c.yard;
  }

  var renderer = {
    id: 'tiles',

    mount: function (regionEl) {
      canvas = document.getElementById('region-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'region-canvas';
        canvas.className = 'region-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        regionEl.insertBefore(canvas, regionEl.firstChild);
      }
      return canvas;
    },

    // visibility is the mode-* class on .region, not an attribute here —
    // .region-canvas sets display:block, which would beat [hidden]
    unmount: function () {},

    draw: function (MAP) {
      if (!canvas) return;
      var pal = readPalette();
      cache = buildCache(pal);
      ensureSheets(pal);

      var W = MAP.W, H = MAP.H, K = MAP.codes;
      canvas.width = W * TILE;
      canvas.height = H * TILE;

      var g = canvas.getContext('2d');
      g.imageSmoothingEnabled = false;

      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
          var t = MAP.at(x, y);
          var alt = MAP.hash2(x, y) < 0.5 ? 0 : 1;
          var img;

          if (t === K.SEA) img = cache.sea[alt];
          else if (t === K.SAND) img = cache.shore[seaMask(MAP, x, y)];
          else if (t === K.GRASS) img = cache.grass[alt];
          else if (t === K.TALL) img = cache.tall[alt];
          else if (t === K.TREE) img = cache.tree[0];
          else if (t === K.PEAK) img = cache.peak[0];
          else if (t === K.CAVE) img = cache.cave[0];
          else if (t === K.ROUTE) img = cache.route[MAP.routeMask(x, y)];
          else img = townTile(MAP, cache, x, y);

          g.drawImage(img, x * TILE, y * TILE);
        }
      }
    },

    /**
     * Square tiles at an integer pixel scale, so the art stays crisp.
     * Returns the geometry region.js needs for --cell-w / --cell-h.
     */
    layout: function (budgetW, availH, MAP) {
      var cell = Math.floor(Math.min(availH / MAP.H, budgetW / MAP.W));
      cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
      cellPx = cell;
      if (canvas) {
        canvas.style.width = cell * MAP.W + 'px';
        canvas.style.height = cell * MAP.H + 'px';
      }
      return {
        cellW: cell,
        cellH: cell,
        width: cell * MAP.W,
        height: cell * MAP.H
      };
    },

    sprite: function (el, dir, frame) {
      ensureSheets(readPalette());
      el.textContent = '';
      el.style.backgroundImage = 'url(' + trainerUrl + ')';
      el.style.backgroundPosition =
        (frame & 1 ? 100 : 0) + '% ' + (DIR_ROW[dir] || 0) * (100 / 3) + '%';
    },

    critter: function (el, index) {
      ensureSheets(readPalette());
      el.textContent = '';
      el.style.backgroundImage = 'url(' + critterUrl + ')';
      el.style.backgroundSize = CRITTERS.length * 100 + '% 100%';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition =
        (index % CRITTERS.length) * (100 / (CRITTERS.length - 1)) + '% 0';
      el.style.width = cellPx + 'px';
      el.style.height = cellPx + 'px';
      el.style.imageRendering = 'pixelated';
    }
  };

  KX.regionTiles = renderer;
})();
