/* Video Studio — presenter PIP, AI news B-roll, crop/cut/paste, download, YouTube */
(function () {
  const vs = {
    open: false,
    playing: false,
    cropMode: false,
    cropDrag: null,
    playhead: 0,
    lastTs: 0,
    clips: [],
    selected: -1,
    clipboard: null,
    generating: 0,
    rec: null,
    chunks: [],
    raf: 0
  };

  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    if (typeof window.toast === "function") window.toast(msg);
    const el = $("vsStatus");
    if (el) el.textContent = msg;
  }
  function uid() { return "c" + Date.now().toString(36) + Math.floor(Math.random() * 999); }
  function story() {
    return (typeof state !== "undefined" && state.currentStory) ? state.currentStory : { title: "AI NEWS TONIGHT", script: "Good evening. This is the AI news desk." };
  }
  function profile() {
    const id = (typeof state !== "undefined" && state.anchorModel) || "nova_kade";
    if (typeof getAnchorProfile === "function") return getAnchorProfile(id);
    return { id: id, name: "Anchor", asset: null, color: "#00d2ff" };
  }
  function presenterImg() {
    const p = profile();
    if (!p.asset || typeof assetImages === "undefined") return null;
    const img = assetImages[p.asset];
    if (img && img.complete && img.naturalWidth) return img;
    return null;
  }
  function clipLen(c) { return Math.max(0.2, (c.outPoint - c.inPoint)); }
  function totalDur() {
    let t = 0;
    vs.clips.forEach(function (c) { t += clipLen(c); });
    return Math.max(0.01, t);
  }
  function clipAt(time) {
    let t = 0;
    for (let i = 0; i < vs.clips.length; i++) {
      const L = clipLen(vs.clips[i]);
      if (time < t + L) return { clip: vs.clips[i], index: i, local: time - t };
      t += L;
    }
    if (vs.clips.length) {
      const last = vs.clips[vs.clips.length - 1];
      return { clip: last, index: vs.clips.length - 1, local: clipLen(last) };
    }
    return null;
  }

  function openStudio() {
    const screen = $("videoStudioScreen");
    if (!screen) return;
    screen.classList.remove("hidden");
    screen.setAttribute("aria-hidden", "false");
    vs.open = true;
    vs.lastTs = 0;
    if (!vs.clips.length) seedAiClip(false);
    renderBin();
    renderTimeline();
    toast("Video Studio — " + (profile().name || "presenter") + " bottom-left");
    loop(0);
  }
  function closeStudio() {
    vs.open = false;
    vs.playing = false;
    const screen = $("videoStudioScreen");
    if (screen) {
      screen.classList.add("hidden");
      screen.setAttribute("aria-hidden", "true");
    }
    if (vs.raf) cancelAnimationFrame(vs.raf);
    vs.raf = 0;
  }
  window.openVideoStudio = openStudio;
  window.closeVideoStudio = closeStudio;

  function seedAiClip(markNew) {
    const s = story();
    vs.clips.push({
      id: uid(),
      type: "ai",
      name: (s.title || "AI News").slice(0, 42),
      duration: 16,
      inPoint: 0,
      outPoint: 16,
      crop: { x: 0, y: 0, w: 1, h: 1 },
      video: null,
      fresh: !!markNew
    });
    vs.selected = vs.clips.length - 1;
  }

  function generateNewsVideo() {
    if (vs.generating) return;
    vs.generating = 0.01;
    toast("AI generating completed news video…");
    const start = performance.now();
    const tick = function () {
      if (!vs.open) { vs.generating = 0; return; }
      vs.generating = Math.min(1, (performance.now() - start) / 2400);
      if (vs.generating < 1) {
        requestAnimationFrame(tick);
        return;
      }
      vs.generating = 0;
      seedAiClip(true);
      renderBin();
      renderTimeline();
      toast("News video complete — on the timeline. Edit, then Download or Publish.");
    };
    requestAnimationFrame(tick);
  }

  function uploadVideos(files) {
    if (!files || !files.length) return;
    Array.from(files).forEach(function (file) {
      if (!file.type || file.type.indexOf("video") !== 0) {
        toast("Please upload a video file");
        return;
      }
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;
      vid.onloadedmetadata = function () {
        const dur = isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 8;
        vs.clips.push({
          id: uid(),
          type: "file",
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
          duration: dur,
          inPoint: 0,
          outPoint: dur,
          crop: { x: 0, y: 0, w: 1, h: 1 },
          video: vid
        });
        vs.selected = vs.clips.length - 1;
        renderBin();
        renderTimeline();
        toast("Uploaded “" + file.name + "” — ready to crop / cut");
      };
    });
  }

  function cutAtPlayhead() {
    const hit = clipAt(vs.playhead);
    if (!hit) { toast("Add a clip first"); return; }
    const c = hit.clip;
    const at = c.inPoint + hit.local;
    if (at <= c.inPoint + 0.15 || at >= c.outPoint - 0.15) {
      toast("Move the playhead inside the clip to cut");
      return;
    }
    const right = {
      id: uid(),
      type: c.type,
      name: c.name + " (B)",
      duration: c.duration,
      inPoint: at,
      outPoint: c.outPoint,
      crop: Object.assign({}, c.crop),
      video: c.video
    };
    c.outPoint = at;
    c.name = c.name + " (A)";
    vs.clips.splice(hit.index + 1, 0, right);
    vs.selected = hit.index + 1;
    vs.clipboard = JSON.parse(JSON.stringify({
      type: right.type, name: right.name, duration: right.duration,
      inPoint: right.inPoint, outPoint: right.outPoint, crop: right.crop
    }));
    vs.clipboard._video = right.video;
    renderBin();
    renderTimeline();
    toast("Cut — second half copied to clipboard");
  }

  function copyClip() {
    if (vs.selected < 0 || !vs.clips[vs.selected]) { toast("Select a clip"); return; }
    const c = vs.clips[vs.selected];
    vs.clipboard = {
      type: c.type, name: c.name + " copy", duration: c.duration,
      inPoint: c.inPoint, outPoint: c.outPoint, crop: Object.assign({}, c.crop),
      _video: c.video
    };
    toast("Copied “" + c.name + "”");
  }

  function pasteClip() {
    if (!vs.clipboard) { toast("Clipboard empty — cut or copy first"); return; }
    const hit = clipAt(vs.playhead);
    const insertAt = hit ? hit.index + 1 : vs.clips.length;
    vs.clips.splice(insertAt, 0, {
      id: uid(),
      type: vs.clipboard.type,
      name: vs.clipboard.name,
      duration: vs.clipboard.duration,
      inPoint: vs.clipboard.inPoint,
      outPoint: vs.clipboard.outPoint,
      crop: Object.assign({}, vs.clipboard.crop),
      video: vs.clipboard._video || null
    });
    vs.selected = insertAt;
    renderBin();
    renderTimeline();
    toast("Pasted on timeline");
  }

  function toggleCrop() {
    vs.cropMode = !vs.cropMode;
    $("vsCropBtn")?.classList.toggle("on", vs.cropMode);
    toast(vs.cropMode ? "Crop: drag on the video" : "Crop off");
  }

  function canvasXY(ev) {
    const canvas = $("vsCanvas");
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width,
      y: (ev.clientY - r.top) / r.height
    };
  }

  function bindCrop() {
    const canvas = $("vsCanvas");
    if (!canvas) return;
    canvas.addEventListener("mousedown", function (ev) {
      if (!vs.cropMode || vs.selected < 0) return;
      const p = canvasXY(ev);
      vs.cropDrag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    });
    window.addEventListener("mousemove", function (ev) {
      if (!vs.cropDrag) return;
      const p = canvasXY(ev);
      vs.cropDrag.x1 = p.x;
      vs.cropDrag.y1 = p.y;
    });
    window.addEventListener("mouseup", function () {
      if (!vs.cropDrag || vs.selected < 0) { vs.cropDrag = null; return; }
      const d = vs.cropDrag;
      vs.cropDrag = null;
      const x = Math.max(0, Math.min(d.x0, d.x1));
      const y = Math.max(0, Math.min(d.y0, d.y1));
      const w = Math.min(1, Math.abs(d.x1 - d.x0));
      const h = Math.min(1, Math.abs(d.y1 - d.y0));
      if (w < 0.05 || h < 0.05) return;
      vs.clips[vs.selected].crop = { x: x, y: y, w: w, h: h };
      toast("Crop applied to clip");
    });
  }

  function drawAiNews(ctx, w, h, t, clip) {
    const s = story();
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#04101c");
    g.addColorStop(0.5, "#0a1c33");
    g.addColorStop(1, "#02060d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = "rgba(0, 180, 255, 0.12)";
    ctx.lineWidth = 1;
    const drift = (t * 28) % 48;
    for (let x = -48 + drift; x < w; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 80, h); ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 18; i++) {
      const px = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * w;
      const py = (Math.cos(t * 0.22 + i) * 0.5 + 0.5) * h * 0.7;
      ctx.fillStyle = "rgba(80,200,255," + (0.15 + 0.25 * Math.sin(t + i)) + ")";
      ctx.beginPath();
      ctx.arc(px, py, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ff2d2d";
    ctx.fillRect(28, 24, 86, 26);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("LIVE", 48, 42);

    ctx.fillStyle = "#00d2ff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("AI GENERATED NEWS PACKAGE", 128, 42);

    const title = (clip && clip.name) || s.title || "Breaking News";
    ctx.fillStyle = "#f4fbff";
    ctx.font = "bold 36px sans-serif";
    wrapText(ctx, title, 28, 110, w - 56, 42);

    const script = s.script || "";
    const chars = Math.min(script.length, Math.floor(t * 28) % Math.max(40, script.length + 20));
    ctx.fillStyle = "rgba(220,235,255,0.88)";
    ctx.font = "18px sans-serif";
    wrapText(ctx, script.slice(0, Math.max(80, chars)), 28, 210, w - 320, 26);

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, h - 48, w, 48);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 16px sans-serif";
    const ch = (typeof state !== "undefined" && state.channelName) ? state.channelName : "AI NEWS";
    const ticker = "  •  " + title + "  •  " + ch + "  •  ";
    const tx = w - ((t * 70) % (ctx.measureText(ticker).width + w));
    ctx.fillText(ticker + ticker, tx, h - 20);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = String(text || "").split(/\s+/);
    let line = "";
    let yy = y;
    let rows = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = words[i];
        yy += lineH;
        rows += 1;
        if (rows > 7) break;
      } else line = test;
    }
    if (rows <= 7 && line) ctx.fillText(line, x, yy);
  }

  function drawFileClip(ctx, w, h, clip, local) {
    const v = clip.video;
    if (!v) return false;
    const t = clip.inPoint + local;
    try {
      if (Math.abs((v.currentTime || 0) - t) > 0.12) v.currentTime = t;
      if (vs.playing && v.paused) v.play().catch(function () {});
      if (!vs.playing && !v.paused) v.pause();
    } catch (e) {}
    if (!v.videoWidth) return false;
    const c = clip.crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = c.x * v.videoWidth;
    const sy = c.y * v.videoHeight;
    const sw = Math.max(2, c.w * v.videoWidth);
    const sh = Math.max(2, c.h * v.videoHeight);
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
    return true;
  }

  function drawPresenterPip(ctx, w, h) {
    const pipW = Math.round(w * 0.24);
    const pipH = Math.round(h * 0.32);
    const x = 18;
    const y = h - pipH - 58;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - 6, y - 6, pipW + 12, pipH + 12);
    ctx.strokeStyle = profile().color || "#00d2ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 3, y - 3, pipW + 6, pipH + 6);
    const img = presenterImg();
    if (img) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const ar = pipW / pipH;
      let sx, sy, sw, sh;
      if (iw / ih > ar) {
        sh = ih; sw = sh * ar; sx = (iw - sw) / 2; sy = 0;
      } else {
        sw = iw; sh = sw / ar; sx = 0; sy = Math.max(0, (ih - sh) * 0.12);
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, pipW, pipH);
    } else {
      ctx.fillStyle = "#123";
      ctx.fillRect(x, y, pipW, pipH);
      ctx.fillStyle = "#7fd";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(profile().name || "Presenter", x + 12, y + pipH / 2);
    }
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x, y + pipH - 26, pipW, 26);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText((profile().name || "Anchor") + "  ·  LIVE", x + 8, y + pipH - 9);
    ctx.restore();
  }

  function drawGenerating(ctx, w, h) {
    ctx.fillStyle = "rgba(2,8,16,0.72)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00d2ff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("AI generating completed news video…", 48, h / 2 - 20);
    const pw = w * 0.5;
    const px = (w - pw) / 2;
    ctx.strokeStyle = "#00d2ff";
    ctx.strokeRect(px, h / 2, pw, 16);
    ctx.fillStyle = "#00d2ff";
    ctx.fillRect(px, h / 2, pw * vs.generating, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText(Math.round(vs.generating * 100) + "%", px + pw + 12, h / 2 + 13);
  }

  function drawFrame(now) {
    const canvas = $("vsCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const t = now / 1000;

    const hit = clipAt(vs.playhead);
    if (hit && hit.clip.type === "file") {
      if (!drawFileClip(ctx, w, h, hit.clip, hit.local)) drawAiNews(ctx, w, h, t, hit.clip);
    } else {
      drawAiNews(ctx, w, h, t, hit ? hit.clip : null);
    }

    if (vs.generating) drawGenerating(ctx, w, h);
    drawPresenterPip(ctx, w, h);

    if (vs.cropMode && vs.clips[vs.selected]) {
      const c = vs.cropDrag
        ? {
            x: Math.min(vs.cropDrag.x0, vs.cropDrag.x1),
            y: Math.min(vs.cropDrag.y0, vs.cropDrag.y1),
            w: Math.abs(vs.cropDrag.x1 - vs.cropDrag.x0),
            h: Math.abs(vs.cropDrag.y1 - vs.cropDrag.y0)
          }
        : vs.clips[vs.selected].crop;
      ctx.save();
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(c.x * w, c.y * h, c.w * w, c.h * h);
      ctx.restore();
    }
  }

  function loop(ts) {
    if (!vs.open) return;
    if (!vs.lastTs) vs.lastTs = ts;
    const dt = Math.min(0.05, (ts - vs.lastTs) / 1000);
    vs.lastTs = ts;
    if (vs.playing) {
      vs.playhead += dt;
      if (vs.playhead >= totalDur()) {
        vs.playhead = 0;
        vs.playing = false;
        const pb = $("vsPlayBtn");
        if (pb) pb.textContent = "Play";
      }
      renderTimeline();
    }
    drawFrame(ts);
    vs.raf = requestAnimationFrame(loop);
  }

  function renderBin() {
    const bin = $("vsBin");
    if (!bin) return;
    bin.innerHTML = "";
    vs.clips.forEach(function (c, i) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "vs-chip" + (i === vs.selected ? " sel" : "");
      el.textContent = (c.type === "ai" ? "AI " : "VID ") + c.name;
      el.onclick = function () { vs.selected = i; renderBin(); renderTimeline(); };
      bin.appendChild(el);
    });
  }

  function renderTimeline() {
    const tl = $("vsTimeline");
    if (!tl) return;
    const tot = totalDur();
    tl.innerHTML = "";
    const track = document.createElement("div");
    track.className = "vs-track";
    let acc = 0;
    vs.clips.forEach(function (c, i) {
      const L = clipLen(c);
      const seg = document.createElement("button");
      seg.type = "button";
      seg.className = "vs-seg" + (i === vs.selected ? " sel" : "") + (c.type === "ai" ? " ai" : "");
      seg.style.width = (L / tot * 100) + "%";
      seg.textContent = c.name;
      seg.onclick = function (ev) {
        ev.stopPropagation();
        vs.selected = i;
        vs.playhead = acc + 0.01;
        renderBin();
        renderTimeline();
      };
      track.appendChild(seg);
      acc += L;
    });
    const head = document.createElement("div");
    head.className = "vs-head";
    head.style.left = (vs.playhead / tot * 100) + "%";
    track.appendChild(head);
    track.addEventListener("click", function (ev) {
      const r = track.getBoundingClientRect();
      vs.playhead = Math.max(0, Math.min(tot, ((ev.clientX - r.left) / r.width) * tot));
      renderTimeline();
    });
    tl.appendChild(track);
  }

  function recordStudio(thenPublish) {
    const canvas = $("vsCanvas");
    if (!canvas || !canvas.captureStream) { toast("Recording not supported"); return; }
    if (vs.rec) return;
    vs.chunks = [];
    const stream = canvas.captureStream(30);
    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" }); }
    catch (e1) {
      try { rec = new MediaRecorder(stream, { mimeType: "video/webm" }); }
      catch (e2) { rec = new MediaRecorder(stream); }
    }
    vs.rec = rec;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) vs.chunks.push(e.data); };
    rec.onstop = function () {
      vs.rec = null;
      const blob = new Blob(vs.chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AI_News_Studio_" + Date.now() + ".webm";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      const s = story();
      const meta = [
        "TITLE: " + (s.title || "AI News"),
        "CHANNEL: " + ((typeof state !== "undefined" && state.channelName) || "AI NEWS"),
        "ANCHOR: " + (profile().name || ""),
        "PRIVACY: " + ($("ytPrivacySelect")?.value || "public"),
        "",
        s.script || ""
      ].join("\n");
      const mt = document.createElement("a");
      mt.href = URL.createObjectURL(new Blob([meta], { type: "text/plain" }));
      mt.download = "YouTube_News_Package_" + Date.now() + ".txt";
      mt.click();
      if (thenPublish && typeof uploadBroadcastToYouTubeChannel === "function") {
        uploadBroadcastToYouTubeChannel();
      } else {
        toast("Download started");
      }
    };
    vs.playhead = 0;
    vs.playing = true;
    const pb = $("vsPlayBtn");
    if (pb) pb.textContent = "Pause";
    rec.start(200);
    toast(thenPublish ? "Recording for YouTube publish…" : "Recording download…");
    const dur = Math.min(20, Math.max(6, totalDur()));
    setTimeout(function () {
      vs.playing = false;
      if (pb) pb.textContent = "Play";
      try { rec.stop(); } catch (e) {}
    }, dur * 1000);
  }

  function bind() {
    $("openVideoStudioBtn")?.addEventListener("click", function (e) {
      e.preventDefault();
      openStudio();
    });
    $("vsCloseBtn")?.addEventListener("click", closeStudio);
    $("vsGenerateBtn")?.addEventListener("click", generateNewsVideo);
    $("vsUploadBtn")?.addEventListener("click", function () { $("vsFileInput")?.click(); });
    $("vsFileInput")?.addEventListener("change", function (e) {
      uploadVideos(e.target.files);
      e.target.value = "";
    });
    $("vsCropBtn")?.addEventListener("click", toggleCrop);
    $("vsCutBtn")?.addEventListener("click", cutAtPlayhead);
    $("vsCopyBtn")?.addEventListener("click", copyClip);
    $("vsPasteBtn")?.addEventListener("click", pasteClip);
    $("vsPlayBtn")?.addEventListener("click", function () {
      vs.playing = !vs.playing;
      this.textContent = vs.playing ? "Pause" : "Play";
    });
    $("vsDownloadBtn")?.addEventListener("click", function () { recordStudio(false); });
    $("vsYoutubeBtn")?.addEventListener("click", function () { recordStudio(true); });
    bindCrop();
    document.addEventListener("keydown", function (e) {
      if (!vs.open) return;
      if (e.key === "Escape") closeStudio();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
