/* ===================================================================
   Truth Surface HUD — R-441 v1.1
   Local-session-only attestation. Opt-in default. No transmission.
   =================================================================== */

(function () {
  const STORAGE_KEY = 'r441_attestation_v1';
  const CONSENT_KEY = 'r441_consent_v1';

  // Pages weighted by epistemic weight: verifying surfaces earn more
  const PAGE_WEIGHTS = {
    'paper.html': 4,
    'detector.html': 6,            // running the detector is the strongest signal
    'research/corpus.html': 5,
    'research/pre-registration.html': 5,
    'research/lit-review.html': 3,
    'research/taxonomy.html': 3,
    'research/methodology.html': 3,
    'security/threat-model.html': 4,
    'security/provenance.html': 4,
    'security/reader-consent.html': 3,
    'runtime/reproduce.html': 5,
    'runtime/quickstart.html': 4,
    'runtime/benchmarks.html': 4,
    'runtime/production-hygiene.html': 2,
    'runtime/sdk.html': 3,
    'runtime/plugin.html': 3,
    'governance/coi.html': 4,
    'governance/disclosures.html': 4,
    'governance/fiscal-sponsor.html': 2,
    'governance/advisory-board.html': 2,
    'governance/test-claims.html': 3,
    'programs/pilot.html': 2,
    'programs/fellowship.html': 2,
    'programs/adversarial-review.html': 3,
    'programs/amendments.html': 2,
    'programs/replay-harness.html': 2,
    'folio/001.html': 5,
    'folio/framing.html': 4,
    'objections.html': 4,
    'about.html': 2,
    'glossary.html': 1,
    'roadmap.html': 3,
    'theory-of-change.html': 3,
    'funding-ask.html': 2,
    'subscribe.html': 1,
    'index.html': 3,             // homepage now hosts the Case Chamber — non-trivial dwell
    'sitemap.html': 1,
    '': 3,
  };

  const ACTIVITY_BONUS = {
    detector_scan: 8,            // each scan invocation
    amendment_proposed: 5,        // each amendment drafted
    amendment_submitted_upstream: 10, // GitHub issue prefilled
    kernel_command: 2,            // each command run
    case_card_opened: 3,          // each of 7 Golden Folio cards opened
    split_inspected: 2,           // each claim-vs-reality row expanded
    recon_step_ordered: 1,        // each reconstruction step correctly placed
    recon_completed: 6,           // full reconstruction chain assembled
    thread_node_hovered: 1,       // each golden thread node inspected
    apparatus_unlocked: 5,        // reaching the apparatus reveal threshold
  };

  function nowMs() { return Date.now(); }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (_) { return defaultState(); }
  }
  function defaultState() {
    return {
      visited: {},          // path -> { count, totalMs }
      activities: {},       // type -> count
      sessionStart: nowMs(),
      lastPageStart: nowMs(),
      lastPath: pathKey(),
      version: 1,
    };
  }
  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) { /* quota? */ }
  }
  function loadConsent() {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      if (v === 'on') return 'on';
      if (v === 'off') return 'off';
      return 'undecided';
    } catch (_) { return 'undecided'; }
  }
  function saveConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (_) { /* quota? */ }
  }
  function purge() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONSENT_KEY);
    } catch (_) { /* quota? */ }
  }

  function pathKey() {
    let p = location.pathname;
    if (p.endsWith('/')) p += 'index.html';
    return p.replace(/^\/+/, '').replace(/^.*coreyalejandro-site\//, '');
  }

  function pageWeight(p) {
    return PAGE_WEIGHTS[p] != null ? PAGE_WEIGHTS[p] : 1;
  }

  function score(state) {
    let s = 0;
    for (const [p, rec] of Object.entries(state.visited)) {
      const w = pageWeight(p);
      const seconds = (rec.totalMs || 0) / 1000;
      const dwell = Math.min(seconds / 8, 5);  // diminishing returns past 40s
      s += w * dwell;
    }
    for (const [k, n] of Object.entries(state.activities)) {
      s += (ACTIVITY_BONUS[k] || 0) * n;
    }
    return Math.round(s);
  }

  function band(score) {
    if (score >= 80) return 'high';
    if (score >= 25) return 'mid';
    return 'low';
  }

  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    return m + 'm';
  }

  let state = loadState();
  let consent = loadConsent();
  let consentBannerShown = false;
  let hudEl = null;
  let consentEl = null;
  let updateTimer = null;

  function attachHudDOM() {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.id = 'hud';
    hudEl.innerHTML = `
      <span class="hud-prompt">R-441 //</span>
      <span class="hud-stream"></span>
      <span class="hud-controls">
        <button data-action="kernel">Ctrl+\`</button>
        <button data-action="toggle">Hide</button>
        <button data-action="settings">⚙</button>
      </span>
    `;
    document.body.appendChild(hudEl);
    hudEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'toggle') hudEl.classList.toggle('is-hidden');
      else if (action === 'kernel') window.dispatchEvent(new CustomEvent('hud:openKernel'));
      else if (action === 'settings') openSettings();
    });

    // Consent banner
    consentEl = document.createElement('div');
    consentEl.id = 'hud-consent';
    consentEl.className = 'is-hidden';
    consentEl.innerHTML = `
      <div><strong>Reviewer Attestation R-441.</strong> This page can log your interactions
      with the manipulanda, the Deception Detector, and the Live Kernel into a local
      session-only record. Nothing is transmitted, nothing is retained beyond the session,
      nothing is shared. Off by default.</div>
      <div class="actions">
        <button class="primary" data-c="on">Turn R-441 on</button>
        <button data-c="off">Keep R-441 off</button>
      </div>
    `;
    document.body.appendChild(consentEl);
    consentEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-c]');
      if (!b) return;
      saveConsent(b.dataset.c);
      consent = b.dataset.c;
      consentEl.classList.add('is-hidden');
      if (consent === 'on') startTracking();
    });
  }

  function openSettings() {
    const opt = confirm(
      consent === 'on'
        ? 'R-441 is currently ON. Choose:\n\nOK = Purge attestation and turn OFF\nCancel = Keep ON, no changes'
        : 'R-441 is currently OFF. Choose:\n\nOK = Turn ON\nCancel = Keep OFF'
    );
    if (consent === 'on') {
      if (opt) {
        purge();
        consent = 'off';
        saveConsent('off');
        state = defaultState();
        renderHud();
      }
    } else {
      if (opt) {
        saveConsent('on');
        consent = 'on';
        state = loadState();
        startTracking();
      }
    }
  }

  function maybeShowConsent() {
    if (consent === 'undecided' && !consentBannerShown) {
      consentBannerShown = true;
      // Defer a couple of seconds so the page reads first
      setTimeout(() => {
        if (consent === 'undecided') consentEl.classList.remove('is-hidden');
      }, 2500);
    }
  }

  function startTracking() {
    if (updateTimer) clearInterval(updateTimer);
    state.sessionStart = state.sessionStart || nowMs();
    state.lastPageStart = nowMs();
    state.lastPath = pathKey();
    accruePage();
    saveState(state);
    updateTimer = setInterval(() => {
      accruePage();
      saveState(state);
      renderHud();
    }, 1000);
    renderHud();
  }

  function accruePage() {
    const p = state.lastPath;
    const now = nowMs();
    const delta = now - (state.lastPageStart || now);
    if (delta < 0 || delta > 5 * 60 * 1000) {
      // tab was hidden or system slept; cap
      state.lastPageStart = now;
      return;
    }
    if (!state.visited[p]) state.visited[p] = { count: 0, totalMs: 0 };
    state.visited[p].totalMs += delta;
    state.lastPageStart = now;
    // First-visit increment
    if (!state.visited[p].firstSeen) {
      state.visited[p].count = 1;
      state.visited[p].firstSeen = now;
    }
  }

  function renderHud() {
    if (!hudEl) return;
    const stream = hudEl.querySelector('.hud-stream');
    if (consent !== 'on') {
      stream.innerHTML = `<span class="key">status</span><span class="val">attestation off</span>
        <span class="sep">│</span>
        <span class="key">page</span><span class="val">${pathKey() || 'index.html'}</span>
        <span class="sep">│</span>
        <span class="key">tip</span><span class="val">enable via ⚙ to track epistemic weight</span>`;
      return;
    }
    const sc = score(state);
    const b = band(sc);
    const pagesVisited = Object.keys(state.visited).length;
    const sessSec = (nowMs() - state.sessionStart);
    const scans = state.activities.detector_scan || 0;
    const amends = state.activities.amendment_proposed || 0;
    const cmds = state.activities.kernel_command || 0;
    stream.innerHTML = `
      <span class="key">credibility</span><span class="val cred-${b}">${sc}</span>
      <span class="sep">│</span>
      <span class="key">pages</span><span class="val">${pagesVisited}</span>
      <span class="sep">│</span>
      <span class="key">session</span><span class="val">${fmt(sessSec)}</span>
      <span class="sep">│</span>
      <span class="key">page</span><span class="val">${state.lastPath || '—'}</span>
      <span class="sep">│</span>
      <span class="key">scans</span><span class="val">${scans}</span>
      <span class="sep">│</span>
      <span class="key">amendments</span><span class="val">${amends}</span>
      <span class="sep">│</span>
      <span class="key">cmds</span><span class="val">${cmds}</span>
    `;
  }

  function recordActivity(kind) {
    if (consent !== 'on') return;
    state.activities[kind] = (state.activities[kind] || 0) + 1;
    saveState(state);
    renderHud();
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  // Expose minimal global API for other modules
  window.R441 = {
    recordActivity,
    getState,
    getConsent: () => consent,
    purge: () => { purge(); state = defaultState(); consent = 'off'; renderHud(); },
  };

  document.addEventListener('DOMContentLoaded', () => {
    attachHudDOM();
    if (consent === 'on') startTracking();
    else renderHud();
    maybeShowConsent();
  });

  // Persist page-exit accrual
  window.addEventListener('beforeunload', () => {
    if (consent === 'on') {
      accruePage();
      saveState(state);
    }
  });
})();
