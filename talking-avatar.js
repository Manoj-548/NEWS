/* Head locked. Only the mouth changes. Voice/gender follow the presenter. */
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

  const OPEN_MOUTH = {
    nova_kade:       { cx: 0.50, mouthY: 0.50, faceW: 0.28 },
    lyra_nova:       { cx: 0.50, mouthY: 0.50, faceW: 0.16 },
    arjun_mehra:     { cx: 0.50, mouthY: 0.47, faceW: 0.28 },
    priya_nair:      { cx: 0.50, mouthY: 0.46, faceW: 0.32 },
    rajesh_sharma:   { cx: 0.50, mouthY: 0.47, faceW: 0.22 },
    meera_kapoor:    { cx: 0.50, mouthY: 0.47, faceW: 0.16 },
    alexander_hayes: { cx: 0.50, mouthY: 0.50, faceW: 0.28 },
    sofia_reyes:     { cx: 0.50, mouthY: 0.50, faceW: 0.16 },
    marcus_cole:     { cx: 0.50, mouthY: 0.48, faceW: 0.28 }
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
    const t = String(ch).toLowerCase();
    const raw = String(ch);
    if (["m", "b", "p", "mb", "mp"].indexOf(t) >= 0 || /[मपबभ]/.test(raw) || /[ಮಪಬ]/.test(raw) || /[மப]/.test(raw) || /[మపబ]/.test(raw))
      return { open: 0, width: 0.8, shape: "closed" };
    if (["f", "v", "ph"].indexOf(t) >= 0 || /[फव]/.test(raw))
      return { open: 0.25, width: 1.05, shape: "teeth" };
    if (["th", "sh", "ch", "s", "z", "j"].indexOf(t) >= 0)
      return { open: 0.28, width: 1.16, shape: "wide" };
    if (["ee", "ea", "ie", "ei", "i", "y", "e"].indexOf(t) >= 0 || /[इईएऐिीेै]/.test(raw) || /[ಇಈಎಏಿೀೆೇ]/.test(raw) || /[இஈஎஏைிீ]/.test(raw) || /[ఇఈఎఏిీెే]/.test(raw))
      return { open: 0.4, width: 1.22, shape: "wide" };
    if (["oo", "ou", "ow", "ue", "ew", "u", "o", "w", "oy", "oi"].indexOf(t) >= 0 || /[उऊओऔुूोौ]/.test(raw) || /[ಉಊಒಓುೂೊೋ]/.test(raw) || /[உஊஒஓொோுூ]/.test(raw) || /[ఉఊఒఓుూొో]/.test(raw))
      return { open: 0.65, width: 0.7, shape: "round" };
    if (["a", "ay", "ai", "ah"].indexOf(t) >= 0 || /[अआा]/.test(raw) || /[ಅಆಾ]/.test(raw) || /[அஆா]/.test(raw) || /[అఆా]/.test(raw))
      return { open: 0.85, width: 1.08, shape: "open" };
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

  function latinTokens(word) {
    const s = String(word).toLowerCase();
    const out = [];
    const digraphs = ["th", "sh", "ch", "ph", "wh", "ee", "ea", "ie", "ei", "oo", "ou", "ow", "ue", "ew", "ai", "ay", "ey", "oi", "oy", "ng"];
    for (let i = 0; i < s.length; ) {
      if (/[^a-z']/.test(s[i])) { i += 1; continue; }
      const two = s.slice(i, i + 2);
      if (digraphs.indexOf(two) >= 0) { out.push(two); i += 2; continue; }
      out.push(s[i]);
      i += 1;
    }
    return out;
  }

  window.wordToVisemes = function wordToVisemes(word) {
    const raw = String(word || "");
    const tokens = /^[A-Za-z']+$/.test(raw) ? latinTokens(raw) : lettersOf(raw);
    return tokens.map(function (tok) {
      const v = window.visemeForChar(tok);
      return { char: tok, viseme: v.shape, id: VISEME_ID[v.shape] ?? 1, open: v.open };
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
    const speaking = !!(state.isSpeaking && !state.isPaused && state.userHasStarted);
    if (!speaking) {
      state.visemeMouthOpen *= 0.65;
      if (state.visemeMouthOpen < 0.05) state.visemeMouthOpen = 0;
      state.visemeShape = "closed";
      state.currentLetter = "";
      return;
    }
    const words = state.scriptWords || [];
    const idx = Math.max(0, state.currentWordIndex || 0);
    if (state._visemeWord !== idx) {
      state._visemeWord = idx;
      state.letterPhase = 0;
      state.currentWordVec = window.wordToVec(words[idx] || "");
    }
    const seq = window.wordToVisemes(words[idx] || "");
    state.letterPhase = (state.letterPhase || 0) + delta * 3.2 * (state.speechRate || 1);
    const i = seq.length ? Math.min(seq.length - 1, Math.floor(state.letterPhase)) : 0;
    const item = seq[i] || { char: "A", viseme: "open", open: 0.7 };
    const v = window.visemeForChar(item.char);
    state.currentLetter = item.char;
    state.visemeMouthOpen += (item.open - (state.visemeMouthOpen || 0)) * 0.4;
    state.visemeMouthWidth += (v.width - (state.visemeMouthWidth || 1)) * 0.4;
    state.visemeShape = item.viseme;
  }

  window.updateFacialAnimations = function (delta) {
    state.breathPhase += delta * 1.2;
    if (Math.random() < 0.004 && state.eyeBlink === 0) state.eyeBlink = 1;
    if (state.eyeBlink > 0) {
      state.eyeBlink -= delta * 9;
      if (state.eyeBlink < 0) state.eyeBlink = 0;
    }
    driveLetterVisemes(delta);
  };

  function pickMouthPhoto(profile, shape) {
    const bank = visemeBank[profile.id] || {};
    if (shape === "wide" && ready(bank.E)) return bank.E;
    if (shape === "round" && ready(bank.O)) return bank.O;
    if (shape === "teeth" && ready(bank.F)) return bank.F;
    if (shape === "open" && ready(bank.A)) return bank.A;
    if (ready(bank.A)) return bank.A;
    if (ready(bank.O)) return bank.O;
    if (ready(bank.E)) return bank.E;
    return null;
  }

  let mouthBuf = null;
  let mouthBufCtx = null;
  function stampSoftMouth(srcImg, om, mx, my, faceW, vis) {
    const onw = srcImg.naturalWidth;
    const onh = srcImg.naturalHeight;
    const pW = Math.max(8, om.faceW * onw * 0.32);
    const pH = Math.max(6, om.faceW * onw * 0.20);
    const pX = om.cx * onw - pW / 2;
    const pY = om.mouthY * onh - pH * 0.42;
    if (pX < 0 || pY < 0 || pX + pW > onw || pY + pH > onh) return;

    let dW = Math.max(10, Math.round(faceW * 0.20 * (vis.width || 1)));
    let dH = Math.max(7, Math.round(faceW * 0.085));
    if (vis.shape === "open") dH = Math.round(faceW * 0.10);
    else if (vis.shape === "round") { dW = Math.round(faceW * 0.15); dH = Math.round(faceW * 0.10); }
    else if (vis.shape === "wide") { dW = Math.round(faceW * 0.24); dH = Math.round(faceW * 0.07); }

    if (!mouthBuf) {
      mouthBuf = document.createElement("canvas");
      mouthBufCtx = mouthBuf.getContext("2d");
    }
    if (mouthBuf.width !== dW || mouthBuf.height !== dH) {
      mouthBuf.width = dW;
      mouthBuf.height = dH;
    }
    const m = mouthBufCtx;
    m.clearRect(0, 0, dW, dH);
    m.drawImage(srcImg, pX, pY, pW, pH, 0, 0, dW, dH);
    m.globalCompositeOperation = "destination-in";
    const g = m.createRadialGradient(dW / 2, dH / 2, Math.min(dW, dH) * 0.12, dW / 2, dH / 2, Math.max(dW, dH) * 0.52);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.65, "rgba(0,0,0,0.9)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    m.fillStyle = g;
    m.fillRect(0, 0, dW, dH);
    m.globalCompositeOperation = "source-over";
    ctx.drawImage(mouthBuf, mx - dW / 2, my - dH / 2);
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
    return { nw, nh, sx, sy, srcW, srcH };
  }

  function drawPhotorealReader(profile, w, h) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    if (!base || !base.complete || !base.naturalWidth) return false;

    const f = marks(profile);
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused && state.userHasStarted);
    const vis = {
      open: state.visemeMouthOpen || 0,
      width: state.visemeMouthWidth || 1,
      shape: state.visemeShape || "closed"
    };

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    const crop = cropAndDraw(base, f, w, h);

    if (speaking && vis.shape !== "closed" && vis.open > 0.12) {
      const mouthSrc = pickMouthPhoto(profile, vis.shape);
      if (mouthSrc) {
        const mx = ((f.cx * crop.nw - crop.sx) / crop.srcW) * w;
        const my = ((f.mouthY * crop.nh - crop.sy) / crop.srcH) * h;
        const faceW = (f.faceW * crop.nw / crop.srcW) * w;
        const om = OPEN_MOUTH[profile.id] || { cx: 0.5, mouthY: 0.48, faceW: 0.22 };
        stampSoftMouth(mouthSrc, om, mx, my, faceW, vis);
      }
    }

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

  window.syncVoiceToPresenter = function syncVoiceToPresenter() {
    const profile = typeof getAnchorProfile === "function" ? getAnchorProfile(state.anchorModel) : null;
    const gender = profile && profile.gender === "female" ? "female" : "male";
    const sel = document.getElementById("voiceGenderSelect");
    if (sel) sel.value = gender;
    const lang = state.currentLanguage || document.getElementById("languageSelect")?.value || "en-IN";
    if (typeof pickVoiceForLanguage === "function") {
      state.currentVoice = pickVoiceForLanguage(lang, gender);
    }
    return gender;
  };

  if (typeof ANCHOR_PROFILES !== "undefined") {
    Object.keys(LANDMARKS).forEach(function (id) {
      if (ANCHOR_PROFILES[id]) ANCHOR_PROFILES[id].face = LANDMARKS[id];
    });
  }
})();
