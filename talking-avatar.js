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
    nova_kade:       { A: 1, E: 1, O: 1, F: 1 },
    lyra_nova:       { A: 1, E: 1, O: 1 },
    arjun_mehra:     { A: 1, E: 1, O: 1, F: 1 },
    priya_nair:      { A: 1, E: 1, O: 1, F: 1 },
    rajesh_sharma:   { A: 1, E: 1, O: 1 },
    meera_kapoor:    { A: 1, E: 1, O: 1, F: 1 },
    alexander_hayes: { A: 1, E: 1, O: 1 },
    sofia_reyes:     { A: 1, E: 1, O: 1 },
    marcus_cole:     { A: 1, E: 1, O: 1 }
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
    l: { open: 0.3, width: 1.12, shape: "wide" },
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
    const z = { A: 0, E: 0, O: 0, F: 0 };
    const allow = MATCHED[id] || {};
    function put(key, amt) {
      if (amt <= 0) return;
      if (allow[key]) z[key] += amt;
      else if (allow.E) z.E += amt * 0.7;
      else if (allow.O) z.O += amt * 0.55;
      else if (allow.A) z.A += amt * 0.45;
    }
    if (shape === "closed" || open < 0.04) return z;
    if (shape === "wide") put("E", 0.88);
    else if (shape === "round") put("O", 0.82);
    else if (shape === "teeth") put("F", 0.7);
    else if (shape === "open") { put("A", 0.5); put("E", 0.35); }
    else if (shape === "rest") put("E", 0.4);
    else put("E", 0.5);
    return z;
  }

  function easeToward(cur, goal, k) {
    return cur + (goal - cur) * k;
  }

  const DIGRAPHS = ["th", "sh", "ch", "ph", "wh", "ee", "ea", "ie", "ei", "oo", "ou", "ow", "ue", "ew", "ai", "ay", "ey", "oi", "oy", "ng"];

  function speakVisemes(word) {
    const raw = window.wordToVisemes(word);
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      let it = raw[i];
      if (it.viseme === "rest") continue;
      if (out.length && out[out.length - 1].viseme === it.viseme) continue;
      out.push(it);
    }
    if (!out.length) {
      const v = window.visemeForChar((word && word[0]) || "a");
      out.push({ char: word || "a", viseme: v.shape === "closed" ? "closed" : "open", open: v.shape === "closed" ? 0 : 0.55, id: v.shape === "closed" ? 0 : 3 });
    }
    return out;
  }

  function wordDurationSec(word, rate) {
    const n = Math.max(1, speakVisemes(word).length);
    return Math.min(1.05, Math.max(0.42, 0.2 + n * 0.28)) / Math.max(0.6, rate || 1);
  }

  function driveLetterVisemes(delta) {
    const speaking = !!(state.isSpeaking && !state.isPaused);
    const k = 1 - Math.exp(-2.8 * Math.max(0.001, delta));
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

    const words = state.scriptWords || [];
    const rate = state.speechRate || 1;
    const now = performance.now();
    const boundAge = state._lastBoundary ? now - state._lastBoundary : 1e9;

    if (!words.length) {
      const tw = targetWeights(id, "open", 0.55);
      w.A = easeToward(w.A, tw.A, k);
      w.E = easeToward(w.E, tw.E, k);
      w.O = easeToward(w.O, tw.O, k);
      w.F = easeToward(w.F, tw.F, k);
      return;
    }

    if (boundAge > 750) {
      const elapsed = Math.max(0, (now - (state._speakT0 || now)) / 1000);
      const wps = 2.05 * rate;
      const est = Math.min(words.length - 1, Math.max(0, Math.floor(elapsed * wps)));
      if (est !== state.currentWordIndex) {
        state.currentWordIndex = est;
        state._wordT0 = now;
      }
    }

    const idx = Math.max(0, Math.min(words.length - 1, state.currentWordIndex || 0));
    const word = words[idx] || "";
    const seq = speakVisemes(word);
    const t0 = state._wordT0 || state._lastBoundary || state._speakT0 || now;
    const dur = wordDurationSec(word, rate);
    const u = Math.min(0.999, Math.max(0, (now - t0) / 1000) / dur);
    const i = Math.min(seq.length - 1, Math.floor(u * seq.length));
    const item = seq[i] || { char: "a", viseme: "open", open: 0.55 };
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

  let mouthBuf = null;
  let mouthCtx = null;
  function stampSmileMouth(srcImg, f, w, h, alpha) {
    if (!ready(srcImg) || alpha < 0.06) return;
    const crop = cropRect(srcImg, f, w, h);
    const mx = ((f.cx * crop.nw - crop.sx) / crop.srcW) * w;
    const my = ((f.mouthY * crop.nh - crop.sy) / crop.srcH) * h;
    const faceW = (f.faceW * crop.nw / crop.srcW) * w;
    const dW = Math.max(36, Math.round(faceW * 0.50));
    const dH = Math.max(18, Math.round(faceW * 0.20));
    if (!mouthBuf) {
      mouthBuf = document.createElement("canvas");
      mouthCtx = mouthBuf.getContext("2d");
    }
    if (mouthBuf.width !== dW || mouthBuf.height !== dH) {
      mouthBuf.width = dW;
      mouthBuf.height = dH;
    }
    const b = mouthCtx;
    b.clearRect(0, 0, dW, dH);
    b.imageSmoothingEnabled = true;
    if (b.imageSmoothingQuality) b.imageSmoothingQuality = "high";
    const srcMW = (dW / w) * crop.srcW;
    const srcMH = (dH / h) * crop.srcH;
    const srcMX = (f.cx * crop.nw) - srcMW / 2;
    const srcMY = (f.mouthY * crop.nh) - srcMH * 0.45;
    b.drawImage(srcImg, srcMX, srcMY, srcMW, srcMH, 0, 0, dW, dH);
    b.globalCompositeOperation = "destination-in";
    const g = b.createRadialGradient(dW / 2, dH / 2, Math.min(dW, dH) * 0.12, dW / 2, dH / 2, Math.max(dW, dH) * 0.52);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.55, "rgba(0,0,0,0.75)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    b.fillStyle = g;
    b.fillRect(0, 0, dW, dH);
    b.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.globalAlpha = Math.min(0.92, alpha);
    ctx.drawImage(mouthBuf, mx - dW / 2, my - dH / 2);
    ctx.restore();
  }

  function drawPhotorealReader(profile, w, h) {
    const base = profile.asset ? assetImages[profile.asset] : null;
    if (!base || !base.complete || !base.naturalWidth) return false;
    const f = marks(profile);
    const crop = cropRect(base, f, w, h);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(base, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);

    const allow = MATCHED[profile.id] || {};
    const bank = visemeBank[profile.id] || {};
    const fw = (state.faceW && typeof state.faceW.A === "number") ? state.faceW : { A: 0, E: 0, O: 0, F: 0 };
    const layers = [];
    if (allow.A && fw.A > 0.05 && ready(bank.A)) layers.push([fw.A, bank.A]);
    if (allow.E && fw.E > 0.05 && ready(bank.E)) layers.push([fw.E, bank.E]);
    if (allow.O && fw.O > 0.05 && ready(bank.O)) layers.push([fw.O, bank.O]);
    if (allow.F && fw.F > 0.05 && ready(bank.F)) layers.push([fw.F, bank.F]);
    layers.sort(function (a, b) { return b[0] - a[0]; });
    if (layers.length) stampSmileMouth(layers[0][1], f, w, h, layers[0][0]);

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
