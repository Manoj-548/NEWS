/* Language-true voices, mic chat, daily world news, YouTube video package */
(function () {
  function toast(m) { if (typeof studioToast === "function") studioToast(m); else console.log(m); }

  function isFemaleName(name) {
    return /female|zira|samantha|victoria|susan|hazel|heera|swara|kalpana|priya|kendra|linda|veena|moira|fiona|karen|tessa|nicky|aria|sonia|raveena|eva|catherine|hazel|google uk english female|microsoft heera|heera|zira|woman/i.test(name);
  }
  function isMaleName(name) {
    return /male|david|mark|ravi|daniel|fred|alex|george|james|hemant|sean|thomas|richard|microsoft ravi|google uk english male|man\b/i.test(name);
  }

  window.pickVoiceForLanguage = function (lang, gender) {
    const voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    if (!voices.length) return null;
    const code = (lang || "en-US").toLowerCase();
    const short = code.split("-")[0];
    const exact = voices.filter((v) => v.lang.toLowerCase() === code);
    const prefix = voices.filter((v) => v.lang.toLowerCase().startsWith(short));
    const pool = exact.length ? exact : (prefix.length ? prefix : voices);
    const wantF = gender === "female";
    const gendered = pool.filter((v) => {
      if (v.gender === "female") return wantF;
      if (v.gender === "male") return !wantF;
      return wantF ? isFemaleName(v.name) : isMaleName(v.name);
    });
    const rest = pool.filter((v) => (wantF ? !isMaleName(v.name) : !isFemaleName(v.name)));
    return gendered[0] || rest[0] || pool[0] || voices[0];
  };

  const _oldInitSpeech = window.initSpeechSynthesis;
  window.initSpeechSynthesis = function () {
    if (!window.speechSynthesis) return;
    function populate() {
      state.availableVoices = speechSynthesis.getVoices() || [];
      const gender = document.getElementById("voiceGenderSelect")?.value || getAnchorProfile?.(state.anchorModel)?.gender || "male";
      const lang = state.currentLanguage || document.getElementById("languageSelect")?.value || "hi-IN";
      const picked = window.pickVoiceForLanguage(lang, gender);
      state.currentVoice = picked;
      const voiceSelect = document.getElementById("voiceSelect");
      if (!voiceSelect) return;
      voiceSelect.innerHTML = "";
      const short = (lang || "en").split("-")[0].toLowerCase();
      const list = state.availableVoices.filter((v) => v.lang.toLowerCase().startsWith(short));
      (list.length ? list : state.availableVoices).forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        if (picked && v.name === picked.name) opt.selected = true;
        voiceSelect.appendChild(opt);
      });
    }
    populate();
    speechSynthesis.onvoiceschanged = populate;
  };

  const _oldSwitchLang = window.switchBroadcastLanguage;
  window.switchBroadcastLanguage = function (lang) {
    state.currentLanguage = lang;
    const langSelect = document.getElementById("languageSelect");
    if (langSelect && langSelect.value !== lang) langSelect.value = lang;
    document.querySelectorAll("[data-lang]").forEach((p) => p.classList.toggle("active", p.dataset.lang === lang));
    const lab = document.getElementById("currentLangLabel");
    const pill = document.querySelector(`#quickLangPills [data-lang="${lang}"]`);
    if (lab) lab.textContent = pill ? pill.textContent.trim() : lang;
    window.initSpeechSynthesis();
    if (typeof translateStoryScript === "function" && state.currentStory) {
      translateStoryScript(state.currentStory, lang);
    }
    const gender = document.getElementById("voiceGenderSelect")?.value || getAnchorProfile?.(state.anchorModel)?.gender || "male";
    state.currentVoice = window.pickVoiceForLanguage(lang, gender);
    if (state.userHasStarted || state.isSpeaking) {
      if (typeof startNewsBroadcast === "function") startNewsBroadcast();
    }
    toast("Language: " + lang + (state.currentVoice ? " · " + state.currentVoice.name : ""));
  };

  window.startVoiceChat = function () {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      toast("Voice chat needs Chrome / Edge on localhost");
      return;
    }
    try {
      if (state._rec) { try { state._rec.stop(); } catch (e) {} }
      const rec = new Rec();
      rec.lang = state.currentLanguage || "en-IN";
      rec.interimResults = true;
      rec.continuous = false;
      const box = document.getElementById("liveChatInput") || document.getElementById("hubChatInput");
      rec.onstart = () => {
        state.listening = true;
        const b = document.getElementById("voiceChatBtn");
        if (b) b.classList.add("listening");
        toast("Listening… speak your news question");
      };
      rec.onresult = (ev) => {
        let text = "";
        for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
        if (box) box.value = text;
        if (ev.results[ev.results.length - 1].isFinal) {
          if (typeof handleHubChatQuery === "function") handleHubChatQuery(text);
        }
      };
      rec.onerror = () => toast("Mic error — allow microphone in the browser");
      rec.onend = () => {
        state.listening = false;
        document.getElementById("voiceChatBtn")?.classList.remove("listening");
      };
      state._rec = rec;
      rec.start();
    } catch (err) {
      toast("Could not start microphone");
    }
  };

  function storyFromRssItem(item, category) {
    const title = (item.title || "Live news").replace(/<[^>]*>/g, "").trim();
    let desc = (item.description || item.content || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (desc.length > 420) desc = desc.slice(0, 417) + "…";
    const script = `Good evening. ${title}. ${desc || "Details are still coming in from the newsroom."}`;
    return { id: "live_" + Date.now() + Math.random(), title, category: category || "Live World Desk", script };
  }

  window.ingestLiveWorldNews = async function () {
    const status = document.getElementById("liveNewsStatus");
    if (status) status.textContent = "Fetching live wires…";
    const feeds = [
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
      "https://feeds.bbci.co.uk/news/world/rss.xml"
    ];
    const stories = [];
    for (const rss of feeds) {
      try {
        const api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rss);
        const res = await fetch(api);
        const data = await res.json();
        (data.items || []).slice(0, 6).forEach((it) => stories.push(storyFromRssItem(it, data.feed?.title || "World Desk")));
      } catch (e) {
        console.warn("feed fail", rss, e);
      }
    }
    if (!stories.length) {
      if (status) status.textContent = "Live wire offline — using desk copy";
      toast("Live news unavailable right now");
      return;
    }
    presetNewsData.live_world = stories;
    const sel = document.getElementById("newsCategorySelect");
    if (sel && !sel.querySelector('option[value="live_world"]')) {
      const opt = document.createElement("option");
      opt.value = "live_world";
      opt.textContent = "🌍 Live World Wire (today)";
      sel.insertBefore(opt, sel.firstChild);
    }
    if (sel) sel.value = "live_world";
    if (typeof loadNewsCategory === "function") loadNewsCategory("live_world");
    if (status) status.textContent = stories.length + " live stories ingested";
    toast("Ingested " + stories.length + " live headlines");
  };

  window.makeYouTubeNewsVideo = function () {
    if (typeof startNewsBroadcast === "function" && !state.isSpeaking) startNewsBroadcast();
    if (typeof downloadBroadcastVideo === "function") {
      downloadBroadcastVideo();
    } else if (typeof toggleRecording === "function") {
      toggleRecording();
    }
    const story = state.currentStory || {};
    const meta = [
      "TITLE: " + (story.title || "NEXUS NEWS 24 LIVE"),
      "CHANNEL: " + (state.channelName || "NEXUS NEWS 24"),
      "LANGUAGE: " + (state.currentLanguage || "en"),
      "ANCHOR: " + (getAnchorProfile?.(state.anchorModel)?.name || "Desk"),
      "",
      "DESCRIPTION:",
      story.script || state.scriptText || "",
      "",
      "TAGS: news, breaking, india, world, AI, youtube, nexus"
    ].join("\n");
    const blob = new Blob([meta], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "YouTube_News_Package_" + Date.now() + ".txt";
    a.click();
    toast("Recording video + YouTube title/description");
  };

  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("button");
    if (!t) return;
    if (t.id === "voiceChatBtn") { ev.stopPropagation(); window.startVoiceChat(); }
    if (t.id === "ingestNewsBtn") { ev.stopPropagation(); window.ingestLiveWorldNews(); }
    if (t.id === "makeYtVideoBtn") { ev.stopPropagation(); window.makeYouTubeNewsVideo(); }
  }, true);

  window.addEventListener("load", () => {
    setTimeout(() => { try { window.initSpeechSynthesis(); } catch (e) {} }, 400);
    setTimeout(() => { try { window.ingestLiveWorldNews(); } catch (e) {} }, 1200);
  });
})();
