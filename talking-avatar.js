/* Head locked. Same-pose viseme photos ease in slowly. Face actions follow the voice. */
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

  // Only blend viseme photos that match the base portrait pose/framing.
  const MATCHED = {
    meera_kapoor: { A: 1, E: 1, O: 1, F: 1 },
    priya_nair:   { A: 1, E: 1, O: 1, F: 1 },
    arjun_mehra:  { A: 1, O: 1 }
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

  function targetWeights(id, shape, open) {
    const z = { A: 0, E: 0, O: 0, F: 0 };
    const allow = MATCHED[id] || {};
    if (!(open > 0.06)) return z;
    const s = Math.min(1, Math.max(0, open));
    function put(key, amt) {
      if (allow[key]) z[key] += amt;
      else if (allow.A) z.A += amt * 0.55;
    }
    if (shape === "wide") put("E", s);
    else if (shape === "round") put("O", s);
    else if (shape === "teeth") put("F", s);
    else if (shape === "open") put("A", s);
    else if (shape === "rest") { put("A", s * 0.28); put("E", s * 0.12); }
    else if (shape !== "closed") put("A", s * 0.45);
    const sum = z.A + z.E + z.O + z.F;
    if (sum > 1.05) {
      z.A /= sum; z.E /= sum; z.O /= sum; z.F /= sum;
    }
    return z;
  }

  function easeToward(cur, goal, k) {
    return cur + (goal - cur) * k;
  }

  function driveLetterVisemes(delta) {
    const speaking = !!(state.isSpeaking && !state.isPaused && state.userHasStarted);
    const k = 1 - Math.exp(-3.1 * Math.max(0.001, delta));
    if (!state.faceW) state.faceW = { A: 0, E: 0, O: 0, F: 0 };
    const id = state.anchorModel || "";
    const w = state.faceW;

    if (!speaking) {
      state.visemeMouthOpen = easeToward(state.visemeMouthOpen || 0, 0, k);
      state.visemeMouthWidth = easeToward(state.visemeMouthWidth || 1, 1, k);
      state.visemeShape = "closed";
      state.currentLetter = "";
      state.browLift = easeToward(state.browLift || 0, 0, k);
      state.cheekRaise = easeToward(state.cheekRaise || 0, 0, k);
      state.jawOpen = easeToward(state.jawOpen || 0, 0, k);
      w.A = easeToward(w.A, 0, k);
      w.E = easeToward(w.E, 0, k);
      w.O = easeToward(w.O, 0, k);
      w.F = easeToward(w.F, 0, k);
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
    const rate = 2.05 * (state.speechRate || 1);
    state.letterPhase = (state.letterPhase || 0) + delta * rate;
    let i = 0;
    if (seq.length) i = Math.min(seq.length - 1, Math.floor(state.letterPhase));
    const item = seq[i] || { char: "", viseme: "rest", open: 0.18 };
    const v = window.visemeForChar(item.char || "e");
    state.currentLetter = item.char;
    state.visemeMouthOpen = easeToward(state.visemeMouthOpen || 0, item.open, k);
    state.visemeMouthWidth = easeToward(state.visemeMouthWidth || 1, v.width, k);
    state.visemeShape = item.viseme;

    const tBrow = (item.viseme === "open" || item.viseme === "wide") ? 0.32 : (item.viseme === "round" ? 0.18 : 0.06);
    const tCheek = item.viseme === "wide" ? 0.42 : (item.viseme === "open" ? 0.14 : 0);
    state.browLift = easeToward(state.browLift || 0, tBrow, k);
    state.cheekRaise = easeToward(state.cheekRaise || 0, tCheek, k);
    state.jawOpen = easeToward(state.jawOpen || 0, item.open, k);

    const tw = targetWeights(id, item.viseme, item.open);
    w.A = easeToward(w.A, tw.A, k);
    w.E = easeToward(w.E, tw.E, k);
    w.O = easeToward(w.O, tw.O, k);
    w.F = easeToward(w.F, tw.F, k);
  }

  window.updateFacialAnimations = function (delta) {
    state.breathPhase += delta * 0.55;
    if (Math.random() < 0.0032 && state.eyeBlink === 0) state.eyeBlink = 1;
    if (state.eyeBlink > 0) {
      state.eyeBlink -= delta * 6.5;
      if (state.eyeBlink < 0) state.eyeBlink = 0;
    }
    driveLetterVisemes(delta);
  };

  function cropRect(img, f, w, h) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const headTop = Math.max(0, (f.eyeY || 0.26) - 0.18);
    const chest = Math.min(1, (f.chinY || 0.4) + 0.20);
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
    return { nw, nh, sx, sy, srcW, srcH };
  }

  let faceBuf = null;
  let faceCtx = null;
  function ensureBuf(w, h) {
    if (!faceBuf) {
      faceBuf = document.createElement("canvas");
      faceCtx = faceBuf.getContext("2d");
    }
    if (faceBuf.width !== w || faceBuf.height !== h) {
      faceBuf.width = w;
      faceBuf.height = h;
    }
    return faceCtx;
  }

  function blendVisemeLayer(srcImg, f, w, h, alpha) {
    if (!ready(srcImg) || alpha < 0.03) return;
    const crop = cropRect(srcImg, f, w, h);
    const b = ensureBuf(w, h);
    b.clearRect(0, 0, w, h);
    b.imageSmoothingEnabled = true;
    if (b.imageSmoothingQuality) b.imageSmoothingQuality = "high";
    b.drawImage(srcImg, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);

    const mx = ((f.cx * crop.nw - crop.sx) / crop.srcW) * w;
    const my = ((f.mouthY * crop.nh - crop.sy) / crop.srcH) * h;
    const eyeY = ((f.eyeY * crop.nh - crop.sy) / crop.srcH) * h;
    const jawY = ((f.chinY * crop.nh - crop.sy) / crop.srcH) * h;
    const faceW = (f.faceW * crop.nw / crop.srcW) * w;
    const rx = faceW * 0.95;
    const ry = Math.max(faceW * 0.42, (jawY - eyeY) * 0.62);
    const cy = my + (jawY - my) * 0.08;

    b.globalCompositeOperation = "destination-in";
    const g = b.createRadialGradient(mx, cy, Math.min(rx, ry) * 0.16, mx, cy, Math.max(rx, ry) * 0.98);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.48, "rgba(0,0,0,0.94)");
    g.addColorStop(0.78, "rgba(0,0,0,0.45)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    b.fillStyle = g;
    b.fillRect(0, 0, w, h);
    b.globalCompositeOperation = "source-over";

    ctx.save();
    ctx.globalAlpha = Math.min(0.9, alpha);
    ctx.drawImage(faceBuf, 0, 0);
    ctx.restore();
  }

  function drawPhotorealReader(profile, w, h) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    if (!base || !base.complete || !base.naturalWidth) return false;
    const f = marks(profile);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    const crop = cropRect(base, f, w, h);
    ctx.drawImage(base, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);

    const allow = MATCHED[profile.id] || {};
    const bank = visemeBank[profile.id] || {};
    const fw = state.faceW || { A: 0, E: 0, O: 0, F: 0 };
    const layers = [];
    if (allow.A && fw.A > 0.04) layers.push([fw.A, bank.A]);
    if (allow.E && fw.E > 0.04) layers.push([fw.E, bank.E]);
    if (allow.O && fw.O > 0.04) layers.push([fw.O, bank.O]);
    if (allow.F && fw.F > 0.04) layers.push([fw.F, bank.F]);
    layers.sort(function (a, b) { return b[0] - a[0]; });
    const n = Math.min(2, layers.length);
    for (let i = 0; i < n; i++) blendVisemeLayer(layers[i][1], f, w, h, layers[i][0]);

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
