/**
 * hero-studio.ts - le mot « Studio » qui surgit de derrière le nom du hero
 * et file vers la droite, puis flotte doucement.
 *
 * Séquence : ~0.5 s après l'animation du nom, « Studio » glisse depuis derrière
 * « Backk » (tucked à gauche, masqué par le nom) jusqu'à sa place à droite, en
 * apparaissant. Ensuite, léger flottement haut/bas en boucle.
 *
 * Garde-fous :
 *  - reduced-motion → posé directement à sa place, visible, sans mouvement.
 *  - idempotent, (ré)initialisé sur `astro:page-load`.
 */
import gsap from "gsap";
import { prefersReducedMotion } from "./motion";

const STUDIO = ".hero__studio";
const START_DELAY = 2; // s après le chargement (le nom s'anime ~1.5 s)

let intro: gsap.core.Timeline | null = null;
let floatTween: gsap.core.Tween | null = null;

function teardown(): void {
  if (intro) {
    intro.kill();
    intro = null;
  }
  if (floatTween) {
    floatTween.kill();
    floatTween = null;
  }
}

function init(): void {
  teardown();

  const studio = document.querySelector<HTMLElement>(STUDIO);
  if (!studio) return;

  // Le centrage vertical est porté par .hero__studio-wrap (CSS) ; ici on ne
  // touche qu'au transform du <span> intérieur (x / y / opacity).
  if (prefersReducedMotion()) {
    // Place finale, visible, immobile.
    gsap.set(studio, { opacity: 1, x: 0, y: 0, xPercent: 0 });
    return;
  }

  // Départ : tucked à gauche (derrière le nom) et invisible.
  gsap.set(studio, { opacity: 0, xPercent: -60, x: "-4rem", y: 0 });

  intro = gsap.timeline({ delay: START_DELAY });
  intro
    .to(studio, {
      opacity: 1,
      xPercent: 0,
      x: 0,
      duration: 0.8,
      ease: "power3.out",
    })
    .add(() => {
      // Flottement doux haut/bas, en boucle, une fois en place.
      floatTween = gsap.to(studio, {
        y: "-0.6rem",
        duration: 2.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });
}

export function bootstrapHeroStudio(): void {
  document.addEventListener("astro:page-load", init);
}
