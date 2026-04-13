/* ===========================
   THEME — persists across pages
   =========================== */
(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const label = btn.querySelector('.theme-label');
  const html = document.documentElement;

  function updateLabel() {
    label.textContent = html.getAttribute('data-theme') === 'dark' ? 'light mode' : 'dark mode';
  }
  updateLabel();

  btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateLabel();
  });
}

/* ===========================
   MANDELBROT SET
   Real escape-time algorithm.
   Rendered into #fractal-art.
   =========================== */
function renderMandelbrot(elId, cols, rows, xMin, xMax, yMin, yMax) {
  const el = document.getElementById(elId);
  if (!el) return;

  // Character ramp: sparse → dense
  const chars = " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@";
  const maxIter = 80;
  let out = '';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = xMin + (col / cols) * (xMax - xMin);
      const cy = yMin + (row / rows) * (yMax - yMin);
      let zx = 0, zy = 0, iter = 0;
      while (zx * zx + zy * zy <= 4 && iter < maxIter) {
        const tmp = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = tmp;
        iter++;
      }
      const t = Math.pow(iter / maxIter, 0.45);
      out += chars[Math.floor(t * (chars.length - 1))];
    }
    out += '\n';
  }
  el.textContent = out;
}

/* ===========================
   JULIA SET
   Rendered into any element by id.
   =========================== */
function renderJulia(elId, cols, rows, cx, cy) {
  const el = document.getElementById(elId);
  if (!el) return;

  const chars = " .,:;=+xX$#@";
  const maxIter = 60;
  const xMin = -1.6, xMax = 1.6;
  const yMin = -1.1, yMax = 1.1;
  let out = '';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let zx = xMin + (col / cols) * (xMax - xMin);
      let zy = yMin + (row / rows) * (yMax - yMin);
      let iter = 0;
      while (zx * zx + zy * zy <= 4 && iter < maxIter) {
        const tmp = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = tmp;
        iter++;
      }
      const t = Math.pow(iter / maxIter, 0.5);
      out += chars[Math.floor(t * (chars.length - 1))];
    }
    out += '\n';
  }
  el.textContent = out;
}

/* ===========================
   L-SYSTEM FRACTAL TREE
   Koch snowflake-ish variant
   for the blog page.
   =========================== */
function renderLSystemTree(elId, cols, rows) {
  const el = document.getElementById(elId);
  if (!el) return;

  // Simple planted fractal tree using a grid approach
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(' '));
  }

  // Draw a recursive fractal tree on the char grid
  function drawTree(x, y, angle, length, depth) {
    if (depth === 0 || length < 1) return;
    const radians = (angle - 90) * Math.PI / 180;
    const ex = Math.round(x + Math.cos(radians) * length);
    const ey = Math.round(y + Math.sin(radians) * length);

    // Draw line from (x,y) to (ex,ey)
    const steps = Math.ceil(Math.hypot(ex - x, ey - y) * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x + (ex - x) * t);
      const py = Math.round(y + (ey - y) * t);
      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        const dx = Math.abs(ex - x);
        const dy = Math.abs(ey - y);
        if (depth === 1) grid[py][px] = '.';
        else if (depth === 2) grid[py][px] = '+';
        else if (depth <= 4) grid[py][px] = '|';
        else grid[py][px] = depth > 5 ? '#' : '|';
      }
    }
    const spread = 28 + depth * 2;
    drawTree(ex, ey, angle - spread, length * 0.68, depth - 1);
    drawTree(ex, ey, angle + spread, length * 0.68, depth - 1);
  }

  const rootX = Math.floor(cols / 2);
  const rootY = rows - 1;
  drawTree(rootX, rootY, 0, Math.floor(rows * 0.38), 7);

  el.textContent = grid.map(row => row.join('')).join('\n');
}

/* ===========================
   INIT
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Home page: full Mandelbrot
  renderMandelbrot('fractal-art', 52, 28, -2.35, 0.75, -1.15, 1.15);

  // About page: small Julia set in aside
  renderJulia('julia-aside', 32, 18, -0.4, 0.6);

  // Blog page: fractal tree
  renderLSystemTree('blog-fractal', 48, 22);
});
