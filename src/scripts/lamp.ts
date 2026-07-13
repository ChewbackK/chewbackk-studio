/**
 * lamp.ts - la « lampe » du hero Blueprint.
 *
 * Pilote --mx/--my (en px, dans le repère du hero) sur la couche `.hero__plan`
 * et ajoute `is-lit` : le masque radial CSS ne révèle alors le plan que dans un
 * disque autour du pointeur. Interpolation (lerp) pour un suivi fluide.
 *
 * Garde-fous (cohérents avec le reste du projet) :
 *  - Seulement sur pointeur fin (souris) : au tactile/clavier c'est le bouton
 *    « Voir le plan » (géré par blueprint.ts) qui révèle le plan entier.
 *  - reduced-motion : pas de suivi (le plan reste accessible via le bouton).
 *  - rAF en pause hors-vue (IntersectionObserver) et onglet caché.
 *  - Idempotent, (ré)initialisé sur `astro:page-load` ; teardown complet.
 */
import { prefersReducedMotion } from "./motion";

const HERO = "[data-hero]";
const PLAN = "[data-plan]";
const EASE = 0.18;
const MAX_R = 14; // rem, doit matcher le rayon du masque en CSS
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

let hero: HTMLElement | null = null;
let plan: HTMLElement | null = null;
let rafId = 0;
let running = false;
let primed = false;

let targetX = 0;
let targetY = 0;
let curX = 0;
let curY = 0;
let targetR = 0;
let curR = 0;

let io: IntersectionObserver | null = null;

function onPointerMove(e: PointerEvent): void {
  if (!hero) return;
  const r = hero.getBoundingClientRect();
  targetX = e.clientX - r.left;
  targetY = e.clientY - r.top;
  targetR = MAX_R;
  if (!primed) {
    curX = targetX;
    curY = targetY;
    primed = true;
  }
  // Résilience : allume la couche chaude dès qu'on bouge la souris, même si un
  // `pointerenter` a été manqué.
  if (plan && !plan.classList.contains("is-lit")) plan.classList.add("is-lit");
}

function onEnter(): void {
  targetR = MAX_R;
  plan?.classList.add("is-lit");
}
function onLeave(): void {
  targetR = 0;
  plan?.classList.remove("is-lit");
}

function frame(): void {
  if (!running || !plan) return;
  curX += (targetX - curX) * EASE;
  curY += (targetY - curY) * EASE;
  curR += (targetR - curR) * EASE;
  plan.style.setProperty("--mx", `${curX.toFixed(1)}px`);
  plan.style.setProperty("--my", `${curY.toFixed(1)}px`);
  plan.style.setProperty("--lamp-r", `${curR.toFixed(2)}rem`);
  rafId = requestAnimationFrame(frame);
}

function start(): void {
  if (running) return;
  running = true;
  rafId = requestAnimationFrame(frame);
}
function stop(): void {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}
function onVisibility(): void {
  if (document.hidden) stop();
  else start();
}

function init(): void {
  destroy();

  hero = document.querySelector<HTMLElement>(HERO);
  plan = document.querySelector<HTMLElement>(PLAN);
  if (!hero || !plan) return;

  // Pas de lampe au tactile/stylet grossier ni en reduced-motion.
  if (
    prefersReducedMotion() ||
    (window.matchMedia && !window.matchMedia(FINE_POINTER).matches)
  ) {
    return;
  }

  hero.addEventListener("pointermove", onPointerMove, { passive: true });
  hero.addEventListener("pointerenter", onEnter, { passive: true });
  hero.addEventListener("pointerleave", onLeave, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !document.hidden) start();
        else stop();
      }
    },
    { threshold: 0 },
  );
  io.observe(hero);
  start();
}

function destroy(): void {
  stop();
  if (hero) {
    hero.removeEventListener("pointermove", onPointerMove);
    hero.removeEventListener("pointerenter", onEnter);
    hero.removeEventListener("pointerleave", onLeave);
  }
  document.removeEventListener("visibilitychange", onVisibility);
  io?.disconnect();
  io = null;
  hero = null;
  plan = null;
  primed = false;
  targetX = targetY = curX = curY = 0;
  targetR = curR = 0;
}

export function bootstrapLamp(): void {
  document.addEventListener("astro:page-load", init);
}
