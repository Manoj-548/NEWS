/* Photoreal news readers. No cartoon face, no sticker mouth — the photo's own lips move. */
(function () {
  const LANDMARKS = {
    nova_kade:       { cx: 0.50, eyeY: 0.250, mouthY: 0.338, chinY: 0.385, faceW: 0.14 },
    lyra_nova:       { cx: 0.50, eyeY: 0.285, mouthY: 0.342, chinY: 0.390, faceW: 0.11 },
    arjun_mehra:     { cx: 0.50, eyeY: 0.255, mouthY: 0.335, chinY: 0.385, faceW: 0.15 },
    priya_nair:      { cx: 0.50, eyeY: 0.275, mouthY: 0.345, chinY: 0.395, faceW: 0.16 },
    rajesh_sharma:   { cx: 0.50, eyeY: 0.282, mouthY: 0.338, chinY: 0.385, faceW: 0.12 },
    meera_kapoor:    { cx: 0.50, eyeY: 0.280, mouthY: 0.358, chinY: 0.410, faceW: 0.12 },
    alexander_hayes: { cx: 0.50, eyeY: 0.265, mouthY: 0.345, chinY: 0.395, faceW: 0.15 },
    sofia_reyes:     { cx: 0.50, eyeY: 0.310, mouthY: 0.362, chinY: 0.420, faceW: 0.11 },
    marcus_cole:     { cx: 0.50, eyeY: 0.265, mouthY: 0.355, chinY: 0.400, faceW: 0.14 }
  };

  let mouthBuf = null;
  let mouthBufCtx = null;

  function marks(profile) {
    return LANDMARKS[profile?.id] || profile?.face || { cx: 0.5, eyeY: 0.26, mouthY: 0.34, chinY: 0.39, faceW: 0.14 };
  }

  function ensureMouthBuf(rw, rh) {
    if (!mouthBuf) {
      mouthBuf = document.createElement("canvas");
      mouthBufCtx = mouthBuf.getContext("2d");
    }
    if (mouthBuf.width !== rw || mouthBuf.height !== rh) {
      mouthBuf.width = rw;
      mouthBuf.height = rh;
    }
    return mouthBufCtx;
  }

  function warpPhotoMouth(mx, my, faceW, open, widen) {
    const rw = Math.max(12, Math.round(faceW * 0.38));
    const rh = Math.max(8, Math.round(faceW * 0.20));
    const rx = Math.round(mx - rw / 2);
    const ry = Math.round(my - rh * 0.42);
    if (rx < 0 || ry < 0 || rx + rw > canvas.width || ry + rh > canvas.height) return;

    let slice;
    try {
      slice = ctx.getImageData(rx, ry, rw, rh);
    } catch (e) {
      return;
    }

    const buf = ensureMouthBuf(rw, rh);
    buf.putImageData(slice, 0, 0);

    const stretch = 1 + Math.min(1, open) * 0.22;
    const dH = rh * stretch;
    const dY = ry - (dH - rh) * 0.28;
    const dW = rw * (0.98 + (widen - 1) * 0.06);
    const dX = mx - dW / 2;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, my + (stretch - 1) * rh * 0.2, dW * 0.48, dH * 0.46, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(mouthBuf, dX, dY, dW, dH);

    const gapH = Math.max(1, 1.2 + open * 4.5);
    const gapW = dW * 0.16 * (0.9 + open * 0.2);
    ctx.globalAlpha = 0.28 + open * 0.28;
    ctx.fillStyle = "rgba(48, 22, 24, 0.85)";
    ctx.beginPath();
    ctx.ellipse(mx, my + gapH * 0.15, gapW, gapH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPhotorealReader(profile, w, h) {
    const img = profile.asset ? assetImages[profile.asset] : null;
    if (!img || !img.complete || !img.naturalWidth) return false;

    const f = marks(profile);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const open = speaking ? Math.max(0.04, state.visemeMouthOpen || 0.2) : (state.visemeMouthOpen || 0);
    const widen = speaking ? (state.visemeMouthWidth || 1) : 1;
    const breath = Math.sin(state.breathPhase || 0) * (speaking ? 1.6 : 0.6);

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

    if (open > 0.06) {
      const mx = ((f.cx * nw - sx) / srcW) * w;
      const my = ((f.mouthY * nh - sy) / srcH) * h;
      const faceW = (f.faceW * nw / srcW) * w;
      warpPhotoMouth(mx, my, faceW, Math.min(1, open), widen);
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
