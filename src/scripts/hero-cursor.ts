/**
 * hero-cursor.ts - effet "révélation au curseur" du hero.
 *
 * Met à jour --mx/--my (en px) sur `.hero__reveal` pour positionner le masque
 * radial qui dévoile une trame d'accent autour du pointeur. Interpolation
 * (lerp) pour un suivi fluide ; couche masquée donc coût GPU contenu.
 *
 * Garde-fous (cohérents avec le projet) :
 *  - reduced-motion → pas de suivi (la trame reste cachée, opacity 0).
 *  - RAF en pause hors-vue (IntersectionObserver) / onglet caché.
 *  - `is-active` (fondu) seulement quand le pointeur est dans le hero.
 *  - idempotent, (ré)initialisé sur `astro:page-load`.
 */
import { prefersReducedMotion } from "./motion";

const HERO = ".hero";
const REVEAL = ".hero__reveal";
const EASE = 0.16;

let hero: HTMLElement | null = null;
let reveal: HTMLElement | null = null;
let rafId = 0;
let running = false;

let targetX = 0;
let targetY = 0;
let curX = 0;
let curY = 0;
let primed = false; // a-t-on reçu une 1re position ?

let io: IntersectionObserver | null = null;

function onPointerMove(e: PointerEvent): void {
  if (!hero) return;
  const r = hero.getBoundingClientRect();
  targetX = e.clientX - r.left;
  targetY = e.clientY - r.top;
  if (!primed) {
    // Évite un saut depuis (0,0) : on cale la position courante d'emblée.
    curX = targetX;
    curY = targetY;
    primed = true;
  }
}

function onPointerEnter(): void {
  reveal?.classList.add("is-active");
}
function onPointerLeave(): void {
  reveal?.classList.remove("is-active");
}

function frame(): void {
  if (!running || !reveal) return;
  curX += (targetX - curX) * EASE;
  curY += (targetY - curY) * EASE;
  reveal.style.setProperty("--mx", `${curX.toFixed(1)}px`);
  reveal.style.setProperty("--my", `${curY.toFixed(1)}px`);
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

export function initHeroCursor(): void {
  destroyHeroCursor();

  hero = document.querySelector<HTMLElement>(HERO);
  reveal = document.querySelector<HTMLElement>(REVEAL);
  if (!hero || !reveal) return;

  // reduced-motion : aucun effet, la trame reste cachée.
  if (prefersReducedMotion()) return;

  hero.addEventListener("pointermove", onPointerMove, { passive: true });
  hero.addEventListener("pointerenter", onPointerEnter, { passive: true });
  hero.addEventListener("pointerleave", onPointerLeave, { passive: true });
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

export function destroyHeroCursor(): void {
  stop();
  if (hero) {
    hero.removeEventListener("pointermove", onPointerMove);
    hero.removeEventListener("pointerenter", onPointerEnter);
    hero.removeEventListener("pointerleave", onPointerLeave);
  }
  document.removeEventListener("visibilitychange", onVisibility);
  io?.disconnect();
  io = null;
  hero = null;
  reveal = null;
  primed = false;
  targetX = targetY = curX = curY = 0;
}

export function bootstrapHeroCursor(): void {
  document.addEventListener("astro:page-load", initHeroCursor);
}
