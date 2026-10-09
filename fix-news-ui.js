(function () {
  const ensureOnce = () => {
    const aside = document.getElementById('mainControlPanel');
    const root = document.querySelector('.studio-container');
    if (aside) {
      aside.classList.remove('hidden');
      aside.style.display = 'flex';
      aside.style.flexDirection = 'column';
      aside.style.overflowY = 'auto';
      aside.style.maxHeight = '100%';
      aside.style.paddingRight = '6px';
    }
    if (root) {
      root.style.display = 'grid';
      root.style.gridTemplateColumns = '320px 1fr';
      root.style.gap = '12px';
      root.style.height = 'calc(100vh - 52px)';
      root.style.width = '100vw';
      root.style.maxWidth = '100%';
      root.style.padding = '8px 12px 8px 6px';
      root.style.overflow = 'hidden';
      root.style.transition = 'all 0.3s ease';
    }

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
    });

    document.querySelectorAll('.tab-content').forEach((tab) => {
      tab.style.display = tab.id === 'preset-feed' ? 'block' : 'none';
    });

    const currentTab = document.querySelector('.tab-btn.active');
    if (currentTab) {
      const tabToShow = document.getElementById(currentTab.dataset.tab);
      if (tabToShow) tabToShow.style.display = 'block';
    }
  };

  function activateDefaultBroadcast() {
    if (!window.__newsFixActivated) {
      window.__newsFixActivated = true;
      setTimeout(() => {
        const appReady = !!(window.switchPresenterModel && window.switchBroadcastLanguage && window.startNewsBroadcast);
        if (!appReady) return;

        const currentSelectedLanguage = document.getElementById('languageSelect');
        if (currentSelectedLanguage) currentSelectedLanguage.value = 'hi-IN';
        if (window.switchBroadcastLanguage) window.switchBroadcastLanguage('hi-IN');

        const currentModel = document.getElementById('anchorModelSelect');
        if (currentModel) currentModel.value = 'nexus_3d';
        if (window.switchPresenterModel) window.switchPresenterModel('nexus_3d');

        const unmuteBanner = document.getElementById('unmuteBanner');
        if (unmuteBanner) unmuteBanner.classList.add('hidden');
      }, 250);
    }
  }

  function bindPillClicks() {
    document.querySelectorAll('[data-model]').forEach((btn) => {
      btn.onclick = function () {
        if (window.switchPresenterModel) {
          window.switchPresenterModel(btn.dataset.model);
        }
      };
    });

    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.onclick = function () {
        if (window.switchBroadcastLanguage) {
          window.switchBroadcastLanguage(btn.dataset.lang);
        }
      };
    });
  }

  const bootstrap = () => {
    ensureOnce();
    bindPillClicks();
    activateDefaultBroadcast();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  window.addEventListener('load', () => {
    ensureOnce();
    activateDefaultBroadcast();
  });
})();
