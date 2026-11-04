/**
 * motion.ts - utilitaires de mouvement partagés.
 * Source de vérité unique pour la préférence « réduire les animations »,
 * honorée séparément par Lenis (smooth-scroll), le hero Blueprint, la lampe
 * et les reveals GSAP.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** `true` si l'utilisateur a demandé à réduire les animations. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
