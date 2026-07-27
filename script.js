/* ===========================
   SHARED LAYOUT (nav + footer)
   =========================== */

const NAV_PAGES = [
  { href: 'index.html', label: 'home' },
  { href: 'about.html', label: 'about' },
  { href: 'projects.html', label: 'projects' },
  { href: 'blog.html', label: 'blog' },
];

function initLayout() {
  const nav = document.getElementById('site-nav');
  const footer = document.getElementById('site-footer');
  if (!nav && !footer) return;

  let current = location.pathname.split('/').pop();
  if (current === '') current = 'index.html';

  if (nav) {
    const links = NAV_PAGES
      .map(p => `<a href="${p.href}" class="nav-link${p.href === current ? ' active' : ''}">${p.label}</a>`)
      .join('\n      ');

    nav.innerHTML = `
    <div class="nav-left">
      <span class="nav-brand">&gt;_</span>
    </div>
    <div class="nav-links">
      <button id="theme-toggle" class="theme-btn" aria-label="toggle theme">
        <span class="theme-label">light mode</span>
      </button>
      ${links}
    </div>
  `;
  }

  if (footer) {
    footer.innerHTML = `
    <a href="https://github.com/kxnar" class="footer-link" target="_blank" rel="noopener">github</a>
    <a href="https://linkedin.com/in/narayaka" class="footer-link" target="_blank" rel="noopener">linkedin</a>
    <a href="cv.pdf" class="footer-link" target="_blank" rel="noopener">cv</a>
  `;
  }
}

/* ===========================
   THEME
   =========================== */

// Apply saved theme immediately to avoid flash of wrong theme
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
   FRACTAL RENDERERS
   =========================== */

/**
 * Render a Mandelbrot set as ASCII art into the element with the given id.
 * @param {string} elId  - target element id
 * @param {number} cols  - character columns
 * @param {number} rows  - character rows
 * @param {number} xMin  - complex plane x min
 * @param {number} xMax  - complex plane x max
 * @param {number} yMin  - complex plane y min
 * @param {number} yMax  - complex plane y max
 */
function renderMandelbrot(elId, cols, rows, xMin, xMax, yMin, yMax) {
  const el = document.getElementById(elId);
  if (!el) return;

  const chars = ' .,:;irsXA253hMHGS#9B&@';
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

      const t = Math.pow(iter / maxIter, 0.55);
      out += chars[Math.floor(t * (chars.length - 1))];
    }
    out += '\n';
  }

  el.textContent = out;
}

/**
 * Render a Julia set as ASCII art into the element with the given id.
 * @param {string} elId - target element id
 * @param {number} cols - character columns
 * @param {number} rows - character rows
 * @param {number} cx   - Julia set constant real part
 * @param {number} cy   - Julia set constant imaginary part
 */
function renderJulia(elId, cols, rows, cx, cy) {
  const el = document.getElementById(elId);
  if (!el) return;

  const chars = ' .,:;=+xX$#@';
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

/**
 * Render a recursive L-system branching tree as ASCII art.
 * @param {string} elId - target element id
 * @param {number} cols - character columns
 * @param {number} rows - character rows
 */
function renderLSystemTree(elId, cols, rows) {
  const el = document.getElementById(elId);
  if (!el) return;

  const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

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
   INIT
   =========================== */

function initMandelbrotSlider() {
  const art = document.getElementById('fractal-art');
  const slider = document.getElementById('fractal-scale');
  if (!art || !slider) return;

  const frameW = 360;
  const frameH = 230;
  const charW = 0.62;
  const charH = 1.08;

  function render(scale) {
    art.style.fontSize = scale + 'px';
    const cols = Math.max(32, Math.floor(frameW / (scale * charW)));
    const rows = Math.max(18, Math.floor(frameH / (scale * charH)));
    renderMandelbrot('fractal-art', cols, rows, -2.2, 0.8, -1.2, 1.2);
  }

  slider.addEventListener('input', () => {
    render(18 - parseFloat(slider.value));
  });

  render(18 - parseFloat(slider.value));
}

document.addEventListener('DOMContentLoaded', () => {
  initLayout();
  initTheme();
  initMandelbrotSlider();
  renderJulia('julia-aside', 32, 18, -0.4, 0.6);
  renderLSystemTree('blog-fractal', 48, 22);
});
