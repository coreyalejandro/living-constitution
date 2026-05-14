/* ===================================================================
   Amendment Commits
   Reader highlights a sentence on an operational page, clicks
   "Propose Amendment," writes a diff, optionally opens a pre-filled
   GitHub Issue for upstream consideration. Local proposals stored in
   localStorage and visible on /programs/amendments.html.
   =================================================================== */

(function () {
  const STORAGE_KEY = 'amendment_proposals_v1';
  const GITHUB_OWNER = 'coreyalejandro';   // placeholder; author updates on deploy
  const GITHUB_REPO  = 'living-constitution';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (_) {}
  }
  function add(proposal) {
    const list = load();
    list.unshift(proposal);
    save(list.slice(0, 50));   // cap at 50
    return proposal;
  }

  let toolbar, modal;
  let lastSelection = null;

  function attachToolbarOnce() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.className = 'amend-toolbar is-hidden';
    toolbar.textContent = '✎ Propose Amendment';
    document.body.appendChild(toolbar);
    toolbar.addEventListener('click', () => openModal(lastSelection));
  }

  function attachModalOnce() {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'amend-modal-bg is-hidden';
    modal.innerHTML = `
      <div class="amend-modal">
        <h3>Stage an Amendment</h3>
        <p class="lede">Propose a reframing for the selected text. Local-only by default; you can optionally open a pre-filled GitHub Issue.</p>
        <label>Original</label>
        <div class="original" data-role="original"></div>
        <label>Proposed</label>
        <textarea data-role="proposed" rows="4" placeholder="Your reframing…"></textarea>
        <label>Rationale</label>
        <textarea data-role="rationale" rows="3" placeholder="One or two sentences. What does this amendment do?"></textarea>
        <div class="actions">
          <button class="cancel" data-act="cancel">Cancel</button>
          <button data-act="github">Open as GitHub Issue</button>
          <button class="primary" data-act="save">Save locally</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'cancel') closeModal();
      else if (act === 'save') saveProposal(false);
      else if (act === 'github') saveProposal(true);
    });
  }

  function openModal(selection) {
    attachModalOnce();
    modal.querySelector('[data-role="original"]').textContent = selection?.text || '';
    modal.querySelector('[data-role="proposed"]').value = '';
    modal.querySelector('[data-role="rationale"]').value = '';
    modal.classList.remove('is-hidden');
    setTimeout(() => modal.querySelector('[data-role="proposed"]').focus(), 100);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.add('is-hidden');
  }

  function currentPath() {
    let p = location.pathname;
    if (p.endsWith('/')) p += 'index.html';
    return p.replace(/^\/+/, '').replace(/^.*coreyalejandro-site\//, '');
  }

  function saveProposal(openGithub) {
    const original = modal.querySelector('[data-role="original"]').textContent.trim();
    const proposed = modal.querySelector('[data-role="proposed"]').value.trim();
    const rationale = modal.querySelector('[data-role="rationale"]').value.trim();
    if (!proposed) {
      alert('Please write a proposed reframing.');
      return;
    }
    const p = {
      id: 'A-' + Date.now().toString(36).toUpperCase(),
      page: currentPath(),
      original,
      proposed,
      rationale,
      proposed_at: new Date().toISOString(),
      source: 'local',
    };
    add(p);
    if (window.R441) window.R441.recordActivity('amendment_proposed');

    if (openGithub) {
      const title = `Amendment proposal · ${p.id} · /${p.page}`;
      const body = [
        `**Page:** \`/${p.page}\``,
        ``,
        `**Original:**`,
        `> ${original.replace(/\n/g, '\n> ')}`,
        ``,
        `**Proposed reframing:**`,
        `> ${proposed.replace(/\n/g, '\n> ')}`,
        ``,
        `**Rationale:**`,
        rationale || '_(none provided)_',
        ``,
        `---`,
        `_Submitted from the Live Kernel · Constitutional Amendment surface._`,
        `_Local proposal id: ${p.id}_`,
      ].join('\n');
      const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=amendment-proposal`;
      window.open(url, '_blank', 'noopener,noreferrer');
      if (window.R441) window.R441.recordActivity('amendment_submitted_upstream');
    }
    closeModal();
    flashConfirmation(`Amendment ${p.id} staged${openGithub ? ' & GitHub Issue opened' : ' locally'}.`);
  }

  function flashConfirmation(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; bottom: 56px; left: 50%; transform: translateX(-50%);
      background: var(--ink, #1a1714); color: var(--paper, #f4f1ea);
      padding: 10px 18px; border-radius: 3px; z-index: 350;
      font-family: monospace; font-size: 12px; letter-spacing: 0.06em;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function onSelectionChange() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      toolbar?.classList.add('is-hidden');
      lastSelection = null;
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 12 || text.length > 600) {
      toolbar?.classList.add('is-hidden');
      lastSelection = null;
      return;
    }
    // Only on operational pages (skip if no op-content parent)
    const anchor = sel.anchorNode?.parentElement;
    if (!anchor) return;
    const opContent = anchor.closest('.op-content');
    if (!opContent) {
      toolbar?.classList.add('is-hidden');
      lastSelection = null;
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    attachToolbarOnce();
    toolbar.classList.remove('is-hidden');
    toolbar.style.top = (window.scrollY + rect.top - 36) + 'px';
    toolbar.style.left = (window.scrollX + rect.right - 200) + 'px';
    lastSelection = { text, range };
  }

  document.addEventListener('DOMContentLoaded', () => {
    attachToolbarOnce();
    attachModalOnce();
    document.addEventListener('selectionchange', onSelectionChange);
  });

  window.Amendments = { load, save, add };
})();
