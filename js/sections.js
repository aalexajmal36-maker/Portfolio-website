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
    label.innerHTML = `<span class="s">${esc(j.side)}</span><span class="c">${esc(j.co)}</span><span class="y">${esc(j.yr.replace(/\s*—\s*/, "–"))}</span><span class="h"></span>`;
    detail.style.setProperty("--tc", j.color);
    detail.innerHTML = `<h3>${esc(j.role)}</h3><p class="meta"><strong>${esc(j.co)}</strong> · ${esc(j.yr)} · ${esc(j.loc)}</p><ul>${j.items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    detail.classList.remove("swap"); void detail.offsetWidth; detail.classList.add("swap");
    arm.style.setProperty("--arm", `${14 + i * 3.4}deg`);
    rec.setAttribute("aria-valuenow", i + 1); rec.setAttribute("aria-valuetext", `${j.side}: ${j.co}`);
  };
  const loop = (t) => { const dt = Math.min(t - last, 50); last = t; if (!drag) { ang += dt * 0.2; paint(); } raf = requestAnimationFrame(loop); };
  const sync = () => { const on = playing && visible && !still; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } if (!on && raf) { cancelAnimationFrame(raf); raf = 0; } };
  const setPlay = (on) => { playing = on; play.setAttribute("aria-pressed", on); play.querySelector("span").textContent = on ? "Pause" : "Play"; sec.classList.toggle("playing", on); sync(); };
  play.addEventListener("click", () => setPlay(!playing));
  tracks.forEach((t) => t.addEventListener("click", () => pick(+t.dataset.i)));
  const angleOf = (e) => { const b = rec.getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI; };
  rec.addEventListener("pointerdown", (e) => { drag = true; rec.setPointerCapture(e.pointerId); prev = angleOf(e); acc = 0; });
  rec.addEventListener("pointermove", (e) => {
    if (!drag) return; const a = angleOf(e); let d = a - prev; if (d > 180) d -= 360; else if (d < -180) d += 360;
    prev = a; ang += d; acc += d; paint();
    if (acc > 150) { acc = 0; pick(cur + 1); } else if (acc < -150) { acc = 0; pick(cur - 1); }
  });
  const end = () => { drag = false; }; rec.addEventListener("pointerup", end); rec.addEventListener("pointercancel", end);
  rec.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d) { e.preventDefault(); ang += 40 * d; paint(); pick(cur + d); } else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPlay(!playing); }
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !sec.dataset.autoplayed && !still) { sec.dataset.autoplayed = "1"; setPlay(true); } sync(); }, { threshold: 0.25 }).observe(sec);
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


// Let's Work Together stage: the cursor leaves a soft trail that reveals a yellow/black halftone version of
// Ajmal's own cut-out (generated here from img/ajmal-cutout.webp, so no extra artwork is needed).
(() => {
  const stage = document.querySelector(".hire-stage"); if (!stage) return;
  const person = stage.querySelector(".hire-person"), cv = stage.querySelector(".hire-helmet"), ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = 0, visible = false, raf = 0, pts = [], dpr = 1, art = null;
  const mask = document.createElement("canvas"), mctx = mask.getContext("2d");
  // halftone duotone of the cut-out: dots sized by darkness, yellow on black, alpha kept from the photo
  const makeArt = () => {
    const w = person.naturalWidth, h = person.naturalHeight; if (!w) return;
    const src = document.createElement("canvas"); src.width = w; src.height = h;
    const s = src.getContext("2d"); s.drawImage(person, 0, 0);
    const d = s.getImageData(0, 0, w, h).data;
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    const o = out.getContext("2d"); const step = Math.max(6, Math.round(w / 150));
    o.fillStyle = "#dafd2c";
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const i = ((y + (step >> 1)) * w + (x + (step >> 1))) * 4; if (i >= d.length || d[i + 3] < 40) continue;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      o.globalCompositeOperation = "source-over";
      o.fillStyle = "#000"; o.fillRect(x, y, step, step);
      const r = (step / 2) * Math.min(1, 0.15 + lum * 1.15);
      o.fillStyle = "#dafd2c"; o.beginPath(); o.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2); o.fill();
    }
    art = out;
  };
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
    ctx.drawImage(art, (pr.left - sr.left) * dpr, (pr.top - sr.top) * dpr, pr.width * dpr, pr.height * dpr);
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
  const close = () => { m.classList.remove("is-open"); const f = frame.querySelector("iframe"); if (f) f.remove(); if (window.lenis && lenis.start) lenis.start(); if (last) last.focus(); };
  tiles.forEach((t) => t.addEventListener("click", () => {
    last = t;
    m.dataset.shape = t.dataset.shape || "tall";
    cap.textContent = t.querySelector(".vg-title").textContent + " / " + t.querySelector(".vg-brand").textContent;
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + t.dataset.yt + "?autoplay=1&rel=0&playsinline=1";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.title = cap.textContent;
    frame.prepend(f);
    m.classList.add("is-open");
    if (window.lenis && lenis.stop) lenis.stop();
    m.querySelector(".vg-close").focus();
  }));
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest(".vg-close")) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && m.classList.contains("is-open")) close(); });
})();
