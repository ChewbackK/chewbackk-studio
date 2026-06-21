/**
 * motion.ts — utilitaires de mouvement partagés.
 * Source de vérité unique pour la préférence « réduire les animations »,
 * honorée séparément par Lenis (smooth-scroll), le canvas et les reveals GSAP.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** `true` si l'utilisateur a demandé à réduire les animations. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Indice « appareil/connexion économe » : on traite ces cas comme
 * reduced-motion pour le canvas (rendu statique) afin de préserver la batterie
 * et la data. Volontairement conservateur.
 */
export function prefersReducedData(): boolean {
  if (typeof navigator === "undefined") return false;
  // `connection` est non-standard ; accès défensif.
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean };
  }).connection;
  return conn?.saveData === true;
}

/** Nombre de cœurs logiques (défaut prudent si l'API est absente). */
export function hardwareConcurrency(): number {
  if (typeof navigator === "undefined") return 4;
  return navigator.hardwareConcurrency ?? 4;
}

/**
 * S'abonne aux changements de la préférence reduced-motion au runtime
 * (l'utilisateur peut basculer le réglage OS sans recharger).
 * Renvoie une fonction de désinscription.
 */
export function onReducedMotionChange(
  handler: (reduced: boolean) => void,
): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  const listener = (e: MediaQueryListEvent) => handler(e.matches);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}
