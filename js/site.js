// Site behaviour: loader exit, mobile menu, reveal-on-scroll, hero scroll cue.
(() => {
  // loader: play one loop of the hands GIF, then slide away (CSS animations keyed off body.loaded)
  const done = () => document.body.classList.add("loaded");
  if (document.readyState === "complete") done(); else addEventListener("load", done);
  setTimeout(done, 4000); // never block the page on a slow asset

  // mobile menu
  const header = document.querySelector(".site-header"), toggle = header && header.querySelector(".menu-toggle");
  if (toggle) {
    const set = (on) => { header.classList.toggle("menu-open", on); toggle.setAttribute("aria-expanded", on); document.documentElement.style.overflow = on ? "hidden" : ""; };
    toggle.addEventListener("click", () => set(!header.classList.contains("menu-open")));
    header.querySelectorAll(".menu-pill a").forEach((a) => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("inview"); io.unobserve(e.target); } }), { threshold: 0.15 });
  document.querySelectorAll("[data-scroll]").forEach((el) => io.observe(el));

  // hero "explore" cue scrolls to the next section
  const cue = document.querySelector(".scroll-cue");
  if (cue) cue.addEventListener("click", () => { const n = document.querySelector(".hero").nextElementSibling; if (n) n.scrollIntoView({ behavior: "smooth" }); });
})();




// Ideas section: standing astronaut, placed like Gorilla's (centred, rises a little as the section scrolls past),
// with a light idle bob and a small lean toward the mouse; the sky drifts the other way.
(() => {
  const wrap = document.querySelector(".statement-bg"); if (!wrap) return;
  const bg = wrap.querySelector(".sb-stars"), astro = wrap.querySelector(".sb-astro"), sec = wrap.closest("section");
  if (!bg || !astro) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mx = 0, my = 0, tx = 0, ty = 0, scrollP = 0, raf = 0, on = false;
  const frame = (t) => {
    tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
    const bob = still ? 0 : Math.sin(t / 1600) * 6;
    astro.style.transform = `translateX(-50%) translate3d(${(tx * 18).toFixed(1)}px,${(scrollP * 90 + ty * 10 + bob).toFixed(1)}px,0) rotate(${(tx * 2.5).toFixed(2)}deg)`;
    bg.style.transform = `translate3d(${(tx * -12).toFixed(1)}px,${(ty * -8 + scrollP * -20).toFixed(1)}px,0) scale(1.04)`;
    raf = on ? requestAnimationFrame(frame) : 0;
  };
  sec.addEventListener("pointermove", (e) => { const r = sec.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });
  sec.addEventListener("pointerleave", () => { mx = my = 0; });
  const onScroll = () => { const r = sec.getBoundingClientRect(); scrollP = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }).observe(sec);
})();
