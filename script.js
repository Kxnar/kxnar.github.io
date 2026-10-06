/* ===========================================================
   script.js — the shell
   Router, typing engine, vim cursor, command line, theme,
   and the education module list.
   Loaded as a plain script (no modules) so index.html still
   works when opened over file://.
   =========================================================== */

window.KX = window.KX || {};

(function () {
  'use strict';

  var USER = 'guest';
  var HOST = 'kenar';

  /* -----------------------------------------------------
     Device
     ----------------------------------------------------- */

  /**
   * True on a real touch device — a phone or tablet, not a narrow window.
   * Read off the class the inline <head> script set rather than re-running
   * matchMedia, so CSS and JS can never end up on different sides of the gate.
   * Never re-evaluated: a device does not grow a mouse mid-session, and the
   * layout it selects is baked into markup by the time anything reads this.
   */
  var TOUCH = document.documentElement.classList.contains('is-touch');
  KX.touch = TOUCH;

  /* -----------------------------------------------------
     Routes
     ----------------------------------------------------- */

  var ROUTES = [
    { id: 'home',        path: '~',             label: 'home' },
    { id: 'interactive', path: '~/interactive', label: 'interactive' },
    { id: 'education',   path: '~/education',   label: 'education' },
    { id: 'projects',    path: '~/projects',    label: 'projects' },
    { id: 'blog',        path: '~/blog',        label: 'blog' }
  ];

  function routeById(id) {
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i];
    return null;
  }

  /* =====================================================
     EDUCATION
     ===================================================== */

  // Point this at the Quartz deploy once the vault is published.
  // Modules with a `notes` slug link to NOTES_BASE + '/' + slug;
  // modules without one render as "no such file (yet)".
  var NOTES_BASE = 'https://kxnar.github.io/notes';
  var NOTES_LIVE = false; // flip to true once NOTES_BASE actually resolves

  // Prelims papers, computer science & philosophy.
  // Shape: { code, name, term, notes?, desc }
  //   code  — short handle shown on the left. A readable convention, not an
  //           official Oxford code — Oxford papers are named, not numbered.
  //   term  — grouping header; groups render in first-seen order
  //   notes — Quartz slug; omit entirely if there will be no notes
  var MODULES = [
    {
      code: 'cs.prob',
      name: 'probability',
      term: "michaelmas '25",
      notes: 'probability',
      desc: 'discrete probability spaces, random variables, expectation and variance, independence, standard distributions.'
    },
    {
      code: 'cs.dm',
      name: 'discrete maths',
      term: "michaelmas '25",
      notes: 'discrete-maths',
      desc: 'sets, relations and functions, proof by induction, counting, graphs, modular arithmetic.'
    },
    {
      code: 'cs.fp',
      name: 'functional programming',
      term: "michaelmas '25",
      notes: 'functional-programming',
      desc: 'haskell — algebraic data types, recursion and structural induction, higher-order functions, laziness.'
    },
    {
      code: 'phil.gen',
      name: 'general philosophy',
      term: "michaelmas '25",
      notes: 'general-philosophy',
      desc: 'knowledge and scepticism, induction, mind and body, personal identity, free will, god and evil.'
    },
    {
      code: 'phil.logic',
      name: 'intro to logic',
      term: "michaelmas '25",
      notes: 'intro-to-logic',
      desc: 'propositional and first-order logic — formalisation, truth tables, natural deduction, validity and soundness.'
    },
    {
      code: 'cs.daa',
      name: 'design & analysis of algorithms',
      term: "hilary '26",
      notes: 'algorithms',
      desc: 'asymptotics and recurrences, divide and conquer, sorting and searching, greedy methods, graph algorithms.'
    },
    {
      code: 'cs.ip',
      name: 'imperative programming',
      term: "hilary '26",
      notes: 'imperative-programming',
      desc: 'state, arrays and loops, invariants and program correctness, data structures, reasoning about imperative code.'
    },
    {
      code: 'phil.ptlp',
      name: 'philosophical topics in logic and probability',
      term: "hilary '26",
      notes: 'logic-and-probability',
      desc: 'what the formal machinery actually means — interpretations of probability, conditionals, and the paradoxes of confirmation.'
    },


    {
      code: 'cs.ips',
      name: 'intro to proof systems',
      term: "trinity '26",
      notes: 'proof-systems',
      desc: 'formal proof calculi — natural deduction and sequent calculus, soundness and completeness, decidability.'
    },

    {
      code: 'phil.turing',
      name: 'alan turing on computability and intelligence',
      term: "trinity '26",
      notes: 'alan-turing-philosophy',
      desc: "alan turing's 1936 and 1950 papers and various discussions around those topics"
    },

    {
      code: 'cs.mc',
      name: 'models of computation',
      term: "michaelmas '26",
      notes: 'models-of-computation',
      desc: 'idk i havent done it yet it seems very familiar to alan turing on computability'
    },



    {
      code: 'cs.la',
      name: 'linear algebra',
      term: "michaelmas '26",
      notes: 'linear-algebra',
      desc: 'eigenvectors n shi'
    },
 {
      code: 'phil.kr',
      name: 'knowledge & reality',
      term: "michaelmas '26",
      notes: 'knowledge-reality',
      desc: "idk i haven't done it yet"
    },
    {
      code: 'cs.ads',
      name: 'algorithms & data structures',
      term: "hilary '27",
      notes: 'algos-datastructs',
      desc: "idk i haven't done it yet"
    },

    {
          code: 'cs.cm',
          name: 'continuous maths',
          term: "hilary '27",
          notes: 'continuous-maths',
          desc: "idk i haven't done it yet"
    },

    {
      code: 'cs.gds',
      name: 'group design practical',
      term: "trinity '27",
      notes: 'group-practical',
      desc: 'real programming'
    }
  ];

  function renderModules() {
    var wrap = document.getElementById('module-list');
    var status = document.getElementById('notes-status');
    if (!wrap) return;

    if (status) {
      status.textContent = NOTES_LIVE
        ? 'notes published with quartz'
        : 'notes vault not published yet';
    }

    if (!MODULES.length) {
      wrap.innerHTML = '<p class="page-sub">nothing here yet.</p>';
      return;
    }

    // group by term, preserving first-seen order
    var order = [];
    var groups = {};
    MODULES.forEach(function (m) {
      var t = m.term || 'other';
      if (!groups[t]) { groups[t] = []; order.push(t); }
      groups[t].push(m);
    });

    var html = '';
    order.forEach(function (term) {
      html += '<div class="term-group">';
      html += '<p class="term-group-title">' + esc(term) + '</p>';

      groups[term].forEach(function (m) {
        var link;
        if (m.notes && NOTES_LIVE) {
          link = '<a class="notes-link" target="_blank" rel="noopener" href="' +
                 esc(NOTES_BASE + '/' + m.notes) + '">$ cat notes/' + esc(m.notes) + ' &#8599;</a>';
        } else {
          var slug = m.notes || slugify(m.name);
          link = '<span class="notes-missing">$ cat notes/' + esc(slug) +
                 ' &rarr; no such file (yet)</span>';
        }

        html +=
          '<details class="module">' +
            '<summary>' +
              '<span class="mod-code">' + esc(m.code) + '</span>' +
              '<span class="mod-name">' + esc(m.name) +
                (m.term ? ' <em>&middot; ' + esc(m.term) + '</em>' : '') +
              '</span>' +
            '</summary>' +
            '<div class="module-detail">' +
              (m.desc ? '<p>' + esc(m.desc) + '</p>' : '') +
              link +
            '</div>' +
          '</details>';
      });

      html += '</div>';
    });

    wrap.innerHTML = html;
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* =====================================================
     TYPING ENGINE
     ===================================================== */

  /**
   * Reveal the text inside `root` as if it were being typed.
   * Text is split into a shown span and a visibility:hidden remainder,
   * so every element occupies its final box from the first frame and
   * nothing reflows as it fills in.
   */
  var NOOP_RUN = { skip: function () {}, finished: true };

  // Deliberately NOT gated on prefers-reduced-motion: this reveal moves
  // nothing — no reflow, no transform, characters simply become visible —
  // and it is the whole point of the site. Genuine motion (cursor blink,
  // drawer slide, scanlines, CSS transitions) still respects the setting.
  //
  // document.hidden is a correctness guard, not a preference: rAF is paused
  // in a background tab, so a run started there would strand text behind
  // visibility:hidden.
  function typeIn(root, done) {
    if (!root || document.hidden) {
      if (done) done();
      return NOOP_RUN;
    }

    var nodes = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        while (p && p !== root.parentElement) {
          var tag = p.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'PRE') return NodeFilter.FILTER_REJECT;
          if (p.hasAttribute && p.hasAttribute('data-no-type')) return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    if (!nodes.length) { if (done) done(); return NOOP_RUN; }

    // split each text node in place (collected first — never mutate mid-walk)
    var items = nodes.map(function (node) {
      var text = node.nodeValue;
      var shown = document.createElement('span');
      var hidden = document.createElement('span');
      hidden.className = 't-hidden';
      hidden.textContent = text;

      var parent = node.parentNode;
      parent.insertBefore(shown, node);
      parent.insertBefore(hidden, node);
      parent.removeChild(node);

      return { shown: shown, hidden: hidden, text: text, i: 0, charMode: isCharMode(shown, root) };
    });

    function isCharMode(el, stop) {
      var p = el.parentElement;
      while (p && p !== stop.parentElement) {
        if (p.dataset && p.dataset.type === 'char') return true;
        p = p.parentElement;
      }
      return false;
    }

    // Rates are chars per SECOND, paced off the rAF timestamp rather than
    // counted per frame — a per-frame budget types twice as fast on a 120Hz
    // display as it does on a 60Hz one.
    var HEAD_CPS = 75;                  // headings, slow enough to read as typing
    var bodyTotal = 0;
    items.forEach(function (it) { if (!it.charMode) bodyTotal += it.text.length; });
    // body fills in ~1.8s, with a floor so short sections don't crawl
    var bodyCps = Math.max(450, bodyTotal / 0.5);

    var caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.textContent = '▌';

    var idx = 0;
    var raf = null;
    var finished = false;
    var last = 0;      // previous frame timestamp
    var carry = 0;     // fractional character left over from the last frame

    /** Collapse an item back to a plain text node, restoring the original DOM shape. */
    function settle(it) {
      var parent = it.shown.parentNode;
      if (!parent) return;
      parent.insertBefore(document.createTextNode(it.text), it.shown);
      parent.removeChild(it.shown);
      if (it.hidden.parentNode) it.hidden.parentNode.removeChild(it.hidden);
    }

    function finish() {
      if (finished) return;
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      if (caret.parentNode) caret.parentNode.removeChild(caret);
      for (var k = idx; k < items.length; k++) settle(items[k]);
      if (done) done();
    }

    function step(ts) {
      raf = null;

      // clamp: coming back from a background tab must not dump the whole
      // section in a single frame
      var dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
      last = ts;

      var timeLeft = dt;

      while (idx < items.length && timeLeft > 0) {
        var it = items[idx];
        var cps = it.charMode ? HEAD_CPS : bodyCps;

        // park the caret just ahead of the text being revealed
        if (caret.parentNode !== it.hidden.parentNode || caret.nextSibling !== it.hidden) {
          it.hidden.parentNode.insertBefore(caret, it.hidden);
        }

        var allowance = timeLeft * cps + carry;
        var take = Math.floor(allowance);
        var remaining = it.text.length - it.i;

        // below one whole character this frame — bank it and wait
        if (take < 1) { carry = allowance; break; }

        if (take >= remaining) {
          timeLeft -= remaining / cps;
          carry = 0;
          it.i = it.text.length;
        } else {
          it.i += take;
          carry = allowance - take;
          timeLeft = 0;
        }

        it.shown.textContent = it.text.slice(0, it.i);
        it.hidden.textContent = it.text.slice(it.i);

        if (it.i >= it.text.length) {
          settle(it);
          idx++;
        }
      }

      if (idx >= items.length) { finish(); return; }
      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return { skip: finish, get finished() { return finished; } };
  }

  /* =====================================================
     ROUTER
     ===================================================== */

  var typed = {};        // section id -> true once it has been revealed
  var activeType = null; // the in-flight typing run, so a click can skip it

  function currentId() {
    var id = (location.hash || '').replace(/^#/, '');
    return routeById(id) ? id : 'home';
  }

  function show(id, opts) {
    var route = routeById(id) || ROUTES[0];
    opts = opts || {};

    ROUTES.forEach(function (r) {
      var el = document.getElementById(r.id);
      if (el) el.classList.toggle('active', r.id === route.id);
    });

    var tabs = document.getElementById('term-tabs');
    if (tabs) {
      var active = null;
      Array.prototype.forEach.call(tabs.children, function (a) {
        var here = a.dataset.route === route.id;
        a.classList.toggle('here', here);
        if (here) active = a;
      });
      // The strip hides its scrollbar, so on a narrow screen the active tab
      // can sit off the end with nothing to say so. Pull it to the left edge
      // — the browser clamps at max scroll, so the last tabs come to rest
      // wherever they can, and the tabs after it are what's revealed.
      // Written as a delta on scrollLeft rather than scrollIntoView so no
      // ancestor scroller can be moved along with it.
      if (active) {
        tabs.scrollLeft +=
          active.getBoundingClientRect().left - tabs.getBoundingClientRect().left;
      }
    }

    setPrompt(route);
    document.title = route.id === 'home' ? 'kxnar' : route.label + ' · kxnar';

    var main = document.getElementById('term-main');
    if (main) {
      main.scrollTop = 0;
      // the map page fills its pane instead of scrolling
      main.classList.toggle('map-mode', route.id === 'interactive');
    }

    // sections that carry live widgets need a nudge once they're measurable
    if (route.id === 'home' && KX.fractals) KX.fractals.refresh();
    if (route.id === 'interactive' && KX.region) {
      KX.region.boot();
      KX.region.refresh();
    }

    if (activeType) activeType.skip();
    activeType = typeIn(document.getElementById(route.id));
  }

  function setPrompt(route) {
    var ps1 = USER + '@' + HOST + ':' + route.path + '$';
    var el = document.getElementById('ps1');
    if (el) el.textContent = ps1;

    var title = document.getElementById('term-title');
    if (title) title.textContent = USER + '@' + HOST + ': ' + route.path;

    var path = document.getElementById('status-path');
    if (path) path.textContent = route.path;
  }

  function promptString() {
    var route = routeById(currentId()) || ROUTES[0];
    return USER + '@' + HOST + ':' + route.path + '$';
  }

  function navigate(id, opts) {
    if (!routeById(id)) return false;
    if (currentId() === id) { show(id, opts); return true; }
    location.hash = '#' + id;   // hashchange drives show()
    return true;
  }

  function initTabs() {
    var tabs = document.getElementById('term-tabs');
    if (!tabs) return;

    tabs.innerHTML = ROUTES.map(function (r, i) {
      return '<a class="tab" href="#' + r.id + '" data-route="' + r.id + '">' +
               '<span class="tab-num">' + (i + 1) + '</span>' +
               '<span class="tab-path">' + r.path + '</span>' +
             '</a>';
    }).join('');

    // clicking a tab reads like a real shell session
    tabs.addEventListener('click', function (e) {
      var a = e.target.closest('.tab');
      if (!a) return;
      var id = a.dataset.route;
      if (id === currentId()) return;
      echoCommand('cd ' + routeById(id).path);
    });
  }

  /* =====================================================
     TERMINAL LOG
     ===================================================== */

  function logEl() { return document.getElementById('term-log'); }

  function scrollToEnd(el) { if (el) el.scrollTop = el.scrollHeight; }

  var LOG_LIMIT = 200; // either log would otherwise grow without bound

  // Where command output goes. `cd` keeps to the two-line strip at the
  // bottom; everything else opens the side pane. Set by runCommand().
  var outTarget = 'log';

  /** Append a line to the current output target. Types it out unless `instant`. */
  function print(html, cls, instant) {
    var toSide = outTarget === 'side' && sideLogEl;
    if (toSide) sideOpen();

    var l = toSide ? sideLogEl : logEl();
    if (!l) return null;

    var line = document.createElement('div');
    line.className = 'log-line' + (cls ? ' ' + cls : '');
    line.innerHTML = html;
    l.appendChild(line);

    while (l.children.length > LOG_LIMIT) l.removeChild(l.firstChild);
    scrollToEnd(l);

    if (!instant) typeIn(line, function () { scrollToEnd(l); });
    return line;
  }

  /** The echo of what you typed always belongs to the bottom strip. */
  function echoCommand(cmd) {
    var l = logEl();
    if (!l) return;
    var line = document.createElement('div');
    line.className = 'log-line echo';
    line.innerHTML = '<span class="ps1-echo">' + esc(promptString()) + '</span> ' + esc(cmd);
    l.appendChild(line);
    while (l.children.length > LOG_LIMIT) l.removeChild(l.firstChild);
    scrollToEnd(l);
  }

  function clearLog() {
    var l = logEl();
    if (l) l.innerHTML = '';
  }

  /* =====================================================
     COMMANDS
     ===================================================== */

  var LINKS = {
    github: 'https://github.com/kxnar',
    linkedin: 'https://linkedin.com/in/narayaka',
    cv: 'cv.pdf',
    notes: NOTES_BASE,
    fracta: 'https://youtu.be/foJNU14CKbQ',
    shotlab: 'https://github.com/Kxnar/ShotLab'
  };

  var COMMANDS = {

    help: function () {
      // kept short — the transcript is only a few lines tall
      print([
        'ls  cd  cat  open  fractal  map  toggle  graph  theme  whoami  pwd  fastfetch  clear',
        'cd &lt;section&gt',
        'cat about|contact|cv',
        'open github|linkedin|cv|notes',
        'fractal [next|prev|list|&lt;name&gt;] · map [town] · toggle [ascii|graphics]',
        'graph — obsidian vault graph · theme [dark|light]',
        'esc → normal mode: 1-5 switch section, arrows/hjkl drive the carousel',
        'and the map, i or : returns to the prompt terminal.'
      ].join('\n'), 'dim');
    },

    ls: function (args) {
      var dir = (args[0] || '').replace(/^~\/?/, '').replace(/\/$/, '');

      if (!dir) {
        print(ROUTES.filter(function (r) { return r.id !== 'home'; })
          .map(function (r) { return r.id + '/'; }).join('   ') + '   cv.pdf   logo.jpeg', null);
        return;
      }
      if (dir === 'projects') {
        print(Array.prototype.map.call(document.querySelectorAll('#projects .project-name'), function (name) {
          return esc(name.textContent.trim());
        }).join('   '), null);
        return;
      }
      if (dir === 'education') {
        print(MODULES.length
          ? MODULES.map(function (m) { return m.code; }).join('   ')
          : '(empty)', null);
        return;
      }
      if (routeById(dir)) { print('(section — try `cd ' + dir + '`)', 'dim'); return; }
      print('ls: ' + esc(dir) + ': no such file or directory', null);
    },

    cd: function (args) {
      var target = (args[0] || 'home').replace(/^~\/?/, '').replace(/\/$/, '');
      if (target === '' || target === '.') target = 'home';
      if (target === '..') target = 'home';
      if (!routeById(target)) {
        print('cd: no such section: ' + esc(target), null);
        return;
      }
      navigate(target);
    },

    cat: function (args) {
      var f = (args[0] || '').replace(/\.(txt|md)$/, '');
      if (f === 'about' || f === 'me') {
        print('kenar narayaka — 18, first year comp sci &amp; philosophy at christ church, oxford.\n' +
              'loughborough / oxford / jakarta. fractals, logic, ai interpretability.', null);
      } else if (f === 'contact') {
        print('email     kenar.narayaka [at] cs.ox.ac.uk\n' +
              'github    <a href="' + LINKS.github + '" target="_blank" rel="noopener">github.com/kxnar</a>\n' +
              'linkedin  <a href="' + LINKS.linkedin + '" target="_blank" rel="noopener">linkedin.com/in/narayaka</a>', null);
      } else if (f === 'cv') {
        print('opening cv.pdf …', 'dim');
        window.open('cv.pdf', '_blank', 'noopener');
      } else if (!f) {
        print('cat: missing operand — try `cat about`', null);
      } else {
        print('cat: ' + esc(f) + ': no such file or directory', null);
      }
    },

    open: function (args) {
      var t = (args[0] || '').toLowerCase();
      if (!t) { print('open: missing target — try `open github`', null); return; }
      if (t === 'notes' && !NOTES_LIVE) {
        print('open: notes vault is not published yet.', 'dim');
        return;
      }
      if (t === 'resume') {
         window.open('cv.pdf', '_blank', 'noopener');
      }
      if (!LINKS[t]) { print('open: unknown target: ' + esc(t), null); return; }
      print('opening ' + esc(t) + ' …', 'dim');
      window.open(LINKS[t], '_blank', 'noopener');
    },

    fractal: function (args) {
      if (!KX.fractals) return;
      var a = (args[0] || '').toLowerCase();
      navigate('home');

      if (!a || a === 'next') { KX.fractals.next(); }
      else if (a === 'prev' || a === 'previous') { KX.fractals.prev(); }
      else if (a === 'list' || a === 'ls') {
        print(KX.fractals.list().map(function (f) { return f.id; }).join('   '), null);
        return;
      } else if (!KX.fractals.byId(a)) {
        print('fractal: unknown — try `fractal list`', null);
        return;
      }
      print(KX.fractals.current().name, 'ok');
    },

    map: function (args) {
      navigate('interactive');
      var town = (args[0] || '').toLowerCase();
      if (town && KX.region && !KX.region.visit(town)) {
        print('map: no town for `' + esc(town) + '` — try: ' +
          KX.region.towns().map(function (t) { return t.id; }).join(', '), null);
      }
    },

    /* Draws the obsidian vault as a graph in the side pane.
       Deliberately NOT in INLINE_CMDS: runCommand only sets outTarget to
       'side' for non-inline commands, and that is the only thing that makes
       print() open the side terminal. */
    graph: function () {
      if (!KX.notesGraph) { print('graph: renderer unavailable', null); return; }
      if (!NOTES_LIVE) {
        print('graph: notes vault not published yet &mdash; nothing to draw.', 'dim');
        return;
      }

      // print() hands back the .log-line it made; the graph mounts inside it.
      // `instant` throughout, so the typing engine never rewrites the subtree.
      var line = print('<div class="notes-graph" data-no-type></div>', null, true);
      if (!line) return;

      KX.notesGraph.mount(line.firstChild, {
        base: NOTES_BASE,
        onReady: function (n, e) {
          print(n + ' notes &middot; ' + e + ' links', 'ok', true);
        },
        onError: function (msg) { print('graph: ' + esc(msg), null, true); }
      });
    },

    // switches which renderer draws the region map. `KX.region.setMode` is
    // the region's own mode, not the local setMode() that drives the vim
    // statusline — same name, different thing.
    toggle: function (args) {
      navigate('interactive');
      if (!KX.region) { print('toggle: map unavailable', null); return; }

      var want = (args[0] || '').toLowerCase();
      var next;
      if (want === 'ascii' || want === 'a') next = 'ascii';
      else if (want === 'graphics' || want === 'g' || want === 'tiles') next = 'tiles';
      else if (want) {
        print('toggle: expected ascii or graphics', null);
        return;
      } else {
        next = KX.region.mode() === 'tiles' ? 'ascii' : 'tiles';
      }

      KX.region.setMode(next);
      // report what actually happened: setMode falls back to ascii when the
      // pixel renderer didn't load
      print('map → ' + (KX.region.mode() === 'tiles' ? 'graphics' : 'ascii'), 'ok');
    },

    theme: function (args) {
      var want = (args[0] || '').toLowerCase();
      var html = document.documentElement;
      var next;
      if (want === 'dark' || want === 'd') next = 'dark';
      else if (want === 'light' || want === 'l') next = 'light';
      else next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
      print('theme → ' + next, 'ok');
    },

    whoami: function () {
      print('kenar narayaka', null);
    },

    pwd: function () {
      print((routeById(currentId()) || ROUTES[0]).path, null);
    },

    fastfetch: function () {
      var t = document.documentElement.getAttribute('data-theme');
      print(
        '<span data-no-type>' +
        '  ▄▄▄▄▄▄▄▄▄▄   </span>' + USER + '@' + HOST + '\n' +
        '<span data-no-type>  █  &gt;_    █   </span>──────────────\n' +
        '<span data-no-type>  █        █   </span>host     christ church, oxford\n' +
        '<span data-no-type>  █        █   </span>course   comp sci ∧ philosophy\n' +
        '<span data-no-type>  ▀▀▀▀▀▀▀▀▀▀   </span>shell    zsh 5.9.2\n' +
        '<span data-no-type>               </span>kernel   Linux 7.1.4-arch1-1\n' +
        '<span data-no-type>               </span>theme    ' + t + '\n',
        'dim', true);
    },

    clear: function () { clearLog(); sideClose(); },

    sudo: function (args) {
      print(esc(USER) + ' is not in the sudoers file. this incident has been reported.' +
        (args.length ? '' : ''), null);
    },

    echo: function (args) { print(esc(args.join(' ')), null); },

    date: function () { print(new Date().toString(), null); },

    exit: function () {
      print('there is no exit. try `cd home`.', 'dim');
    }
  };

  // aliases
  COMMANDS.dir = COMMANDS.ls;
  COMMANDS.man = COMMANDS.help;
  COMMANDS['?'] = COMMANDS.help;

  var ARG_HINTS = {
    cd: ROUTES.map(function (r) { return r.id; }),
    ls: ROUTES.map(function (r) { return r.id; }),
    cat: ['about', 'contact', 'cv'],
    open: Object.keys(LINKS),
    theme: ['dark', 'light'],
    map: ['home', 'education', 'projects', 'blog', 'cv'],
    toggle: ['ascii', 'graphics'],
    fractal: ['next', 'prev', 'list']
  };

  // these stay in the bottom strip rather than spawning a side terminal
  var INLINE_CMDS = { cd: true, clear: true, toggle: true };

  function runCommand(raw) {
    var line = raw.trim();
    if (!line) return;

    echoCommand(line);

    var parts = line.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1);

    outTarget = INLINE_CMDS[cmd] ? 'log' : 'side';

    if (COMMANDS[cmd]) {
      COMMANDS[cmd](args);
    } else {
      print('zsh: command not found: ' + esc(cmd) + ' — try `help`', null);
    }

    outTarget = 'log';
  }

  /* =====================================================
     PROMPT / INPUT
     ===================================================== */

  var HISTORY_KEY = 'kx-history';
  var history = [];
  var histIdx = -1;
  var draft = '';

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) history = [];
    } catch (e) { history = []; }
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50))); }
    catch (e) { /* private mode — history just won't persist */ }
  }

  function setMode(insert) {
    var m = document.getElementById('status-mode');
    if (m) m.textContent = insert ? '-- INSERT --' : '-- NORMAL --';
  }

  function initPrompt() {
    var form = document.getElementById('term-prompt');
    var input = document.getElementById('cmd');
    if (!form || !input) return;

    loadHistory();
    setMode(false);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value;
      if (v.trim()) {
        history.push(v.trim());
        saveHistory();
      }
      histIdx = -1;
      draft = '';
      input.value = '';
      runCommand(v);
    });

    input.addEventListener('focus', function () { setMode(true); });
    input.addEventListener('blur', function () { setMode(false); });

    var tabCycle = { prefix: null, matches: [], i: 0 };

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        input.blur();
        setMode(false); // focus events don't fire when the window itself is unfocused
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!history.length) return;
        if (histIdx === -1) { draft = input.value; histIdx = history.length; }
        histIdx = Math.max(0, histIdx - 1);
        input.value = history[histIdx];
        moveCaretToEnd(input);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx === -1) return;
        histIdx++;
        if (histIdx >= history.length) { histIdx = -1; input.value = draft; }
        else input.value = history[histIdx];
        moveCaretToEnd(input);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        complete(input, tabCycle);
        return;
      }

      // ctrl+c aborts the line, but only when it isn't a copy
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        var sel = window.getSelection();
        if (sel && String(sel).length) return;
        e.preventDefault();
        echoCommand(input.value + '^C');
        input.value = '';
        histIdx = -1;
        return;
      }

      if (e.key !== 'Tab') tabCycle.prefix = null;
    });
  }

  function moveCaretToEnd(input) {
    requestAnimationFrame(function () {
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function complete(input, cycle) {
    var v = input.value;
    var sp = v.indexOf(' ');

    var pool, prefix, head;
    if (sp === -1) {
      pool = Object.keys(COMMANDS);
      prefix = v;
      head = '';
    } else {
      var cmd = v.slice(0, sp).toLowerCase();
      pool = ARG_HINTS[cmd] || [];
      prefix = v.slice(sp + 1);
      head = v.slice(0, sp + 1);
    }

    if (cycle.prefix !== v || !cycle.matches.length) {
      cycle.matches = pool.filter(function (c) { return c.indexOf(prefix) === 0; }).sort();
      cycle.i = 0;
    } else {
      cycle.i = (cycle.i + 1) % cycle.matches.length;
    }

    if (!cycle.matches.length) return;

    input.value = head + cycle.matches[cycle.i];
    cycle.prefix = input.value;
    moveCaretToEnd(input);
  }

  /* =====================================================
     NORMAL MODE KEYS
     ===================================================== */

  function initNormalMode() {
    var input = document.getElementById('cmd');

    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // esc dismisses the side terminal
      if (e.key === 'Escape') { sideClose(); return; }

      // i or : drops into the prompt, like vim
      if (e.key === 'i' || e.key === ':') {
        e.preventDefault();
        if (input) { input.focus(); setMode(true); }
        return;
      }

      // 1-5 switch section
      if (/^[1-5]$/.test(e.key)) {
        var r = ROUTES[parseInt(e.key, 10) - 1];
        if (r) {
          e.preventDefault();
          echoCommand('cd ' + r.path);
          navigate(r.id);
        }
        return;
      }

      // hjkl mirrors the arrow keys for the carousel and the map
      var map = { h: 'ArrowLeft', j: 'ArrowDown', k: 'ArrowUp', l: 'ArrowRight' };
      if (map[e.key]) {
        var synth = new KeyboardEvent('keydown', { key: map[e.key], bubbles: true, cancelable: true });
        document.dispatchEvent(synth);
        e.preventDefault();
      }
    });

    // Clicking dead space in the terminal focuses the prompt, like a real one.
    // Not on touch: there every stray tap would throw up the soft keyboard.
    var term = document.getElementById('term');
    if (term && input && !TOUCH) {
      term.addEventListener('click', function (e) {
        if (e.target.closest('a, button, input, select, textarea, summary, label')) return;
        var sel = window.getSelection();
        if (sel && String(sel).length) return;   // don't steal focus mid-selection
        input.focus({ preventScroll: true });
        setMode(true);
      });
    }

    // any click or keypress skips an in-flight reveal
    ['click', 'keydown'].forEach(function (evt) {
      document.addEventListener(evt, function () {
        if (activeType && !activeType.finished) activeType.skip();
      }, true);
    });
  }

  /* =====================================================
     VIM CURSOR
     ===================================================== */

  function initVimCursor() {
    var el = document.getElementById('vim-cursor');
    if (!el) return;
    if (TOUCH) return;   // no pointer to follow

    var mx = 0, my = 0, queued = false, idleTimer = null;
    var cellW = 8, cellH = 15;

    // measure one monospace cell for the fallback grid
    var probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;top:-9999px;left:-9999px;white-space:pre;' +
      'font-family:var(--font-mono);font-size:0.82rem;line-height:1.8';
    probe.textContent = 'M';
    document.body.appendChild(probe);
    var pr = probe.getBoundingClientRect();
    if (pr.width) cellW = pr.width;
    if (pr.height) cellH = pr.height;
    probe.parentNode.removeChild(probe);

    function caretAt(x, y) {
      if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode && pos.offsetNode.nodeType === 3) {
          return { node: pos.offsetNode, offset: pos.offset };
        }
      } else if (document.caretRangeFromPoint) {
        var r = document.caretRangeFromPoint(x, y);
        if (r && r.startContainer.nodeType === 3) {
          return { node: r.startContainer, offset: r.startOffset };
        }
      }
      return null;
    }

    function tick() {
      queued = false;
      var rect = null;
      var hit = caretAt(mx, my);

      if (hit) {
        var len = hit.node.nodeValue.length;
        if (len > 0) {
          var start = Math.min(hit.offset, len - 1);
          try {
            var range = document.createRange();
            range.setStart(hit.node, start);
            range.setEnd(hit.node, start + 1);
            var r = range.getBoundingClientRect();
            if (r.width > 0.5 && r.height > 0.5) rect = r;
          } catch (e) { /* detached node mid-retype — fall through to the grid */ }
        }
      }

      if (rect) {
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        el.style.transform = 'translate3d(' + rect.left + 'px,' + rect.top + 'px,0)';
      } else {
        // no character under the pointer — snap to a plain monospace grid
        el.style.width = cellW + 'px';
        el.style.height = cellH + 'px';
        el.style.transform = 'translate3d(' +
          (Math.round(mx / cellW) * cellW) + 'px,' +
          (Math.round((my - cellH / 2) / cellH) * cellH) + 'px,0)';
      }

      el.classList.add('on');
    }

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;

      el.classList.remove('blink');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { el.classList.add('blink'); }, 380);

      if (!queued) {
        queued = true;
        requestAnimationFrame(tick);
      }
    }, { passive: true });

    window.addEventListener('blur', function () { el.classList.remove('on'); });
    document.addEventListener('mouseleave', function () { el.classList.remove('on'); });
  }

  /* =====================================================
     THEME
     ===================================================== */

  function setTheme(next) {
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    updateThemeLabel();
    // the map's --px-* palette is theme-independent, but the graph is drawn
    // from the terminal tokens, so it has to follow
    if (KX.notesGraph) KX.notesGraph.repaint();
    // the eevee column beside the map swaps art with the theme, and the two
    // aren't the same shape — re-size it (a no-op away from #interactive)
    if (KX.region) KX.region.fit();
  }

  function updateThemeLabel() {
    var label = document.querySelector('#theme-toggle .theme-label');
    if (!label) return;
    label.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  }

  /**
   * The graph button is a shortcut for two real commands, which is both the
   * site's conceit and the only sane order: `clear` runs sideClose(), which
   * wipes the side pane — so it has to happen *before* the graph mounts.
   * (The `clear` echo is itself cleared, so the transcript shows just `graph`.)
   */
  function initNotesGraph() {
    var btn = document.getElementById('notes-graph-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      runCommand('clear');
      runCommand('graph');
    });
  }

  function initTheme() {
    var btn = document.getElementById('theme-toggle');
    updateThemeLabel();
    if (!btn) return;
    btn.addEventListener('click', function () {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* =====================================================
     BOOT
     ===================================================== */

  var updateSize = function () {};

  function initSize() {
    var el = document.getElementById('term-size');
    var main = document.getElementById('term-main');
    if (!el || !main) return;

    var cellW = 0, cellH = 0;

    // Measure a real character rather than assuming font metrics — the old
    // hardcoded constants also counted the padding as columns.
    function measure() {
      var probe = document.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText =
        'position:absolute;visibility:hidden;white-space:pre;' +
        'font-family:var(--font-mono);font-size:0.78rem;line-height:1.65';
      probe.textContent = new Array(101).join('M');
      main.appendChild(probe);
      var r = probe.getBoundingClientRect();
      cellW = r.width / 100;
      cellH = r.height;
      main.removeChild(probe);
    }

    updateSize = function () {
      if (!cellW) measure();
      if (!cellW || !cellH) return;
      var cs = getComputedStyle(main);
      var w = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var h = main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      el.textContent = Math.max(0, Math.round(w / cellW)) + '×' + Math.max(0, Math.round(h / cellH));
    };

    measure();
    updateSize();
    window.addEventListener('resize', updateSize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); updateSize(); });
    }
  }

  /* =====================================================
     SIDE TERMINAL
     ===================================================== */

  var sideEl, sideLogEl;

  /** Anything that changes the content width has to re-fit the live widgets. */
  function reflowWidgets() {
    updateSize();
    if (KX.fractals) KX.fractals.refresh();
    if (KX.region) KX.region.fit();
    // the graph lives *in* the side pane, so opening or closing it changes
    // the canvas's own box, not just the main column's
    if (KX.notesGraph) KX.notesGraph.fit();
  }

  function sideOpen() {
    if (!sideEl || !sideEl.hidden) return;
    sideEl.hidden = false;
    reflowWidgets();
  }

  function sideClose() {
    if (!sideEl || sideEl.hidden) return;
    sideEl.hidden = true;
    if (sideLogEl) sideLogEl.innerHTML = '';
    reflowWidgets();
  }

  function initSide() {
    sideEl = document.getElementById('term-side');
    sideLogEl = document.getElementById('side-log');
    var close = document.getElementById('side-close');
    if (close) close.addEventListener('click', sideClose);
  }

  /* -----------------------------------------------------
     Eevee art
     ----------------------------------------------------- */

  /**
   * The umbreon/espeon pair is written once, in the blog section — the home
   * page borrows it rather than repeating 46 lines of braille in the markup
   * (region.js borrows the same pair for the map stage). The clone carries
   * [aria-hidden] and [data-no-type] with it, so it stays out of both the
   * accessibility tree and the typing engine; that is also why this has to
   * run before show() types the home section.
   */
  function initEevee() {
    var slot = document.getElementById('home-eevee');
    var source = document.querySelector('#blog .eevee');
    if (!slot || !source) return;
    slot.appendChild(source.cloneNode(true));
  }

  function boot() {
    initTabs();
    renderModules();
    initEevee();
    initNotesGraph();
    initTheme();
    initSide();
    initSize();
    initPrompt();
    initNormalMode();
    initVimCursor();

    if (KX.fractals) KX.fractals.init();

    window.addEventListener('hashchange', function () { show(currentId()); });
    show(currentId());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // exposed for the console and for the other modules
  KX.shell = {
    navigate: navigate,
    print: print,
    run: runCommand,
    routes: function () { return ROUTES.slice(); },
    sideClose: sideClose
  };
})();
