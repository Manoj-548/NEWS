/* Photoreal presenters. No sticker mouth — only the photo’s own lips move. */
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

  function marks(profile) {
    return LANDMARKS[profile?.id] || profile?.face || { cx: 0.5, eyeY: 0.26, mouthY: 0.34, chinY: 0.39, faceW: 0.14 };
  }

  window.visemeForChar = function visemeForChar(ch) {
    if (!ch || /\s/.test(ch)) return { open: 0.06, width: 1, shape: "rest" };
    const c = String(ch).toUpperCase();
    const raw = String(ch);

    if (/[MBP]/.test(c) || /[मपबभप]/.test(raw) || /[ಮಪಬಭ]/.test(raw) || /[மபப]/.test(raw) || /[మపబభ]/.test(raw))
      return { open: 0.02, width: 0.78, shape: "closed" };
    if (/[FV]/.test(c) || /[फव]/.test(raw) || /[ಫವ]/.test(raw))
      return { open: 0.18, width: 1.08, shape: "teeth" };
    if (/[SZCJ]/.test(c) || /[सशषचज]/.test(raw))
      return { open: 0.2, width: 1.14, shape: "wide" };
    if (c === "W" || c === "Q")
      return { open: 0.28, width: 0.74, shape: "round" };
    if (c === "L" || /[लळ]/.test(raw))
      return { open: 0.26, width: 1.02, shape: "rest" };
    if (c === "R" || /[रऱ]/.test(raw))
      return { open: 0.24, width: 0.95, shape: "rest" };

    if (/[AÁÀÂÄĀ]/.test(c) || /[अआा]/.test(raw) || /[ಅಆಾ]/.test(raw) || /[அஆா]/.test(raw) || /[అఆా]/.test(raw) || /[അആാ]/.test(raw))
      return { open: 0.78, width: 1.1, shape: "open" };
    if (/[EÉÈÊËIÍÌÎÏY]/.test(c) || /[इईएऐिीेैयेी]/.test(raw) || /[ಇಈಎಏಿೀೆೇ]/.test(raw) || /[இஈஎஏைிீய]/.test(raw) || /[ఇఈఎఏిీెే]/.test(raw))
      return { open: 0.34, width: 1.26, shape: "wide" };
    if (/[OÓÒÔÖUÚÙÛÜ]/.test(c) || /[उऊओऔुूोौु]/.test(raw) || /[ಉಊಒಓುೂೊೋ]/.test(raw) || /[உஊஒஓொோுூ]/.test(raw) || /[ఉఊఒఓుూొో]/.test(raw))
      return { open: 0.5, width: 0.68, shape: "round" };

    if (/[0-9]/.test(c)) return { open: 0.3, width: 1.0, shape: "rest" };
    return { open: 0.2, width: 1.0, shape: "rest" };
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
      state.visemeMouthOpen *= 0.8;
      if (state.visemeMouthOpen < 0.04) state.visemeMouthOpen = 0;
      state.visemeMouthWidth = 1;
      state.visemeShape = "rest";
      state.currentLetter = "";
      return;
    }
    const words = state.scriptWords || [];
    const idx = Math.max(0, state.currentWordIndex || 0);
    if (state._visemeWord !== idx) {
      state._visemeWord = idx;
      state.letterPhase = 0;
    }
    const word = words[idx] || "";
    const letters = lettersOf(word);
    const rate = 7 * (state.speechRate || 1);
    state.letterPhase = (state.letterPhase || 0) + delta * rate;
    let ch = "A";
    if (letters.length) ch = letters[Math.floor(state.letterPhase) % letters.length];
    state.currentLetter = ch;
    const v = window.visemeForChar(ch);
    const k = 0.5;
    state.visemeMouthOpen += (v.open - (state.visemeMouthOpen || 0)) * k;
    state.visemeMouthWidth += (v.width - (state.visemeMouthWidth || 1)) * k;
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

  function warpPhotoLips(img, f, nw, nh, sx, sy, srcW, srcH, w, h, vis) {
    const open = vis.open || 0;
    const shape = vis.shape || "rest";
    if (open < 0.08 || shape === "closed") return;

    const mx = ((f.cx * nw - sx) / srcW) * w;
    const my = ((f.mouthY * nh - sy) / srcH) * h;

    const sW = Math.max(10, f.faceW * nw * 0.46);
    const sH = Math.max(8, f.faceW * nw * 0.24);
    const sX = f.cx * nw - sW / 2;
    const sY = f.mouthY * nh - sH * 0.42;
    if (sX < 0 || sY < 0 || sX + sW > nw || sY + sH > nh) return;

    let stretch = 1 + Math.min(1, open) * 0.28;
    let wMul = vis.width || 1;
    if (shape === "open") stretch = 1 + open * 0.42;
    else if (shape === "round") { stretch = 1 + open * 0.34; wMul = 0.88; }
    else if (shape === "wide") { stretch = 1 + open * 0.2; wMul = 1.1; }
    else if (shape === "teeth") stretch = 1 + open * 0.16;

    const dW = (sW / srcW) * w * wMul;
    const dH = (sH / srcH) * h * stretch;
    const dX = mx - dW / 2;
    const dY = my - dH * 0.4;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, my + (stretch - 1) * dH * 0.1, dW * 0.48, dH * 0.46, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, sX, sY, sW, sH, dX, dY, dW, dH);
    ctx.restore();
  }

  function drawPhotorealReader(profile, w, h) {
    const img = profile.asset ? assetImages[profile.asset] : null;
    if (!img || !img.complete || !img.naturalWidth) return false;

    const f = marks(profile);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const vis = {
      open: state.visemeMouthOpen || 0,
      width: state.visemeMouthWidth || 1,
      shape: state.visemeShape || "rest"
    };
    const breath = Math.sin(state.breathPhase || 0) * (speaking ? 1.4 : 0.5);

    ctx.save();
    ctx.translate(0, breath);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";

    const headTop = Math.max(0, f.eyeY - 0.16);
    const chest = Math.min(1, f.chinY + 0.32);
    let srcH = (chest - headTop) * nh;
    let srcW = srcH * (w / Math.max(1, h));
    if (srcW > nw) {
      srcW = nw;
      srcH = srcW * (h / Math.max(1, w));
    }
    let sx = f.cx * nw - srcW / 2;
    let sy = headTop * nh;
    if (sx < 0) sx = 0;
    if (sx + srcW > nw) sx = Math.max(0, nw - srcW);
    if (sy < 0) sy = 0;
    if (sy + srcH > nh) sy = Math.max(0, nh - srcH);

    ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, w, h);

    if (speaking) {
      warpPhotoLips(img, f, nw, nh, sx, sy, srcW, srcH, w, h, vis);
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

  if (typeof ANCHOR_PROFILES !== "undefined") {
    Object.keys(LANDMARKS).forEach(function (id) {
      if (ANCHOR_PROFILES[id]) ANCHOR_PROFILES[id].face = LANDMARKS[id];
    });
  }
})();
