/**
 * hero-intro.ts - animation d'entrée du hero (typo XXL « Chewbackk »).
 *
 * Chorégraphie : les lignes du nom montent depuis un masque (overflow caché),
 * le dernier « k » (signature) se verrouille en dernier avec un léger snap,
 * puis l'eyebrow / la tagline / les CTA apparaissent en cascade.
 *
 * Contraintes du projet :
 *  - Idempotent, (ré)initialisé sur `astro:page-load` (cf. ClientRouter).
 *  - reduced-motion → état final instantané, aucune animation.
 *  - Le markup porte déjà tout le texte : si le JS ne tourne pas, le hero est
 *    lisible (les éléments sont visibles par défaut, l'anim part de l'état final
 *    seulement quand on l'anime).
 */
import gsap from "gsap";
import { prefersReducedMotion } from "./motion";

const ROOT = ".hero";

let tl: gsap.core.Timeline | null = null;

function teardown(): void {
  if (tl) {
    tl.kill();
    tl = null;
  }
}

function init(): void {
  teardown();

  const root = document.querySelector<HTMLElement>(ROOT);
  if (!root) return;

  const name = root.querySelector<HTMLElement>(".hero__name");
  const lines = gsap.utils.toArray<HTMLElement>(".hero__line-inner", root);
  const sigK = root.querySelector<HTMLElement>(".hero__sig");
  const fades = gsap.utils.toArray<HTMLElement>("[data-hero-fade]", root);

  if (lines.length === 0) return;

  // Le nom est masqué en CSS (anti-flash) tant que JS n'a pas pris la main.
  // Dans tous les cas (animé ou non), on le rend visible ici.
  if (name) name.style.visibility = "visible";

  // En reduced-motion : on pose tout l'état final, sans timeline.
  if (prefersReducedMotion()) {
    gsap.set(lines, { yPercent: 0 });
    if (sigK) gsap.set(sigK, { opacity: 1, scale: 1 });
    gsap.set(fades, { opacity: 1, y: 0 });
    // Anim terminée d'emblée → on lève les masques (sinon ils clipent la
    // lueur du k au survol).
    root.classList.add("is-done");
    return;
  }

  // État initial (avant peinture) : lignes sous leur masque, le reste effacé.
  gsap.set(lines, { yPercent: 120 });
  if (sigK) gsap.set(sigK, { opacity: 0, scale: 0.6, transformOrigin: "50% 70%" });
  gsap.set(fades, { opacity: 0, y: 16 });

  tl = gsap.timeline({
    defaults: { ease: "power4.out" },
    onComplete: () => {
      // Une fois en place, on retire les masques de ligne pour que la lueur
      // du k au survol ne soit pas rognée (bord net disgracieux).
      root.classList.add("is-done");
    },
  });

  tl.to(lines, {
    yPercent: 0,
    duration: 1,
    stagger: 0.12,
  })
    // Le « k » signature se cale en dernier, avec un petit snap.
    .to(
      sigK,
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(2.2)",
      },
      "-=0.35",
    )
    .to(
      fades,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.08,
      },
      "-=0.3",
    );
}

/** Branche le cycle de vie sur les navigations ClientRouter. */
export function bootstrapHeroIntro(): void {
  document.addEventListener("astro:page-load", init);
}
