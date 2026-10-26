/* Single click/change router so every control works even if a setup listener failed. */
(function () {
  function fire(name, fn) {
    try { fn(); } catch (err) { console.error(name, err); }
  }

  function onClick(ev) {
    const t = ev.target.closest("button, .top-reporter-pill, .remote-pill, .tab-btn, .hub-chip, .unmute-banner");
    if (!t) return;

    if (t.classList.contains("unmute-banner") || t.id === "unmuteBanner") {
      t.classList.add("hidden");
      fire("unmute", () => { if (typeof startNewsBroadcast === "function") startNewsBroadcast(); });
      ev.preventDefault();
      return;
    }

    if (t.dataset && t.dataset.model) {
      fire("model", () => {
        if (typeof switchPresenterModel === "function") switchPresenterModel(t.dataset.model);
      });
      ev.stopPropagation();
      return;
    }
    if (t.dataset && t.dataset.lang) {
      fire("lang", () => {
        if (typeof switchBroadcastLanguage === "function") switchBroadcastLanguage(t.dataset.lang);
      });
      ev.stopPropagation();
      return;
    }
    if (t.dataset && t.dataset.tab) {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === t.dataset.tab));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.toggle("active", c.id === t.dataset.tab));
      ev.stopPropagation();
      return;
    }
    if (t.dataset && t.dataset.query) {
      fire("chip", () => {
        const input = document.getElementById("hubChatInput");
        if (input) input.value = t.dataset.query;
        if (typeof handleHubChatQuery === "function") handleHubChatQuery(t.dataset.query);
      });
      ev.stopPropagation();
      return;
    }

    const id = t.id;
    const map = {
      startSpeechBtn: () => { if (typeof startNewsBroadcast === "function") startNewsBroadcast(); },
      pauseSpeechBtn: () => { if (typeof pauseNewsBroadcast === "function") pauseNewsBroadcast(); },
      stopSpeechBtn: () => { if (typeof stopNewsBroadcast === "function") stopNewsBroadcast(); },
      nextNewsBtn: () => { if (typeof playNextNewsStory === "function") playNextNewsStory(); },
      loadCustomBtn: () => {
        const title = (document.getElementById("customNewsTitle")?.value || "").trim() || "Custom Breaking Story";
        const script = (document.getElementById("customNewsBody")?.value || "").trim();
        if (!script) { alert("Enter a news script first"); return; }
        if (typeof loadStoryIntoTeleprompter === "function") {
          loadStoryIntoTeleprompter({ title, script, category: "Custom Script" });
        }
        if (typeof startNewsBroadcast === "function") startNewsBroadcast();
      },
      sendAiChatBtn: () => { if (typeof handleAiChatQuery === "function") handleAiChatQuery(); },
      liveChatSendBtn: () => { if (typeof handleAiChatQuery === "function") handleAiChatQuery(); },
      hubSendBtn: () => {
        const q = document.getElementById("hubChatInput")?.value;
        if (typeof handleHubChatQuery === "function") handleHubChatQuery(q);
      },
      fetchRssBtn: () => { if (typeof fetchRssFeed === "function") fetchRssFeed(); },
      toggleRevealBtn: () => { if (typeof toggleChannelReveal === "function") toggleChannelReveal(); },
      editBrandBtn: () => document.getElementById("brandModal")?.classList.remove("hidden"),
      closeBrandModalBtn: () => document.getElementById("brandModal")?.classList.add("hidden"),
      saveBrandBtn: () => { if (typeof saveBrandingSettings === "function") saveBrandingSettings(); },
      devModeToggleBtn: () => { if (typeof toggleDeveloperMode === "function") toggleDeveloperMode(); },
      snapThumbnailBtn: () => { if (typeof downloadYouTubeThumbnail === "function") downloadYouTubeThumbnail(); },
      recordBtn: () => { if (typeof toggleRecording === "function") toggleRecording(); },
      stopRecordBtn: () => { if (typeof toggleRecording === "function") toggleRecording(); },
      downloadVideoBtn: () => { if (typeof downloadBroadcastVideo === "function") downloadBroadcastVideo(); },
      uploadToYouTubeBtn: () => { if (typeof uploadBroadcastToYouTubeChannel === "function") uploadBroadcastToYouTubeChannel(); },
      generateAiVideoBtn: () => { if (typeof generateAiMotionVideo === "function") generateAiMotionVideo(); },
      fullscreenBtn: () => {
        const elem = document.getElementById("canvasWrapper");
        if (!elem) return;
        if (!document.fullscreenElement) elem.requestFullscreen().catch(() => {});
        else document.exitFullscreen();
      },
      viewModeBroadcastBtn: () => {
        document.getElementById("viewModeBroadcastBtn")?.classList.add("active");
        document.getElementById("viewModeAiChatBtn")?.classList.remove("active");
        document.getElementById("canvasWrapper")?.classList.remove("hidden");
        document.getElementById("aiChatHubViewport")?.classList.add("hidden");
      },
      viewModeAiChatBtn: () => {
        document.getElementById("viewModeAiChatBtn")?.classList.add("active");
        document.getElementById("viewModeBroadcastBtn")?.classList.remove("active");
        document.getElementById("aiChatHubViewport")?.classList.remove("hidden");
        document.getElementById("canvasWrapper")?.classList.add("hidden");
      },
      sidebarToggleBtn: () => {
        document.getElementById("mainControlPanel")?.classList.toggle("collapsed");
        document.getElementById("studioContainer")?.classList.toggle("sidebar-collapsed");
      }
    };

    if (id && map[id]) {
      fire(id, map[id]);
      ev.stopPropagation();
    }
  }

  function onChange(ev) {
    const t = ev.target;
    if (!t || !t.id) return;
    if (t.id === "newsCategorySelect" && typeof loadNewsCategory === "function") loadNewsCategory(t.value);
    if (t.id === "languageSelect" && typeof switchBroadcastLanguage === "function") switchBroadcastLanguage(t.value);
    if (t.id === "anchorModelSelect" && typeof switchPresenterModel === "function") switchPresenterModel(t.value);
    if (t.id === "studioBgSelect" && typeof state !== "undefined") state.studioBg = t.value;
    if (t.id === "studioLightingSelect" && typeof state !== "undefined") state.lightingTheme = t.value;
    if (t.id === "voiceGenderSelect" && typeof initSpeechSynthesis === "function") {
      initSpeechSynthesis();
      if (typeof state !== "undefined" && state.isSpeaking && typeof startNewsBroadcast === "function") startNewsBroadcast();
    }
    if (t.id === "subtitleStyleSelect") {
      if (typeof state !== "undefined") state.subtitleStyle = t.value;
      const box = document.getElementById("teleprompterSubtitleBox");
      if (box) box.className = "subtitle-overlay style-" + t.value;
    }
    if (t.id === "aspectRatioSelect" && typeof state !== "undefined") {
      state.aspectRatio = t.value;
      if (typeof initCanvas === "function") initCanvas();
    }
  }

  document.addEventListener("click", onClick, true);
  document.addEventListener("change", onChange, true);
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      if (ev.target && (ev.target.id === "liveChatInput" || ev.target.id === "aiChatInput" || ev.target.id === "hubChatInput")) {
        ev.preventDefault();
        if (typeof handleAiChatQuery === "function") handleAiChatQuery();
      }
    }
  });
  window.bindStudioDelegation = function () {};
})();
