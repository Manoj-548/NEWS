/* Video Studio — presenter PIP, AI news B-roll, crop/cut/paste, download, YouTube */
(function () {
  const vs = {
    open: false,
    playing: false,
    cropMode: false,
    cropDrag: null,
    playhead: 0,
    lastTs: 0,
    clips: [],
    selected: -1,
    clipboard: null,
    generating: 0,
    rec: null,
    chunks: [],
    raf: 0
  };

  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    if (typeof window.toast === "function") window.toast(msg);
    const el = $("vsStatus");
    if (el) el.textContent = msg;
  }
  function uid() { return "c" + Date.now().toString(36) + Math.floor(Math.random() * 999); }
  function story() {
    return (typeof state !== "undefined" && state.currentStory) ? state.currentStory : { title: "AI NEWS TONIGHT", script: "Good evening. This is the AI news desk." };
  }
  function profile() {
    const id = (typeof state !== "undefined" && state.anchorModel) || "nova_kade";
    if (typeof getAnchorProfile === "function") return getAnchorProfile(id);
    return { id: id, name: "Anchor", asset: null, color: "#00d2ff" };
  }
  function presenterImg() {
    const p = profile();
    if (!p.asset || typeof assetImages === "undefined") return null;
    const img = assetImages[p.asset];
    if (img && img.complete && img.naturalWidth) return img;
    return null;
  }
  function clipLen(c) { return Math.max(0.2, (c.outPoint - c.inPoint)); }
  function totalDur() {
    let t = 0;
    vs.clips.forEach(function (c) { t += clipLen(c); });
    return Math.max(0.01, t);
  }
  function clipAt(time) {
    let t = 0;
    for (let i = 0; i < vs.clips.length; i++) {
      const L = clipLen(vs.clips[i]);
      if (time < t + L) return { clip: vs.clips[i], index: i, local: time - t };
      t += L;
    }
    if (vs.clips.length) {
      const last = vs.clips[vs.clips.length - 1];
      return { clip: last, index: vs.clips.length - 1, local: clipLen(last) };
    }
    return null;
  }

  const PEOPLE = [
    ["nova_kade", "Kade Nova"],
    ["lyra_nova", "Lyra Nova"],
    ["arjun_mehra", "Arjun Mehra"],
    ["priya_nair", "Priya Nair"],
    ["rajesh_sharma", "Rajesh Sharma"],
    ["meera_kapoor", "Meera Kapoor"],
    ["alexander_hayes", "Alexander Hayes"],
    ["sofia_reyes", "Sofia Reyes"],
    ["marcus_cole", "Marcus Cole"]
  ];

  function setModeTabs(which) {
    ["viewModeBroadcastBtn", "viewModeAiChatBtn", "viewModeStudioBtn"].forEach(function (id) {
      const el = $(id);
      if (el) el.classList.toggle("active", id === which);
    });
  }

  function fitCanvas() {
    const stage = document.querySelector("#videoStudioScreen .vs-stage");
    const canvas = $("vsCanvas");
    if (!stage || !canvas) return;
    const w = Math.max(640, Math.floor(stage.clientWidth) || 1280);
    const h = Math.max(360, Math.floor(stage.clientHeight) || 720);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function renderPills() {
    const box = $("vsPresenterPills");
    if (!box) return;
    const cur = (typeof state !== "undefined" && state.anchorModel) || "nova_kade";
    box.innerHTML = "";
    PEOPLE.forEach(function (p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vs-pill" + (p[0] === cur ? " active" : "");
      b.textContent = p[1];
      b.onclick = function () {
        if (typeof switchPresenterModel === "function") switchPresenterModel(p[0]);
        renderPills();
        toast(p[1] + " — press Play presenter");
      };
      box.appendChild(b);
    });
  }

  function openStudio() {
    const screen = $("videoStudioScreen");
    if (!screen) return;
    setModeTabs("viewModeStudioBtn");
    $("canvasWrapper")?.classList.add("hidden");
    $("aiChatHubViewport")?.classList.add("hidden");
    document.body.classList.add("vs-open");
    screen.classList.remove("hidden");
    screen.setAttribute("aria-hidden", "false");
    vs.open = true;
    vs.lastTs = 0;
    renderPills();
    renderBin();
    renderTimeline();
    fitCanvas();
    toast("Video Studio — World news + video pulls a clip and the presenter reads it");
    if (!vs.raf) loop(0);
  }
  function hideStudio() {
    vs.open = false;
    vs.playing = false;
    document.body.classList.remove("vs-open");
    if (vs.raf) cancelAnimationFrame(vs.raf);
    vs.raf = 0;
    const screen = $("videoStudioScreen");
    if (screen) {
      screen.classList.add("hidden");
      screen.setAttribute("aria-hidden", "true");
    }
  }
  function closeStudio() {
    hideStudio();
    setModeTabs("viewModeBroadcastBtn");
    $("canvasWrapper")?.classList.remove("hidden");
    $("aiChatHubViewport")?.classList.add("hidden");
  }
  window.openVideoStudio = openStudio;
  window.closeVideoStudio = closeStudio;
  window.hideVideoStudio = hideStudio;

  function seedAiClip(markNew) {
    const s = story();
    vs.clips.push({
      id: uid(),
      type: "ai",
      name: (s.title || "AI News").slice(0, 42),
      duration: 16,
      inPoint: 0,
      outPoint: 16,
      crop: { x: 0, y: 0, w: 1, h: 1 },
      video: null,
      fresh: !!markNew
    });
    vs.selected = vs.clips.length - 1;
  }

  const FALLBACK_VIDEOS = [
    "/assets/fallback_broll.mp4",
    "/assets/fallback_broll.webm",
    "https://images-assets.nasa.gov/video/GSFC_20161116_Climate_m12426_Change/GSFC_20161116_Climate_m12426_Change~mobile.mp4"
  ];

  function bgEl() { return $("vsBgVideo"); }

  function playBg(src) {
    const el = bgEl();
    if (!el || !src) return;
    el.crossOrigin = "anonymous";
    el.muted = true;
    el.defaultMuted = true;
    el.loop = true;
    el.playsInline = true;
    el.autoplay = true;
    if (el.getAttribute("data-src") !== src) {
      el.setAttribute("data-src", src);
      el.src = src;
      try { el.load(); } catch (e) {}
    }
    if (vs.playing) {
      const p = el.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      try { el.pause(); } catch (e2) {}
    }
  }

  function commitFileClip(vid, name) {
    const dur = isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 12;
    vs.clips = vs.clips.filter(function (c) { return !c.auto; });
    vs.clips.unshift({
      id: uid(),
      type: "file",
      auto: true,
      name: (name || "World news").slice(0, 42),
      duration: dur,
      inPoint: 0,
      outPoint: dur,
      crop: { x: 0, y: 0, w: 1, h: 1 },
      video: vid
    });
    vs.selected = 0;
    vs.playhead = 0;
    vs._flowId = null;
    renderBin();
    renderTimeline();
  }

  function addRemoteClip(src, name, timeoutMs) {
    playBg(src);
    return new Promise(function (resolve) {
      const vid = bgEl() || document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "auto";
      let settled = false;
      const done = function (ok) {
        if (settled) return;
        settled = true;
        vid.onloadedmetadata = null;
        vid.oncanplay = null;
        vid.onerror = null;
        if (!ok) { resolve(false); return; }
        commitFileClip(vid, name);
        try { vid.play().catch(function () {}); } catch (e) {}
        resolve(true);
      };
      if (vid.readyState >= 2 && vid.videoWidth && vid.getAttribute("data-src") === src) {
        done(true);
        return;
      }
      vid.onloadedmetadata = function () { done(true); };
      vid.oncanplay = function () { if (vid.videoWidth) done(true); };
      vid.onerror = function () { done(false); };
      setTimeout(function () {
        if (!settled) done(!!(vid.videoWidth || (isFinite(vid.duration) && vid.duration > 0)));
      }, timeoutMs || 5000);
    });
  }

  async function placeFirstVideo(urls, name) {
    for (let i = 0; i < urls.length; i++) {
      const ok = await addRemoteClip(urls[i], name, 4000);
      if (ok) return true;
    }
    playBg(urls[0]);
    const vid = bgEl();
    if (vid) commitFileClip(vid, name);
    return !!vid;
  }

  function attachStory(story) {
    if (!story) return;
    if (!story.category) story.category = "Live World Desk";
    if (typeof state !== "undefined") {
      state.currentStory = story;
      state.scriptText = story.script || "";
      state.scriptWords = String(story.script || "").split(/\s+/).filter(Boolean);
      state.currentWordIndex = 0;
      state._ttsLang = story.language || state.currentLanguage;
      state._speakT0 = performance.now();
      state._wordT0 = performance.now();
    }
    try {
      if (typeof loadStoryIntoTeleprompter === "function") loadStoryIntoTeleprompter(story);
    } catch (e) {}
  }

  function kickVoice(text) {
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      const u = new SpeechSynthesisUtterance(text || " ");
      u.volume = 1;
      u.rate = 1;
      const lang = (typeof state !== "undefined" && (state._ttsLang || state.currentLanguage)) || "en-IN";
      u.lang = lang;
      if (typeof pickVoiceForLanguage === "function" && typeof state !== "undefined") {
        const g = (typeof syncVoiceToPresenter === "function") ? syncVoiceToPresenter() : "female";
        const v = pickVoiceForLanguage(lang, g);
        if (v) u.voice = v;
      }
      s.cancel();
      s.speak(u);
      if (typeof state !== "undefined") {
        state.isSpeaking = true;
        state.isPaused = false;
        state.userHasStarted = true;
        state.scriptWords = String(text || "").split(/\s+/).filter(Boolean);
        state.currentWordIndex = 0;
        state._speakT0 = performance.now();
        state._wordT0 = performance.now();
      }
    } catch (e) {}
  }

  async function generateNewsVideo() {
    if (vs.generating) return;
    vs.generating = 0.12;
    const lang = (typeof state !== "undefined" && state.currentLanguage)
      || $("languageSelect")?.value
      || "en-IN";
    const loadingLine = /^hi/i.test(lang) ? "विश्व समाचार लोड हो रहा है।" : "Loading world news.";
    kickVoice(loadingLine);
    toast("Putting video on the background…");
    playBg(FALLBACK_VIDEOS[0]);
    if (bgEl()) commitFileClip(bgEl(), "World b-roll");
    const tick = setInterval(function () {
      vs.generating = Math.min(0.92, (vs.generating || 0.12) + 0.05);
    }, 450);
    try {
      const res = await fetch("/api/trending-broll?lang=" + encodeURIComponent(lang));
      const data = await res.json();
      clearInterval(tick);
      vs.generating = 0;
      attachStory(data.story);
      const clipName = (data.video && data.video.name) || (data.story && data.story.title) || "World news";
      let placed = false;
      if (data.video && data.video.src) {
        placed = await addRemoteClip(data.video.src, clipName, 8000);
      }
      if (!placed) placed = await placeFirstVideo(FALLBACK_VIDEOS, clipName);
      vs.playing = true;
      const pb = $("vsPlayBtn");
      if (pb) pb.textContent = "Pause";
      toast(placed
        ? "Video is on the background — presenter is reading the story"
        : "News attached — check Video Studio background");
      if (typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e) {}
      }
      setTimeout(function () {
        if (typeof state !== "undefined" && !state.isSpeaking && typeof startNewsBroadcast === "function") {
          try { startNewsBroadcast(); } catch (e2) {}
        }
      }, 500);
    } catch (err) {
      clearInterval(tick);
      vs.generating = 0;
      await placeFirstVideo(FALLBACK_VIDEOS, "World b-roll");
      toast("Could not fetch world news — background video is still playing");
    }
  }

  const ABBAKKA = {
    title: "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ",
    category: "ಕನ್ನಡ ವಿಶೇಷ",
    language: "kn-IN",
    video: "/assets/abbakka/abbakka_full.mp4",
    script:
      "ನಮಸ್ಕಾರ. ಕನ್ನಡಿಗರೇ, ಇದು ವಿಶೇಷ ಇತಿಹಾಸ ವಾರ್ತಾ ಪ್ರಸಾರ. ತೆರೆಯ ಮೇಲೆ ನೀವು ನೋಡುತ್ತಿರುವುದು ಅರಬ್ಬೀ ಸಮುದ್ರ ತೀರದ ಉಳ್ಳಾಲ. ಇಂದಿನ ದಕ್ಷಿಣ ಕನ್ನಡ. ಈ ನೆಲದಿಂದ ಹದಿನಾರನೇ ಶತಮಾನದಲ್ಲಿ ಒಬ್ಬ ವೀರರಾಣಿ ಪೋರ್ಚುಗೀಸ್ ಸಾಮ್ರಾಜ್ಯವನ್ನು ನಾಲ್ಕು ದಶಕಗಳ ಕಾಲ ಎದುರಿಸಿದಳು. ಅವಳೇ ರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ. ಜನ ಅವಳನ್ನು ಅಭಯರಾಣಿ ಎಂದು ಕರೆದರು. " +
      "ಈಗ ಕಾಣುವವಳು ಉಳ್ಳಾಲದ ರಾಣಿ. ಚೌಟ ವಂಶ ಅಳಿಯಸಂತಾನ ಪದ್ಧತಿಯನ್ನು ಅನುಸರಿಸುತ್ತಿತ್ತು. ಮಾವ ತಿರುಮಲ ರಾಯ ಅಬ್ಬಕ್ಕನಿಗೆ ಖಡ್ಗ, ಬಿಲ್ಲು ಮತ್ತು ಯುದ್ಧತಂತ್ರ ಕಲಿಸಿ ಸಿಂಹಾಸನ ಕಟ್ಟಿದರು. ಆಕೆ ಸಾಮಾನ್ಯರಂತೆ ಉಡುಪು ಧರಿಸಿ, ರಾತ್ರಿ ತಡವಾಗಿ ನ್ಯಾಯ ನೀಡುತ್ತಿದ್ದಳು ಎಂದು ಜಾನಪದ ಹೇಳುತ್ತದೆ. " +
      "ಮುಂದಿನ ಚಿತ್ರ ಅರಮನೆ. ಜೈನ, ಹಿಂದೂ ಮತ್ತು ಬ್ಯಾರಿ ಮುಸ್ಲಿಂ ಸಮುದಾಯಗಳೆಲ್ಲರೂ ಆಡಳಿತದಲ್ಲಿದ್ದರು. ನಂತರ ಕಾಣುವುದು ಮಸಾಲೆ ಬಂದರು. ಉಳ್ಳಾಲ ಮೆಣಸು ಮತ್ತು ವ್ಯಾಪಾರದ ಮುಖ್ಯ ಕೇಂದ್ರ. ಪೋರ್ಚುಗೀಸರು ತೆರಿಗೆ ಕೇಳಿದರು. ರಾಣಿ ನಿರಾಕರಿಸಿದಳು. " +
      "ಕಪ್ಪು ಮೋಡದಡಿ ಬರುವ ನೌಕೆಗಳು ಪೋರ್ಚುಗೀಸ್ ಹಡಗುಗಳು. ಒಂದು ಸಾವಿರ ಐನೂರು ಐವತ್ತೈದರಲ್ಲಿ ಅಡ್ಮಿರಲ್ ಡಾನ್ ಅಲ್ವಾರೊ ದಾ ಸಿಲ್ವೇರಾ ದಾಳಿ ಮಾಡಿದ. ಅಬ್ಬಕ್ಕ ಅವರನ್ನು ಹಿಮ್ಮೆಟ್ಟಿಸಿದಳು. " +
      "ಈ ನೌಕಾಯುದ್ಧದಲ್ಲಿ ಮೊಗವೀರ ಮೀನುಗಾರರು ಮತ್ತು ಬ್ಯಾರಿ ನಾವಿಕರು ರಾಣಿಯ ಬಲ. ಅಗ್ನಿಬಾಣ ಬಳಸಿದ ಕೊನೆಯವರಲ್ಲಿ ಒಬ್ಬಳು ಎಂದು ಐತಿಹ್ಯ. ನೋಡಿ, ಸಣ್ಣ ದೋಣಿಗಳು ದೊಡ್ಡ ಹಡಗುಗಳನ್ನು ಎದುರಿಸುತ್ತಿವೆ. " +
      "ಮುಂದೆ ಮಹಿಳೆಯರು ಖಡ್ಗಾಭ್ಯಾಸ ಮಾಡುತ್ತಿರುವುದು. ರಾಣಿ ಹೊಲದ ಕುಡುಗೋಲು ಹಿಡಿದ ಕರಾವಳಿ ಮಹಿಳೆಯರನ್ನು ಸೇನೆ ಮಾಡಿದಳು. " +
      "ರಾತ್ರಿ ದೃಶ್ಯ. ಒಂದು ಸಾವಿರ ಐನೂರು ಅರವತ್ತೆಂಟರಲ್ಲಿ ಜನರಲ್ ಜೊವಾವೊ ಪೈಕ್ಸೊಟೊ ಉಳ್ಳಾಲವನ್ನು ಆಕ್ರಮಿಸಿ ಅರಮನೆ ಪ್ರವೇಶಿಸಿದ. ರಾಣಿ ಮಸೀದಿಯಲ್ಲಿ ಆಶ್ರಯ ಪಡೆದು ಅದೇ ರಾತ್ರಿ ಎರಡು ನೂರು ಸೈನಿಕರೊಂದಿಗೆ ಮರುದಾಳಿ ಮಾಡಿದಳು. ಪೈಕ್ಸೊಟೊ ಹತರಾದರು. ಎಪ್ಪತ್ತು ಪೋರ್ಚುಗೀಸ್ ಸೈನಿಕರು ಸೆರೆಯಾದರು. ಅಡ್ಮಿರಲ್ ಮಾಸ್ಕರೆನ್ಹಾಸ್ ಕೂಡ ಬಿದ್ದರು. ಮಂಗಳೂರು ಕೋಟೆಯಿಂದ ಪೋರ್ಚುಗೀಸರು ಹಿಂದೆ ಸರಿದರು. " +
      "ಕೊನೆಯ ಚಿತ್ರ ಸ್ಮೃತಿ. ಕಾಲಿಕತ್ ಸಾಮೂತಿರಿ ಮತ್ತು ಬಿಜಾಪುರ ಸುಲ್ತಾನರೊಂದಿಗೆ ಮೈತ್ರಿ. ಗಂಡನ ದ್ರೋಹದ ನಂತರವೂ ಆಕೆ ಶರಣಾಗಲಿಲ್ಲ. ಸೆರೆಯಲ್ಲಿಯೂ ಯೋಧಳಾಗಿ ಹೋರಾಡಿ ಪ್ರಾಣ ಬಿಟ್ಟಳು. ಇಂದು ಯಕ್ಷಗಾನ, ದೈವಕೋಲ ಮತ್ತು ಉಳ್ಳಾಲದ ಕಡಲ ತೀರದಲ್ಲಿ ಅಬ್ಬಕ್ಕ ಜೀವಂತ. ಕಿತ್ತೂರು ಚೆನ್ನಮ್ಮ ಮತ್ತು ಒನಕೆ ಓಬವ್ವರ ಸಾಲಿನಲ್ಲಿ ಕರ್ನಾಟಕ ಈ ವೀರರಾಣಿಯನ್ನು ಸ್ಮರಿಸುತ್ತದೆ. " +
      "ಇದು ನಮ್ಮ ಪೂರ್ಣಾವಧಿ ಕನ್ನಡ ವರದಿ. ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ. ಅಭಯರಾಣಿ. ನಾವು ಮತ್ತೆ ಸಿಗೋಣ."
  };

  async function playAbbakkaKannada() {
    toast("ರಾಣಿ ಅಬ್ಬಕ್ಕ ಕನ್ನಡ ಪೂರ್ಣಾವಧಿ ವೀಡಿಯೊ ಹಾಕುತ್ತಿದ್ದೇವೆ…");
    openStudio();
    renderPills();
    if (typeof state !== "undefined") {
      state.currentLanguage = "kn-IN";
      state._ttsLang = "kn-IN";
      state.speechRate = 0.92;
      state.userHasStarted = true;
      state._lockScript = true;
    }
    const langSelect = $("languageSelect");
    if (langSelect) langSelect.value = "kn-IN";
    const lab = $("currentLangLabel");
    if (lab) lab.textContent = "Kannada (ಕನ್ನಡ)";
    document.querySelectorAll("[data-lang]").forEach(function (p) {
      p.classList.toggle("active", p.dataset.lang === "kn-IN");
    });
    if (typeof initSpeechSynthesis === "function") {
      try { initSpeechSynthesis(); } catch (e2) {}
    }
    kickVoice("ನಮಸ್ಕಾರ. ಕನ್ನಡಿಗರೇ.");
    attachStory({
      title: ABBAKKA.title,
      script: ABBAKKA.script,
      category: ABBAKKA.category,
      language: "kn-IN"
    });
    playBg(ABBAKKA.video);
    const ok = await addRemoteClip(ABBAKKA.video, ABBAKKA.title, 8000);
    vs.playing = true;
    syncPlayerUI();
    toast(ok)
      ? "ಅಬ್ಬಕ್ಕ ವೀಡಿಯೊ ಹಿನ್ನೆಲೆಯಲ್ಲಿ. ಪ್ರೆಸೆಂಟರ್ ಕನ್ನಡದಲ್ಲಿ ಓದುತ್ತಿದ್ದಾರೆ."
      : "ಕನ್ನಡ ಸುದ್ದಿ ಶುರು. ವೀಡಿಯೊ ತೆರೆಯುತ್ತಿದೆ.");
    if (typeof startNewsBroadcast === "function") {
      try { startNewsBroadcast(); } catch (e3) {}
    }
    setTimeout(function () {
      if (typeof state !== "undefined" && !state.isSpeaking && typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e4) {}
      }
    }, 600);
  }
  window.playAbbakkaKannada = playAbbakkaKannada;

  function uploadVideos(files) {
    if (!files || !files.length) return;
    Array.from(files).forEach(function (file) {
      if (!file.type || file.type.indexOf("video") !== 0) {
        toast("Please upload a video file");
        return;
      }
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;
      vid.onloadedmetadata = function () {
        const dur = isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 8;
        vs.clips.push({
          id: uid(),
          type: "file",
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
          duration: dur,
          inPoint: 0,
          outPoint: dur,
          crop: { x: 0, y: 0, w: 1, h: 1 },
          video: vid
        });
        vs.selected = vs.clips.length - 1;
        renderBin();
        renderTimeline();
        toast("Uploaded “" + file.name + "” — ready to crop / cut");
      };
    });
  }

  function cutAtPlayhead() {
    const hit = clipAt(vs.playhead);
    if (!hit) { toast("Add a clip first"); return; }
    const c = hit.clip;
    const at = c.inPoint + hit.local;
    if (at <= c.inPoint + 0.15 || at >= c.outPoint - 0.15) {
      toast("Move the playhead inside the clip to cut");
      return;
    }
    const right = {
      id: uid(),
      type: c.type,
      name: c.name + " (B)",
      duration: c.duration,
      inPoint: at,
      outPoint: c.outPoint,
      crop: Object.assign({}, c.crop),
      video: c.video
    };
    c.outPoint = at;
    c.name = c.name + " (A)";
    vs.clips.splice(hit.index + 1, 0, right);
    vs.selected = hit.index + 1;
    vs.clipboard = JSON.parse(JSON.stringify({
      type: right.type, name: right.name, duration: right.duration,
      inPoint: right.inPoint, outPoint: right.outPoint, crop: right.crop
    }));
    vs.clipboard._video = right.video;
    renderBin();
    renderTimeline();
    toast("Cut — second half copied to clipboard");
  }

  function copyClip() {
    if (vs.selected < 0 || !vs.clips[vs.selected]) { toast("Select a clip"); return; }
    const c = vs.clips[vs.selected];
    vs.clipboard = {
      type: c.type, name: c.name + " copy", duration: c.duration,
      inPoint: c.inPoint, outPoint: c.outPoint, crop: Object.assign({}, c.crop),
      _video: c.video
    };
    toast("Copied “" + c.name + "”");
  }

  function pasteClip() {
    if (!vs.clipboard) { toast("Clipboard empty — cut or copy first"); return; }
    const hit = clipAt(vs.playhead);
    const insertAt = hit ? hit.index + 1 : vs.clips.length;
    vs.clips.splice(insertAt, 0, {
      id: uid(),
      type: vs.clipboard.type,
      name: vs.clipboard.name,
      duration: vs.clipboard.duration,
      inPoint: vs.clipboard.inPoint,
      outPoint: vs.clipboard.outPoint,
      crop: Object.assign({}, vs.clipboard.crop),
      video: vs.clipboard._video || null
    });
    vs.selected = insertAt;
    renderBin();
    renderTimeline();
    toast("Pasted on timeline");
  }

  function toggleCrop() {
    vs.cropMode = !vs.cropMode;
    $("vsCropBtn")?.classList.toggle("on", vs.cropMode);
    toast(vs.cropMode ? "Crop: drag on the video" : "Crop off");
  }

  function canvasXY(ev) {
    const canvas = $("vsCanvas");
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width,
      y: (ev.clientY - r.top) / r.height
    };
  }

  function bindCrop() {
    const canvas = $("vsCanvas");
    if (!canvas) return;
    canvas.addEventListener("mousedown", function (ev) {
      if (!vs.cropMode || vs.selected < 0) return;
      const p = canvasXY(ev);
      vs.cropDrag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    });
    window.addEventListener("mousemove", function (ev) {
      if (!vs.cropDrag) return;
      const p = canvasXY(ev);
      vs.cropDrag.x1 = p.x;
      vs.cropDrag.y1 = p.y;
    });
    window.addEventListener("mouseup", function () {
      if (!vs.cropDrag || vs.selected < 0) { vs.cropDrag = null; return; }
      const d = vs.cropDrag;
      vs.cropDrag = null;
      const x = Math.max(0, Math.min(d.x0, d.x1));
      const y = Math.max(0, Math.min(d.y0, d.y1));
      const w = Math.min(1, Math.abs(d.x1 - d.x0));
      const h = Math.min(1, Math.abs(d.y1 - d.y0));
      if (w < 0.05 || h < 0.05) return;
      vs.clips[vs.selected].crop = { x: x, y: y, w: w, h: h };
      toast("Crop applied to clip");
    });
  }

  function drawAiNews(ctx, w, h, t, clip) {
    const s = story();
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#04101c");
    g.addColorStop(0.5, "#0a1c33");
    g.addColorStop(1, "#02060d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = "rgba(0, 180, 255, 0.12)";
    ctx.lineWidth = 1;
    const drift = (t * 28) % 48;
    for (let x = -48 + drift; x < w; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 80, h); ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 18; i++) {
      const px = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * w;
      const py = (Math.cos(t * 0.22 + i) * 0.5 + 0.5) * h * 0.7;
      ctx.fillStyle = "rgba(80,200,255," + (0.15 + 0.25 * Math.sin(t + i)) + ")";
      ctx.beginPath();
      ctx.arc(px, py, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ff2d2d";
    ctx.fillRect(28, 24, 86, 26);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("LIVE", 48, 42);

    ctx.fillStyle = "#00d2ff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("AI GENERATED NEWS PACKAGE", 128, 42);

    const title = (clip && clip.name) || s.title || "Breaking News";
    ctx.fillStyle = "#f4fbff";
    ctx.font = "bold 36px sans-serif";
    wrapText(ctx, title, 28, 110, w - 56, 42);

    const script = s.script || "";
    const chars = Math.min(script.length, Math.floor(t * 28) % Math.max(40, script.length + 20));
    ctx.fillStyle = "rgba(220,235,255,0.88)";
    ctx.font = "18px sans-serif";
    wrapText(ctx, script.slice(0, Math.max(80, chars)), 28, 210, w - 320, 26);

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, h - 48, w, 48);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 16px sans-serif";
    const ch = (typeof state !== "undefined" && state.channelName) ? state.channelName : "AI NEWS";
    const ticker = "  •  " + title + "  •  " + ch + "  •  ";
    const tx = w - ((t * 70) % (ctx.measureText(ticker).width + w));
    ctx.fillText(ticker + ticker, tx, h - 20);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = String(text || "").split(/\s+/);
    let line = "";
    let yy = y;
    let rows = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = words[i];
        yy += lineH;
        rows += 1;
        if (rows > 7) break;
      } else line = test;
    }
    if (rows <= 7 && line) ctx.fillText(line, x, yy);
  }

  function drawFileClip(ctx, w, h, clip) {
    const v = clip.video || bgEl();
    if (!v) return false;
    v.muted = true;
    v.playsInline = true;
    const one = vs.clips.filter(function (c) { return c.type === "file"; }).length <= 1;
    v.loop = one;
    if (vs._flowId !== clip.id) {
      vs._flowId = clip.id;
      try { v.currentTime = clip.inPoint || 0; } catch (e) {}
    }
    try {
      if (vs.playing) {
        if (v.paused) v.play().catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
      if (!one && v.currentTime >= (clip.outPoint || v.duration) - 0.08) {
        try { v.currentTime = clip.inPoint || 0; } catch (e2) {}
      }
    } catch (e) {}
    if (!v.videoWidth || v.readyState < 2) return false;
    const c = clip.crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = c.x * v.videoWidth;
    const sy = c.y * v.videoHeight;
    const sw = Math.max(2, c.w * v.videoWidth);
    const sh = Math.max(2, c.h * v.videoHeight);
    try {
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
      return true;
    } catch (e3) {
      return false;
    }
  }

  function squareSource(src) {
    const sw = src.videoWidth || src.naturalWidth || src.width || 0;
    const sh = src.videoHeight || src.naturalHeight || src.height || 0;
    if (!sw || !sh) return null;
    const side = Math.min(sw, sh);
    return {
      sx: Math.max(0, (sw - side) / 2),
      sy: Math.max(0, (sh - side) * 0.12),
      side: side
    };
  }

  function drawNewsOverlay(ctx, w, h, t) {
    const s = story();
    ctx.save();
    ctx.fillStyle = "#ff2d2d";
    ctx.fillRect(16, 14, 64, 22);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("LIVE", 30, 30);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(88, 14, Math.min(w - 110, 720), 22);
    ctx.fillStyle = "#f4fbff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText((s.title || "World news").slice(0, 78), 96, 30);

    const pip = Math.round(Math.min(w * 0.2, h * 0.36, 240));
    const words = (typeof state !== "undefined" && state.scriptWords) || String(s.script || "").split(/\s+/).filter(Boolean);
    const idx = (typeof state !== "undefined" && state.currentWordIndex) || 0;
    const snip = words.slice(idx, idx + 10).join(" ");
    if (snip) {
      const bx = 16 + pip + 14;
      const by = h - 86;
      const bw = Math.max(120, w - bx - 16);
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(bx, by, bw, 36);
      ctx.fillStyle = "#ffe566";
      ctx.font = "16px sans-serif";
      let line = snip;
      while (ctx.measureText(line).width > bw - 16 && line.length > 8) line = line.slice(0, -1);
      ctx.fillText(line, bx + 8, by + 24);
    }

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, h - 42, w, 42);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 15px sans-serif";
    const ticker = "  •  " + (s.title || "") + "  •  " + (s.script || "") + "  •  ";
    const tw = Math.max(240, ctx.measureText(ticker).width);
    const tx = w - ((t * 72) % (tw + w));
    ctx.fillText(ticker + ticker, tx, h - 16);
    ctx.restore();
  }

  function drawPresenterPip(ctx, w, h) {
    const size = Math.round(Math.min(w * 0.2, h * 0.36, 240));
    const x = 18;
    const y = h - size - 58;
    ctx.save();
    ctx.fillStyle = "#05070c";
    ctx.fillRect(x - 5, y - 5, size + 10, size + 10);
    ctx.strokeStyle = profile().color || "#00d2ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 3, y - 3, size + 6, size + 6);
    const live = document.getElementById("broadcastCanvas");
    const img = presenterImg();
    const src = (live && live.width) ? live : img;
    const box = src ? squareSource(src) : null;
    if (src && box) {
      ctx.drawImage(src, box.sx, box.sy, box.side, box.side, x, y, size, size);
    } else {
      ctx.fillStyle = "#123";
      ctx.fillRect(x, y, size, size);
    }
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(x, y + size - 24, size, 24);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText((profile().name || "Anchor"), x + 8, y + size - 8);
    ctx.restore();
  }

  function drawGenerating(ctx, w, h) {
    ctx.fillStyle = "rgba(2,8,16,0.55)";
    ctx.fillRect(0, 44, w, 54);
    ctx.fillStyle = "#00d2ff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("Pulling news video… " + Math.round(vs.generating * 100) + "%", 24, 78);
  }

  function drawFrame(now) {
    const canvas = $("vsCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    const w = canvas.width;
    const h = canvas.height;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);

    const hit = clipAt(vs.playhead);
    let painted = false;
    if (hit && hit.clip.type === "file") {
      painted = drawFileClip(ctx, w, h, hit.clip);
    } else if (hit && hit.clip.type === "ai") {
      drawAiNews(ctx, w, h, t, hit.clip);
      painted = true;
    }
    if (!painted) {
      const bg = bgEl();
      if (bg && bg.videoWidth && bg.readyState >= 2) {
        try { ctx.drawImage(bg, 0, 0, w, h); painted = true; } catch (e) {}
      }
    }

    drawNewsOverlay(ctx, w, h, t);
    if (vs.generating) drawGenerating(ctx, w, h);
    drawPresenterPip(ctx, w, h);

    if (vs.cropMode && vs.clips[vs.selected]) {
      const c = vs.cropDrag
        ? {
            x: Math.min(vs.cropDrag.x0, vs.cropDrag.x1),
            y: Math.min(vs.cropDrag.y0, vs.cropDrag.y1),
            w: Math.abs(vs.cropDrag.x1 - vs.cropDrag.x0),
            h: Math.abs(vs.cropDrag.y1 - vs.cropDrag.y0)
          }
        : vs.clips[vs.selected].crop;
      ctx.save();
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(c.x * w, c.y * h, c.w * w, c.h * h);
      ctx.restore();
    }
  }

  function loop(ts) {
    if (!vs.open) return;
    if (!vs.lastTs) vs.lastTs = ts;
    const dt = Math.min(0.05, (ts - vs.lastTs) / 1000);
    vs.lastTs = ts;
    if (vs.playing) {
      vs.playhead += dt;
      if (vs.playhead >= totalDur()) vs.playhead = 0;
    }
    vs._tlAcc = (vs._tlAcc || 0) + dt;
    if (vs._tlAcc > 0.25) {
      vs._tlAcc = 0;
      renderTimeline();
      syncPlayerUI();
    }
    fitCanvas();
    drawFrame(ts);
    vs.raf = requestAnimationFrame(loop);
  }

  function syncPlayerUI() {
    const pb = $("vsPlayBtn");
    if (pb) pb.textContent = vs.playing ? "Pause" : "Play presenter + timeline";
    const v = bgEl();
    const t = $("vsUnderTime");
    if (t && v) {
      function fmt(s) {
        s = Math.max(0, Math.floor(Number(s) || 0));
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      }
      t.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
    }
    const hint = $("vsUnderHint");
    if (hint) hint.textContent = vs.playing ? "Playing in Video Studio" : "Paused — press Play below the video";
  }

  function togglePlay() {
    vs.playing = !vs.playing;
    const v = bgEl();
    if (v) {
      if (vs.playing) {
        const p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        try { v.pause(); } catch (e0) {}
      }
    }
    syncPlayerUI();
    if (vs.playing) {
      if (typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e) {}
      }
    } else if (typeof pauseNewsBroadcast === "function") {
      try { pauseNewsBroadcast(); } catch (e) {}
    }
  }

  function renderBin() {
    const bin = $("vsBin");
    if (!bin) return;
    bin.innerHTML = "";
    vs.clips.forEach(function (c, i) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "vs-chip" + (i === vs.selected ? " sel" : "");
      el.textContent = (c.type === "ai" ? "AI " : "VID ") + c.name;
      el.onclick = function () { vs.selected = i; renderBin(); renderTimeline(); };
      bin.appendChild(el);
    });
  }

  function renderTimeline() {
    const tl = $("vsTimeline");
    if (!tl) return;
    const tot = totalDur();
    tl.innerHTML = "";
    const track = document.createElement("div");
    track.className = "vs-track";
    let acc = 0;
    vs.clips.forEach(function (c, i) {
      const L = clipLen(c);
      const seg = document.createElement("button");
      seg.type = "button";
      seg.className = "vs-seg" + (i === vs.selected ? " sel" : "") + (c.type === "ai" ? " ai" : "");
      seg.style.width = (L / tot * 100) + "%";
      seg.textContent = c.name;
      seg.onclick = function (ev) {
        ev.stopPropagation();
        vs.selected = i;
        vs.playhead = acc + 0.01;
        renderBin();
        renderTimeline();
      };
      track.appendChild(seg);
      acc += L;
    });
    const head = document.createElement("div");
    head.className = "vs-head";
    head.style.left = (vs.playhead / tot * 100) + "%";
    track.appendChild(head);
    track.addEventListener("click", function (ev) {
      const r = track.getBoundingClientRect();
      vs.playhead = Math.max(0, Math.min(tot, ((ev.clientX - r.left) / r.width) * tot));
      renderTimeline();
    });
    tl.appendChild(track);
  }

  function recordStudio(thenPublish) {
    const canvas = $("vsCanvas");
    if (!canvas || !canvas.captureStream) { toast("Recording not supported"); return; }
    if (vs.rec) return;
    vs.chunks = [];
    const stream = canvas.captureStream(30);
    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" }); }
    catch (e1) {
      try { rec = new MediaRecorder(stream, { mimeType: "video/webm" }); }
      catch (e2) { rec = new MediaRecorder(stream); }
    }
    vs.rec = rec;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) vs.chunks.push(e.data); };
    rec.onstop = function () {
      vs.rec = null;
      const blob = new Blob(vs.chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AI_News_Studio_" + Date.now() + ".webm";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      const s = story();
      const meta = [
        "TITLE: " + (s.title || "AI News"),
        "CHANNEL: " + ((typeof state !== "undefined" && state.channelName) || "AI NEWS"),
        "ANCHOR: " + (profile().name || ""),
        "PRIVACY: " + ($("ytPrivacySelect")?.value || "public"),
        "",
        s.script || ""
      ].join("\n");
      const mt = document.createElement("a");
      mt.href = URL.createObjectURL(new Blob([meta], { type: "text/plain" }));
      mt.download = "YouTube_News_Package_" + Date.now() + ".txt";
      mt.click();
      if (thenPublish && typeof uploadBroadcastToYouTubeChannel === "function") {
        uploadBroadcastToYouTubeChannel();
      } else {
        toast("Download started");
      }
    };
    vs.playhead = 0;
    vs.playing = true;
    const pb = $("vsPlayBtn");
    if (pb) pb.textContent = "Pause";
    rec.start(200);
    toast(thenPublish ? "Recording for YouTube publish…" : "Recording download…");
    const dur = Math.min(180, Math.max(5, totalDur() + 0.4));
    setTimeout(function () {
      vs.playing = false;
      if (pb) pb.textContent = "Play";
      try { rec.stop(); } catch (e) {}
    }, dur * 1000);
  }

  function bind() {
    $("openVideoStudioBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      openStudio();
    });
    $("vsCloseBtn")?.addEventListener("click", closeStudio);
    $("vsGenerateBtn")?.addEventListener("click", generateNewsVideo);
    $("vsAbbakkaBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      playAbbakkaKannada();
    });
    $("vsUnderPlay")?.addEventListener("click", function (e) {
      e.preventDefault();
      if (!vs.playing) togglePlay();
    });
    $("vsUnderPause")?.addEventListener("click", function (e) {
      e.preventDefault();
      if (vs.playing) togglePlay();
    });
    $("vsUploadBtn")?.addEventListener("click", function () { $("vsFileInput")?.click(); });
    $("vsFileInput")?.addEventListener("change", function (e) {
      uploadVideos(e.target.files);
      e.target.value = "";
    });
    $("vsCropBtn")?.addEventListener("click", toggleCrop);
    $("vsCutBtn")?.addEventListener("click", cutAtPlayhead);
    $("vsCopyBtn")?.addEventListener("click", copyClip);
    $("vsPasteBtn")?.addEventListener("click", pasteClip);
    $("vsDupBtn")?.addEventListener("click", function () {
      if (vs.selected < 0 || !vs.clips[vs.selected]) { toast("Select a clip"); return; }
      const c = vs.clips[vs.selected];
      vs.clips.splice(vs.selected + 1, 0, {
        id: uid(), type: c.type, name: c.name + " copy", duration: c.duration,
        inPoint: c.inPoint, outPoint: c.outPoint, crop: Object.assign({}, c.crop), video: c.video
      });
      vs.selected += 1;
      renderBin(); renderTimeline();
      toast("Duplicated clip");
    });
    $("vsDelBtn")?.addEventListener("click", function () {
      if (vs.selected < 0) { toast("Select a clip"); return; }
      vs.clips.splice(vs.selected, 1);
      vs.selected = Math.min(vs.selected, vs.clips.length - 1);
      renderBin(); renderTimeline();
      toast("Clip deleted");
    });
    $("vsTrimInBtn")?.addEventListener("click", function () {
      const hit = clipAt(vs.playhead);
      if (!hit) return;
      const at = hit.clip.inPoint + hit.local;
      if (at < hit.clip.outPoint - 0.15) {
        hit.clip.inPoint = at;
        vs.selected = hit.index;
        renderBin(); renderTimeline();
        toast("Trim in");
      }
    });
    $("vsTrimOutBtn")?.addEventListener("click", function () {
      const hit = clipAt(vs.playhead);
      if (!hit) return;
      const at = hit.clip.inPoint + hit.local;
      if (at > hit.clip.inPoint + 0.15) {
        hit.clip.outPoint = at;
        vs.selected = hit.index;
        renderBin(); renderTimeline();
        toast("Trim out");
      }
    });
    $("vsLeftBtn")?.addEventListener("click", function () {
      const i = vs.selected;
      if (i <= 0) return;
      const t = vs.clips[i]; vs.clips[i] = vs.clips[i - 1]; vs.clips[i - 1] = t;
      vs.selected = i - 1;
      renderBin(); renderTimeline();
    });
    $("vsRightBtn")?.addEventListener("click", function () {
      const i = vs.selected;
      if (i < 0 || i >= vs.clips.length - 1) return;
      const t = vs.clips[i]; vs.clips[i] = vs.clips[i + 1]; vs.clips[i + 1] = t;
      vs.selected = i + 1;
      renderBin(); renderTimeline();
    });
    $("vsSideToggle")?.addEventListener("click", function () {
      $("videoStudioScreen")?.classList.toggle("side-off");
    });
    $("vsPlayBtn")?.addEventListener("click", togglePlay);
    $("viewModeStudioBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      openStudio();
    });
    $("openVideoStudioBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      openStudio();
    });
    $("vsDownloadBtn")?.addEventListener("click", function () { recordStudio(false); });
    $("vsYoutubeBtn")?.addEventListener("click", function () { recordStudio(true); });
    bindCrop();
    document.addEventListener("keydown", function (e) {
      if (!vs.open) return;
      if (e.key === "Escape") closeStudio();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
