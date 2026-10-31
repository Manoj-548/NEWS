/* HD portrait, no extra zoom. Mouth visemes follow the spoken words. */
(function () {
  const LANDMARKS = {
    nova_kade:       { cx: 0.50, eyeY: 0.220, mouthY: 0.292, chinY: 0.355, faceW: 0.16 },
    lyra_nova:       { cx: 0.50, eyeY: 0.260, mouthY: 0.322, chinY: 0.378, faceW: 0.10 },
    arjun_mehra:     { cx: 0.50, eyeY: 0.240, mouthY: 0.322, chinY: 0.378, faceW: 0.15 },
    priya_nair:      { cx: 0.50, eyeY: 0.265, mouthY: 0.338, chinY: 0.395, faceW: 0.15 },
    rajesh_sharma:   { cx: 0.50, eyeY: 0.255, mouthY: 0.325, chinY: 0.378, faceW: 0.13 },
    meera_kapoor:    { cx: 0.50, eyeY: 0.225, mouthY: 0.292, chinY: 0.345, faceW: 0.12 },
    alexander_hayes: { cx: 0.50, eyeY: 0.240, mouthY: 0.320, chinY: 0.378, faceW: 0.14 },
    sofia_reyes:     { cx: 0.50, eyeY: 0.280, mouthY: 0.338, chinY: 0.395, faceW: 0.11 },
    marcus_cole:     { cx: 0.50, eyeY: 0.235, mouthY: 0.328, chinY: 0.385, faceW: 0.14 }
  };

  const MATCHED = {
    nova_kade:       { A: 1, E: 1, O: 1 },
    lyra_nova:       { A: 1, O: 1 },
    arjun_mehra:     { A: 1, O: 1 },
    priya_nair:      { A: 1, E: 1, O: 1, F: 1 },
    rajesh_sharma:   { A: 1 },
    meera_kapoor:    { A: 1, E: 1, O: 1, F: 1 },
    alexander_hayes: { A: 1 },
    sofia_reyes:     { A: 1, E: 1 },
    marcus_cole:     { A: 1 }
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
    return { open: 0.45, width: 1, shape: "open" };
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
    function put(key, amt) {
      if (amt <= 0) return;
      if (allow[key]) z[key] += amt;
      else if (allow.A) z.A += amt * 0.9;
      else if (allow.O) z.O += amt * 0.75;
      else if (allow.E) z.E += amt * 0.75;
    }
    if (shape === "closed" || open < 0.04) return z;
    if (shape === "wide") put("E", 0.95);
    else if (shape === "round") put("O", 0.95);
    else if (shape === "teeth") put("F", 0.9);
    else if (shape === "open") put("A", 0.98);
    else put("A", 0.7);
    const sum = z.A + z.E + z.O + z.F;
    if (sum > 1) {
      z.A /= sum; z.E /= sum; z.O /= sum; z.F /= sum;
    }
    if (sum < 0.5) put("A", 0.9);
    return z;
  }

  function easeToward(cur, goal, k) {
    return cur + (goal - cur) * k;
  }

  const IDLE_CYCLE = [
    { char: "a", viseme: "open", open: 0.9 },
    { char: "e", viseme: "wide", open: 0.45 },
    { char: "o", viseme: "round", open: 0.72 },
    { char: "a", viseme: "open", open: 0.8 },
    { char: "m", viseme: "closed", open: 0.02 }
  ];

  function syncWordClock() {
    const words = state.scriptWords || [];
    if (!words.length) return;
    const now = performance.now();
    if (state._lastBoundary && now - state._lastBoundary < 380) return;
    const t0 = state._speakT0 || now;
    const elapsed = Math.max(0, (now - t0) / 1000);
    const wps = 2.5 * (state.speechRate || 1);
    const est = Math.min(words.length - 1, Math.floor(elapsed * wps));
    if (est !== state.currentWordIndex) {
      state.currentWordIndex = est;
      state.letterPhase = 0;
      state._visemeWord = est;
    }
  }

  function driveLetterVisemes(delta) {
    const speaking = !!(state.isSpeaking && !state.isPaused);
    const k = 1 - Math.exp(-12 * Math.max(0.001, delta));
    if (!state.faceW || typeof state.faceW.A !== "number") state.faceW = { A: 0, E: 0, O: 0, F: 0 };
    const id = state.anchorModel || "";
    const w = state.faceW;

    if (!speaking) {
      state.visemeMouthOpen = easeToward(state.visemeMouthOpen || 0, 0, k);
      state.visemeMouthWidth = easeToward(state.visemeMouthWidth || 1, 1, k);
      state.visemeShape = "closed";
      state.currentLetter = "";
      w.A = easeToward(w.A, 0, k);
      w.E = easeToward(w.E, 0, k);
      w.O = easeToward(w.O, 0, k);
      w.F = easeToward(w.F, 0, k);
      return;
    }

    syncWordClock();
    const words = state.scriptWords || [];
    const idx = Math.max(0, state.currentWordIndex || 0);
    if (state._visemeWord !== idx) {
      state._visemeWord = idx;
      state.letterPhase = 0;
    }
    const seq = window.wordToVisemes(words[idx] || "");
    const rate = 4.2 * (state.speechRate || 1);
    state.letterPhase = (state.letterPhase || 0) + delta * rate;
    let item;
    if (seq.length) {
      const i = Math.min(seq.length - 1, Math.floor(state.letterPhase));
      item = seq[i];
    } else {
      item = IDLE_CYCLE[Math.floor(state.letterPhase) % IDLE_CYCLE.length];
    }
    const v = window.visemeForChar(item.char || "a");
    state.currentLetter = item.char;
    state.visemeMouthOpen = easeToward(state.visemeMouthOpen || 0, item.open, k);
    state.visemeMouthWidth = easeToward(state.visemeMouthWidth || 1, v.width, k);
    state.visemeShape = item.viseme;
    const tw = targetWeights(id, item.viseme, item.open);
    w.A = easeToward(w.A, tw.A, k);
    w.E = easeToward(w.E, tw.E, k);
    w.O = easeToward(w.O, tw.O, k);
    w.F = easeToward(w.F, tw.F, k);
  }

  function talkingAvatarTick(delta) {
    if (typeof delta !== "number" || !isFinite(delta) || delta < 0) delta = 0.016;
    if (delta > 0.08) delta = 0.08;
    state.breathPhase = (state.breathPhase || 0) + delta * 0.4;
    if (Math.random() < 0.003 && (state.eyeBlink || 0) === 0) state.eyeBlink = 1;
    if (state.eyeBlink > 0) {
      state.eyeBlink -= delta * 6.5;
      if (state.eyeBlink < 0) state.eyeBlink = 0;
    }
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
      sx = (f.cx || 0.5) * nw - srcW / 2;
      sy = 0;
    } else {
      srcW = nw;
      srcH = srcW / ar;
      const eye = (f.eyeY || 0.26) * nh;
      sy = eye - srcH * 0.34;
      sx = 0;
    }
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + srcW > nw) sx = Math.max(0, nw - srcW);
    if (sy + srcH > nh) sy = Math.max(0, nh - srcH);
    return { nw, nh, sx, sy, srcW, srcH };
  }

  function pickTalkFrame(profile, base) {
    const allow = MATCHED[profile.id] || {};
    const bank = visemeBank[profile.id] || {};
    const fw = (state.faceW && typeof state.faceW.A === "number") ? state.faceW : { A: 0, E: 0, O: 0, F: 0 };
    const layers = [];
    if (allow.A && fw.A > 0.05 && ready(bank.A)) layers.push([fw.A, bank.A]);
    if (allow.E && fw.E > 0.05 && ready(bank.E)) layers.push([fw.E, bank.E]);
    if (allow.O && fw.O > 0.05 && ready(bank.O)) layers.push([fw.O, bank.O]);
    if (allow.F && fw.F > 0.05 && ready(bank.F)) layers.push([fw.F, bank.F]);
    layers.sort(function (a, b) { return b[0] - a[0]; });
    if (!layers.length) return { img: base, alpha: 0 };
    return { img: layers[0][1], alpha: Math.min(1, layers[0][0]) };
  }

  function drawPhotorealReader(profile, w, h) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    if (!base || !base.complete || !base.naturalWidth) return false;
    const f = marks(profile);
    const crop = cropRect(base, f, w, h);
    const talk = pickTalkFrame(profile, base);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    // One whole photograph only — mouth belongs to that face. No lip stamp, no blur ring.
    if (talk.img && talk.img !== base && talk.alpha > 0.55 && ready(talk.img)) {
      const vc = cropRect(talk.img, f, w, h);
      ctx.drawImage(talk.img, vc.sx, vc.sy, vc.srcW, vc.srcH, 0, 0, w, h);
    } else if (talk.img && talk.img !== base && talk.alpha > 0.08 && ready(talk.img)) {
      ctx.drawImage(base, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);
      const vc = cropRect(talk.img, f, w, h);
      ctx.globalAlpha = talk.alpha;
      ctx.drawImage(talk.img, vc.sx, vc.sy, vc.srcW, vc.srcH, 0, 0, w, h);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(base, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);
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
