/* ===========================
   THEME
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
    label.textContent =
      html.getAttribute('data-theme') === 'dark'
        ? 'light mode'
        : 'dark mode';
  }

  updateLabel();

  btn.addEventListener('click', () => {
    const next =
      html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateLabel();
  });
}

/* ===========================
   MANDELBROT
   =========================== */
function renderMandelbrot(elId, cols, rows, xMin, xMax, yMin, yMax) {
  const el = document.getElementById(elId);
  if (!el) return;

  const chars =
    " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@";

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
   JULIA + BLOG TREE (unchanged)
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

function renderLSystemTree(elId, cols, rows) {
  const el = document.getElementById(elId);
  if (!el) return;

  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(' '));
  }

  function drawTree(x, y, angle, length, depth) {
    if (depth === 0 || length < 1) return;

    const radians = (angle - 90) * Math.PI / 180;
    const ex = Math.round(x + Math.cos(radians) * length);
    const ey = Math.round(y + Math.sin(radians) * length);

    const steps = Math.ceil(Math.hypot(ex - x, ey - y) * 2);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x + (ex - x) * t);
      const py = Math.round(y + (ey - y) * t);

      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        grid[py][px] = depth > 4 ? '#' : '|';
      }
    }

    const spread = 28 + depth * 2;
    drawTree(ex, ey, angle - spread, length * 0.68, depth - 1);
    drawTree(ex, ey, angle + spread, length * 0.68, depth - 1);
  }

  drawTree(Math.floor(cols / 2), rows - 1, 0, Math.floor(rows * 0.38), 7);

  el.textContent = grid.map(r => r.join('')).join('\n');
}

/* ===========================
   INIT (KEY PART)
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const art = document.getElementById('fractal-art');
  const slider = document.getElementById('fractal-scale');
  const label = document.getElementById('fractal-scale-value');

  if (art && slider && label) {
    const frameW = 330;
    const frameH = 230;

    function render(scale) {
      art.style.fontSize = scale + 'px';
      label.textContent = scale.toFixed(1);

      const charW = 0.62;
      const charH = 1.08;

      const cols = Math.floor(frameW / (scale * charW));
      const rows = Math.floor(frameH / (scale * charH));

      renderMandelbrot(
        'fractal-art',
        cols,
        rows,
        -2.35,
        0.75,
        -1.15,
        1.15
      );
    }

    slider.addEventListener('input', () => {
      render(parseFloat(slider.value));
    });

    render(parseFloat(slider.value));
  }

  renderJulia('julia-aside', 32, 18, -0.4, 0.6);
  renderLSystemTree('blog-fractal', 48, 22);
});
