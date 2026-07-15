/**
 * intro.ts - écran d'intro joué UNE SEULE FOIS par session, au premier
 * chargement, sur la home uniquement.
 *
 * Garde-fous :
 *  - reduced-motion → on ne joue pas (et on marque comme vu).
 *  - une seule fois par session via sessionStorage.
 *  - skippable (clic / scroll / touche / Échap) : on saute à la fin.
 *  - idempotent vis-à-vis de ClientRouter (le flag de session empêche la
 *    relecture lors des navigations internes).
 */
import gsap from "gsap";
import { prefersReducedMotion } from "./motion";

const FLAG = "cbk_intro_seen";

let played = false; // garde locale en plus du sessionStorage

function markSeen(): void {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* sessionStorage indisponible (mode privé strict) : on ignore. */
  }
}

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

function init(): void {
  if (played) return;

  const el = document.querySelector<HTMLElement>("[data-intro]");
  if (!el) return; // pas d'intro sur cette page

  // On ne joue qu'à la racine, une fois par session, hors reduced-motion.
  const isHome = window.location.pathname === "/";
  if (!isHome || alreadySeen() || prefersReducedMotion()) {
    el.remove();
    markSeen();
    return;
  }

  played = true;
  markSeen();

  const name = el.querySelector<HTMLElement>(".intro__name");
  const skipBtn = el.querySelector<HTMLElement>("[data-intro-skip]");

  // L'overlay est déjà visible (CSS sous html.js). On bloque le scroll le
  // temps de l'intro.
  document.documentElement.style.overflow = "hidden";

  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    document.documentElement.style.overflow = "";
    el.removeEventListener("click", finish);
    window.removeEventListener("wheel", finish);
    window.removeEventListener("touchmove", finish);
    window.removeEventListener("keydown", onKey);
    el.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
  };

  const tl = gsap.timeline({
    defaults: { ease: "power4.out" },
    onComplete: finish,
  });

  tl.from(name, { yPercent: 110, duration: 0.9 })
    .to(name, { yPercent: 0, duration: 0.3 }) // petit temps de pose
    .to(el, { yPercent: -100, duration: 0.7, ease: "power3.inOut" }, "+=0.25");

  // Skip : on accélère la timeline jusqu'au bout (transition douce, pas de
  // coupure brutale), ce qui déclenchera onComplete → finish.
  const skip = (): void => {
    if (finished) return;
    tl.timeScale(4);
  };
  el.addEventListener("click", skip);
  skipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    skip();
  });
  window.addEventListener("wheel", skip, { passive: true, once: true });
  window.addEventListener("touchmove", skip, { passive: true, once: true });
  window.addEventListener("keydown", onKey);
}

export function bootstrapIntro(): void {
  document.addEventListener("astro:page-load", init);
}
