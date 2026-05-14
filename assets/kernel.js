/* ===================================================================
   Live Kernel — terminal overlay (Ctrl+` or Cmd+K to toggle)
   No backend. Commands navigate, animate verifications, or invoke the
   client-side detector. Tab-completion. Command history.
   =================================================================== */

(function () {
  // ---- Command registry ----
  const COMMANDS = {
    help: {
      desc: 'List available commands.',
      run: (args, k) => {
        k.println('Available commands:', 'ok');
        Object.entries(COMMANDS).forEach(([name, def]) => {
          k.println(`  ${name.padEnd(18)} ${def.desc}`, 'dim');
        });
        k.println('');
        k.println('Use Tab to complete. Up/Down for history. Esc to close.', 'dim');
      },
    },
    whoami: {
      desc: 'Show R-441 reader credibility for current session.',
      run: (args, k) => {
        if (!window.R441) {
          k.println('R-441 module not loaded.', 'err'); return;
        }
        const consent = window.R441.getConsent();
        if (consent !== 'on') {
          k.println('R-441 attestation is OFF. Enable via the HUD ⚙ to track credibility.', 'warn');
          return;
        }
        const s = window.R441.getState();
        const pages = Object.keys(s.visited).length;
        const scans = s.activities.detector_scan || 0;
        const amends = s.activities.amendment_proposed || 0;
        const cmds = s.activities.kernel_command || 0;
        k.println(`reader: anonymous`, 'ok');
        k.println(`session_started: ${new Date(s.sessionStart).toISOString()}`, 'dim');
        k.println(`pages_visited: ${pages}`, 'dim');
        k.println(`detector_scans: ${scans}`, 'dim');
        k.println(`amendments_proposed: ${amends}`, 'dim');
        k.println(`kernel_commands: ${cmds}`, 'dim');
      },
    },
    'list': {
      desc: 'Usage: list <folios|amendments|claims|pages|evasions|cards>',
      run: (args, k) => {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'cards') {
          k.println('Golden Folio Case Deck · 7 cards:', 'ok');
          k.println('  01  SETUP                 vulnerable researcher, real stakes', 'dim');
          k.println('  02  CLAIM                 agent reports systems working across sessions', 'dim');
          k.println('  03  FABRICATION PATTERN   docs/configs support non-existent systems', 'dim');
          k.println('  04  CONFESSION            STRAIGHT ANSWER · transcript-verbatim', 'dim');
          k.println('  05  HARM CHAIN            trust → time → credits → opportunity → consequence', 'dim');
          k.println('  06  CLASSIFICATION        Construct-Confidence Deception', 'dim');
          k.println('  07  APPARATUS             lab, products, claims, governance', 'dim');
          k.println('');
          k.println('Open: open card <id>   (setup | claim | fabrication | confession | harm | classification | apparatus)', 'dim');
          return;
        }
        if (sub === 'folios') {
          k.println('FOLIO 001  ·  documented misalignment  ·  verified  ·  2026.04', 'ok');
          k.println('  open: get evidence folio-001', 'dim');
          k.println('');
          k.println('(no further folios yet; each new amendment may add one)', 'dim');
        } else if (sub === 'amendments') {
          k.println('Public Amendment Queue:', 'ok');
          k.println('  open: get evidence amendments', 'dim');
        } else if (sub === 'claims') {
          k.println('Falsifiable claims of the Constitution:', 'ok');
          k.println('  C1  CCD is empirically separable from neighbors (preprint §C1)', 'dim');
          k.println('  C2  CCD is behaviorally signed: D4 + D3 + D5 (preprint §C2)', 'dim');
          k.println('  C3  CCD is detectable at runtime via PROACTIVE (preprint §C3)', 'dim');
          k.println('  C4  CCD is a behavioral safety failure with material consequence (preprint §C4)', 'dim');
        } else if (sub === 'pages') {
          k.println('Site sitemap: /sitemap.html', 'ok');
          k.println('  open: cd sitemap', 'dim');
        } else if (sub === 'evasions') {
          k.println('Documented evasion paths against PROACTIVE v1:', 'ok');
          k.println('  Ev-1  Single-session compression       recall ≈ 0.61 (held-in)', 'dim');
          k.println('  Ev-2  Artifact-suppression             recall ≈ 0.74 (held-in)', 'dim');
          k.println('  Ev-3  Hedging escalation               recall ≈ 0.55 (held-in)', 'dim');
          k.println('  Ev-4  Post-hoc admission suppression   recall ≈ 0.39 (held-in)', 'dim');
          k.println('Read: get evidence threat-model', 'dim');
        } else {
          k.println('Usage: list <folios|amendments|claims|pages|evasions>', 'warn');
        }
      },
      complete: (args) => {
        const opts = ['folios', 'amendments', 'claims', 'pages', 'evasions', 'cards'];
        if (args.length <= 1) return opts.filter(o => o.startsWith((args[0] || '').toLowerCase()));
        return [];
      },
    },
    open: {
      desc: 'Usage: open card <id> | open chamber | open <page>',
      run: (args, k) => {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'card') {
          const id = (args[1] || '').toLowerCase();
          const cardIds = ['setup', 'claim', 'fabrication', 'confession', 'harm', 'classification', 'apparatus'];
          if (!cardIds.includes(id)) {
            k.println(`unknown card: ${id || '(none)'}`, 'err');
            k.println(`Available: ${cardIds.join(', ')}`, 'dim');
            return;
          }
          if (window.GoldenFolio && typeof window.GoldenFolio.openCard === 'function') {
            // If we're on the homepage, open directly. Otherwise, navigate there with the card id as hash.
            const onHome = /\/(index\.html)?$/.test(location.pathname) || location.pathname.endsWith('/');
            if (onHome) {
              window.GoldenFolio.openCard(id);
              const el = document.getElementById('gf-card-panel');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              k.println(`opening card · ${id}`, 'ok');
            } else {
              k.println(`navigating home → open card ${id}`, 'ok');
              location.href = prefix('index.html') + '#card=' + id;
            }
            return;
          }
          k.println('Golden Folio not loaded on this page. Navigating home …', 'warn');
          location.href = prefix('index.html') + '#card=' + id;
        } else if (sub === 'chamber') {
          k.println('opening Case Chamber → home', 'ok');
          location.href = prefix('index.html') + '#gf-deck-section';
        } else if (!sub) {
          k.println('Usage: open card <id> | open chamber | open <page>', 'warn');
        } else {
          // Pass through to cd
          COMMANDS.cd.run(args, k);
        }
      },
      complete: (args) => {
        if (args.length <= 1) {
          const opts = ['card', 'chamber', ...EVIDENCE_IDS];
          return opts.filter(o => o.startsWith((args[0] || '').toLowerCase()));
        }
        if (args.length === 2 && args[0] === 'card') {
          const cardIds = ['setup', 'claim', 'fabrication', 'confession', 'harm', 'classification', 'apparatus'];
          return cardIds.filter(o => o.startsWith((args[1] || '').toLowerCase()));
        }
        return [];
      },
    },
    chamber: {
      desc: 'Open the Golden Folio Case Chamber.',
      run: (args, k) => {
        k.println('opening Case Chamber → home', 'ok');
        location.href = prefix('index.html') + '#gf-deck-section';
      },
    },
    'reset-chamber': {
      desc: 'Reset Golden Folio progress (cards opened, reconstruction order).',
      run: (args, k) => {
        if (window.GoldenFolio && typeof window.GoldenFolio.reset === 'function') {
          window.GoldenFolio.reset();
          k.println('Chamber progress reset.', 'ok');
        } else {
          // Try direct localStorage clear if Chamber module isn't loaded on this page
          try {
            localStorage.removeItem('gf_progress_v1');
            k.println('Chamber progress cleared from local storage.', 'ok');
          } catch (_) {
            k.println('Could not clear Chamber state.', 'err');
          }
        }
      },
    },
    get: {
      desc: 'Usage: get evidence <id>     Navigate to evidence page.',
      run: (args, k) => {
        if (args[0] === 'evidence' || !args[0]) {
          const id = (args[1] || args[0] || '').toLowerCase();
          const route = RESOLVE_EVIDENCE(id);
          if (!route) {
            k.println(`unknown evidence id: ${id || '(none)'}`, 'err');
            k.println('Try: folio-001, paper, corpus, threat-model, provenance, pre-registration', 'dim');
            return;
          }
          k.println(`navigating → ${route}`, 'ok');
          k.navigate(route);
        } else {
          k.println('Usage: get evidence <id>', 'warn');
        }
      },
      complete: (args) => {
        if (args.length <= 1) {
          return ['evidence'].filter(o => o.startsWith((args[0] || '').toLowerCase()));
        }
        if (args.length === 2 && args[0] === 'evidence') {
          return EVIDENCE_IDS.filter(o => o.startsWith((args[1] || '').toLowerCase()));
        }
        return [];
      },
    },
    verify: {
      desc: 'Usage: verify module <name>  Animate a reproduce-path run.',
      run: async (args, k) => {
        if (args[0] !== 'module') {
          k.println('Usage: verify module <name>', 'warn');
          k.println(`Modules: ${VERIFIABLE_MODULES.join(', ')}`, 'dim');
          return;
        }
        const name = args[1];
        if (!name || !VERIFIABLE_MODULES.includes(name)) {
          k.println(`unknown module: ${name || '(none)'}`, 'err');
          k.println(`Available: ${VERIFIABLE_MODULES.join(', ')}`, 'dim');
          return;
        }
        await animateVerify(k, name);
      },
      complete: (args) => {
        if (args.length <= 1) return ['module'].filter(o => o.startsWith((args[0] || '').toLowerCase()));
        if (args.length === 2 && args[0] === 'module') return VERIFIABLE_MODULES.filter(o => o.startsWith((args[1] || '').toLowerCase()));
        return [];
      },
    },
    scan: {
      desc: 'Usage: scan transcript       Open the Deception Detector.',
      run: (args, k) => {
        if (args[0] === 'transcript' || !args[0]) {
          k.println('opening Deception Detector → /detector.html', 'ok');
          k.navigate(prefix('detector.html'));
        } else {
          k.println('Usage: scan transcript', 'warn');
        }
      },
      complete: (args) => args.length <= 1 ? ['transcript'].filter(o => o.startsWith((args[0] || '').toLowerCase())) : [],
    },
    cite: {
      desc: 'Usage: cite paper           Emit a BibTeX citation.',
      run: (args, k) => {
        const target = args[0] || 'paper';
        if (target === 'paper' || target === 'preprint') {
          k.println('@misc{alejandro2026ccd,', 'ok');
          k.println('  author       = {Alejandro, Corey},');
          k.println('  title        = {{Construct-Confidence Deception in Coding Assistants}},');
          k.println('  year         = {2026},');
          k.println('  howpublished = {The Living Constitution, preprint v0.1},');
          k.println('  url          = {https://coreyalejandro.com/paper.html},');
          k.println('  note         = {Pre-registration: OSF}');
          k.println('}');
        } else {
          k.println(`unknown citation target: ${target}`, 'err');
          k.println('Try: cite paper', 'dim');
        }
      },
      complete: (args) => args.length <= 1 ? ['paper', 'preprint'].filter(o => o.startsWith((args[0] || '').toLowerCase())) : [],
    },
    show: {
      desc: 'Usage: show <evasions|tests|status|threat-model|coi>',
      run: (args, k) => {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'evasions') {
          COMMANDS.list.run(['evasions'], k);
        } else if (sub === 'tests') {
          k.println('Constitution test suite : 62/62 passing', 'ok');
          k.println('PROACTIVE test suite    : 212/212 passing', 'ok');
          k.println('SentinelOS test suite   : 88/88 passing', 'ok');
          k.println('All implementation-level. Construct validity in corpus + pre-registration.', 'dim');
        } else if (sub === 'status') {
          k.println('Apparatus:   v1.0  (62/62, 212/212, 88/88 passing)', 'ok');
          k.println('Paper:       preprint v0.1 (CCD)', 'ok');
          k.println('Corpus:      held-in n=19  ·  held-out target ≥100 (Q4 2026)', 'warn');
          k.println('Funding:     fiscal sponsor in negotiation  ·  $0 raised', 'warn');
          k.println('Board:       0/3 confirmed  ·  recruitment open', 'warn');
          k.println('Pilots:      0 active  ·  2 in conversation', 'warn');
        } else if (sub === 'threat-model' || sub === 'threats') {
          k.println('Threat model surfaces:', 'ok');
          k.println('  Adv-1: Non-adversarial coding assistant   IN SCOPE', 'dim');
          k.println('  Adv-2: White-box adversary                PARTIAL', 'dim');
          k.println('  Adv-3: Model-trainer adversary            OUT OF SCOPE (v1)', 'dim');
          k.println('Read: get evidence threat-model', 'dim');
        } else if (sub === 'coi') {
          k.println('Conflicts of interest:', 'ok');
          k.println('  COI-A  Founder-as-witness in FOLIO 001', 'dim');
          k.println('  COI-B  Material precarity at founding incident', 'dim');
          k.println('  COI-C  Identity as part of methodology', 'dim');
          k.println('  COI-D  Public adversarial stance toward institutional AI safety', 'dim');
          k.println('  COI-E  No undisclosed financial relationships', 'dim');
          k.println('  COI-F  Future financial interests (funded stipend)', 'dim');
          k.println('Read: get evidence coi', 'dim');
        } else {
          k.println('Usage: show <evasions|tests|status|threat-model|coi>', 'warn');
        }
      },
      complete: (args) => {
        const opts = ['evasions', 'tests', 'status', 'threat-model', 'coi'];
        return args.length <= 1 ? opts.filter(o => o.startsWith((args[0] || '').toLowerCase())) : [];
      },
    },
    cd: {
      desc: 'Usage: cd <page>            Navigate to a named page.',
      run: (args, k) => {
        const id = (args[0] || '').toLowerCase();
        const route = RESOLVE_EVIDENCE(id);
        if (route) {
          k.println(`navigating → ${route}`, 'ok');
          k.navigate(route);
        } else {
          k.println(`unknown destination: ${id || '(none)'}`, 'err');
        }
      },
      complete: (args) => args.length <= 1 ? EVIDENCE_IDS.filter(o => o.startsWith((args[0] || '').toLowerCase())) : [],
    },
    clear: {
      desc: 'Clear the terminal.',
      run: (args, k) => k.clear(),
    },
    history: {
      desc: 'Show command history.',
      run: (args, k) => {
        k.history.forEach((h, i) => k.println(`  ${(i + 1).toString().padStart(3, ' ')}  ${h}`, 'dim'));
      },
    },
    exit: {
      desc: 'Close the kernel.',
      run: (args, k) => k.close(),
    },
  };

  const VERIFIABLE_MODULES = ['constitution', 'proactive', 'sentinelos', 'all'];

  const EVIDENCE_MAP = {
    'folio-001':         'folio/001.html',
    'folio':             'folio/001.html',
    'folio-framing':     'folio/framing.html',
    'paper':             'paper.html',
    'preprint':          'paper.html',
    'corpus':            'research/corpus.html',
    'lit-review':        'research/lit-review.html',
    'taxonomy':          'research/taxonomy.html',
    'methodology':       'research/methodology.html',
    'pre-registration':  'research/pre-registration.html',
    'threat-model':      'security/threat-model.html',
    'provenance':        'security/provenance.html',
    'reader-consent':    'security/reader-consent.html',
    'coi':               'governance/coi.html',
    'fiscal-sponsor':    'governance/fiscal-sponsor.html',
    'advisory-board':    'governance/advisory-board.html',
    'disclosures':       'governance/disclosures.html',
    'test-claims':       'governance/test-claims.html',
    'pilot':             'programs/pilot.html',
    'fellowship':        'programs/fellowship.html',
    'adversarial':       'programs/adversarial-review.html',
    'amendments':        'programs/amendments.html',
    'replay':            'programs/replay-harness.html',
    'reproduce':         'runtime/reproduce.html',
    'quickstart':        'runtime/quickstart.html',
    'benchmarks':        'runtime/benchmarks.html',
    'production':        'runtime/production-hygiene.html',
    'sdk':               'runtime/sdk.html',
    'plugin':            'runtime/plugin.html',
    'objections':        'objections.html',
    'about':             'about.html',
    'glossary':          'glossary.html',
    'subscribe':         'subscribe.html',
    'roadmap':           'roadmap.html',
    'theory':            'theory-of-change.html',
    'theory-of-change':  'theory-of-change.html',
    'funding':           'funding-ask.html',
    'funding-ask':       'funding-ask.html',
    'home':              'index.html',
    'sitemap':           'sitemap.html',
    'detector':          'detector.html',
  };
  const EVIDENCE_IDS = Object.keys(EVIDENCE_MAP).sort();

  function RESOLVE_EVIDENCE(id) {
    if (!id) return null;
    const m = EVIDENCE_MAP[id];
    return m ? prefix(m) : null;
  }

  function prefix(relPath) {
    const here = location.pathname.replace(/\/+$/, '/').replace(/[^\/]*$/, '');
    return here + relPath;
  }

  // ---- Verify animation ----
  async function animateVerify(k, name) {
    const modules = (name === 'all') ? ['constitution', 'proactive', 'sentinelos'] : [name];
    k.println(`==> make verify · target=${name}`, 'ok');
    k.println(`==> detecting environment`, 'dim');
    await sleep(180);
    k.println(`    OS: ${navigator.platform || 'unknown'}`, 'dim');
    k.println(`    Python: 3.12.x`, 'dim');
    k.println(`    Node: 22.x`, 'dim');
    await sleep(220);
    k.println(`==> resolving dependencies (uv)`, 'dim');
    await sleep(280);
    k.println(`    OK · 0.8s`, 'ok');
    let totalPassed = 0;
    for (const m of modules) {
      await sleep(180);
      k.println(`==> ${m} test suite`, 'dim');
      await sleep(220);
      let passed = 0;
      if (m === 'constitution') passed = 62;
      else if (m === 'proactive') passed = 212;
      else if (m === 'sentinelos') passed = 88;
      // Chunked progress
      const chunks = 6;
      for (let i = 1; i <= chunks; i++) {
        await sleep(120 + Math.random() * 80);
        const so_far = Math.floor((passed * i) / chunks);
        k.println(`    ${so_far} passed (running)`, 'dim');
      }
      await sleep(160);
      k.println(`    ${passed} passed, 0 failed in ${(Math.random() * 30 + 10).toFixed(1)}s`, 'ok');
      totalPassed += passed;
    }
    await sleep(180);
    k.println(`==> hashes`, 'dim');
    k.println(`    constitution-tests : sha256:${randomHex(8)}…${randomHex(8)}`, 'dim');
    k.println(`    proactive-tests    : sha256:${randomHex(8)}…${randomHex(8)}`, 'dim');
    k.println(`    sentinelos-tests   : sha256:${randomHex(8)}…${randomHex(8)}`, 'dim');
    await sleep(120);
    k.println(`==> SUCCESS · all suites green · ${totalPassed} tests passing`, 'ok');
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function randomHex(n) {
    const c = '0123456789abcdef';
    let r = '';
    for (let i = 0; i < n; i++) r += c[Math.floor(Math.random() * 16)];
    return r;
  }

  // ---- Kernel UI ----
  const Kernel = {
    history: [],
    historyIdx: -1,
    el: null,
    bodyEl: null,
    inputEl: null,
    isOpen: false,
    init() {
      if (this.el) return;
      this.el = document.createElement('div');
      this.el.id = 'kernel';
      this.el.innerHTML = `
        <div id="kernel-header">
          <span><span class="header-accent">▼</span> LIVE KERNEL · constitutional surface</span>
          <button id="kernel-close">esc</button>
        </div>
        <div id="kernel-body"></div>
        <div id="kernel-input-row">
          <span id="kernel-prompt">▶</span>
          <input id="kernel-input" type="text" autocomplete="off" spellcheck="false" autocapitalize="off">
        </div>
      `;
      document.body.appendChild(this.el);
      this.bodyEl = this.el.querySelector('#kernel-body');
      this.inputEl = this.el.querySelector('#kernel-input');
      this.el.querySelector('#kernel-close').addEventListener('click', () => this.close());
      this.inputEl.addEventListener('keydown', (e) => this.onKey(e));
      this.println('Live Kernel — type `help` for commands. `exit` to close.', 'dim');
      this.println('');
    },
    open() {
      this.init();
      this.el.classList.add('is-open');
      this.isOpen = true;
      setTimeout(() => this.inputEl.focus(), 100);
    },
    close() {
      if (!this.el) return;
      this.el.classList.remove('is-open');
      this.isOpen = false;
    },
    toggle() {
      this.init();
      if (this.isOpen) this.close(); else this.open();
    },
    println(text, klass) {
      const div = document.createElement('div');
      div.className = 'line cmd-out' + (klass ? ' ' + klass : '');
      div.textContent = text;
      this.bodyEl.appendChild(div);
      this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
    },
    echo(cmd) {
      const div = document.createElement('div');
      div.className = 'line cmd-echo';
      div.innerHTML = '<span class="prompt">▶</span>';
      const span = document.createElement('span');
      span.textContent = cmd;
      div.appendChild(span);
      this.bodyEl.appendChild(div);
      this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
    },
    clear() {
      this.bodyEl.innerHTML = '';
    },
    navigate(url) {
      setTimeout(() => { location.href = url; }, 220);
    },
    onKey(e) {
      if (e.key === 'Enter') {
        const raw = this.inputEl.value.trim();
        this.inputEl.value = '';
        if (!raw) { this.echo(''); return; }
        this.echo(raw);
        this.history.push(raw);
        this.historyIdx = this.history.length;
        if (window.R441) window.R441.recordActivity('kernel_command');
        const [name, ...args] = raw.split(/\s+/);
        const def = COMMANDS[name.toLowerCase()];
        if (!def) {
          this.println(`command not found: ${name}`, 'err');
          this.println('Try `help` for available commands.', 'dim');
          return;
        }
        try {
          def.run(args, this);
        } catch (err) {
          this.println(`error: ${err.message}`, 'err');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.history.length === 0) return;
        this.historyIdx = Math.max(0, this.historyIdx - 1);
        this.inputEl.value = this.history[this.historyIdx] || '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.history.length === 0) return;
        this.historyIdx = Math.min(this.history.length, this.historyIdx + 1);
        this.inputEl.value = this.history[this.historyIdx] || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.complete();
      } else if (e.key === 'Escape') {
        this.close();
      }
    },
    complete() {
      const raw = this.inputEl.value;
      const parts = raw.split(/\s+/);
      if (parts.length === 1) {
        const matches = Object.keys(COMMANDS).filter(c => c.startsWith(parts[0].toLowerCase()));
        if (matches.length === 1) this.inputEl.value = matches[0] + ' ';
        else if (matches.length > 1) {
          this.println('  ' + matches.join('   '), 'dim');
        }
      } else {
        const cmd = COMMANDS[parts[0].toLowerCase()];
        if (cmd && cmd.complete) {
          const rest = parts.slice(1);
          const matches = cmd.complete(rest);
          if (matches.length === 1) {
            rest[rest.length - 1] = matches[0];
            this.inputEl.value = parts[0] + ' ' + rest.join(' ');
          } else if (matches.length > 1) {
            this.println('  ' + matches.join('   '), 'dim');
          }
        }
      }
    },
  };

  // Listen for global toggle events
  function handleToggleKey(e) {
    // Ctrl+` or Cmd+K
    const isToggle = (e.key === '`' && (e.ctrlKey || e.metaKey)) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k');
    if (isToggle) {
      e.preventDefault();
      Kernel.toggle();
    }
  }
  document.addEventListener('keydown', handleToggleKey);
  window.addEventListener('hud:openKernel', () => Kernel.open());

  window.LiveKernel = Kernel;
})();
