/* Modern talkative digital news readers — mouths belong to the face, not a blob on a photo. */
(function () {
  const LOOKS = {
    nova_kade: { gender: "male", skin: ["#e8c4a2", "#c9926a"], hair: "#1a1410", suit: "#1b2433", accent: "#00f5d4", bot: true, hairStyle: "short" },
    lyra_nova: { gender: "female", skin: ["#f0d0b0", "#d4a07a"], hair: "#1c1210", suit: "#141820", accent: "#7dd3fc", bot: true, hairStyle: "bob" },
    arjun_mehra: { gender: "male", skin: ["#d4a074", "#b07848"], hair: "#1a120e", suit: "#12315c", accent: "#60a5fa", bot: false, hairStyle: "short" },
    priya_nair: { gender: "female", skin: ["#e0b089", "#c48a5c"], hair: "#140e0c", suit: "#1e3a6e", accent: "#f9a8d4", bot: false, hairStyle: "wave" },
    rajesh_sharma: { gender: "male", skin: ["#c9956a", "#a67446"], hair: "#1a1410", suit: "#2c3340", accent: "#c4b5fd", bot: false, hairStyle: "side" },
    meera_kapoor: { gender: "female", skin: ["#e2b48a", "#c48a58"], hair: "#1a100c", suit: "#6b1d32", accent: "#fca5a5", bot: false, hairStyle: "wave" },
    alexander_hayes: { gender: "male", skin: ["#f0d0b4", "#d4a888"], hair: "#2a1c14", suit: "#1e3a5f", accent: "#93c5fd", bot: false, hairStyle: "side" },
    sofia_reyes: { gender: "female", skin: ["#e6b890", "#c48a60"], hair: "#3a2418", suit: "#3d4450", accent: "#fdba74", bot: false, hairStyle: "wave" },
    marcus_cole: { gender: "male", skin: ["#ebc9a6", "#c9a07c"], hair: "#1c1410", suit: "#252a36", accent: "#a5b4fc", bot: false, hairStyle: "short" },
    nexus_3d: { gender: "male", skin: ["#cbd5e1", "#64748b"], hair: "#0f172a", suit: "#0f172a", accent: "#00d2ff", bot: true, hairStyle: "none", robot: true }
  };

  function lookOf(profile) {
    return LOOKS[profile?.id] || LOOKS.nova_kade;
  }

  function rr(c, x, y, w, h, r) {
    if (typeof c.roundRect === "function") { c.roundRect(x, y, w, h, r); return; }
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  window.drawTalkingNewsReader = function drawTalkingNewsReader(profile, w, h) {
    const look = lookOf(profile);
    const speaking = !!(typeof state !== "undefined" && state.isSpeaking && !state.isPaused);
    const t = (typeof state !== "undefined" && state.breathPhase) || (Date.now() / 400);
    const open = speaking ? Math.max(0.08, state.visemeMouthOpen || 0.2) : 0.02;
    const widen = speaking ? (state.visemeMouthWidth || 1) : 1;
    const blink = (typeof state !== "undefined" && state.eyeBlink) || 0;
    const nod = speaking ? Math.sin(t * 2.1) * 5 : Math.sin(t * 0.7) * 1.5;
    const sway = Math.sin(t * 0.9) * (speaking ? 4 : 1.5);

    const cx = w / 2 + sway;
    const headY = h * 0.30 + nod;
    const shoulderY = h * 0.52;

    // Suit / torso
    const suit = ctx.createLinearGradient(cx - 220, shoulderY, cx + 220, h);
    suit.addColorStop(0, look.suit);
    suit.addColorStop(1, "#05070c");
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.moveTo(cx - 260, h);
    ctx.lineTo(cx - 170, shoulderY + 40);
    ctx.lineTo(cx - 70, shoulderY);
    ctx.lineTo(cx + 70, shoulderY);
    ctx.lineTo(cx + 170, shoulderY + 40);
    ctx.lineTo(cx + 260, h);
    ctx.closePath();
    ctx.fill();

    // Shirt / lapel
    ctx.fillStyle = look.bot ? "#0b1220" : "#f4f1ea";
    ctx.beginPath();
    ctx.moveTo(cx - 28, shoulderY + 8);
    ctx.lineTo(cx, h * 0.78);
    ctx.lineTo(cx + 28, shoulderY + 8);
    ctx.closePath();
    ctx.fill();

    if (!look.bot) {
      ctx.strokeStyle = look.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 8, shoulderY + 18);
      ctx.lineTo(cx - 8, h * 0.72);
      ctx.stroke();
    } else {
      ctx.fillStyle = look.accent;
      ctx.shadowColor = look.accent;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, shoulderY + 70, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (speaking) {
        for (let i = 0; i < 5; i++) {
          const bh = 6 + Math.abs(Math.sin(Date.now() / 80 + i)) * 18;
          ctx.fillRect(cx - 22 + i * 10, shoulderY + 110 - bh, 6, bh);
        }
      }
    }

    // Neck
    const neckG = ctx.createLinearGradient(cx, headY + 55, cx, shoulderY);
    neckG.addColorStop(0, look.skin[0]);
    neckG.addColorStop(1, look.skin[1]);
    ctx.fillStyle = neckG;
    ctx.fillRect(cx - 22, headY + 48, 44, 46);

    // Head
    const headG = ctx.createRadialGradient(cx - 12, headY - 18, 10, cx, headY, 78);
    headG.addColorStop(0, look.skin[0]);
    headG.addColorStop(1, look.skin[1]);
    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.ellipse(cx, headY, 58, 72, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    if (look.hairStyle !== "none") {
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      if (look.hairStyle === "bob" || look.hairStyle === "wave") {
        ctx.ellipse(cx, headY - 28, 64, 48, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 64, headY - 30, 18, 70);
        ctx.fillRect(cx + 46, headY - 30, 18, 78);
        if (look.hairStyle === "wave") {
          ctx.beginPath();
          ctx.ellipse(cx + 50, headY + 30, 16, 40, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.ellipse(cx, headY - 40, 60, 38, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 58, headY - 40, 14, 50);
        ctx.fillRect(cx + 44, headY - 40, 14, 50);
      }
    }

    if (look.bot) {
      ctx.strokeStyle = look.accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 50, headY - 8);
      ctx.lineTo(cx - 20, headY + 6);
      ctx.moveTo(cx + 50, headY - 8);
      ctx.lineTo(cx + 20, headY + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Brows
    ctx.strokeStyle = look.hair;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    const browLift = speaking ? -2 : 0;
    ctx.beginPath();
    ctx.moveTo(cx - 38, headY - 18 + browLift);
    ctx.lineTo(cx - 12, headY - 22 + browLift);
    ctx.moveTo(cx + 12, headY - 22 + browLift);
    ctx.lineTo(cx + 38, headY - 18 + browLift);
    ctx.stroke();

    // Eyes
    const eyeOpen = blink > 0.4 ? 1 : 8;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(cx - 22, headY - 4, 10, eyeOpen, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 22, headY - 4, 10, eyeOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    if (eyeOpen > 3) {
      ctx.fillStyle = "#1b140e";
      const gaze = (typeof state !== "undefined" ? state.gazeX : 0) * 3;
      ctx.beginPath();
      ctx.arc(cx - 22 + gaze, headY - 4, 4.2, 0, Math.PI * 2);
      ctx.arc(cx + 22 + gaze, headY - 4, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx - 20 + gaze, headY - 6, 1.4, 0, Math.PI * 2);
      ctx.arc(cx + 24 + gaze, headY - 6, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.strokeStyle = "rgba(90,50,30,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, headY + 2);
    ctx.lineTo(cx + 1, headY + 18);
    ctx.lineTo(cx + 7, headY + 22);
    ctx.stroke();

    // Mouth — real viseme on this face
    const mx = cx;
    const my = headY + 38;
    const mw = 16 * widen;
    const mh = 3 + open * 16;
    ctx.fillStyle = "#7a2a36";
    ctx.beginPath();
    ctx.ellipse(mx, my, mw, Math.max(2.5, mh * 0.55), 0, 0, Math.PI * 2);
    ctx.fill();
    if (open > 0.18) {
      ctx.fillStyle = "#2a0c12";
      ctx.beginPath();
      ctx.ellipse(mx, my + 1, mw * 0.72, mh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      if (open > 0.45) {
        ctx.fillStyle = "#f3efe6";
        ctx.fillRect(mx - mw * 0.45, my - mh * 0.15, mw * 0.9, 2.4);
      }
    } else {
      ctx.strokeStyle = "#8a3a42";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 12, my);
      ctx.quadraticCurveTo(mx, my + 3, mx + 12, my);
      ctx.stroke();
    }

    // Mic
    ctx.fillStyle = "#111";
    ctx.fillRect(cx + 70, shoulderY + 20, 6, 90);
    ctx.beginPath();
    ctx.arc(cx + 73, shoulderY + 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.accent;
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("LIVE", cx + 58, shoulderY + 14);
  };

  window.drawMaleAnchorModel = function () {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const profile = typeof getAnchorProfile === "function" ? getAnchorProfile(state.anchorModel) : { id: state.anchorModel, name: "Anchor", title: "News Reader", color: "#00d2ff" };
    if (profile.kind === "robot" || profile.id === "nexus_3d") {
      if (typeof drawHumanoid3DAnchor === "function") drawHumanoid3DAnchor(w, h);
      else window.drawTalkingNewsReader(profile, w, h);
    } else {
      window.drawTalkingNewsReader(profile, w, h);
    }
    if (typeof drawPresenterLowerThird === "function") drawPresenterLowerThird(profile, w, h);
  };

  window.renderAdvancedAnchor = function (profile, w, h) {
    window.drawTalkingNewsReader(profile, w, h);
  };
})();
