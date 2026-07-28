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
  var SPRITE_W = 10;     // the trainer overhangs his tile a little either side
  var SPRITE_H = 14;     // ...and stands a bit under two tiles tall
  var MIN_CELL = 3;
  var MAX_CELL = 24;

  /* -----------------------------------------------------
     Palette

     Colours come from --px-* on :root rather than literals,
     so the whole look is retuned from the stylesheet. Unlike
     the rest of the site this palette is theme-independent:
     grass is green and ash's cap is red in both themes, so
     there is no [data-theme="light"] override to match.
     ----------------------------------------------------- */

  var PX_KEYS = [
    /* terrain */
    'grass', 'grass-lit', 'grass-dk', 'bloom', 'bloom-alt',
    'tall', 'tall-lit', 'tall-dk',
    'tree', 'tree-lit', 'tree-dk', 'trunk',
    'sea', 'sea-lit', 'foam', 'sand', 'sand-lit',
    'rock', 'rock-lit', 'rock-dk', 'path', 'path-lit', 'cave',
    /* buildings */
    'roof', 'roof-lit', 'roof-dk',
    'roof-alt', 'roof-alt-lit', 'roof-alt-dk',
    'wall', 'wall-dk', 'glass', 'door', 'emblem',
    /* the trainer */
    'cap', 'cap-dk', 'cap-white', 'cap-logo', 'hair', 'eye',
    'skin', 'skin-dk', 'jacket', 'jacket-dk', 'sleeve',
    'glove', 'denim', 'shoe',
    /* wild sprites */
    'mon-umbreon', 'mon-umbreon-lit', 'mon-zubat', 'mon-zubat-lit',
    'mon-oddish', 'mon-oddish-lit', 'mon-rattata', 'mon-rattata-lit',
    'mon-ponyta', 'mon-ponyta-lit', 'mon-gastly', 'mon-gastly-lit'
  ];

  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    var p = {};
    for (var i = 0; i < PX_KEYS.length; i++) {
      var k = PX_KEYS[i];
      // magenta is the tell that a key here has no --px-* to match it
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
    s: 'sea',   l: 'sea-lit',   F: 'foam',
    a: 'sand',  A: 'sand-lit',
    g: 'grass', G: 'grass-lit', D: 'grass-dk',
    b: 'bloom', B: 'bloom-alt',
    t: 'tall',  T: 'tall-lit',  y: 'tall-dk',
    c: 'tree',  C: 'tree-lit',  v: 'tree-dk',  k: 'trunk',
    r: 'rock',  R: 'rock-lit',  x: 'rock-dk',
    p: 'path',  P: 'path-lit',
    n: 'cave',
    w: 'wall',  W: 'wall-dk',   o: 'door',     q: 'glass',  e: 'emblem',
    f: 'roof',  H: 'roof-lit',  h: 'roof-dk'
  };

  /** Same art, blue: the league gate reuses the pokémon-centre stamps. */
  function remap(base, over) {
    var out = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in over) if (Object.prototype.hasOwnProperty.call(over, k)) out[k] = over[k];
    return out;
  }

  var CH_GATE = remap(CH, {
    f: 'roof-alt', H: 'roof-alt-lit', h: 'roof-alt-dk'
  });

  var ART = {
    sea: [
      ['ssssssss',
       'ssllssss',
       'ssssssss',
       'ssssslls',
       'ssssssss',
       'llssssss',
       'ssssssss',
       'sssslsss'],
      ['ssssssss',
       'sllsssss',
       'ssssssss',
       'ssssllss',
       'ssssssss',
       'sllsssss',
       'ssssssss',
       'sslsssss']
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
       'gggggDgg',
       'ggggggGg',
       'gGgggggg',
       'ggDggggg',
       'ggggGggg',
       'gggggggg'],
      ['gggggggg',
       'ggggggGg',
       'gGggDggg',
       'gggggggg',
       'gggGgggg',
       'ggggggDg',
       'ggGgggGg',
       'gGgggggg']
    ],

    // the flower clusters that break up a route — picked by hash2, so only
    // a minority of grass tiles get one
    bloom: [
      ['gggggggg',
       'ggbgbggg',
       'gggbgggg',
       'ggbgbggg',
       'gggggggg',
       'gggggbgb',
       'ggggggbg',
       'gggggbgb'],
      ['gggggggg',
       'gggBBggg',
       'ggBbbBgg',
       'ggBbbBgg',
       'gggBBggg',
       'ggggggGg',
       'gDgggggg',
       'gggggggg']
    ],

    // clumps of blades, the classic wild-encounter patch
    tall: [
      ['tttttttt',
       'tTtttTtt',
       'tTTttTTt',
       'TTTtTTTt',
       'tttttttt',
       'ttTtttTt',
       'tTTTtTTT',
       'yyyyyyyy'],
      ['tttttttt',
       'TttttTtt',
       'TTtttTTt',
       'TTTttTTT',
       'tttttttt',
       'tttTtttT',
       'ttTTTtTT',
       'yyyyyyyy']
    ],

    cave: [
      ['rrrrrrrr',
       'rrxnnxrr',
       'rxnnnnxr',
       'rnnnnnnr',
       'rnnnnnnr',
       'rnnnnnnr',
       'rxnnnnxr',
       'rrrrrrrr']
    ],

    /* town pieces — the 5x3 stamp in region.js is read as a building
       cluster: three roof tiles, then wall/door/wall with a fence post
       either side, then a paved yard. */

    roofL: [
      ['ggHHHHHH',
       'gHffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'hhhhhhhh']
    ],
    // the pokéball emblem is what makes it read as a pokémon centre
    roofC: [
      ['HHHHHHHH',
       'ffffffff',
       'ffeeeeff',
       'feeeeeef',
       'ffhhhhff',
       'feeeeeef',
       'ffeeeeff',
       'hhhhhhhh']
    ],
    roofR: [
      ['HHHHHHgg',
       'ffffffHg',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'ffffffff',
       'hhhhhhhh']
    ],
    wall: [
      ['wwwwwwww',
       'wwWWWWww',
       'wwqqqqww',
       'wwqqqqww',
       'wwWWWWww',
       'wwwwwwww',
       'wwwwwwww',
       'WWWWWWWW']
    ],
    door: [
      ['wwwwwwww',
       'wwwwwwww',
       'WWWWWWWW',
       'WqqqqqqW',
       'WqqooqqW',
       'WqqooqqW',
       'WqqooqqW',
       'WWWWWWWW']
    ],
    // low fence either side of the buildings
    post: [
      ['gggggggg',
       'gggggggg',
       'gkgggkgg',
       'kkkkkkkk',
       'gkgggkgg',
       'gkgggkgg',
       'gggggggg',
       'gggggggg']
    ],
    yard: [
      ['pppppppp',
       'pPpppppp',
       'pppppppp',
       'ppppPppp',
       'pppppppp',
       'pPpppppp',
       'pppppppp',
       'ppppPppp']
    ]
  };

  /* -----------------------------------------------------
     The trainer

     10x14, drawn side-on once and mirrored for the other
     facing — half the art, and the two directions stay in
     step by construction. Rows 12 and 13 come from LEGS so
     the walk cycle only re-authors the feet.
     ----------------------------------------------------- */

  var SCH = {
    R: 'cap',    r: 'cap-dk',     W: 'cap-white', L: 'cap-logo',
    h: 'hair',   n: 'skin',       m: 'skin-dk',   e: 'eye',
    J: 'jacket', j: 'jacket-dk',  S: 'sleeve',    k: 'glove',
    d: 'denim',  b: 'shoe'
  };

  // rows 0-11; the brim is the widest row, which is what reads as a cap
  var TRAINER = {
    down: [
      '..RRRRRR..',
      '.RRRRRRRR.',
      '.RWWLLWWR.',
      'rrRRRRRRrr',
      '.hnnnnnnh.',
      '.hnennenh.',
      '.hnnnnnnh.',
      '..mnnnnm..',
      '.SJJJJJJS.',
      '.SJJjjJJS.',
      '.kJJJJJJk.',
      '..dddddd..'
    ],
    // seen from behind there's no face, so the hair mass is the whole tell
    up: [
      '..RRRRRR..',
      '.RRRRRRRR.',
      '.RRRRRRRR.',
      'rrRRRRRRrr',
      '.hhhhhhhh.',
      '.hhhhhhhh.',
      '.hhhhhhhh.',
      '..hhhhhh..',
      '.SJJJJJJS.',
      '.SJJJJJJS.',
      '.kJJJJJJk.',
      '..dddddd..'
    ],
    side: [
      '..RRRRRR..',
      '.RRRRRRRRr',
      '.RWWLLWWRr',
      'rrRRRRRRrr',
      '.hhnnnnn..',
      '.hhnnennn.',
      '.hhnnnnnn.',
      '..hmnnnm..',
      '..SJJJJJ..',
      '..SJJJJJk.',
      '..JJJJJJ..',
      '..dddddd..'
    ]
  };

  // rows 12-13 per sheet column: neutral, step, opposite step
  var LEGS = {
    down: [['..dd..dd..', '..bb..bb..'],
           ['..dd.dd...', '..bb.bb...'],
           ['...dd.dd..', '...bb.bb..']],
    up:   [['..dd..dd..', '..bb..bb..'],
           ['..dd.dd...', '..bb.bb...'],
           ['...dd.dd..', '...bb.bb..']],
    side: [['...dddd...', '...bbbb...'],
           ['..dd..dd..', '..bb..bb..'],
           ['...dd.dd..', '...bb.bb..']]
  };

  var DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  // region.js bumps `frame` once per tile step, so this is the classic
  // step / neutral / other-step / neutral beat
  var WALK = [0, 1, 0, 2];
  var FRAMES = 3;

  /* -----------------------------------------------------
     Wild sprites — one per name in WILD (region.js), in the
     same order, so the flash text and the art agree.
     ----------------------------------------------------- */

  function mon(name, rows) {
    return {
      rows: rows,
      chars: { a: 'mon-' + name, b: 'mon-' + name + '-lit', e: 'eye' }
    };
  }

  var CRITTERS = [
    mon('umbreon', [
      'a......a',
      'ab....ba',
      'aa....aa',
      '.aaaaaa.',
      '.aeaaea.',
      '.aaaaaa.',
      '..abba..',
      '..a..a..'
    ]),
    mon('zubat', [
      '.a....a.',
      'ba....ab',
      'baaaaaab',
      'baaaaaab',
      '.aaaaaa.',
      '..a..a..',
      '..b..b..',
      '........'
    ]),
    mon('oddish', [
      '..b..b..',
      '.bb.bb..',
      '.bbbbbb.',
      '..aaaa..',
      '.aaaaaa.',
      '.aeaaea.',
      '.aaaaaa.',
      '..a..a..'
    ]),
    mon('rattata', [
      '.a....a.',
      'aa....aa',
      '.aaaaaa.',
      '.aeaaea.',
      'baaaaaab',
      '.aaaaaa.',
      '..aaaa.b',
      '..a..a.b'
    ]),
    mon('ponyta', [
      '.b...b..',
      'bb..bb..',
      'bbaaaa..',
      '.baaaaa.',
      '..aaaaa.',
      '..aeaaa.',
      '..a.a.a.',
      '..a.a.a.'
    ]),
    mon('gastly', [
      '..bbbb..',
      '.bbbbbb.',
      'bbaaaabb',
      'baeaaeab',
      'baaaaaab',
      'bbaaaabb',
      '.bbbbbb.',
      '..b..b..'
    ])
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

  /** One building cluster in a given set of roof colours. */
  function buildSet(chars, pal) {
    return {
      roofL: stamp(ART.roofL[0], chars, pal),
      roofC: stamp(ART.roofC[0], chars, pal),
      roofR: stamp(ART.roofR[0], chars, pal),
      wall: stamp(ART.wall[0], chars, pal),
      door: stamp(ART.door[0], chars, pal),
      post: stamp(ART.post[0], chars, pal),
      yard: stamp(ART.yard[0], chars, pal)
    };
  }

  function buildCache(pal) {
    var c = {
      sea: stampSet('sea', pal),
      sand: stampSet('sand', pal),
      grass: stampSet('grass', pal),
      bloom: stampSet('bloom', pal),
      tall: stampSet('tall', pal),
      cave: stampSet('cave', pal),
      shore: [],
      route: [],
      tree: [],
      peak: [],
      builds: {
        center: buildSet(CH, pal),
        gate: buildSet(CH_GATE, pal)
      }
    };

    var m, g;

    // shore: sand with a foam line on whichever sides face the sea
    for (m = 0; m < 16; m++) {
      var sc = mk(TILE, TILE);
      g = sc.getContext('2d');
      g.drawImage(c.sand[m & 1], 0, 0);
      g.fillStyle = pal.foam;
      if (m & 1) g.fillRect(0, 0, TILE, 1);              // N
      if (m & 2) g.fillRect(0, TILE - 1, TILE, 1);       // S
      if (m & 4) g.fillRect(TILE - 1, 0, 1, TILE);       // E
      if (m & 8) g.fillRect(0, 0, 1, TILE);              // W
      c.shore.push(sc);
    }

    // route: a wide dirt path with an arm toward each connected neighbour, so
    // the 4-bit mask that picks the ascii box-drawing glyph picks this too
    for (m = 0; m < 16; m++) {
      var rc = mk(TILE, TILE);
      g = rc.getContext('2d');
      g.drawImage(c.grass[m & 1], 0, 0);
      g.fillStyle = pal.path;
      g.fillRect(1, 1, 6, 6);
      if (m & 1) g.fillRect(1, 0, 6, 2);
      if (m & 2) g.fillRect(1, 6, 6, 2);
      if (m & 4) g.fillRect(6, 1, 2, 6);
      if (m & 8) g.fillRect(0, 1, 2, 6);
      g.fillStyle = pal['path-lit'];
      g.fillRect(2, 2, 1, 1);
      g.fillRect(5, 4, 1, 1);
      g.fillRect(3, 5, 1, 1);
      c.route.push(rc);
    }

    /* Tree and mountain both autotile off the same 4-bit neighbour mask as
       the routes do: the dark outline is drawn only on edges with no
       matching neighbour, so a block of forest merges into one canopy
       instead of reading as a field of identical bumps. */

    for (m = 0; m < 16; m++) {
      var tc = mk(TILE, TILE);
      g = tc.getContext('2d');
      g.drawImage(c.grass[m & 1], 0, 0);

      // outline box, pulled in on every exposed side (and off the bottom,
      // where the trunk needs the room)
      var x0 = (m & 8) ? 0 : 1, x1 = (m & 4) ? TILE : TILE - 1;
      var y0 = (m & 1) ? 0 : 1, y1 = (m & 2) ? TILE : TILE - 2;
      g.fillStyle = pal['tree-dk'];
      g.fillRect(x0, y0, x1 - x0, y1 - y0);

      var ix0 = (m & 8) ? 0 : 2, ix1 = (m & 4) ? TILE : TILE - 2;
      var iy0 = (m & 1) ? 0 : 2, iy1 = (m & 2) ? TILE : TILE - 3;
      g.fillStyle = pal.tree;
      g.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);

      g.fillStyle = pal['tree-lit'];
      if (!(m & 1)) g.fillRect(ix0, iy0, ix1 - ix0, 1);   // sun on the top edge
      g.fillRect(2, 3, 1, 1);                             // dappling, always
      g.fillRect(5, 2, 1, 1);                             // inside the inner
      g.fillRect(3, 4, 1, 1);                             // box on every mask

      // the trunk shows only where the canopy stops
      if (!(m & 2)) {
        g.fillStyle = pal.trunk;
        g.fillRect(3, TILE - 3, 2, 3);
      }
      c.tree.push(tc);
    }

    for (m = 0; m < 16; m++) {
      var pc = mk(TILE, TILE);
      g = pc.getContext('2d');
      g.drawImage(c.grass[m & 1], 0, 0);

      var px0 = (m & 8) ? 0 : 1, px1 = (m & 4) ? TILE : TILE - 1;
      var py0 = (m & 1) ? 0 : 1, py1 = (m & 2) ? TILE : TILE - 1;
      g.fillStyle = pal['rock-dk'];
      g.fillRect(px0, py0, px1 - px0, py1 - py0);

      var qx0 = (m & 8) ? 0 : 2, qx1 = (m & 4) ? TILE : TILE - 2;
      var qy0 = (m & 1) ? 0 : 2, qy1 = (m & 2) ? TILE : TILE - 2;
      g.fillStyle = pal.rock;
      g.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);

      g.fillStyle = pal['rock-lit'];
      if (!(m & 1)) g.fillRect(qx0, qy0, qx1 - qx0, 1);   // lit face on top
      g.fillRect(2, 3, 2, 1);
      g.fillRect(4, 4, 1, 1);
      c.peak.push(pc);
    }

    return c;
  }

  /* -----------------------------------------------------
     Sprite sheets — generated once per palette, handed to
     CSS as data URLs so the walk cycle stays a background
     -position swap (no per-frame drawing).
     ----------------------------------------------------- */

  var trainerUrl = null, critterUrl = null, sheetSig = null;

  // every key the sheets actually paint with — the signature has to cover
  // all of them or a palette change leaves a stale sheet behind
  var SHEET_KEYS = (function () {
    var seen = {}, out = [], k, i;
    for (k in SCH) if (Object.prototype.hasOwnProperty.call(SCH, k)) seen[SCH[k]] = 1;
    for (i = 0; i < CRITTERS.length; i++) {
      var ch = CRITTERS[i].chars;
      for (k in ch) if (Object.prototype.hasOwnProperty.call(ch, k)) seen[ch[k]] = 1;
    }
    for (k in seen) if (Object.prototype.hasOwnProperty.call(seen, k)) out.push(k);
    return out;
  })();

  function palSig(pal) {
    return SHEET_KEYS.map(function (k) { return pal[k]; }).join('|');
  }

  function buildSheets(pal) {
    var sheet = mk(SPRITE_W * FRAMES, SPRITE_H * 4);
    var g = sheet.getContext('2d');

    Object.keys(DIR_ROW).forEach(function (dir) {
      var src = dir === 'left' || dir === 'right' ? 'side' : dir;
      var rows = TRAINER[src];
      var row = DIR_ROW[dir];

      for (var f = 0; f < FRAMES; f++) {
        var body = rows.concat(LEGS[src][f]);
        if (dir === 'left') {
          // draw the side pose mirrored rather than authoring it twice
          var tmp = mk(SPRITE_W, SPRITE_H);
          paint(tmp.getContext('2d'), body, SCH, pal, 0, 0);
          g.save();
          g.translate(f * SPRITE_W + SPRITE_W, row * SPRITE_H);
          g.scale(-1, 1);
          g.drawImage(tmp, 0, 0);
          g.restore();
        } else {
          paint(g, body, SCH, pal, f * SPRITE_W, row * SPRITE_H);
        }
      }
    });

    trainerUrl = sheet.toDataURL();

    var cs = mk(TILE * CRITTERS.length, TILE);
    var cg = cs.getContext('2d');
    CRITTERS.forEach(function (c, i) {
      paint(cg, c.rows, c.chars, pal, i * TILE, 0);
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

  /**
   * 4-bit N|S|E|W mask of the neighbours matching `code`. Off-map counts as
   * a match so coastlines and forests don't outline themselves against the
   * edge of the world.
   */
  function maskOf(MAP, x, y, code) {
    var m = 0;
    if (!MAP.inside(x, y - 1) || MAP.at(x, y - 1) === code) m |= 1;
    if (!MAP.inside(x, y + 1) || MAP.at(x, y + 1) === code) m |= 2;
    if (!MAP.inside(x + 1, y) || MAP.at(x + 1, y) === code) m |= 4;
    if (!MAP.inside(x - 1, y) || MAP.at(x - 1, y) === code) m |= 8;
    return m;
  }

  /** Which piece of a town's building cluster this tile is. */
  function townTile(MAP, c, x, y) {
    for (var i = 0; i < MAP.TOWNS.length; i++) {
      var t = MAP.TOWNS[i];
      var dx = x - t.x, dy = y - t.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 1) continue;
      var b = c.builds[t.build] || c.builds.center;
      if (dy === -1) return dx < 0 ? b.roofL : dx > 0 ? b.roofR : b.roofC;
      if (dy === 0) {
        if (Math.abs(dx) === 2) return b.post;
        return dx === 0 ? b.door : b.wall;
      }
      return b.yard;
    }
    return c.builds.center.yard;
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
          var hv = MAP.hash2(x, y);
          var alt = hv < 0.5 ? 0 : 1;
          var img;

          if (t === K.SEA) img = cache.sea[alt];
          else if (t === K.SAND) img = cache.shore[maskOf(MAP, x, y, K.SEA)];
          else if (t === K.GRASS) {
            // a minority of grass tiles carry flowers
            img = hv < 0.42 ? cache.grass[0]
                : hv < 0.84 ? cache.grass[1]
                : hv < 0.94 ? cache.bloom[0]
                : cache.bloom[1];
          }
          else if (t === K.TALL) img = cache.tall[alt];
          else if (t === K.TREE) img = cache.tree[maskOf(MAP, x, y, K.TREE)];
          else if (t === K.PEAK) img = cache.peak[maskOf(MAP, x, y, K.PEAK)];
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
      budgetW = Math.max(1, budgetW);
      availH = Math.max(1, availH);

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

    // the sheet is FRAMES columns by 4 rows; style.css has to carry the
    // matching background-size or the sprite tears
    sprite: function (el, dir, frame) {
      ensureSheets(readPalette());
      el.textContent = '';
      el.style.backgroundImage = 'url(' + trainerUrl + ')';
      el.style.backgroundPosition =
        WALK[frame & 3] * (100 / (FRAMES - 1)) + '% ' +
        (DIR_ROW[dir] || 0) * (100 / 3) + '%';
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
