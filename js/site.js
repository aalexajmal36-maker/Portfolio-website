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
