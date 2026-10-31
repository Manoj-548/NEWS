/* HD portrait, no extra zoom. Mouth visemes follow the spoken words. */
(function () {
  const LANDMARKS = {
    nova_kade:       { cx: 0.50, eyeY: 0.220, mouthY: 0.295, chinY: 0.358, faceW: 0.18 },
    lyra_nova:       { cx: 0.50, eyeY: 0.255, mouthY: 0.325, chinY: 0.385, faceW: 0.15 },
    arjun_mehra:     { cx: 0.50, eyeY: 0.240, mouthY: 0.325, chinY: 0.382, faceW: 0.17 },
    priya_nair:      { cx: 0.50, eyeY: 0.265, mouthY: 0.342, chinY: 0.400, faceW: 0.17 },
    rajesh_sharma:   { cx: 0.50, eyeY: 0.255, mouthY: 0.328, chinY: 0.382, faceW: 0.16 },
    meera_kapoor:    { cx: 0.50, eyeY: 0.225, mouthY: 0.298, chinY: 0.350, faceW: 0.16 },
    alexander_hayes: { cx: 0.50, eyeY: 0.240, mouthY: 0.322, chinY: 0.380, faceW: 0.16 },
    sofia_reyes:     { cx: 0.50, eyeY: 0.275, mouthY: 0.340, chinY: 0.398, faceW: 0.15 },
    marcus_cole:     { cx: 0.50, eyeY: 0.235, mouthY: 0.330, chinY: 0.388, faceW: 0.16 }
  };

  const MATCHED = {
    nova_kade:       { M: 1, T: 1, A: 1, E: 1, O: 1, F: 1 },
    lyra_nova:       { M: 1, T: 1, A: 1, E: 1, O: 1 },
    arjun_mehra:     { M: 1, T: 1, A: 1, E: 1, O: 1, F: 1 },
    priya_nair:      { M: 1, T: 1, A: 1, E: 1, O: 1, F: 1 },
    rajesh_sharma:   { M: 1, T: 1, A: 1, E: 1, O: 1 },
    meera_kapoor:    { M: 1, T: 1, A: 1, E: 1, O: 1, F: 1 },
    alexander_hayes: { M: 1, T: 1, A: 1, E: 1, O: 1 },
    sofia_reyes:     { M: 1, T: 1, A: 1, E: 1, O: 1 },
    marcus_cole:     { M: 1, T: 1, A: 1, E: 1, O: 1 }
  };

  const LATIN_LETTER = {
    a: { open: 0.88, width: 1.08, shape: "open" },
    b: { open: 0, width: 0.82, shape: "closed" },
    c: { open: 0.18, width: 1.0, shape: "rest" },
    d: { open: 0.2, width: 1.0, shape: "rest" },
    e: { open: 0.42, width: 1.22, shape: "wide" },
    f: { open: 0.26, width: 1.06, shape: "teeth" },
    g: { open: 0.2, width: 1.0, shape: "rest" },
    h: { open: 0.22, width: 1.0, shape: "rest" },
    i: { open: 0.38, width: 1.2, shape: "wide" },
    j: { open: 0.3, width: 1.14, shape: "wide" },
    k: { open: 0.18, width: 1.0, shape: "rest" },
    l: { open: 0.22, width: 1.0, shape: "rest" },
    m: { open: 0, width: 0.8, shape: "closed" },
    n: { open: 0.16, width: 1.0, shape: "rest" },
    o: { open: 0.7, width: 0.7, shape: "round" },
    p: { open: 0, width: 0.82, shape: "closed" },
    q: { open: 0.18, width: 1.0, shape: "rest" },
    r: { open: 0.42, width: 0.84, shape: "round" },
    s: { open: 0.28, width: 1.16, shape: "wide" },
    t: { open: 0.18, width: 1.0, shape: "rest" },
    u: { open: 0.62, width: 0.7, shape: "round" },
    v: { open: 0.26, width: 1.06, shape: "teeth" },
    w: { open: 0.58, width: 0.7, shape: "round" },
    x: { open: 0.28, width: 1.12, shape: "wide" },
    y: { open: 0.38, width: 1.18, shape: "wide" },
    z: { open: 0.28, width: 1.16, shape: "wide" }
  };
  window.letterToViseme = LATIN_LETTER;

  const VISEME_ID = { closed: 0, rest: 1, wide: 2, open: 3, round: 4, teeth: 5 };

  const visemeBank = {};
  function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
  }
  Object.keys(LANDMARKS).forEach(function (id) {
    visemeBank[id] = {
      M: loadImg("assets/viseme_M_" + id + ".jpg"),
      T: loadImg("assets/viseme_talk_" + id + ".jpg"),
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
    if (!ch || /\s/.test(ch)) return { open: 0, width: 1, shape: "closed" };
    const t = String(ch).toLowerCase();
    const raw = String(ch);
    if (LATIN_LETTER[t]) return LATIN_LETTER[t];
    if (["mb", "mp"].indexOf(t) >= 0 || /[मपबभ]/.test(raw) || /[ಮಪಬ]/.test(raw) || /[மப]/.test(raw) || /[మపబ]/.test(raw))
      return { open: 0, width: 0.8, shape: "closed" };
    if (t === "ph" || /[फव]/.test(raw))
      return { open: 0.26, width: 1.05, shape: "teeth" };
    if (["th", "sh", "ch"].indexOf(t) >= 0)
      return { open: 0.3, width: 1.16, shape: "wide" };
    if (["ee", "ea", "ie", "ei", "ey"].indexOf(t) >= 0 || /[इईएऐिीेै]/.test(raw) || /[ಇಈಎಏಿೀೆೇ]/.test(raw) || /[இஈஎஏைிீ]/.test(raw) || /[ఇఈఎఏిీెే]/.test(raw))
      return { open: 0.4, width: 1.22, shape: "wide" };
    if (["oo", "ou", "ow", "ue", "ew", "oy", "oi"].indexOf(t) >= 0 || /[उऊओऔुूोौ]/.test(raw) || /[ಉಊಒಓುೂೊೋ]/.test(raw) || /[உஊஒஓொோுூ]/.test(raw) || /[ఉఊఒఓుూొో]/.test(raw))
      return { open: 0.66, width: 0.7, shape: "round" };
    if (["ay", "ai", "ah"].indexOf(t) >= 0 || /[अआा]/.test(raw) || /[ಅಆಾ]/.test(raw) || /[அஆா]/.test(raw) || /[అఆా]/.test(raw))
      return { open: 0.85, width: 1.08, shape: "open" };
    if (/[0-9]/.test(t)) return { open: 0.5, width: 1.05, shape: "open" };
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
    const z = { T: 0, A: 0, E: 0, O: 0, F: 0 };
    const allow = MATCHED[id] || {};
    function put(key, amt) {
      if (amt <= 0) return;
      if (allow[key]) z[key] += amt;
      else if (allow.T) z.T += amt * 0.8;
      else if (allow.E) z.E += amt * 0.55;
    }
    if (shape === "closed" || open < 0.04) return z;
    if (shape === "wide") put("E", 0.92);
    else if (shape === "round") put("O", 0.92);
    else if (shape === "teeth") put("F", 0.9);
    else put("T", 0.9);
    return z;
  }

  function easeToward(cur, goal, k) {
    return cur + (goal - cur) * k;
  }

  const DIGRAPHS = ["th", "sh", "ch", "ph", "wh", "ee", "ea", "ie", "ei", "oo", "ou", "ow", "ue", "ew", "ai", "ay", "ey", "oi", "oy", "ng"];

  function visemeRun(word) {
    const raw = window.wordToVisemes(word);
    const out = [];
    function mild(it) {
      let s = it.viseme;
      if (s === "rest") s = "talk";
      if (s === "open") s = "talk";
      const tok = String(it.char || "").toLowerCase();
      if (tok === "ai" || tok === "ay") return [{ char: tok, viseme: "talk", open: 0.32 }, { char: tok, viseme: "wide", open: 0.34 }];
      if (tok === "oi" || tok === "oy") return [{ char: tok, viseme: "round", open: 0.34 }, { char: tok, viseme: "wide", open: 0.34 }];
      if (tok === "ou" || tok === "ow") return [{ char: tok, viseme: "talk", open: 0.32 }, { char: tok, viseme: "round", open: 0.34 }];
      return [{ char: it.char, viseme: s, open: s === "closed" ? 0 : 0.34 }];
    }
    for (let i = 0; i < raw.length; i++) {
      const bits = mild(raw[i]);
      for (let b = 0; b < bits.length; b++) {
        const it = bits[b];
        if (out.length && out[out.length - 1].viseme === it.viseme) continue;
        out.push(it);
      }
    }
    if (!out.length) out.push({ char: word || "a", viseme: "talk", open: 0.32 });
    return out;
  }

  function driveLetterVisemes(delta) {
    const speaking = !!(state.isSpeaking && !state.isPaused);
    const k = 1 - Math.exp(-3.1 * Math.max(0.001, delta));
    if (!state.faceW || typeof state.faceW.T !== "number") state.faceW = { T: 0, A: 0, E: 0, O: 0, F: 0 };
    const id = state.anchorModel || "";
    const w = state.faceW;
    function applyW(tw) {
      w.T = easeToward(w.T || 0, tw.T || 0, k);
      w.A = easeToward(w.A || 0, tw.A || 0, k);
      w.E = easeToward(w.E || 0, tw.E || 0, k);
      w.O = easeToward(w.O || 0, tw.O || 0, k);
      w.F = easeToward(w.F || 0, tw.F || 0, k);
    }

    if (!speaking) {
      state.visemeMouthOpen = easeToward(state.visemeMouthOpen || 0, 0, k);
      state.visemeShape = "closed";
      state.currentLetter = "";
      applyW({ T: 0, A: 0, E: 0, O: 0, F: 0 });
      return;
    }

    const words = state.scriptWords || [];
    const rate = state.speechRate || 1;
    const now = performance.now();
    const boundAge = state._lastBoundary ? now - state._lastBoundary : 1e9;

    if (boundAge > 800 && words.length) {
      const elapsed = Math.max(0, (now - (state._speakT0 || now)) / 1000);
      const wps = 1.85 * rate;
      const est = Math.min(words.length - 1, Math.max(0, Math.floor(elapsed * wps)));
      if (est !== state.currentWordIndex) {
        state.currentWordIndex = est;
        state._wordT0 = now;
      }
    }

    const idx = Math.max(0, Math.min(Math.max(0, words.length - 1), state.currentWordIndex || 0));
    const word = words[idx] || "";
    const seq = visemeRun(word);
    const t0 = state._wordT0 || state._lastBoundary || state._speakT0 || now;
    const hold = 0.20 / Math.max(0.7, rate);
    const i = Math.min(seq.length - 1, Math.floor(Math.max(0, (now - t0) / 1000) / hold));
    const item = seq[i] || { viseme: "talk", open: 0.32, char: word };
    state.currentLetter = item.char;
    state.visemeShape = item.viseme;
    state.visemeMouthOpen = item.open;
    applyW(targetWeights(id, item.viseme, item.open));
  }

  function talkingAvatarTick(delta) {
    if (typeof delta !== "number" || !isFinite(delta) || delta < 0) delta = 0.016;
    if (delta > 0.08) delta = 0.08;
    state.headTilt = 0;
    state.gazeX = 0;
    state.shoulderSway = 0;
    state.bgPhase = (state.bgPhase || 0) + delta;
    state.eyeBlink = 0;
    driveLetterVisemes(delta);
  }
  window.talkingAvatarTick = talkingAvatarTick;
  window.updateFacialAnimations = talkingAvatarTick;

  function cropRect(img, f, w, h) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const ar = w / Math.max(1, h);
    let srcW, srcH, sx, sy;
    if (nw / nh >= ar) {
      srcH = nh;
      srcW = srcH * ar;
      sx = (nw - srcW) / 2;
      sy = 0;
    } else {
      srcW = nw;
      srcH = srcW / ar;
      sx = 0;
      sy = (nh - srcH) / 2;
    }
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + srcW > nw) sx = Math.max(0, nw - srcW);
    if (sy + srcH > nh) sy = Math.max(0, nh - srcH);
    return { nw, nh, sx, sy, srcW, srcH };
  }

  function mappedCrop(base, img, f, w, h) {
    const bc = cropRect(base, f, w, h);
    if (!img || img === base || !img.naturalWidth) return bc;
    return {
      nw: img.naturalWidth,
      nh: img.naturalHeight,
      sx: (bc.sx / bc.nw) * img.naturalWidth,
      sy: (bc.sy / bc.nh) * img.naturalHeight,
      srcW: (bc.srcW / bc.nw) * img.naturalWidth,
      srcH: (bc.srcH / bc.nh) * img.naturalHeight
    };
  }

  function pickMouthPhoto(id) {
    const speaking = !!(state.isSpeaking && !state.isPaused);
    if (!speaking) return null;
    const allow = MATCHED[id] || {};
    const bank = visemeBank[id] || {};
    function take(k) {
      return (allow[k] && ready(bank[k])) ? bank[k] : null;
    }
    const shape = state.visemeShape || "talk";
    if (shape === "closed") return take("M") || take("T");
    if (shape === "teeth") return take("F") || take("T");
    if (shape === "wide") return take("E") || take("T");
    if (shape === "round") return take("O") || take("T");
    return take("T") || take("E");
  }

  function drawPhotorealReader(profile, w, h) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    if (!base || !base.complete || !base.naturalWidth) return false;
    const f = marks(profile);
    const talk = pickMouthPhoto(profile.id);
    const img = talk || base;
    const crop = mappedCrop(base, img, f, w, h);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 1;
    ctx.drawImage(img, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);
    ctx.restore();
    return true;
  }

  window.getPresenterFaceOval = function (w, h) {
    const f = LANDMARKS[state.anchorModel] || { cx: 0.5, eyeY: 0.26, faceW: 0.16 };
    return {
      x: w * f.cx,
      y: h * (f.eyeY + 0.04),
      rx: Math.max(w * 0.28, w * f.faceW * 2.2),
      ry: h * 0.42
    };
  };

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
