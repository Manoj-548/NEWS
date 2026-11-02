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
    raf: 0,
    rate: 1,
    scrubbing: false,
    desk: null
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
  const vsViseme = {};
  function visemeFile(id, shape) {
    if (shape === "closed") return "viseme_M_" + id + ".jpg";
    if (shape === "wide") return "viseme_E_" + id + ".jpg";
    if (shape === "round") return "viseme_O_" + id + ".jpg";
    if (shape === "teeth") return "viseme_talk_" + id + ".jpg";
    return "viseme_talk_" + id + ".jpg";
  }
  function preloadVisemes(id) {
    id = id || "priya_nair";
    ["M", "E", "O", "talk", "open", "F", "U"].forEach(function (k) {
      const file = "viseme_" + k + "_" + id + ".jpg";
      if (!vsViseme[file]) {
        const im = new Image();
        im.src = "assets/" + file;
        vsViseme[file] = im;
      }
    });
  }
  function talkingPresenterImg() {
    const idle = presenterImg();
    const narr = $("vsNarration");
    const fileTalking = !!(narr && !narr.paused && !narr.ended);
    const speaking = fileTalking || (typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    if (!speaking) return idle;
    const id = (typeof state !== "undefined" && state.anchorModel) || "priya_nair";
    const file = visemeFile(id, (typeof state !== "undefined" && state.visemeShape) || "talk");
    preloadVisemes(id);
    const im = vsViseme[file];
    if (im && im.complete && im.naturalWidth > 0) return im;
    const talk = vsViseme["viseme_talk_" + id + ".jpg"];
    if (talk && talk.complete && talk.naturalWidth > 0) return talk;
    return idle;
  }
  function narrationEl() {
    let a = $("vsNarration");
    if (!a) {
      a = document.createElement("audio");
      a.id = "vsNarration";
      a.preload = "auto";
      document.body.appendChild(a);
    }
    if (!a._vsBound) {
      a._vsBound = true;
      a.addEventListener("ended", function () {
        if (typeof state !== "undefined") {
          state.isSpeaking = false;
          state.isPaused = false;
          state.visemeMouthOpen = 0;
        }
      });
      a.addEventListener("timeupdate", function () {
        if (typeof state === "undefined") return;
        if (a.paused || a.ended) return;
        state.isSpeaking = true;
        state.isPaused = false;
        const words = state.scriptWords || [];
        if (a.duration > 0 && words.length) {
          const idx = Math.min(words.length - 1, Math.floor((a.currentTime / a.duration) * words.length));
          if (idx !== state.currentWordIndex) {
            state.currentWordIndex = idx;
            state._wordT0 = performance.now();
            state._lastBoundary = performance.now();
          }
        }
      });
    }
    return a;
  }
  function playFileNarration() {
    const a = narrationEl();
    const same = a.getAttribute("data-src") === ABBAKKA.audio;
    if (same && !a.paused && !a.ended) {
      if (typeof state !== "undefined") {
        state.isSpeaking = true;
        state.isPaused = false;
        state._fileNarration = true;
      }
      return a;
    }
    if (!same) {
      a.src = ABBAKKA.audio;
      a.setAttribute("data-src", ABBAKKA.audio);
    }
    a.volume = 0.75;
    a.playbackRate = vs.rate || 1;
    if (!same || a.ended) {
      try { a.currentTime = 0; } catch (e0) {}
    }
    const p = a.play();
    if (p && p.catch) p.catch(function () {});
    if (typeof state !== "undefined") {
      state.isSpeaking = true;
      state.isPaused = false;
      state.userHasStarted = true;
      state._fileNarration = true;
    }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e1) {}
    return a;
  }
  function pauseFileNarration() {
    const a = $("vsNarration");
    if (a && !a.paused) try { a.pause(); } catch (e) {}
  }
  function stopFileNarration() {
    const a = $("vsNarration");
    if (a) {
      try { a.pause(); } catch (e) {}
      try { a.currentTime = 0; } catch (e2) {}
    }
    if (typeof state !== "undefined") {
      state._fileNarration = false;
      state.isSpeaking = false;
    }
  }
  window.pauseFileNarration = pauseFileNarration;
  window.stopFileNarration = stopFileNarration;
  window.playFileNarration = playFileNarration;
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
    const w = 1920;
    const h = 1080;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function renderPills() {
    const box = $("vsPresenterPills");
    if (!box) return;
    const cur = (typeof state !== "undefined" && state.anchorModel) || "priya_nair";
    box.innerHTML = "";
    PEOPLE.forEach(function (p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vs-pill" + (p[0] === cur ? " active" : "");
      b.textContent = p[1];
      b.onclick = function () {
        applyPresenter(p[0], true);
      };
      box.appendChild(b);
    });
  }

  function openStudio() {
    const screen = $("videoStudioScreen");
    if (!screen) {
      console.error("videoStudioScreen missing");
      return;
    }
    setModeTabs("viewModeStudioBtn");
    $("canvasWrapper")?.classList.add("hidden");
    $("aiChatHubViewport")?.classList.add("hidden");
    document.body.classList.add("vs-open");
    document.body.classList.remove("remote-open");
    screen.classList.remove("hidden");
    screen.removeAttribute("hidden");
    screen.setAttribute("aria-hidden", "false");
    screen.style.setProperty("display", "grid", "important");
    screen.style.setProperty("visibility", "visible", "important");
    screen.style.setProperty("opacity", "1", "important");
    screen.style.setProperty("pointer-events", "auto", "important");
    vs.open = true;
    vs.lastTs = 0;
    preloadVisemes((typeof state !== "undefined" && state.anchorModel) || "priya_nair");
    renderPills();
    renderNameBar();
    renderBin();
    renderTimeline();
    updateGfx();
    fitCanvas();
    toast("Video Studio — editor open");
    if (!vs.raf) loop(0);
  }
  function hideStudio() {
    document.body.classList.remove("vs-film");
    document.body.classList.remove("vs-world");
    pauseFileNarration();
    vs.open = false;
    vs.playing = false;
    document.body.classList.remove("vs-open");
    if (vs.raf) cancelAnimationFrame(vs.raf);
    vs.raf = 0;
    const screen = $("videoStudioScreen");
    if (screen) {
      screen.classList.add("hidden");
      screen.setAttribute("aria-hidden", "true");
      screen.style.removeProperty("display");
      screen.style.removeProperty("visibility");
      screen.style.removeProperty("opacity");
      screen.style.removeProperty("pointer-events");
    }
  }
  function closeStudio() {
    stopFileNarration();
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
    "assets/climate/earth.mp4",
    "assets/fallback_broll.mp4",
    "assets/fallback_broll.webm"
  ];
  const CLIMATE_BEATS = [
    { at: 0, src: "assets/climate/earth.mp4", label: "Earth from space" },
    { at: 53, src: "assets/climate/oceancloud.webm", label: "Ice, ocean, meltwater" },
    { at: 84, src: "assets/climate/clouds.webm", label: "Storms and flood skies" },
    { at: 106, src: "assets/climate/fire.webm", label: "Heat, fire, fossil fuel" },
    { at: 137, src: "assets/climate/wind.webm", label: "Wind and clean power" }
  ];
  const CLIMATE_VIDEOS = CLIMATE_BEATS.map(function (b) { return b.src; });

  function climateSrcForWord(idx) {
    let src = CLIMATE_BEATS[0].src;
    let label = CLIMATE_BEATS[0].label;
    for (let i = 0; i < CLIMATE_BEATS.length; i++) {
      if (idx >= CLIMATE_BEATS[i].at) {
        src = CLIMATE_BEATS[i].src;
        label = CLIMATE_BEATS[i].label;
      }
    }
    return { src: src, label: label };
  }

  function preloadClimate() {
    CLIMATE_BEATS.forEach(function (b) {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.src = b.src;
    });
  }

  function syncWordVideo() {
    if (!vs.open || !vs.playing) return;
    const idx = (typeof state !== "undefined" && state.currentWordIndex) || 0;
    if (vs.desk === "world") {
      const hit = climateSrcForWord(idx);
      vs._beatLabel = hit.label;
      if (bgEl() && bgEl().getAttribute("data-src") !== hit.src) playBg(hit.src);
    }
  }

  const PEOPLE_GENDER = {
    nova_kade: "male",
    lyra_nova: "female",
    arjun_mehra: "male",
    priya_nair: "female",
    rajesh_sharma: "male",
    meera_kapoor: "female",
    alexander_hayes: "male",
    sofia_reyes: "female",
    marcus_cole: "male"
  };

  function climateStory(p) {
    const name = (p && p.name) || "Alexander Hayes";
    const foreign = /hayes|reyes|cole|lyra|nova/i.test(name);
    return {
      title: "GLOBAL WARMING: THE PLANET'S RED LINE",
      category: "World Climate Desk",
      language: "en-GB",
      script:
        "Good evening from the World Climate Desk. I am " + name +
        ", your " + (foreign ? "foreign correspondent" : "anchor") +
        ". Nineteen of the twenty hottest years ever measured have fallen in this century. " +
        "The planet's average temperature now sits about one point five degrees Celsius above the pre-industrial line — " +
        "the very limit governments vowed to defend in Paris. From space, the story is written in ice and ocean. " +
        "Greenland and West Antarctica are losing mass faster each decade. Meltwater, plus the expansion of warming seas, " +
        "is lifting global waterlines. Streets in Mumbai, Lagos, Jakarta and Miami already flood on cloudless days. " +
        "A warmer sky holds more moisture, so storms strike harder, while dry belts burn longer. The science is not ambiguous: " +
        "the main driver is carbon dioxide and methane from coal, oil, gas, and land use. There is a hard, practical hope. " +
        "Solar and wind are now the cheapest new electricity in most of the world. Every tenth of a degree we still prevent " +
        "is harvests, coastlines, and lives saved. This is " + name + ", World Climate Desk. We will keep the watch."
    };
  }

  function isolateDesk(which) {
    vs.desk = which;
    if (typeof state !== "undefined") state._desk = which;
    if (which === "world") {
      stopFileNarration();
      if (typeof state !== "undefined") {
        state._fileNarration = false;
        state._lockScript = false;
      }
      document.body.classList.remove("vs-film");
      document.body.classList.add("vs-world");
    } else if (which === "abbakka") {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e0) {}
      if (typeof stopNewsBroadcast === "function") {
        try { stopNewsBroadcast(true); } catch (e1) {}
      }
      document.body.classList.add("vs-film");
      document.body.classList.remove("vs-world");
    }
    updateGfx();
    renderNameBar();
  }

  function renderNameBar() {
    const bar = $("vsNameBar");
    if (!bar) return;
    const cur = (typeof state !== "undefined" && state.anchorModel) || "alexander_hayes";
    bar.innerHTML = "";
    PEOPLE.forEach(function (p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vs-name-chip" + (p[0] === cur ? " active" : "");
      b.textContent = p[1];
      b.title = (PEOPLE_GENDER[p[0]] === "female" ? "Female voice · " : "Male voice · ") + p[1];
      b.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        applyPresenter(p[0], true);
      };
      bar.appendChild(b);
    });
  }

  function applyPresenter(id, restartWorld) {
    const name = (PEOPLE.filter(function (x) { return x[0] === id; })[0] || [id, id])[1];
    const gender = PEOPLE_GENDER[id] || "male";
    if (typeof state !== "undefined") state.anchorModel = id;
    document.querySelectorAll("[data-model]").forEach(function (el) {
      el.classList.toggle("active", el.dataset.model === id);
    });
    const modelSelect = $("anchorModelSelect");
    if (modelSelect) modelSelect.value = id;
    const genderSelect = $("voiceGenderSelect");
    if (genderSelect) genderSelect.value = gender;
    const nameLabel = $("currentAnchorLabel");
    if (nameLabel) nameLabel.textContent = name;
    if (typeof syncVoiceToPresenter === "function") {
      try { syncVoiceToPresenter(); } catch (e0) {}
    }
    preloadVisemes(id);
    renderPills();
    renderNameBar();
    updateGfx();
    if (restartWorld && vs.desk === "world") {
      if (typeof state !== "undefined") {
        state._fileNarration = false;
        state.currentLanguage = "en-GB";
        state._ttsLang = "en-GB";
      }
      const storyPack = climateStory({ name: name, gender: gender });
      attachStory(storyPack);
      if (typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e1) {}
      }
      toast(name + " · " + gender + " voice · climate desk");
    } else {
      toast(name + " · " + gender + " voice");
    }
  }
  window.studioApplyPresenter = applyPresenter;

  function updateGfx() {
    const p = profile();
    const s = story();
    const world = vs.desk === "world";
    const show = $("vsGfxShow");
    const title = $("vsGfxTitle");
    const kicker = $("vsGfxKicker");
    const nm = $("vsGfxName");
    const role = $("vsGfxRole");
    const sub = $("vsGfxSub");
    const tick = $("vsGfxTicker");
    if (show) show.textContent = world ? "WORLD CLIMATE DESK" : "KANNADA HISTORY DESK";
    if (title) title.textContent = world
      ? (s.title || "GLOBAL WARMING: THE PLANET'S RED LINE")
      : (s.title || "VEERARANI ABBAKKA CHOUTA");
    if (kicker) kicker.textContent = world ? "FOREIGN CORRESPONDENT" : "KANNADA PRESENTER";
    if (nm) nm.textContent = p.name || "";
    if (role) role.textContent = world
      ? ("HD B-ROLL · " + (vs._beatLabel || "Earth from space"))
      : "Ullal · Karnataka · HD film";
    const words = (typeof state !== "undefined" && state.scriptWords) || [];
    const idx = (typeof state !== "undefined" && state.currentWordIndex) || 0;
    if (sub) sub.textContent = words.slice(idx, idx + 12).join(" ");
    if (tick) {
      tick.textContent = "  •  " + (s.title || "") + "  •  " + (s.script || "") + "  •  LIVE  •  ";
    }
  }

  function bgEl() { return $("vsBgVideo"); }

  function playBg(src) {
    const el = bgEl();
    if (!el || !src) return;
    if (!/^https?:/i.test(src)) el.removeAttribute("crossorigin");
    const film = /abbakka/i.test(src);
    el.loop = true;
    el.playsInline = true;
    el.autoplay = true;
    el.muted = true;
    el.defaultMuted = true;
    if (el.getAttribute("data-src") !== src) {
      el.setAttribute("data-src", src);
      el.src = src;
    }
    el.playbackRate = vs.rate || 1;
    const p = el.play();
    if (p && p.catch) p.catch(function () {});
    if (film) {
      document.body.classList.add("vs-film");
      if (typeof state !== "undefined") {
        state._fileNarration = true;
        state.isSpeaking = true;
        state.isPaused = false;
      }
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
    if (!vs.playing) vs.playhead = 0;
    renderBin();
    renderTimeline();
  }

  function addRemoteClip(src, name, timeoutMs) {
    playBg(src);
    return new Promise(function (resolve) {
      const vid = bgEl() || document.createElement("video");
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
      u.volume = 0.75;
      u.rate = 0.8;
      const lang = (typeof state !== "undefined" && (state._ttsLang || state.currentLanguage)) || "en-IN";
      u.lang = lang;
      if (typeof pickVoiceForLanguage === "function" && typeof state !== "undefined") {
        const g = (typeof syncVoiceToPresenter === "function") ? syncVoiceToPresenter() : "female";
        const v = pickVoiceForLanguage(lang, g);
        if (v) u.voice = v;
      }
      if (u.voice) u.lang = u.voice.lang || lang;
      try { s.resume(); } catch (eR) {}
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
    isolateDesk("world");
    preloadClimate();
    applyPresenter("alexander_hayes", false);
    const pack = climateStory(profile());
    if (typeof state !== "undefined") {
      state.currentLanguage = "en-GB";
      state._ttsLang = "en-GB";
      state.speechRate = 0.92;
      state.speechPitch = 0.9;
      state.volume = 1;
      state.userHasStarted = true;
    }
    const langSelect = $("languageSelect");
    if (langSelect) langSelect.value = "en-GB";
    const lab = $("currentLangLabel");
    if (lab) lab.textContent = "English (UK)";
    attachStory(pack);
    toast("World Climate Desk — Alexander Hayes reading global warming");
    openStudio();
    playBg(CLIMATE_VIDEOS[0]);
    if (bgEl()) commitFileClip(bgEl(), "Global warming · HD");
    vs.playing = true;
    syncPlayerUI();
    if (typeof startNewsBroadcast === "function") {
      try { startNewsBroadcast(); } catch (e0) {}
    }
    const tick = setInterval(function () {
      vs.generating = Math.min(0.92, (vs.generating || 0.12) + 0.08);
    }, 300);
    try {
      const placed = await placeFirstVideo(CLIMATE_VIDEOS, "Global warming · HD");
      clearInterval(tick);
      vs.generating = 0;
      vs.playing = true;
      playBg(CLIMATE_VIDEOS[0]);
      if (typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e1) {}
      }
      toast(placed
        ? "Climate film on air — foreign correspondent reading. Voices are not mixed with Abbakka."
        : "Climate script is on air. Video is loading.");
    } catch (err) {
      clearInterval(tick);
      vs.generating = 0;
      playBg(CLIMATE_VIDEOS[0]);
      if (typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e2) {}
      }
    }
    updateGfx();
  }

  const ABBAKKA = {
    title: "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ",
    category: "ಕನ್ನಡ ವಿಶೇಷ",
    language: "kn-IN",
    video: "assets/abbakka/abbakka_play.mp4?v=desk1",
    audio: "assets/abbakka/abbakka_kn.mp3?v=pack23",
    script:
      "ನಮಸ್ಕಾರ. ಕನ್ನಡಿಗರೇ, ಇದು ವಿಶೇಷ ಇತಿಹಾಸ ವಾರ್ತಾ ಪ್ರಸಾರ. ತೆರೆಯ ಮೇಲೆ ದಕ್ಷಿಣ ಕನ್ನಡದ ಉಳ್ಳಾಲ. ಈ ನೆಲದಿಂದ ಹದಿನಾರನೇ ಶತಮಾನದಲ್ಲಿ ರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ ಪೋರ್ಚುಗೀಸ್ ಸಾಮ್ರಾಜ್ಯವನ್ನು ನಾಲ್ಕು ದಶಕ ಎದುರಿಸಿದಳು. ಜನ ಅವಳನ್ನು ಅಭಯರಾಣಿ ಎಂದು ಕರೆದರು. ಚೌಟ ವಂಶ ಅಳಿಯಸಂತಾನ. ಮಾವ ತಿರುಮಲ ರಾಯ ಖಡ್ಗ ಮತ್ತು ಯುದ್ಧತಂತ್ರ ಕಲಿಸಿ ಸಿಂಹಾಸನ ಕಟ್ಟಿದರು. ಜೈನ, ಹಿಂದೂ, ಬ್ಯಾರಿ ಮುಸ್ಲಿಂ ಸಮುದಾಯ ಆಡಳಿತದಲ್ಲಿದ್ದರು. ಉಳ್ಳಾಲ ಮೆಣಸು ವ್ಯಾಪಾರದ ಕೇಂದ್ರ. ಪೋರ್ಚುಗೀಸರು ತೆರಿಗೆ ಕೇಳಿದರು. ರಾಣಿ ನಿರಾಕರಿಸಿದಳು. ಈಗ ಕಾಣುವವಳು ಉಳ್ಳಾಲದ ರಾಣಿ. ಆಕೆ ಸಾಮಾನ್ಯರಂತೆ ಉಡುಪು ಧರಿಸಿ ರಾತ್ರಿ ತಡವಾಗಿ ನ್ಯಾಯ ನೀಡುತ್ತಿದ್ದಳು. ಕಪ್ಪು ಮೋಡದಡಿ ಪೋರ್ಚುಗೀಸ್ ಹಡಗುಗಳು. ಒಂದು ಸಾವಿರ ಐನೂರು ಐವತ್ತೈದರಲ್ಲಿ ಅಡ್ಮಿರಲ್ ಡಾನ್ ಅಲ್ವಾರೊ ದಾಳಿ ಮಾಡಿದ. ಅಬ್ಬಕ್ಕ ಅವರನ್ನು ಹಿಮ್ಮೆಟ್ಟಿಸಿದಳು. ಮೊಗವೀರ ಮೀನುಗಾರರು ಮತ್ತು ಬ್ಯಾರಿ ನಾವಿಕರು ರಾಣಿಯ ಬಲ. ಅಗ್ನಿಬಾಣ ಬಳಸಿದ ಕೊನೆಯವರಲ್ಲಿ ಒಬ್ಬಳು ಎಂದು ಐತಿಹ್ಯ. ಮಹಿಳೆಯರು ಖಡ್ಗಾಭ್ಯಾಸ ಮಾಡುತ್ತಿದ್ದಾರೆ. ರಾಣಿ ಕರಾವಳಿ ಮಹಿಳೆಯರನ್ನು ಸೇನೆ ಮಾಡಿದಳು. ಒಂದು ಸಾವಿರ ಐನೂರು ಅರವತ್ತೆಂಟರಲ್ಲಿ ಜನರಲ್ ಪೈಕ್ಸೊಟೊ ಉಳ್ಳಾಲವನ್ನು ಆಕ್ರಮಿಸಿ ಅರಮನೆ ಪ್ರವೇಶಿಸಿದ. ರಾಣಿ ಮಸೀದಿಯಲ್ಲಿ ಆಶ್ರಯ ಪಡೆದು ಅದೇ ರಾತ್ರಿ ಎರಡು ನೂರು ಸೈನಿಕರೊಂದಿಗೆ ಮರುದಾಳಿ ಮಾಡಿದಳು. ಪೋರ್ಚುಗೀಸರು ಮಂಗಳೂರು ಕೋಟೆಯಿಂದ ಹಿಂದೆ ಸರಿದರು. ಕೊನೆಯ ಚಿತ್ರ ಸ್ಮೃತಿ. ಉಳ್ಳಾಲದ ವೃತ್ತದಲ್ಲಿ ಅಬ್ಬಕ್ಕ ಜೀವಂತ. ಅಂಚೆಚೀಟಿಯಲ್ಲಿ ವೀರರಾಣಿ. ಕಿತ್ತೂರು ಚೆನ್ನಮ್ಮ ಮತ್ತು ಒನಕೆ ಓಬವ್ವರ ಸಾಲಿನಲ್ಲಿ ಕರ್ನಾಟಕ ಈ ರಾಣಿಯನ್ನು ಸ್ಮರಿಸುತ್ತದೆ. ಇದು ನಮ್ಮ ಕನ್ನಡ ವರದಿ. ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ. ಅಭಯರಾಣಿ. ನಾವು ಮತ್ತೆ ಸಿಗೋಣ."
  };

  async function playAbbakkaKannada() {
    vs._abbakkaClick = Date.now();
    isolateDesk("abbakka");
    toast("ರಾಣಿ ಅಬ್ಬಕ್ಕ ಕನ್ನಡ ಪೂರ್ಣಾವಧಿ ವೀಡಿಯೊ ಹಾಕುತ್ತಿದ್ದೇವೆ…");
    preloadVisemes("priya_nair");
    if (typeof state !== "undefined") {
      state.anchorModel = "priya_nair";
      state.currentLanguage = "kn-IN";
      state._ttsLang = "kn-IN";
      state.speechRate = 0.78;
      state.speechPitch = 1.05;
      state.volume = 0.75;
      state.userHasStarted = true;
      state._lockScript = true;
      state._fileNarration = true;
    }
    attachStory({
      title: ABBAKKA.title,
      script: ABBAKKA.script,
      category: ABBAKKA.category,
      language: "kn-IN"
    });
    if (typeof state !== "undefined") {
      state.scriptText = ABBAKKA.script;
      state.volume = 0.75;
    }
    vs.playing = true;
    document.body.classList.add("vs-film");
    playBg(ABBAKKA.video);
    playFileNarration();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (eR0) {}
    document.querySelectorAll("[data-model]").forEach(function (p) {
      p.classList.toggle("active", p.dataset.model === "priya_nair");
    });
    const modelSelect = $("anchorModelSelect");
    if (modelSelect) modelSelect.value = "priya_nair";
    const genderSelect = $("voiceGenderSelect");
    if (genderSelect) genderSelect.value = "female";
    if (typeof syncVoiceToPresenter === "function") {
      try { syncVoiceToPresenter(); } catch (e0) {}
    }
    openStudio();
    renderPills();
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
    vs.playing = true;
    syncPlayerUI();
    playBg(ABBAKKA.video);
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (eR) {}
    toast("ಅಬ್ಬಕ್ಕ ಚಿತ್ರಹಾದು ಚಾಲನೆ. Play ಒತ್ತಿ.");
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
    v.playsInline = true;
    const one = vs.clips.filter(function (c) { return c.type === "file"; }).length <= 1;
    v.loop = true;
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
    // Head box from the top so the forehead stays in frame (not a mid-body crop).
    const side = Math.round(Math.min(sw, sh) * 0.50);
    const sx = Math.max(0, Math.round((sw - side) / 2));
    const sy = Math.max(0, Math.round(sh * 0.02));
    return { sx, sy, side: Math.min(side, sh - sy, sw - sx) };
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
    ctx.font = "bold 16px sans-serif";
    let title = String(s.title || "World news");
    if (/[\u0C80-\u0CFF]/.test(title)) title = "Veerarani Abbakka Chouta";
    ctx.fillText(title, 96, 30);

    const pip = Math.round(Math.min(w * 0.26, h * 0.44, 300));
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
    ctx.font = "bold 18px sans-serif";
    const ticker = "  •  " + (s.title || "") + "  •  " + (s.script || "") + "  •  ";
    const tw = Math.max(240, ctx.measureText(ticker).width);
    const tx = w - ((t * 26) % (tw + w));
    ctx.fillText(ticker + ticker, tx, h - 16);
    ctx.restore();
  }

  function drawPresenterPip(ctx, w, h) {
    const size = Math.round(Math.min(w * 0.26, h * 0.44, 300));
    const x = 18;
    const y = h - size - 58;
    ctx.save();
    ctx.fillStyle = "#05070c";
    ctx.fillRect(x - 5, y - 5, size + 10, size + 10);
    ctx.strokeStyle = profile().color || "#00d2ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 3, y - 3, size + 6, size + 6);
    const src = talkingPresenterImg() || presenterImg();
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

    const bg = bgEl();
    const streaming = !!(bg && bg.videoWidth && bg.readyState >= 2);
    if (streaming) {
      if (vs.playing && bg.paused) {
        const p = bg.play();
        if (p && p.catch) p.catch(function () {});
      }
      if (typeof state !== "undefined" && !bg.paused && !bg.ended) {
        state.isSpeaking = true;
        state.isPaused = false;
        const words = state.scriptWords || [];
        if (bg.duration > 0 && words.length) {
          const idx = Math.min(words.length - 1, Math.floor((bg.currentTime / bg.duration) * words.length));
          if (idx !== state.currentWordIndex) {
            state.currentWordIndex = idx;
            state._wordT0 = performance.now();
            state._lastBoundary = performance.now();
          }
        }
      }
    } else {
      const hit = clipAt(vs.playhead);
      if (hit && hit.clip.type === "file") {
        drawFileClip(ctx, w, h, hit.clip);
      } else if (hit && hit.clip.type === "ai") {
        drawAiNews(ctx, w, h, t, hit.clip);
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

  function mediaDur() {
    const v = bgEl();
    if (v && isFinite(v.duration) && v.duration > 0) return v.duration;
    const n = $("vsNarration");
    if (n && isFinite(n.duration) && n.duration > 0) return n.duration;
    return totalDur();
  }
  function fmtTime(s) {
    s = Math.max(0, Number(s) || 0);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + String(sec).padStart(2, "0");
  }
  function seekTo(t, keepPlaying) {
    const dur = mediaDur();
    t = Math.max(0, Math.min(Math.max(0.01, dur - 0.05), t));
    vs.playhead = t;
    const v = bgEl();
    if (v) {
      try { v.currentTime = t; } catch (e) {}
      v.playbackRate = vs.rate || 1;
    }
    const n = $("vsNarration");
    if (n && isFinite(n.duration) && n.duration > 0) {
      try { n.currentTime = Math.min(n.duration - 0.05, t); } catch (e2) {}
      n.playbackRate = vs.rate || 1;
    }
    if (keepPlaying === false) {
      vs.playing = false;
      if (v) try { v.pause(); } catch (e3) {}
      pauseFileNarration();
    }
    updateScrubber();
  }
  function setRate(r) {
    vs.rate = Math.max(1, Math.min(10, Math.round(Number(r) || 1)));
    const v = bgEl();
    if (v) v.playbackRate = vs.rate;
    const n = $("vsNarration");
    if (n) n.playbackRate = vs.rate;
    ["vsSpeedLabel", "vsSpeedDockLabel"].forEach(function (id) {
      const el = $(id);
      if (el) el.textContent = vs.rate + "x";
    });
    ["vsSpeed", "vsSpeedDock"].forEach(function (id) {
      const el = $(id);
      if (el && String(el.value) !== String(vs.rate)) el.value = String(vs.rate);
    });
  }
  function skipBy(delta) {
    const v = bgEl();
    const now = (v && isFinite(v.currentTime)) ? v.currentTime : vs.playhead;
    seekTo(now + delta);
  }
  function updateScrubber() {
    const dur = mediaDur();
    const v = bgEl();
    const t = (v && isFinite(v.currentTime)) ? v.currentTime : vs.playhead;
    const pct = dur > 0 ? Math.max(0, Math.min(100, (t / dur) * 100)) : 0;
    const fill = $("vsScrubFill");
    const knob = $("vsScrubKnob");
    if (fill) fill.style.width = pct + "%";
    if (knob) knob.style.left = pct + "%";
    const clock = fmtTime(t) + " / " + fmtTime(dur);
    const ov = $("vsOvTime");
    if (ov) ov.textContent = clock;
    const under = $("vsUnderTime");
    if (under) under.textContent = clock;
    const ovPlay = $("vsOvPlay");
    if (ovPlay) {
      ovPlay.textContent = vs.playing ? "Pause" : "Play";
      ovPlay.classList.toggle("playing", !!vs.playing);
    }
  }
  function scrubFromEvent(ev) {
    const bar = $("vsScrub");
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    const x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX) - r.left;
    const pct = Math.max(0, Math.min(1, x / Math.max(1, r.width)));
    seekTo(pct * mediaDur());
  }
  function bindScrubber() {
    const bar = $("vsScrub");
    if (!bar || bar._bound) return;
    bar._bound = true;
    const start = function (ev) {
      vs.scrubbing = true;
      scrubFromEvent(ev);
      ev.preventDefault();
    };
    const move = function (ev) {
      if (!vs.scrubbing) return;
      scrubFromEvent(ev);
    };
    const end = function () { vs.scrubbing = false; };
    bar.addEventListener("pointerdown", start);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    bar.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
  }

  function loop(ts) {
    if (!vs.open) return;
    if (!vs.lastTs) vs.lastTs = ts;
    const dt = Math.min(0.05, (ts - vs.lastTs) / 1000);
    vs.lastTs = ts;
    if (!vs.scrubbing) {
      const v = bgEl();
      if (v && isFinite(v.currentTime) && v.readyState >= 2) {
        vs.playhead = v.currentTime;
        if (v.ended) {
          vs.playing = false;
        }
      } else if (vs.playing) {
        vs.playhead += dt * (vs.rate || 1);
        if (vs.playhead >= totalDur()) vs.playhead = 0;
      }
    }
    vs._tlAcc = (vs._tlAcc || 0) + dt;
    if (vs._tlAcc > 0.08) {
      vs._tlAcc = 0;
      updateScrubber();
      renderTimeline();
      syncPlayerUI();
    }
    if (typeof window.talkingAvatarTick === "function") {
      try { window.talkingAvatarTick(dt); } catch (eT) {}
    }
    const pip = $("vsPipLive");
    if (pip && (document.body.classList.contains("vs-film") || document.body.classList.contains("vs-open"))) {
      const im = talkingPresenterImg() || presenterImg();
      if (im && im.src && pip.src !== im.src) pip.src = im.src;
    }
    if (vs.open) {
      syncWordVideo();
      updateGfx();
    }
    fitCanvas();
    drawFrame(ts);
    vs.raf = requestAnimationFrame(loop);
  }

  function syncPlayerUI() {
    const pb = $("vsPlayBtn");
    if (pb) pb.textContent = vs.playing ? "Pause" : "Play presenter + timeline";
    const hint = $("vsUnderHint");
    if (hint) hint.textContent = vs.playing
      ? ("Playing " + (vs.rate || 1) + "x — drag the yellow dot to jump")
      : "Paused — drag the yellow dot, or Play";
    updateScrubber();
  }

  function togglePlay() {
    vs.playing = !vs.playing;
    const v = bgEl();
    if (v) {
      v.playbackRate = vs.rate || 1;
      if (vs.playing) {
        const p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        try { v.pause(); } catch (e0) {}
      }
    }
    syncPlayerUI();
    if (vs.playing) {
      if (vs.desk === "abbakka") {
        playFileNarration();
        if (typeof state !== "undefined") {
          state._fileNarration = true;
          state.isSpeaking = true;
          state.isPaused = false;
        }
      } else if (typeof startNewsBroadcast === "function") {
        try { startNewsBroadcast(); } catch (e) {}
      }
    } else {
      pauseFileNarration();
      if (typeof pauseNewsBroadcast === "function") {
        try { pauseNewsBroadcast(); } catch (e) {}
      }
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
        seekTo(acc + 0.01);
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
      seekTo(((ev.clientX - r.left) / r.width) * mediaDur());
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
    bindScrubber();
    $("vsOvPlay")?.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      togglePlay();
    });
    $("vsRewind")?.addEventListener("click", function (e) {
      e.preventDefault();
      skipBy(-5);
    });
    $("vsFwd")?.addEventListener("click", function (e) {
      e.preventDefault();
      skipBy(5);
    });
    $("vsUnderBack")?.addEventListener("click", function (e) {
      e.preventDefault();
      skipBy(-5);
    });
    $("vsUnderFwd")?.addEventListener("click", function (e) {
      e.preventDefault();
      skipBy(5);
    });
    function onSpeed(ev) { setRate(ev.target.value); }
    $("vsSpeed")?.addEventListener("input", onSpeed);
    $("vsSpeedDock")?.addEventListener("input", onSpeed);
    const bg = bgEl();
    if (bg && !bg._vsTimeBound) {
      bg._vsTimeBound = true;
      bg.addEventListener("timeupdate", function () {
        if (!vs.scrubbing) updateScrubber();
      });
      bg.addEventListener("ended", function () {
        vs.playing = false;
        pauseFileNarration();
        syncPlayerUI();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (!vs.open) return;
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); skipBy(e.shiftKey ? -15 : -5); }
      if (e.code === "ArrowRight") { e.preventDefault(); skipBy(e.shiftKey ? 15 : 5); }
      if (e.code === "ArrowUp") { e.preventDefault(); setRate((vs.rate || 1) + 1); }
      if (e.code === "ArrowDown") { e.preventDefault(); setRate((vs.rate || 1) - 1); }
    });
    $("vsPlayBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      const hasNarr = typeof state !== "undefined" && state._fileNarration;
      if (!vs.playing && !hasNarr && !(bgEl() && bgEl().src)) {
        playAbbakkaKannada();
        return;
      }
      togglePlay();
    });
    $("viewModeStudioBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      playAbbakkaKannada();
    });
    $("openVideoStudioBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      playAbbakkaKannada();
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
