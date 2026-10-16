(function () {
  const ensureSidebarVisible = () => {
    const sidebar = document.getElementById('mainControlPanel');
    const container = document.querySelector('.studio-container');
    if (sidebar) {
      sidebar.classList.remove('hidden');
      if (!sidebar.classList.contains('collapsed')) {
        sidebar.style.display = 'flex';
      }
      sidebar.style.flexDirection = 'column';
      sidebar.style.overflowY = 'auto';
      sidebar.style.maxHeight = '100%';
    }
    if (container && !container.classList.contains('sidebar-collapsed')) {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = '320px 1fr';
      container.style.height = 'calc(100vh - 52px)';
      container.style.overflow = 'hidden';
    }
  };

  const ensureButtonsVisible = () => {
    document.querySelectorAll('[data-model], [data-lang]').forEach((btn) => {
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.gap = '6px';
    });
  };

  const forceDefaultBroadcast = () => {
    const payload = () => {
      if (typeof window.dismissAppLoader === 'function') {
        window.dismissAppLoader();
      }
      const unmute = document.getElementById('unmuteBanner');
      if (unmute) unmute.classList.add('hidden');
      const main = document.getElementById('mainControlPanel');
      if (main) main.classList.remove('hidden');
    };

    setTimeout(payload, 150);
    setTimeout(payload, 800);
  };

  const init = () => {
    ensureSidebarVisible();
    ensureButtonsVisible();
    forceDefaultBroadcast();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FIXES = { ensureSidebarVisible, ensureButtonsVisible, forceDefaultBroadcast };
})();
