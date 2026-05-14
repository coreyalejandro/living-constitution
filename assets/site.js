/* ===================================================================
   Site shared JS — active nav highlighting, light helpers.
   Other modules (hud.js, kernel.js, detector.js, amendments.js)
   load in parallel and run independently.
   =================================================================== */

(function () {
  function currentRelPath() {
    let p = location.pathname;
    if (p.endsWith('/')) p += 'index.html';
    // Normalize to relative form vs. site root
    return p.replace(/^\/+/, '').replace(/^.*coreyalejandro-site\//, '');
  }

  function markActiveNav() {
    const here = currentRelPath();
    document.querySelectorAll('.topbar-link').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      const normalized = href.replace(/^\.\.?\/+/, '');
      if (here === normalized || here.startsWith(normalized.replace(/index\.html$/, ''))) {
        a.classList.add('is-active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    markActiveNav();
  });
})();
