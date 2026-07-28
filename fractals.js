/* ===========================================================
   fractals.js — ASCII fractal renderers + the carousel
   Attaches to window.KX.fractals. No modules, so this still
   works when index.html is opened over file://.
   =========================================================== */

window.KX = window.KX || {};

(function () {
  'use strict';

  /* -----------------------------------------------------
     Character ramps
     ----------------------------------------------------- */

  // the original mandelbrot ramp — structured rather than strictly luminance-ordered
  var RAMP_FINE = ' .,:;irsXA253hMHGS#9B&@';
  // the original julia ramp — shorter, conventional density ramp
  var RAMP_SOFT = ' .,:;=+xX$#@';

  // Glyph cell proportions for JetBrains Mono, as fractions of font-size.
  // These must match the CSS: #frac-art has line-height 1.08.
  var CHAR_W = 0.62;
  var CHAR_H = 1.08;

  /* -----------------------------------------------------
     Shared helpers
     ----------------------------------------------------- */

  /**
   * Build a complex-plane window whose proportions match the physical
   * shape of a cols x rows character grid, so nothing comes out stretched.
   */
  function viewFor(cols, rows, cx, cy, halfH) {
    var aspect = (cols * CHAR_W) / (rows * CHAR_H);
    var halfW = halfH * aspect;
    return { xMin: cx - halfW, xMax: cx + halfW, yMin: cy - halfH, yMax: cy + halfH };
  }

  /**
   * Escape-time driver shared by mandelbrot, julia, burning ship and tricorn.
   * `iterate(px, py, maxIter)` returns the iteration count for one cell.
   */
  function escapeGrid(cols, rows, view, maxIter, chars, gamma, iterate) {
    var out = '';
    var last = chars.length - 1;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var px = view.xMin + (col / cols) * (view.xMax - view.xMin);
        var py = view.yMin + (row / rows) * (view.yMax - view.yMin);
        var iter = iterate(px, py, maxIter);
        var t = Math.pow(iter / maxIter, gamma);
        out += chars[Math.floor(t * last)];
      }
      out += '\n';
    }
    return out;
  }

  /** Small deterministic PRNG, so chaos-game fractals redraw identically. */
  function lcg(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function blankGrid(cols, rows) {
    var g = new Array(rows);
    for (var i = 0; i < rows; i++) g[i] = new Array(cols).fill(' ');
    return g;
  }

  function gridToText(grid) {
    return grid.map(function (r) { return r.join(''); }).join('\n');
  }

  /* -----------------------------------------------------
     Escape-time fractals
     ----------------------------------------------------- */

  function mandelbrot(el, cols, rows) {
    var view = viewFor(cols, rows, -0.7, 0, 1.2);
    el.textContent = escapeGrid(cols, rows, view, 80, RAMP_FINE, 0.55, function (cx, cy, maxIter) {
      var zx = 0, zy = 0, iter = 0;
      while (zx * zx + zy * zy <= 4 && iter < maxIter) {
        var tmp = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = tmp;
        iter++;
      }
      return iter;
    });
  }

  /** Julia set for a fixed constant c = jx + i*jy. */
  function julia(jx, jy) {
    return function (el, cols, rows) {
      var view = viewFor(cols, rows, 0, 0, 1.15);
      el.textContent = escapeGrid(cols, rows, view, 60, RAMP_SOFT, 0.5, function (zx, zy, maxIter) {
        var iter = 0;
        while (zx * zx + zy * zy <= 4 && iter < maxIter) {
          var tmp = zx * zx - zy * zy + jx;
          zy = 2 * zx * zy + jy;
          zx = tmp;
          iter++;
        }
        return iter;
      });
    };
  }

  /** z -> (|Re z| + i|Im z|)^2 + c. Drawn y-flipped, which is the iconic view. */
  function burningShip(el, cols, rows) {
    var view = viewFor(cols, rows, -0.5, 0.5, 1.4);
    el.textContent = escapeGrid(cols, rows, view, 80, RAMP_FINE, 0.5, function (cx, cy, maxIter) {
      var zx = 0, zy = 0, iter = 0;
      var ci = -cy; // flip so the "ship" sits the right way up
      while (zx * zx + zy * zy <= 4 && iter < maxIter) {
        var ax = Math.abs(zx), ay = Math.abs(zy);
        var tmp = ax * ax - ay * ay + cx;
        zy = 2 * ax * ay + ci;
        zx = tmp;
        iter++;
      }
      return iter;
    });
  }

  /** z -> conj(z)^2 + c — the mandelbar / tricorn. */
  function tricorn(el, cols, rows) {
    var view = viewFor(cols, rows, -0.25, 0, 1.7);
    el.textContent = escapeGrid(cols, rows, view, 70, RAMP_FINE, 0.55, function (cx, cy, maxIter) {
      var zx = 0, zy = 0, iter = 0;
      while (zx * zx + zy * zy <= 4 && iter < maxIter) {
        var tmp = zx * zx - zy * zy + cx;
        zy = -2 * zx * zy + cy; // conjugate
        zx = tmp;
        iter++;
      }
      return iter;
    });
  }

  /* -----------------------------------------------------
     Newton fractal — basins of z^3 - 1
     ----------------------------------------------------- */

  // one glyph family per root, so the three basins stay visually distinct
  var NEWTON_RAMPS = [
    ' .:-=+*#',
    ' .,;:!i%',
    " .'`^\"~@"
  ];

  var ROOTS = [
    [1, 0],
    [-0.5, Math.sqrt(3) / 2],
    [-0.5, -Math.sqrt(3) / 2]
  ];

  function newton(el, cols, rows) {
    var view = viewFor(cols, rows, 0, 0, 1.4);
    var maxIter = 24;
    var out = '';

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var zx = view.xMin + (col / cols) * (view.xMax - view.xMin);
        var zy = view.yMin + (row / rows) * (view.yMax - view.yMin);

        var iter = 0;
        for (; iter < maxIter; iter++) {
          // z - (z^3 - 1) / (3 z^2)
          var x2 = zx * zx - zy * zy;
          var y2 = 2 * zx * zy;                    // z^2
          var x3 = x2 * zx - y2 * zy;
          var y3 = x2 * zy + y2 * zx;              // z^3
          var nx = x3 - 1, ny = y3;                // z^3 - 1
          var dx = 3 * x2, dy = 3 * y2;            // 3 z^2
          var den = dx * dx + dy * dy;
          if (den < 1e-12) break;
          var qx = (nx * dx + ny * dy) / den;
          var qy = (ny * dx - nx * dy) / den;
          zx -= qx;
          zy -= qy;
          if (qx * qx + qy * qy < 1e-12) break;
        }

        // which root did we land on?
        var basin = 0, best = Infinity;
        for (var r = 0; r < 3; r++) {
          var ddx = zx - ROOTS[r][0], ddy = zy - ROOTS[r][1];
          var d = ddx * ddx + ddy * ddy;
          if (d < best) { best = d; basin = r; }
        }

        var ramp = NEWTON_RAMPS[basin];
        var t = 1 - iter / maxIter;                // converge fast => dense glyph
        out += ramp[Math.floor(Math.pow(t, 0.7) * (ramp.length - 1))];
      }
      out += '\n';
    }

    el.textContent = out;
  }

  /* -----------------------------------------------------
     Geometric / IFS fractals
     ----------------------------------------------------- */

  /** Recursive binary branching tree (carried over from the old script.js). */
  function lsystemTree(el, cols, rows) {
    var grid = blankGrid(cols, rows);

    function drawTree(x, y, angle, length, depth) {
      if (depth === 0 || length < 1) return;

      var radians = (angle - 90) * Math.PI / 180;
      var ex = Math.round(x + Math.cos(radians) * length);
      var ey = Math.round(y + Math.sin(radians) * length);
      var steps = Math.ceil(Math.hypot(ex - x, ey - y) * 2);

      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var px = Math.round(x + (ex - x) * t);
        var py = Math.round(y + (ey - y) * t);
        if (px >= 0 && px < cols && py >= 0 && py < rows) {
          grid[py][px] = depth > 4 ? '#' : '|';
        }
      }

      var spread = 28 + depth * 2;
      drawTree(ex, ey, angle - spread, length * 0.68, depth - 1);
      drawTree(ex, ey, angle + spread, length * 0.68, depth - 1);
    }

    drawTree(Math.floor(cols / 2), rows - 1, 0, Math.floor(rows * 0.38), 7);
    el.textContent = gridToText(grid);
  }

  /**
   * Sierpinski gasket via Pascal's triangle mod 2.
   * Rows are left ragged on purpose — #frac-art is text-align:center, so each
   * line centres itself and the triangle comes out symmetric.
   */
  function sierpinski(el, cols, rows) {
    // row r is 2r+1 glyphs wide, so cap the height to whatever fits
    var n = Math.min(rows, Math.floor((cols + 1) / 2));
    var lines = [];

    var padTop = Math.floor((rows - n) / 2);
    for (var i = 0; i < padTop; i++) lines.push('');

    for (var row = 0; row < n; row++) {
      var line = '';
      for (var k = 0; k <= row; k++) {
        // C(row, k) is odd exactly when (k & (row - k)) === 0
        line += (k & (row - k)) === 0 ? '#' : ' ';
        if (k < row) line += ' ';
      }
      lines.push(line);
    }

    while (lines.length < rows) lines.push('');
    el.textContent = lines.join('\n');
  }

  /** Barnsley fern, chaos game with density shading. Seeded so it redraws identically. */
  function barnsleyFern(el, cols, rows) {
    var counts = new Array(rows);
    for (var i = 0; i < rows; i++) counts[i] = new Array(cols).fill(0);

    var rand = lcg(0x5eed1e);
    var x = 0, y = 0;
    var n = cols * rows * 30;
    var peak = 0;

    for (var s = 0; s < n; s++) {
      var r = rand(), nx, ny;
      if (r < 0.01) { nx = 0; ny = 0.16 * y; }
      else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
      else if (r < 0.93) { nx = 0.20 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
      else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
      x = nx; y = ny;

      // fern bounds: x in [-2.182, 2.6558], y in [0, 9.9983]
      var px = Math.round(((x + 2.182) / 4.8378) * (cols - 1));
      var py = Math.round((1 - y / 9.9983) * (rows - 1));
      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        var c = ++counts[py][px];
        if (c > peak) peak = c;
      }
    }

    var ramp = ' .:-=+*#%@';
    var lines = [];
    for (var row = 0; row < rows; row++) {
      var line = '';
      for (var col = 0; col < cols; col++) {
        var v = counts[row][col];
        if (v === 0) { line += ' '; continue; }
        var t = Math.pow(v / peak, 0.35);
        line += ramp[Math.max(1, Math.floor(t * (ramp.length - 1)))];
      }
      lines.push(line);
    }
    el.textContent = lines.join('\n');
  }

  /* -----------------------------------------------------
     The collection
     ----------------------------------------------------- */

  var FRACTALS = [
    { id: 'mandelbrot', name: 'mandelbrot set', formula: 'z ↦ z² + c,  z₀ = 0', render: mandelbrot },
    { id: 'julia', name: 'julia set', formula: 'c = −0.4 + 0.6i', render: julia(-0.4, 0.6) },
    { id: 'dendrite', name: 'julia dendrite', formula: 'c = −0.8 + 0.156i', render: julia(-0.8, 0.156) },
    { id: 'burning-ship', name: 'burning ship', formula: 'z ↦ (|Re z| + i|Im z|)² + c', render: burningShip },
    { id: 'tricorn', name: 'tricorn', formula: 'z ↦ conj(z)² + c', render: tricorn },
    { id: 'newton', name: 'newton basins', formula: "z ↦ z − (z³−1)/3z²", render: newton },
    { id: 'tree', name: 'l-system tree', formula: 'depth 7, spread 28°+2d, decay 0.68', render: lsystemTree },
    { id: 'sierpinski', name: 'sierpinski gasket', formula: 'C(n,k) mod 2', render: sierpinski },
    { id: 'fern', name: 'barnsley fern', formula: '4-map affine IFS', render: barnsleyFern }
  ];

  /* -----------------------------------------------------
     Carousel
     ----------------------------------------------------- */

  var art, caption, formulaEl, countEl, detail;
  var index = 0;
  var pending = false;
  var retrying = false;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** Render the current fractal at the current detail level. Synchronous and instant. */
  function paint() {
    if (!art) return;

    var w = art.clientWidth;
    var h = art.clientHeight;
    // Section is still hidden (display:none) or layout hasn't settled.
    // Retry next frame rather than silently leaving the frame blank.
    if (w === 0 || h === 0) {
      if (!retrying) {
        retrying = true;
        // setTimeout, not rAF — rAF is paused in a background tab and the
        // carousel would stay blank until the tab was focused.
        setTimeout(function () { retrying = false; paint(); }, 24);
      }
      return;
    }

    var scale = 18 - parseFloat(detail.value); // slider is inverted: higher = finer
    art.style.fontSize = scale + 'px';

    var cols = Math.max(32, Math.floor(w / (scale * CHAR_W)));
    var rows = Math.max(18, Math.floor(h / (scale * CHAR_H)));

    var f = FRACTALS[index];
    f.render(art, cols, rows);

    caption.textContent = f.name;
    formulaEl.textContent = f.formula;
    countEl.textContent = '[' + pad2(index + 1) + '/' + pad2(FRACTALS.length) + ']';
  }

  /** Coalesce bursts of slider input into one render per frame. */
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      paint();
    });
  }

  function go(i) {
    index = ((i % FRACTALS.length) + FRACTALS.length) % FRACTALS.length;
    paint(); // deliberately synchronous — swaps are instant, no fade, no preview
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  function init() {
    art = document.getElementById('frac-art');
    caption = document.getElementById('frac-caption');
    formulaEl = document.getElementById('frac-formula');
    countEl = document.getElementById('frac-count');
    detail = document.getElementById('frac-detail');
    if (!art || !detail) return;

    // The slider is hidden on touch — a 10px track with a 10px thumb is a
    // quarter of a usable target — so the value it would have set has to be
    // chosen here instead. 8 gives a 10px font, which is legible in the
    // 170px-tall frame a phone gets; the desktop default of 10 is not.
    // paint() reads detail.value directly, so no input event is needed.
    if (KX.touch) detail.value = 8;

    var frame = art.closest('.frac-frame');
    var nextBtn = frame && frame.querySelector('.frac-arrow.next');
    var prevBtn = frame && frame.querySelector('.frac-arrow.prev');

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    art.addEventListener('click', next);

    detail.addEventListener('input', schedule);

    // arrow keys drive the carousel, but not while the user is typing a command
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var home = document.getElementById('home');
      if (!home || !home.classList.contains('active')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    // the frame is fluid, so re-fit on resize
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(paint, 120);
    });

    // the web font changes glyph metrics, so re-fit once it lands
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(paint);
    }

    paint();
  }

  KX.fractals = {
    init: init,
    next: next,
    prev: prev,
    go: go,
    list: function () { return FRACTALS.map(function (f) { return { id: f.id, name: f.name }; }); },
    current: function () { return { id: FRACTALS[index].id, name: FRACTALS[index].name }; },
    byId: function (id) {
      for (var i = 0; i < FRACTALS.length; i++) {
        if (FRACTALS[i].id === id) { go(i); return true; }
      }
      return false;
    },
    /** Called by the router when #home becomes visible, so a deep link still renders. */
    refresh: paint
  };
})();
