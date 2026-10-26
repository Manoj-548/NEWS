/* Photoreal news readers — real human photos, viseme on the actual mouth. */
(function () {
  const LANDMARKS = {
    nova_kade:       { cx: 0.50, eyeY: 0.250, mouthY: 0.338, chinY: 0.385, faceW: 0.14 },
    lyra_nova:       { cx: 0.50, eyeY: 0.285, mouthY: 0.342, chinY: 0.390, faceW: 0.11 },
    arjun_mehra:     { cx: 0.50, eyeY: 0.255, mouthY: 0.335, chinY: 0.385, faceW: 0.15 },
    priya_nair:      { cx: 0.50, eyeY: 0.275, mouthY: 0.345, chinY: 0.395, faceW: 0.16 },
    rajesh_sharma:   { cx: 0.50, eyeY: 0.282, mouthY: 0.338, chinY: 0.385, faceW: 0.12 },
    meera_kapoor:    { cx: 0.50, eyeY: 0.280, mouthY: 0.365, chinY: 0.410, faceW: 0.12 },
    alexander_hayes: { cx: 0.50, eyeY: 0.265, mouthY: 0.345, chinY: 0.395, faceW: 0.15 },
    sofia_reyes:     { cx: 0.50, eyeY: 0.310, mouthY: 0.368, chinY: 0.420, faceW: 0.11 },
    marcus_cole:     { cx: 0.50, eyeY: 0.265, mouthY: 0.355, chinY: 0.400, faceW: 0.14 }
  };

  const skinCache = {};

  function marks(profile) {
    return LANDMARKS[profile?.id] || profile?.face || { cx: 0.5, eyeY: 0.26, mouthY: 0.34, chinY: 0.39, faceW: 0.14 };
  }

  function sampleSkin(key, x, y) {
    if (skinCache[key]) return skinCache[key];
    try {
      const p = ctx.getImageData(Math.max(0, x | 0), Math.max(0, y | 0), 1, 1).data;
      skinCache[key] = "rgb(" + p[0] + "," + p[1] + "," + p[2] + ")";
    } catch (e) {
      skinCache[key] = "#c4a07a";
    }
    return skinCache[key];
  }

  function drawHumanMouth(mx, my, faceW, open, widen, gender, skin) {
    const mw = Math.max(8, faceW * 0.28 * widen);
    const mh = Math.max(2.2, faceW * (0.028 + 0.13 * open));
    const female = gender === "female";
    const lip = female ? "#9a3f4c" : "#7a4540";
    const lipHi = female ? "#c45d6a" : "#a05c56";
    const inner = "#2a1014";

    ctx.save();
    ctx.translate(mx, my);

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, mh * 0.05, mw * 1.28, Math.max(faceW * 0.065, mh * 1.55), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.ellipse(0, mh * 0.08, mw * 0.92, mh * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    if (open > 0.2) {
      const tw = mw * 1.55;
      const th = Math.min(faceW * 0.03, mh * 0.42);
      ctx.fillStyle = "#f2ebe3";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(-tw / 2, -mh * 0.52, tw, th, 1.6);
      else ctx.rect(-tw / 2, -mh * 0.52, tw, th);
      ctx.fill();
      ctx.strokeStyle = "rgba(170,150,140,0.4)";
      ctx.lineWidth = 0.7;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo((i * tw) / 8, -mh * 0.52);
        ctx.lineTo((i * tw) / 8, -mh * 0.52 + th);
        ctx.stroke();
      }
      if (open > 0.55) {
        ctx.fillStyle = "#c9a8a4";
        ctx.beginPath();
        ctx.ellipse(0, mh * 0.42, mw * 0.38, mh * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = lip;
    ctx.beginPath();
    ctx.moveTo(-mw, -mh * 0.08);
    ctx.quadraticCurveTo(-mw * 0.35, -mh * 0.78, 0, -mh * 0.48);
    ctx.quadraticCurveTo(mw * 0.35, -mh * 0.78, mw, -mh * 0.08);
    ctx.quadraticCurveTo(0, mh * 0.02, -mw, -mh * 0.08);
    ctx.fill();

    ctx.fillStyle = lipHi;
    ctx.beginPath();
    ctx.ellipse(0, mh * 0.48, mw * 0.96, Math.max(2.2, mh * 0.48), 0, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = "rgba(40,12,14,0.4)";
    ctx.lineWidth = Math.max(1, faceW * 0.008);
    ctx.beginPath();
    ctx.moveTo(-mw * 0.92, 0);
    ctx.quadraticCurveTo(0, mh * 0.12, mw * 0.92, 0);
    ctx.stroke();

    ctx.restore();
  }

  function drawPhotorealReader(profile, w, h) {
    const img = profile.asset ? assetImages[profile.asset] : null;
    if (!img || !img.complete || !img.naturalWidth) return false;

    const f = marks(profile);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const open = speaking ? Math.max(0.05, state.visemeMouthOpen || 0.2) : (state.visemeMouthOpen || 0);
    const widen = speaking ? (state.visemeMouthWidth || 1) : 1;
    const breath = Math.sin((state.breathPhase || 0)) * (speaking ? 1.8 : 0.7);

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

    const mx = ((f.cx * nw - sx) / srcW) * w;
    const my = ((f.mouthY * nh - sy) / srcH) * h;
    const faceW = (f.faceW * nw / srcW) * w;

    if (open > 0.07) {
      const skin = sampleSkin(profile.id, mx + faceW * 0.2, my - faceW * 0.12);
      drawHumanMouth(mx, my, faceW, Math.min(1, open), widen, profile.gender, skin);
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
