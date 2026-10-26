/* Photoreal lip-sync: swap real mouth-shape photos. Never paint an oval. */
(function () {
  const LANDMARKS = {
    nova_kade:       { cx: 0.50, eyeY: 0.250, mouthY: 0.329, chinY: 0.385, faceW: 0.14 },
    lyra_nova:       { cx: 0.50, eyeY: 0.285, mouthY: 0.298, chinY: 0.390, faceW: 0.11 },
    arjun_mehra:     { cx: 0.50, eyeY: 0.255, mouthY: 0.339, chinY: 0.385, faceW: 0.15 },
    priya_nair:      { cx: 0.50, eyeY: 0.275, mouthY: 0.318, chinY: 0.395, faceW: 0.16 },
    rajesh_sharma:   { cx: 0.50, eyeY: 0.282, mouthY: 0.381, chinY: 0.385, faceW: 0.12 },
    meera_kapoor:    { cx: 0.50, eyeY: 0.280, mouthY: 0.324, chinY: 0.410, faceW: 0.12 },
    alexander_hayes: { cx: 0.50, eyeY: 0.265, mouthY: 0.345, chinY: 0.395, faceW: 0.15 },
    sofia_reyes:     { cx: 0.50, eyeY: 0.310, mouthY: 0.346, chinY: 0.420, faceW: 0.11 },
    marcus_cole:     { cx: 0.50, eyeY: 0.265, mouthY: 0.375, chinY: 0.400, faceW: 0.14 }
  };

  const VISEME_ID = { closed: 0, rest: 1, wide: 2, open: 3, round: 4, teeth: 5 };

  const visemeBank = {};
  function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
  }
  Object.keys(LANDMARKS).forEach(function (id) {
    visemeBank[id] = {
      A: loadImg("assets/viseme_open_" + id + ".jpg"),
      E: loadImg("assets/viseme_E_" + id + ".jpg"),
      O: loadImg("assets/viseme_O_" + id + ".jpg"),
      F: loadImg("assets/viseme_F_" + id + ".jpg")
    };
  });

  function ready(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function marks(profile) {
    return LANDMARKS[profile?.id] || profile?.face || { cx: 0.5, eyeY: 0.26, mouthY: 0.34, chinY: 0.39, faceW: 0.14 };
  }

  window.visemeForChar = function visemeForChar(ch) {
    if (!ch || /\s/.test(ch)) return { open: 0.05, width: 1, shape: "rest" };
    const c = String(ch).toUpperCase();
    const raw = String(ch);
    if (/[MBP]/.test(c) || /[मपबभ]/.test(raw) || /[ಮಪಬ]/.test(raw) || /[மப]/.test(raw) || /[మపబ]/.test(raw))
      return { open: 0, width: 0.8, shape: "closed" };
    if (/[FV]/.test(c) || /[फव]/.test(raw))
      return { open: 0.25, width: 1.05, shape: "teeth" };
    if (/[AÁÀÂÄĀ]/.test(c) || /[अआा]/.test(raw) || /[ಅಆಾ]/.test(raw) || /[அஆா]/.test(raw) || /[అఆా]/.test(raw))
      return { open: 0.85, width: 1.08, shape: "open" };
    if (/[EÉÈÊËIÍÌÎÏY]/.test(c) || /[इईएऐिीेै]/.test(raw) || /[ಇಈಎಏಿೀೆೇ]/.test(raw) || /[இஈஎஏைிீ]/.test(raw) || /[ఇఈఎఏిీెే]/.test(raw))
      return { open: 0.4, width: 1.22, shape: "wide" };
    if (/[OÓÒÔÖUÚÙÛÜW]/.test(c) || /[उऊओऔुूोौ]/.test(raw) || /[ಉಊಒಓುೂೊೋ]/.test(raw) || /[உஊஒஓொோுூ]/.test(raw) || /[ఉఊఒఓుూొో]/.test(raw))
      return { open: 0.65, width: 0.7, shape: "round" };
    return { open: 0.22, width: 1, shape: "rest" };
  };

  function lettersOf(word) {
    const out = [];
    for (const ch of String(word || "")) {
      const cp = ch.codePointAt(0);
      if (cp === 0x094d || cp === 0x093c || cp === 0x0ccd || cp === 0x0bcd || cp === 0x0c4d || cp === 0x0d4d) continue;
      if (/[\s.,!?;:।'"()[\]{}…—–-]/.test(ch)) continue;
      out.push(ch);
    }
    return out;
  }

  window.wordToVisemes = function wordToVisemes(word) {
    return lettersOf(word).map(function (ch) {
      const v = window.visemeForChar(ch);
      return { char: ch, viseme: v.shape, id: VISEME_ID[v.shape] ?? 1, open: v.open };
    });
  };

  window.wordToVec = function wordToVec(word) {
    const vec = [0, 0, 0, 0, 0, 0];
    const seq = window.wordToVisemes(word);
    seq.forEach(function (x) { vec[x.id] += 1; });
    const n = seq.length || 1;
    return vec.map(function (x) { return x / n; });
  };

  window.scriptToVisemeVec = function scriptToVisemeVec(text) {
    return String(text || "").split(/\s+/).filter(Boolean).map(function (w) {
      return { word: w, visemes: window.wordToVisemes(w), vec: window.wordToVec(w) };
    });
  };

  function driveLetterVisemes(delta) {
    const speaking = !!(state.isSpeaking && !state.isPaused);
    if (!speaking) {
      state.visemeMouthOpen *= 0.7;
      if (state.visemeMouthOpen < 0.04) state.visemeMouthOpen = 0;
      state.visemeShape = "closed";
      state.currentLetter = "";
      return;
    }
    const words = state.scriptWords || [];
    const idx = Math.max(0, state.currentWordIndex || 0);
    if (state._visemeWord !== idx) {
      state._visemeWord = idx;
      state.letterPhase = 0;
      const w = words[idx] || "";
      state.currentWordVec = window.wordToVec(w);
    }
    const letters = lettersOf(words[idx] || "");
    state.letterPhase = (state.letterPhase || 0) + delta * 8 * (state.speechRate || 1);
    const ch = letters.length ? letters[Math.floor(state.letterPhase) % letters.length] : "A";
    const v = window.visemeForChar(ch);
    state.currentLetter = ch;
    state.visemeMouthOpen += (v.open - (state.visemeMouthOpen || 0)) * 0.55;
    state.visemeMouthWidth += (v.width - (state.visemeMouthWidth || 1)) * 0.55;
    state.visemeShape = v.shape;
  }

  window.updateFacialAnimations = function (delta) {
    state.breathPhase += delta * 1.6;
    if (Math.random() < 0.006 && state.eyeBlink === 0) state.eyeBlink = 1;
    if (state.eyeBlink > 0) {
      state.eyeBlink -= delta * 9;
      if (state.eyeBlink < 0) state.eyeBlink = 0;
    }
    driveLetterVisemes(delta);
  };

  function pickVisemePhoto(profile, shape) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    const bank = visemeBank[profile.id] || {};
    if (shape === "closed" || !shape) return base;
    if (shape === "wide" && ready(bank.E)) return bank.E;
    if (shape === "round" && ready(bank.O)) return bank.O;
    if (shape === "teeth" && ready(bank.F)) return bank.F;
    if (ready(bank.A)) return bank.A;
    if (ready(bank.O)) return bank.O;
    if (ready(bank.E)) return bank.E;
    return base;
  }

  function cropAndDraw(img, f, w, h) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const headTop = Math.max(0, (f.eyeY || 0.26) - 0.16);
    const chest = Math.min(1, (f.chinY || 0.4) + 0.32);
    let srcH = (chest - headTop) * nh;
    let srcW = srcH * (w / Math.max(1, h));
    if (srcW > nw) {
      srcW = nw;
      srcH = srcW * (h / Math.max(1, w));
    }
    let sx = (f.cx || 0.5) * nw - srcW / 2;
    let sy = headTop * nh;
    if (sx < 0) sx = 0;
    if (sx + srcW > nw) sx = Math.max(0, nw - srcW);
    if (sy < 0) sy = 0;
    if (sy + srcH > nh) sy = Math.max(0, nh - srcH);
    ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, w, h);
  }

  function drawPhotorealReader(profile, w, h) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    if (!base || !base.complete || !base.naturalWidth) return false;

    const f = marks(profile);
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const shape = speaking ? (state.visemeShape || "open") : "closed";
    const img = pickVisemePhoto(profile, shape) || base;
    const breath = Math.sin(state.breathPhase || 0) * (speaking ? 1.1 : 0.4);

    ctx.save();
    ctx.translate(0, breath);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    cropAndDraw(img, f, w, h);
    ctx.restore();
    return true;
  }

  window.drawTalkingNewsReader = function (profile, w, h) {
    drawPhotorealReader(profile, w, h);
  };

  window.renderAdvancedAnchor = function (profile, w, h) {
    if (profile.kind === "robot" || profile.id === "nexus_3d") {
      if (typeof drawHumanoid3DAnchor === "function") drawHumanoid3DAnchor(w, h);
      return;
    }
    if (!drawPhotorealReader(profile, w, h)) {
      if (typeof drawHumanoid3DAnchor === "function") drawHumanoid3DAnchor(w, h);
    }
  };

  window.drawMaleAnchorModel = function () {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const profile = typeof getAnchorProfile === "function"
      ? getAnchorProfile(state.anchorModel)
      : { id: state.anchorModel, name: "Anchor", title: "News Reader", color: "#00d2ff", kind: "human" };
    window.renderAdvancedAnchor(profile, w, h);
    if (typeof drawPresenterLowerThird === "function") drawPresenterLowerThird(profile, w, h);
  };

  if (typeof ANCHOR_PROFILES !== "undefined") {
    Object.keys(LANDMARKS).forEach(function (id) {
      if (ANCHOR_PROFILES[id]) ANCHOR_PROFILES[id].face = LANDMARKS[id];
    });
  }
})();
