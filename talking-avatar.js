/* Photoreal presenters. Real open-mouth photos composite onto the real lips. No painted oval. */
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
    lyra_nova:       { cx: 0.50, mouthY: 0.58, faceW: 0.14 },
    arjun_mehra:     { cx: 0.50, mouthY: 0.47, faceW: 0.28 },
    priya_nair:      { cx: 0.50, mouthY: 0.46, faceW: 0.32 },
    rajesh_sharma:   { cx: 0.50, mouthY: 0.47, faceW: 0.22 },
    meera_kapoor:    { cx: 0.50, mouthY: 0.475, faceW: 0.16 },
    alexander_hayes: { cx: 0.50, mouthY: 0.50, faceW: 0.28 },
    sofia_reyes:     { cx: 0.50, mouthY: 0.56, faceW: 0.14 },
    marcus_cole:     { cx: 0.50, mouthY: 0.48, faceW: 0.28 }
  };

  const visemeOpen = {};
  Object.keys(LANDMARKS).forEach(function (id) {
    const img = new Image();
    img.src = "assets/viseme_open_" + id + ".jpg";
    visemeOpen[id] = img;
  });

  function marks(profile) {
    return LANDMARKS[profile?.id] || profile?.face || { cx: 0.5, eyeY: 0.26, mouthY: 0.34, chinY: 0.39, faceW: 0.14 };
  }

  window.visemeForChar = function visemeForChar(ch) {
    if (!ch || /\s/.test(ch)) return { open: 0.06, width: 1, shape: "rest" };
    const c = String(ch).toUpperCase();
    const raw = String(ch);
    if (/[MBP]/.test(c) || /[मपबभप]/.test(raw) || /[ಮಪಬಭ]/.test(raw) || /[மபப]/.test(raw) || /[మపబభ]/.test(raw))
      return { open: 0.02, width: 0.78, shape: "closed" };
    if (/[FV]/.test(c) || /[फव]/.test(raw))
      return { open: 0.22, width: 1.08, shape: "teeth" };
    if (/[AÁÀÂÄĀ]/.test(c) || /[अआा]/.test(raw) || /[ಅಆಾ]/.test(raw) || /[அஆா]/.test(raw) || /[అఆా]/.test(raw))
      return { open: 0.9, width: 1.1, shape: "open" };
    if (/[EÉÈÊËIÍÌÎÏY]/.test(c) || /[इईएऐिीेै]/.test(raw) || /[ಇಈಎಏಿೀೆೇ]/.test(raw) || /[இஈஎஏைிீ]/.test(raw))
      return { open: 0.45, width: 1.22, shape: "wide" };
    if (/[OÓÒÔÖUÚÙÛÜ]/.test(c) || /[उऊओऔुूोौ]/.test(raw) || /[ಉಊಒಓುೂೊೋ]/.test(raw) || /[உஊஒஓொோுூ]/.test(raw))
      return { open: 0.7, width: 0.72, shape: "round" };
    return { open: 0.28, width: 1.0, shape: "rest" };
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

  function driveLetterVisemes(delta) {
    const speaking = !!(state.isSpeaking && !state.isPaused);
    if (!speaking) {
      state.visemeMouthOpen *= 0.75;
      if (state.visemeMouthOpen < 0.04) state.visemeMouthOpen = 0;
      state.visemeMouthWidth = 1;
      state.visemeShape = "rest";
      return;
    }
    const words = state.scriptWords || [];
    const idx = Math.max(0, state.currentWordIndex || 0);
    if (state._visemeWord !== idx) {
      state._visemeWord = idx;
      state.letterPhase = 0;
    }
    const letters = lettersOf(words[idx] || "");
    state.letterPhase = (state.letterPhase || 0) + delta * 7 * (state.speechRate || 1);
    const ch = letters.length ? letters[Math.floor(state.letterPhase) % letters.length] : "A";
    const v = window.visemeForChar(ch);
    state.visemeMouthOpen += (v.open - (state.visemeMouthOpen || 0)) * 0.5;
    state.visemeMouthWidth += (v.width - (state.visemeMouthWidth || 1)) * 0.5;
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

  function cropParams(img, f, w, h) {
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
    return { nw, nh, sx, sy, srcW, srcH };
  }

  function compositeRealMouth(profile, base, f, crop, w, h, vis) {
    const openImg = visemeOpen[profile.id];
    if (!openImg || !openImg.complete || !openImg.naturalWidth) return;
    if (vis.shape === "closed" || vis.open < 0.12) return;

    const mx = ((f.cx * crop.nw - crop.sx) / crop.srcW) * w;
    const my = ((f.mouthY * crop.nh - crop.sy) / crop.srcH) * h;
    const faceW = (f.faceW * crop.nw / crop.srcW) * w;

    const om = OPEN_MOUTH[profile.id] || { cx: 0.5, mouthY: 0.5, faceW: 0.25 };
    const onw = openImg.naturalWidth;
    const onh = openImg.naturalHeight;
    const pW = Math.max(12, om.faceW * onw * 0.7);
    const pH = Math.max(10, om.faceW * onw * 0.55);
    const pX = om.cx * onw - pW / 2;
    const pY = om.mouthY * onh - pH * 0.45;
    if (pX < 0 || pY < 0 || pX + pW > onw || pY + pH > onh) return;

    const dW = faceW * 0.55 * (vis.width || 1);
    const dH = faceW * 0.42 * (0.7 + vis.open * 0.5);
    const alpha = Math.min(1, (vis.open - 0.1) / 0.55);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, my, dW * 0.5, dH * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.drawImage(openImg, pX, pY, pW, pH, mx - dW / 2, my - dH * 0.45, dW, dH);
    ctx.restore();
  }

  function drawPhotorealReader(profile, w, h) {
    const img = profile.asset ? assetImages[profile.asset] : null;
    if (!img || !img.complete || !img.naturalWidth) return false;

    const f = marks(profile);
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const vis = {
      open: state.visemeMouthOpen || 0,
      width: state.visemeMouthWidth || 1,
      shape: state.visemeShape || "rest"
    };
    const breath = Math.sin(state.breathPhase || 0) * (speaking ? 1.2 : 0.4);

    ctx.save();
    ctx.translate(0, breath);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";

    const crop = cropParams(img, f, w, h);
    ctx.drawImage(img, crop.sx, crop.sy, crop.srcW, crop.srcH, 0, 0, w, h);

    if (speaking) compositeRealMouth(profile, img, f, crop, w, h, vis);

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
