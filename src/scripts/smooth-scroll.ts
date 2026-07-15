/**
 * smooth-scroll.ts - cycle de vie du smooth-scroll (Lenis) et des reveals (GSAP).
 *
 * Contraintes Astro 6 + ClientRouter :
 *  - Un <script> hoisté ne se rejoue PAS après une navigation client. On
 *    n'attache donc qu'un écouteur `astro:page-load` (qui couvre aussi le
 *    premier chargement) et c'est lui qui (re)construit tout.
 *  - `init()` commence par `tearDown()` → idempotent : jamais deux instances
 *    Lenis ni deux boucles RAF, même si l'événement se déclenche plusieurs fois.
 *  - On n'utilise PAS les événements `astro:before-swap`/`after-swap`
 *    (dépréciés, retirés dans Astro 7) ; le teardown-avant-init suffit.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { prefersReducedMotion } from "./motion";

let lenis: Lenis | null = null;
let tickerCb: ((time: number) => void) | null = null;
let pluginRegistered = false;

/** Détruit l'instance Lenis et tous les ScrollTriggers. Sûr à appeler à vide. */
function tearDown(): void {
  if (tickerCb) {
    gsap.ticker.remove(tickerCb);
    tickerCb = null;
  }
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

/** Anime les éléments .reveal vers leur état final au scroll. */
function setupReveals(reduce: boolean): void {
  const targets = gsap.utils.toArray<HTMLElement>(".reveal");
  if (targets.length === 0) return;

  if (reduce) {
    // Pas d'animation : on pose directement l'état final.
    gsap.set(targets, { opacity: 1, y: 0 });
    return;
  }

  ScrollTrigger.batch(targets, {
    start: "top 85%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.08,
        overwrite: true,
      }),
  });
}

/** (Ré)initialise le smooth-scroll et les reveals pour la page courante. */
function init(): void {
  tearDown();

  const reduce = prefersReducedMotion();

  if (reduce) {
    // Scroll natif, reveals instantanés, AUCUNE boucle RAF.
    // On n'enregistre PAS ScrollTrigger et on ne le sollicite pas : il
    // s'abonnerait au ticker GSAP et relancerait un rAF en continu.
    // Les reveals sont posés directement à leur état final via gsap.set().
    setupReveals(true);
    // GSAP a pu démarrer son ticker rAF ; rien n'est animé → on l'endort.
    gsap.ticker.sleep();
    return;
  }

  // Mode animé : on (ré)enregistre ScrollTrigger et on réveille le ticker
  // (il a pu être endormi par un passage précédent en reduced-motion).
  if (!pluginRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    pluginRegistered = true;
  }
  gsap.ticker.wake();

  lenis = new Lenis({ autoRaf: false, lerp: 0.1 });

  // Pilotage manuel de la boucle Lenis par le ticker GSAP (cf. recommandation
  // officielle Lenis × GSAP). `lagSmoothing(0)` évite les sauts après pause.
  tickerCb = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCb);
  gsap.ticker.lagSmoothing(0);

  // Synchronise ScrollTrigger sur le scroll virtuel de Lenis.
  lenis.on("scroll", ScrollTrigger.update);

  setupReveals(false);

  // Les positions sont périmées juste après un swap de page : on recalcule.
  ScrollTrigger.refresh();
}

/**
 * Gèle/relâche le smooth-scroll (menu mobile ouvert). Complète le
 * `html.is-menu-open { overflow: hidden }` côté CSS : Lenis écoute la
 * molette et animerait quand même le scroll virtuel. No-op sans instance
 * (reduced-motion, ou appel avant l'init).
 */
export function scrollFreeze(frozen: boolean): void {
  if (frozen) lenis?.stop();
  else lenis?.start();
}

/**
 * Point d'entrée appelé une fois par le layout. N'attache que l'écouteur
 * `astro:page-load` (déclenché au premier chargement ET à chaque navigation).
 */
export function bootstrapMotion(): void {
  document.addEventListener("astro:page-load", init);
}
