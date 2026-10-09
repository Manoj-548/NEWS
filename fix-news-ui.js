(function () {
  const ensureSidebarVisible = () => {
    const sidebar = document.getElementById('mainControlPanel');
    const container = document.querySelector('.studio-container');
    if (sidebar) {
      sidebar.classList.remove('hidden');
      sidebar.style.display = 'flex';
      sidebar.style.flexDirection = 'column';
      sidebar.style.overflowY = 'auto';
      sidebar.style.maxHeight = '100%';
      sidebar.style.minWidth = '290px';
      sidebar.style.width = '320px';
      sidebar.style.scrollbarWidth = 'thin';
    }
    if (container) {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = '320px 1fr';
      container.style.gap = '12px';
      container.style.height = 'calc(100vh - 52px)';
      container.style.overflow = 'hidden';
      container.style.padding = '8px 12px 8px 6px';
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

  const bindSelectionHandlers = () => {
    document.querySelectorAll('[data-model]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof window.switchPresenterModel === 'function') {
          window.switchPresenterModel(btn.dataset.model);
        }
      });
    });

    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof window.switchBroadcastLanguage === 'function') {
          window.switchBroadcastLanguage(btn.dataset.lang);
        }
      });
    });
  };

  const forceDefaultBroadcast = () => {
    const payload = () => {
      if (typeof window.switchPresenterModel === 'function') {
        window.switchPresenterModel('nexus_3d');
      }
      if (typeof window.switchBroadcastLanguage === 'function') {
        window.switchBroadcastLanguage('hi-IN');
      }
      const unmute = document.getElementById('unmuteBanner');
      if (unmute) unmute.classList.add('hidden');
      const main = document.getElementById('mainControlPanel');
      if (main) main.classList.remove('hidden');
    };

    setTimeout(payload, 150);
    setTimeout(payload, 700);
  };

  const init = () => {
    ensureSidebarVisible();
    ensureButtonsVisible();
    bindSelectionHandlers();
    forceDefaultBroadcast();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FIXES = { ensureSidebarVisible, ensureButtonsVisible, bindSelectionHandlers, forceDefaultBroadcast };
})();
