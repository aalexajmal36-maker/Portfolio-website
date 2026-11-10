// Key Skills sticker wall: staggered layout, slap-in on view, drag, shuffle.
(() => {
  const wall = document.getElementById("stickerWallG");
  if (!wall) return;
  const stickers = [...wall.querySelectorAll(".stk")];
  const rots = [-8, 6, -4, 10, -6, 7, -10, 4, -5, 9, -7, 5];
  const mobile = () => innerWidth <= 900;
  let z = 20;

  // staggered grid: 5 per row on desktop, 2 on phones, slightly offset like stickers slapped on a wall
  const layout = (shuffle = false) => {
    const n = stickers.length, cols = mobile() ? 2 : 5, rows = Math.ceil(n / cols);
    const order = stickers.map((_, i) => i);
    if (shuffle) order.sort(() => Math.random() - 0.5);
    order.forEach((slot, i) => {
      const s = stickers[i], r = Math.floor(slot / cols), c = slot % cols, inRow = Math.min(cols, n - r * cols);
      const x = ((c + 0.5) / inRow) * 84 + 8 + (r % 2 ? 3 : -3);
      const y = ((r + 0.5) / rows) * 86 + 7 + (c % 2 ? 2.5 : -2);
      s.style.setProperty("--x", x.toFixed(1) + "%");
      s.style.setProperty("--y", y.toFixed(1) + "%");
      s.style.setProperty("--rot", (rots[i % rots.length] + (shuffle ? Math.random() * 8 - 4 : 0)).toFixed(1) + "deg");
      s.style.setProperty("--d", i * 60 + "ms");
    });
  };
  const slap = () => stickers.forEach((s) => { s.classList.remove("in"); void s.offsetWidth; s.classList.add("in"); });
  layout();

  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { slap(); io.disconnect(); } }, { threshold: 0.2 }).observe(wall);
  document.querySelector(".skills-shuffle")?.addEventListener("click", () => { layout(true); slap(); });
  let wasMobile = mobile();
  addEventListener("resize", () => { if (mobile() !== wasMobile) { wasMobile = mobile(); layout(); } }, { passive: true });

  // drag (pointer events, positions kept in % of the wall)
  stickers.forEach((s) => {
    let dx = 0, dy = 0, on = false;
    s.addEventListener("pointerdown", (e) => {
      on = true; s.setPointerCapture(e.pointerId); s.classList.add("dragging"); s.style.zIndex = ++z;
      const r = s.getBoundingClientRect(); dx = e.clientX - (r.left + r.width / 2); dy = e.clientY - (r.top + r.height / 2);
    });
    s.addEventListener("pointermove", (e) => {
      if (!on) return;
      const w = wall.getBoundingClientRect();
      const x = Math.min(96, Math.max(4, ((e.clientX - dx - w.left) / w.width) * 100));
      const y = Math.min(96, Math.max(4, ((e.clientY - dy - w.top) / w.height) * 100));
      s.style.setProperty("--x", x + "%"); s.style.setProperty("--y", y + "%");
    });
    const end = () => { if (!on) return; on = false; s.classList.remove("dragging"); s.style.setProperty("--rot", Math.round(Math.random() * 16 - 8) + "deg"); };
    s.addEventListener("pointerup", end); s.addEventListener("pointercancel", end);
  });
})();

// Road So Far turntable + tracklist: pick a track, drag the record, play/pause.
(() => {
  const sec = document.getElementById("experience"), rec = document.getElementById("xpRecord");
  if (!sec || !rec) return;
  const label = document.getElementById("xpLabel"), arm = document.getElementById("xpArm"), play = document.getElementById("xpPlay");
  const list = document.getElementById("xpTracklist"), detail = document.getElementById("xpDetail");
  let jobs = []; try { jobs = JSON.parse(document.getElementById("xpData").textContent); } catch (e) {}
  if (!jobs.length) return;
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => map[c]);
  list.innerHTML = jobs.map((j, i) => `<li><button class="xp-track" type="button" data-i="${i}" style="--tc:${j.color}">
    <span class="side">${esc(j.side)}</span>
    <span class="who"><span class="co">${esc(j.co)}</span><span class="role">${esc(j.role)}</span></span>
    <span class="yr"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${esc(j.yr)}</span>
  </button></li>`).join("");
  const tracks = [...list.querySelectorAll(".xp-track")];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = -1, ang = 0, playing = false, visible = false, raf = 0, last = 0, drag = false, prev = 0, acc = 0;
  const paint = () => { rec.style.transform = `rotate(${ang}deg)`; };
  const pick = (i) => {
    i = (i + jobs.length) % jobs.length; if (i === cur) return; cur = i; const j = jobs[i];
    tracks.forEach((t, k) => t.setAttribute("aria-current", String(k === i)));
    label.style.setProperty("--lbl", j.color);
    if (!label.firstChild) label.innerHTML = `<img class="xp-ah" src="img/ah-disc.svg" alt="" draggable="false">`;
    detail.style.setProperty("--tc", j.color);
    detail.innerHTML = `<h3>${esc(j.role)}</h3><p class="meta"><strong>${esc(j.co)}</strong> · ${esc(j.yr)} · ${esc(j.loc)}</p><ul>${j.items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    detail.classList.remove("swap"); void detail.offsetWidth; detail.classList.add("swap");
    arm.style.setProperty("--arm", `${26 + i * 4}deg`);
    rec.setAttribute("aria-valuenow", i + 1); rec.setAttribute("aria-valuetext", `${j.side}: ${j.co}`);
  };
  const loop = (t) => { const dt = Math.min(t - last, 50); last = t; if (!drag) { ang += dt * 0.2; paint(); } raf = requestAnimationFrame(loop); };
  const sync = () => { const on = playing && visible && !still; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } if (!on && raf) { cancelAnimationFrame(raf); raf = 0; } };
  // Background music (YouTube, hidden player) follows the deck: Play/Pause button, a tap on the record, Space/Enter on it.
  const MUSIC = "Efew326rte0";
  let yt = null, ytReady = false, pending = false, held = false;
  const setPlay = (on) => {
    playing = on; play.setAttribute("aria-pressed", on); play.querySelector("span").textContent = on ? "Pause" : "Play"; sec.classList.toggle("playing", on); sync();
    if (on) pending = false;
    if (ytReady) { try { on ? yt.playVideo() : yt.pauseVideo(); } catch (e) {} }
  };
  const loadYT = () => new Promise((res) => {
    if (window.YT && YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.async = true; document.head.appendChild(s);
  });
  const startMusic = () => {
    const box = document.createElement("div"); box.className = "xp-music"; box.setAttribute("aria-hidden", "true");
    const slot = document.createElement("div"); box.appendChild(slot); document.body.appendChild(box);
    setPlay(true);
    loadYT().then(() => {
      yt = new YT.Player(slot, {
        host: "https://www.youtube-nocookie.com", videoId: MUSIC, width: 200, height: 200,
        playerVars: { autoplay: 1, loop: 1, playlist: MUSIC, controls: 0, disablekb: 1, playsinline: 1, rel: 0, iv_load_policy: 3, modestbranding: 1 },
        events: {
          onReady: (e) => {
            ytReady = true; e.target.setVolume(55); const f = e.target.getIframe(); if (f) { f.setAttribute("tabindex", "-1"); f.title = "Background music"; }
            if (playing) e.target.playVideo(); else e.target.pauseVideo();
            // the browser blocked sound before any click: show the deck as paused and start on the first click/key anywhere
            setTimeout(() => { if (playing && yt.getPlayerState() !== 1) { setPlay(false); pending = true; } }, 2000);
          },
          onStateChange: (e) => { if (e.data === 1 && !playing && !drag) yt.pauseVideo(); }
        }
      });
    }).catch(() => {});
  };
  const firstGesture = (e) => {
    if (!pending) return;
    if (e.target && e.target.closest && e.target.closest("#xpPlay,#xpRecord,.vg-tile")) { pending = false; return; }
    setPlay(true);
  };
  addEventListener("pointerdown", firstGesture, true); addEventListener("keydown", firstGesture, true);
  if (document.readyState === "complete") startMusic(); else addEventListener("load", startMusic, { once: true });
  // pause the music while a Brand Ads video is open, resume after
  addEventListener("site:video-open", () => { if (playing) { held = true; setPlay(false); } });
  addEventListener("site:video-close", () => { if (held) { held = false; setPlay(true); } });
  play.addEventListener("click", () => setPlay(!playing));
  tracks.forEach((t) => t.addEventListener("click", () => pick(+t.dataset.i)));
  const angleOf = (e) => { const b = rec.getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI; };
  // DJ hands: holding the record stops it and the music; dragging it scratches the track back or forward;
  // let go and it plays on from there. A quick tap still toggles play/pause.
  const SEC_PER_TURN = 3;
  let tot = 0, dx = 0, dy = 0, t0 = 0, scrub = 0, lastSeek = 0, idle = 0;
  const ytOk = () => ytReady && yt && yt.seekTo;
  const scratch = () => {
    const now = performance.now(); if (now - lastSeek < 90) return; lastSeek = now;
    try { yt.seekTo(scrub, true); yt.playVideo(); } catch (e) {}
    clearTimeout(idle); idle = setTimeout(() => { if (drag && ytOk()) yt.pauseVideo(); }, 140);
  };
  rec.addEventListener("pointerdown", (e) => {
    drag = true; rec.setPointerCapture(e.pointerId); prev = angleOf(e); acc = 0; tot = 0; dx = e.clientX; dy = e.clientY; t0 = performance.now();
    if (ytOk()) { try { scrub = yt.getCurrentTime() || 0; yt.pauseVideo(); } catch (err) {} }
  });
  rec.addEventListener("pointermove", (e) => {
    if (!drag) return; const a = angleOf(e); let d = a - prev; if (d > 180) d -= 360; else if (d < -180) d += 360;
    prev = a; ang += d; acc += d; tot += Math.abs(d); paint();
    if (ytOk() && Math.abs(d) > 0.2) { const len = yt.getDuration ? yt.getDuration() : 0; scrub = Math.max(0, scrub + (d / 360) * SEC_PER_TURN); if (len) scrub = Math.min(scrub, len - 0.5); scratch(); }
    if (acc > 300) { acc = 0; pick(cur + 1); } else if (acc < -300) { acc = 0; pick(cur - 1); }
  });
  rec.addEventListener("pointerup", (e) => {
    if (!drag) return; drag = false; clearTimeout(idle);
    const tap = tot < 8 && Math.hypot(e.clientX - dx, e.clientY - dy) < 8 && performance.now() - t0 < 350;
    if (tap) { setPlay(!playing); return; }
    if (ytOk()) { try { yt.seekTo(scrub, true); playing ? yt.playVideo() : yt.pauseVideo(); } catch (err) {} }
  });
  rec.addEventListener("pointercancel", () => { drag = false; clearTimeout(idle); if (ytOk()) { try { playing ? yt.playVideo() : yt.pauseVideo(); } catch (err) {} } });
  rec.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d) { e.preventDefault(); ang += 40 * d; paint(); pick(cur + d); } else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPlay(!playing); }
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.25 }).observe(sec);
  pick(0);
})();

// Hero rooftop signs: keep the overlay locked to the video's object-fit:cover box (video is 3840x2160).
(() => {
  const box = document.querySelector(".hero-signs"); if (!box) return;
  const fig = box.parentElement;
  const fit = () => {
    const W = fig.clientWidth, H = fig.clientHeight, s = Math.max(W / 3840, H / 2160);
    Object.assign(box.style, { width: 3840 * s + "px", height: 2160 * s + "px", left: (W - 3840 * s) / 2 + "px", top: (H - 2160 * s) / 2 + "px" });
    box.style.setProperty("--s", s + "px");
  };
  fit(); addEventListener("resize", fit, { passive: true }); new ResizeObserver(fit).observe(fig);
})();


// Let's Work Together stage: the cursor leaves a soft trail that reveals Ajmal in a racing helmet
// (img/ajmal-helmet.webp: same width and top edge as img/ajmal-cutout.webp, so it lines up when drawn top-aligned).
(() => {
  const stage = document.querySelector(".hire-stage"); if (!stage) return;
  const person = stage.querySelector(".hire-person"), cv = stage.querySelector(".hire-helmet"), ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = 0, visible = false, raf = 0, pts = [], dpr = 1, art = null;
  const mask = document.createElement("canvas"), mctx = mask.getContext("2d");
  const helmet = new Image(); helmet.decoding = "async";
  const makeArt = () => { if (!art) { helmet.onload = () => { art = helmet; }; helmet.src = "img/ajmal-helmet.webp"; } };
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); cv.width = mask.width = stage.clientWidth * dpr; cv.height = mask.height = stage.clientHeight * dpr; };
  const draw = (t) => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts = pts.filter((p) => t - p.t < 700);
    if (!pts.length || !art || stage.classList.contains("no-person")) return;
    mctx.clearRect(0, 0, mask.width, mask.height);
    const R = Math.max(110, stage.clientWidth * 0.085) * dpr;
    for (const p of pts) {
      const a = 1 - (t - p.t) / 700, r = R * (0.35 + 0.65 * Math.min(1, (t - p.t) / 140 + 0.4)) * a;
      const g = mctx.createRadialGradient(p.x * dpr, p.y * dpr, 0, p.x * dpr, p.y * dpr, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.8, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
      mctx.fillStyle = g; mctx.beginPath(); mctx.arc(p.x * dpr, p.y * dpr, r, 0, Math.PI * 2); mctx.fill();
    }
    const pr = person.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    ctx.save(); ctx.drawImage(mask, 0, 0); ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(art, (pr.left - sr.left) * dpr, (pr.top - sr.top) * dpr, pr.width * dpr, pr.width * (art.naturalHeight / art.naturalWidth) * dpr);
    ctx.restore();
  };
  const step = (t) => { last = t; draw(t); raf = visible ? requestAnimationFrame(step) : 0; };
  stage.addEventListener("pointermove", (e) => {
    if (still) return;
    const r = stage.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    const prev = pts[pts.length - 1];
    if (prev) { const d = Math.hypot(p.x - prev.x, p.y - prev.y), n = Math.floor(d / 18); for (let i = 1; i < n; i++) pts.push({ x: prev.x + (p.x - prev.x) * i / n, y: prev.y + (p.y - prev.y) * i / n, t: p.t }); }
    pts.push(p);
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(step); }).observe(stage);
  addEventListener("resize", size, { passive: true });
  if (person.complete && person.naturalWidth) makeArt(); else person.addEventListener("load", makeArt);
  size();
})();


// WORK categories: three category cards; clicking one opens that category's project carousel, "All Work" goes back.
(() => {
  const sec = document.querySelector(".work-g"); if (!sec) return;
  const cats = [...sec.querySelectorAll(".work-cat")], now = sec.querySelector(".work-now");
  const open = (id) => {
    sec.querySelectorAll(".work-panel").forEach((p) => p.classList.toggle("is-on", p.id === "work-" + id));
    const cat = cats.find((c) => c.dataset.cat === id);
    now.innerHTML = cat ? cat.querySelector("h3 p").innerHTML : "";
    sec.classList.add("is-open");
    const sw = sec.querySelector("#work-" + id + " .swiper")?.swiper;
    sec.querySelectorAll("#work-" + id + " .swiper, #work-" + id + " .swiper-wrapper, #work-" + id + " .swiper-slide").forEach((el) => (el.style.height = ""));
    if (sw) { sw.update(); sw.slideToLoop ? sw.slideToLoop(0, 0) : sw.slideTo(0, 0); }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  const close = () => { sec.classList.remove("is-open"); sec.querySelectorAll(".work-panel").forEach((p) => p.classList.remove("is-on")); if (window.ScrollTrigger) ScrollTrigger.refresh(); };
  cats.forEach((c) => c.addEventListener("click", (e) => { e.preventDefault(); open(c.dataset.cat); }));
  sec.querySelector(".work-back-btn").addEventListener("click", close);
})();

// WORK gallery: dim rows that are still below their sticky position (reference behaviour).
(() => {
  const rows = [...document.querySelectorAll(".wl-sticky")]; if (!rows.length) return;
  const tick = () => rows.forEach((r) => { if (!r.offsetParent) return; const top = parseFloat(r.style.top) || 0; r.classList.toggle("is-ahead", r.getBoundingClientRect().top > top + 140); });
  addEventListener("scroll", tick, { passive: true }); if (window.lenis && lenis.on) lenis.on("scroll", tick);
  document.addEventListener("click", (e) => { if (e.target.closest(".work-cat,.work-back-btn")) setTimeout(tick, 50); });
  tick();
})();

// Brand Ads gallery: click a tile to play it in a pop-up YouTube player (Esc / backdrop / X to close).
(() => {
  const tiles = [...document.querySelectorAll(".vg-tile")]; if (!tiles.length) return;
  const m = document.createElement("div");
  m.className = "vg-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Video player");
  m.innerHTML = '<button type="button" class="vg-close" aria-label="Close video">&#10005;</button><div class="vg-frame"><p class="vg-cap"></p></div>';
  document.body.appendChild(m);
  const frame = m.querySelector(".vg-frame"), cap = m.querySelector(".vg-cap");
  let last = null;
  const close = () => { if (m.classList.contains("is-open")) dispatchEvent(new Event("site:video-close")); m.classList.remove("is-open"); const f = frame.querySelector("iframe"); if (f) f.remove(); if (window.lenis && lenis.start) lenis.start(); if (last) last.focus(); };
  tiles.forEach((t) => t.addEventListener("click", () => {
    last = t;
    m.dataset.shape = t.dataset.shape || "tall";
    cap.textContent = t.querySelector(".vg-title").textContent + " / " + t.querySelector(".vg-brand").textContent;
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + t.dataset.yt + "?autoplay=1&rel=0&playsinline=1";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.title = cap.textContent;
    frame.prepend(f);
    m.classList.add("is-open"); dispatchEvent(new Event("site:video-open"));
    if (window.lenis && lenis.stop) lenis.stop();
    m.querySelector(".vg-close").focus();
  }));
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest(".vg-close")) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && m.classList.contains("is-open")) close(); });
})();

// Behance projects open in a full-screen viewer on this site instead of leaving for behance.net.
(() => {
  const data = window.PROJECTS, base = window.PROJECT_IMG; if (!data) return;
  const links = [...document.querySelectorAll('a[href*="behance.net/gallery/"]')]; if (!links.length) return;
  const m = document.createElement("div");
  m.className = "pj-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Project");
  m.innerHTML = '<div class="pj-bar"><p class="pj-title"></p><button type="button" class="pj-close" aria-label="Close project">&#10005;</button></div><div class="pj-body" tabindex="-1"><div class="pj-inner"></div></div>';
  document.body.appendChild(m);
  const body = m.querySelector(".pj-body"), inner = m.querySelector(".pj-inner"), title = m.querySelector(".pj-title"), closeBtn = m.querySelector(".pj-close");
  let last = null, pushed = false;
  const img = (path, alt) => { const i = new Image(); i.src = base + path; i.alt = alt; i.loading = "lazy"; i.decoding = "async"; i.referrerPolicy = "no-referrer"; return i; };
  const build = (p) => {
    inner.textContent = "";
    p.mods.forEach(([type, val]) => {
      if (type === "i") inner.appendChild(img(val, p.name));
      else if (type === "g") { const g = document.createElement("div"); g.className = "pj-grid"; val.forEach((v) => g.appendChild(img(v, p.name))); inner.appendChild(g); }
      else if (type === "t") { const t = document.createElement("p"); t.className = "pj-text"; t.textContent = val; inner.appendChild(t); }
      else if (type === "v") { const w = document.createElement("div"); w.className = "pj-video"; const f = document.createElement("iframe"); f.src = val; f.title = p.name; f.loading = "lazy"; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; w.appendChild(f); inner.appendChild(w); }
      else if (type === "b") inner.appendChild(book(val, p.name));
    });
  };
  // Flipbook: spreads split into left/right pages; each sheet carries a right page on its front and the next left page
  // on its back, and turns around the spine. Click/tap a page side, swipe, or use the arrow keys.
  let turn = null;
  const book = (cfg, alt) => {
    const pages = [];
    for (let i = 1; i <= cfg.count; i++) { const n = String(i).padStart(2, "0"); pages.push(cfg.path + n + "a.jpg", cfg.path + n + "b.jpg"); }
    const el = document.createElement("div"); el.className = "fb";
    el.innerHTML = '<div class="fb-book"><div class="fb-base fb-l"></div><div class="fb-base fb-r"></div></div>' +
      '<div class="fb-ctl"><button type="button" class="fb-btn fb-prev" aria-label="Previous spread">&#8592;</button><span class="fb-count" aria-live="polite"></span><button type="button" class="fb-btn fb-next" aria-label="Next spread">&#8594;</button></div>' +
      '<p class="fb-hint">Click a page or swipe to turn it</p><p class="fb-rotate">Turn your phone sideways for a bigger view</p>';
    const bk = el.querySelector(".fb-book"), count = el.querySelector(".fb-count"), prev = el.querySelector(".fb-prev"), next = el.querySelector(".fb-next");
    const pic = (src) => { const i = new Image(); i.src = src; i.alt = alt; i.decoding = "async"; i.draggable = false; return i; };
    el.querySelector(".fb-l").appendChild(pic(pages[0])); el.querySelector(".fb-r").appendChild(pic(pages[pages.length - 1]));
    const N = cfg.count - 1, sheets = [];
    for (let k = 0; k < N; k++) {
      const s = document.createElement("div"); s.className = "fb-sheet"; s.style.zIndex = N - k;
      const f = document.createElement("div"); f.className = "fb-face fb-front"; f.appendChild(pic(pages[2 * k + 1]));
      const b = document.createElement("div"); b.className = "fb-face fb-back"; b.appendChild(pic(pages[2 * k + 2]));
      s.append(f, b); bk.appendChild(s); sheets.push(s);
    }
    let cur = 0;
    const show = () => { count.textContent = "Spread " + (cur + 1) + " / " + cfg.count; prev.disabled = cur === 0; next.disabled = cur === N; };
    const go = (d) => {
      const fwd = d > 0; if (fwd ? cur >= N : cur <= 0) return;
      const k = fwd ? cur : cur - 1, s = sheets[k];
      s.style.zIndex = 1000; s.classList.toggle("is-flipped", fwd); cur += fwd ? 1 : -1; show();
      clearTimeout(s._t); s._t = setTimeout(() => { s.style.zIndex = s.classList.contains("is-flipped") ? k + 1 : N - k; }, 820);
    };
    prev.addEventListener("click", () => go(-1)); next.addEventListener("click", () => go(1));
    let sx = null;
    bk.addEventListener("pointerdown", (e) => { sx = e.clientX; });
    bk.addEventListener("pointerup", (e) => {
      if (sx === null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { go(dx < 0 ? 1 : -1); return; }
      const r = bk.getBoundingClientRect(); go(e.clientX > r.left + r.width / 2 ? 1 : -1);
    });
    show(); turn = go;
    return el;
  };
  const shut = () => {
    if (!m.classList.contains("is-open")) return;
    m.classList.remove("is-open"); inner.textContent = ""; turn = null; // clearing also stops any playing video
    document.documentElement.style.overflow = ""; dispatchEvent(new Event("site:video-close"));
    if (last) last.focus({ preventScroll: true });
  };
  const close = () => { if (pushed) { pushed = false; history.back(); } shut(); };
  // YouTube rows play in the same viewer: one video, starting right away
  document.querySelectorAll('a.wl-row[href*="youtu.be/"], a.wl-row[href*="youtube.com/watch"]').forEach((a) => {
    const yt = (a.href.match(/youtu\.be\/([\w-]{6,})/) || a.href.match(/[?&]v=([\w-]{6,})/) || [])[1]; if (!yt) return;
    const name = a.querySelector(".wl-title");
    links.push(a); a.dataset.pj = "yt-" + yt;
    data["yt-" + yt] = { name: name ? name.textContent : "Video", mods: [["v", "https://www.youtube-nocookie.com/embed/" + yt + "?autoplay=1&rel=0&playsinline=1"]] };
  });
  links.forEach((a) => {
    const id = a.dataset.pj || (a.href.match(/gallery\/(\d+)/) || [])[1]; if (!id || !data[id]) return;
    a.removeAttribute("target");
    a.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); last = a;
      title.textContent = data[id].name; build(data[id]);
      const isBook = data[id].mods.some((x) => x[0] === "b");
      m.classList.toggle("pj-solo", id.startsWith("yt-") || isBook); m.classList.toggle("pj-book", isBook);
      m.classList.add("is-open"); body.scrollTop = 0; document.documentElement.style.overflow = "hidden";
      if (data[id].mods.some((x) => x[0] === "v")) dispatchEvent(new Event("site:video-open")); // only videos pause the music
      history.pushState({ pj: 1 }, ""); pushed = true; // the phone's back button closes the project, not the site
      closeBtn.focus();
    });
  });
  closeBtn.addEventListener("click", close);
  addEventListener("keydown", (e) => {
    if (!m.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (turn && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); turn(e.key === "ArrowRight" ? 1 : -1); }
  });
  addEventListener("popstate", () => { if (m.classList.contains("is-open")) { pushed = false; shut(); } });
})();
