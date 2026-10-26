/* Photoreal presenters only. Never paint a mouth on the photo. */
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

  window.updateFacialAnimations = function (delta) {
    state.breathPhase += delta * 1.6;
    if (Math.random() < 0.006 && state.eyeBlink === 0) state.eyeBlink = 1;
    if (state.eyeBlink > 0) {
      state.eyeBlink -= delta * 9;
      if (state.eyeBlink < 0) state.eyeBlink = 0;
    }
    state.visemeMouthOpen = 0;
    state.visemeMouthWidth = 1;
  };

  function drawPhotorealReader(profile, w, h) {
    const img = profile.asset ? assetImages[profile.asset] : null;
    if (!img || !img.complete || !img.naturalWidth) return false;

    const f = marks(profile);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const breath = Math.sin(state.breathPhase || 0) * (speaking ? 1.2 : 0.4);

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
