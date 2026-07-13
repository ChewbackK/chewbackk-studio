/**
 * blueprint.ts - direction « Blueprint vivant ».
 *
 * Le plan technique est PERMANENT (couche base toujours visible) et VIVANT :
 *  - À l'entrée, le plan se dessine (balayage --bp-draw) pendant que la grille
 *    se révèle, puis le nom se compose glyphe par glyphe.
 *  - La couche « chaude » (détail fin) est révélée par la lampe (lamp.ts).
 *  - Une cote suit le scroll : elle mesure la position réelle du titre en direct
 *    et l'affiche (l'instrument de mesure vivant).
 *
 * Toutes les cotes viennent de mesures DOM réelles, recalculées au resize.
 * Idempotent sur `astro:page-load`, teardown d'abord. reduced-motion : tout est
 * posé à l'état final, aucun balayage, aucune boucle rAF.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./motion";

let tl: gsap.core.Timeline | null = null;
let deconstructST: ScrollTrigger | null = null;
let resizeRaf = 0;
let scrollRaf = 0;
let armRaf = 0;
let gen = 0;
let onResize: (() => void) | null = null;
let onScroll: (() => void) | null = null;

/** Enveloppe chaque glyphe du mot (clip + char). Idempotent via data-text. */
function splitWord(word: HTMLElement): HTMLElement[] {
  const text = word.dataset.text ?? word.textContent ?? "";
  word.dataset.text = text;
  word.textContent = "";
  const chars: HTMLElement[] = [];
  const letters = [...text];
  letters.forEach((ch, i) => {
    const clip = document.createElement("span");
    clip.className = "hero__clip";
    const span = document.createElement("span");
    span.className = "hero__char";
    span.textContent = ch;
    if (i === letters.length - 1) span.classList.add("hero__char--sig");
    clip.appendChild(span);
    word.appendChild(clip);
    chars.push(span);
  });
  return chars;
}

/**
 * Déconstruction au scroll (0→1, fourni par le ScrollTrigger épinglé sur le
 * hero) : chaque lettre perd son remplissage et laisse apparaître son tracé,
 * décalée dans l'ordre de lecture (démontage gauche→droite). Le hero est
 * épinglé le temps de l'effet (cf. init) : sans ça, le titre ne fait que
 * ~150-200px de haut et quitterait l'écran en un seul geste de scroll, bien
 * avant d'avoir fini de se démonter.
 */
function updateDeconstruct(chars: HTMLElement[], progress: number): void {
  const spread = 0.5;
  const per = chars.length > 1 ? spread / (chars.length - 1) : 0;
  chars.forEach((char, i) => {
    const cp = Math.min(1, Math.max(0, (progress - i * per) / (1 - spread)));
    const sign = i % 2 === 0 ? -1 : 1;
    char.style.transform = `translateY(${(cp * -0.55).toFixed(3)}em) rotate(${(cp * sign * 6).toFixed(2)}deg)`;
    const isSig = char.classList.contains("hero__char--sig");
    char.style.color = isSig
      ? `rgba(var(--c-accent-rgb), ${(1 - cp * 0.82).toFixed(3)})`
      : `rgba(var(--c-ink-rgb), ${(1 - cp * 0.82).toFixed(3)})`;
    char.style.setProperty("-webkit-text-stroke-width", `${(cp * 1.4).toFixed(2)}px`);
  });
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

type Box = { x: number; y: number; w: number; h: number };
function relBox(el: Element, origin: DOMRect): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

/** Construit les deux couches du plan (base + chaud) à partir des mesures. */
function buildPlan(
  hero: HTMLElement,
  baseSvg: SVGSVGElement,
  hotSvg: SVGSVGElement,
): void {
  const origin = hero.getBoundingClientRect();
  const W = Math.round(origin.width);
  const H = Math.round(origin.height);
  if (W === 0 || H === 0) return;

  const rgb = cssVar("--c-accent-rgb") || "198, 242, 78";
  const accentHex = (cssVar("--c-accent") || "#c6f24e").toUpperCase();
  const bg = cssVar("--c-bg") || "#0a0a0a";
  const a = (alpha: number): string => `rgba(${rgb}, ${alpha})`;
  // Alpha qui monte avec --bp-focus (0→1, piloté par le scroll) : les cotes
  // autour du titre reprennent le dessus à mesure que le mot se démonte.
  const af = (base: number, boost: number): string =>
    `rgba(${rgb}, calc(${base} + var(--bp-focus, 0) * ${boost}))`;
  const cellPx =
    parseFloat(getComputedStyle(hero).getPropertyValue("--bp-cell")) *
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 80;

  const word = hero.querySelector<HTMLElement>("[data-title-word]");
  const eyebrow = hero.querySelector<HTMLElement>(".hero__eyebrow");
  const cta = hero.querySelector<HTMLElement>(".btn--cta");
  if (!word) return;

  const t = relBox(word, origin);
  const fs = Math.round(parseFloat(getComputedStyle(word).fontSize));
  const wide = W >= 700;

  const mono = (
    x: number,
    y: number,
    str: string,
    o: { size?: number; fill?: string; anchor?: string } = {},
  ): string =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ` +
    `style="font-family:'Martian Mono',monospace;font-size:${o.size ?? 12}px;` +
    `letter-spacing:0.04em;fill:${o.fill ?? a(0.85)};text-anchor:${o.anchor ?? "start"}">` +
    `${str.toUpperCase()}</text>`;

  // ---- Couche BASE (toujours visible, calme) ----
  const base: string[] = [];
  const grid: string[] = [];
  for (let x = cellPx; x < W; x += cellPx) grid.push(`M${x.toFixed(0)} 0V${H}`);
  for (let y = cellPx; y < H; y += cellPx) grid.push(`M0 ${y.toFixed(0)}H${W}`);
  base.push(`<path d="${grid.join("")}" stroke="${a(0.08)}" stroke-width="1" fill="none"/>`);
  base.push(
    `<rect x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" width="${t.w.toFixed(1)}" height="${t.h.toFixed(1)}" fill="none" style="stroke:${af(0.26, 0.55)}" stroke-width="1" stroke-dasharray="2 4"/>`,
  );
  const cross = (cx: number, cy: number, col: string): string =>
    `<path d="M${(cx - 7).toFixed(1)} ${cy.toFixed(1)}h14 M${cx.toFixed(1)} ${(cy - 7).toFixed(1)}v14" style="stroke:${col}" stroke-width="1.5"/>`;
  const crossCol = af(0.4, 0.5);
  base.push(
    cross(t.x, t.y, crossCol),
    cross(t.x + t.w, t.y, crossCol),
    cross(t.x, t.y + t.h, crossCol),
    cross(t.x + t.w, t.y + t.h, crossCol),
  );
  // Cartouche (bloc-titre) en bas à droite.
  const bx = W - 20;
  const by = H - 84;
  base.push(
    mono(bx, by, "Chewbackk Studio", { anchor: "end", fill: a(0.5), size: 13 }),
    mono(bx, by + 18, "Plan · héro · feuille 01", { anchor: "end", fill: a(0.42) }),
    mono(bx, by + 36, `${W} × ${H} px · grille ${Math.round(cellPx)}`, { anchor: "end", fill: a(0.42) }),
  );

  // ---- Couche CHAUDE (détail révélé par la lampe) ----
  const hot: string[] = [];
  // Trame d'accent révélée SOUS la lampe, partout sur le fond : mailles pleines
  // (accent net) + demi-mailles fines. C'est l'effet « projecteur » qui éclaire
  // la construction là où passe le curseur.
  const gMain: string[] = [];
  for (let x = cellPx; x < W; x += cellPx) gMain.push(`M${x.toFixed(0)} 0V${H}`);
  for (let y = cellPx; y < H; y += cellPx) gMain.push(`M0 ${y.toFixed(0)}H${W}`);
  const gHalf: string[] = [];
  for (let x = cellPx / 2; x < W; x += cellPx) gHalf.push(`M${x.toFixed(0)} 0V${H}`);
  for (let y = cellPx / 2; y < H; y += cellPx) gHalf.push(`M0 ${y.toFixed(0)}H${W}`);
  hot.push(
    `<path d="${gHalf.join("")}" stroke="${a(0.14)}" stroke-width="1" fill="none"/>`,
    `<path d="${gMain.join("")}" stroke="${a(0.42)}" stroke-width="1" fill="none"/>`,
  );
  // Cote de largeur (chaude : mouse-only, comme le reste du détail fin).
  const dyW = t.y + t.h + 22;
  hot.push(
    `<path d="M${t.x.toFixed(1)} ${dyW}h${t.w.toFixed(1)} M${t.x.toFixed(1)} ${(dyW - 5).toFixed(1)}v10 M${(t.x + t.w).toFixed(1)} ${(dyW - 5).toFixed(1)}v10" stroke="${a(0.7)}" stroke-width="1"/>`,
    `<rect x="${(t.x + t.w / 2 - 34).toFixed(1)}" y="${(dyW - 10).toFixed(1)}" width="68" height="18" fill="${bg}"/>`,
    mono(t.x + t.w / 2, dyW + 4, `${Math.round(t.w)} px`, { anchor: "middle", fill: a(0.9) }),
  );
  // Cote de hauteur.
  const dxH = t.x - 22;
  hot.push(
    `<path d="M${dxH.toFixed(1)} ${t.y.toFixed(1)}v${t.h.toFixed(1)} M${(dxH - 5).toFixed(1)} ${t.y.toFixed(1)}h10 M${(dxH - 5).toFixed(1)} ${(t.y + t.h).toFixed(1)}h10" stroke="${a(0.7)}" stroke-width="1"/>`,
    `<g transform="translate(${(dxH - 8).toFixed(1)} ${(t.y + t.h / 2).toFixed(1)}) rotate(-90)">${mono(0, 0, `${Math.round(t.h)} px`, { anchor: "middle", fill: a(0.85) })}</g>`,
  );
  if (wide) {
    const ay = t.y + t.h + 44;
    hot.push(
      `<path d="M${t.x.toFixed(1)} ${(t.y + t.h + 4).toFixed(1)}v${(ay - t.y - t.h - 14).toFixed(1)}" stroke="${a(0.6)}" stroke-width="1"/>`,
      mono(t.x + 8, ay, `Archivo · 900 · ${fs}px`, { fill: a(0.95) }),
    );
  }
  if (eyebrow) {
    const e = relBox(eyebrow, origin);
    hot.push(
      `<path d="M${(e.x + e.w + 10).toFixed(1)} ${(e.y + e.h / 2).toFixed(1)}h40" stroke="${a(0.6)}" stroke-width="1"/>`,
      mono(e.x + e.w + 56, e.y + e.h / 2 + 4, "label · mono", { fill: a(0.8) }),
    );
  }
  if (cta && wide) {
    const c = relBox(cta, origin);
    hot.push(
      `<rect x="${(c.x - 4).toFixed(1)}" y="${(c.y - 4).toFixed(1)}" width="${(c.w + 8).toFixed(1)}" height="${(c.h + 8).toFixed(1)}" fill="none" stroke="${a(0.7)}" stroke-width="1"/>`,
      `<path d="M${(c.x + c.w + 6).toFixed(1)} ${(c.y - 4).toFixed(1)}l18 -18" stroke="${a(0.7)}" stroke-width="1"/>`,
      mono(c.x + c.w + 28, c.y - 24, `CTA · ${accentHex}`, { fill: a(0.9) }),
    );
  }

  baseSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  baseSvg.innerHTML = base.join("");
  hotSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  hotSvg.innerHTML = hot.join("");
}

/** Place la cote vivante à hauteur du centre du titre (dans le repère hero). */
function positionDatum(hero: HTMLElement, datum: HTMLElement): void {
  const word = hero.querySelector<HTMLElement>("[data-title-word]");
  if (!word) return;
  const origin = hero.getBoundingClientRect();
  const t = relBox(word, origin);
  datum.style.setProperty("--datum-y", `${(t.y + t.h / 2).toFixed(0)}px`);
}

/** Lecture live : la cote affiche la position réelle du titre à l'écran. */
function updateDatum(hero: HTMLElement, datum: HTMLElement, read: HTMLElement | null): void {
  const word = hero.querySelector<HTMLElement>("[data-title-word]");
  if (!word) return;
  const top = word.getBoundingClientRect().top;
  if (read) read.textContent = `y ${Math.round(Math.max(0, top))} px`;
  // Fond au repos, s'efface quand le hero quitte l'écran (scroll > ~60% de H).
  const scrolled = window.scrollY;
  const fade = 1 - Math.min(1, scrolled / (hero.offsetHeight * 0.6));
  datum.style.setProperty("--datum-op", (0.55 * fade).toFixed(3));
}

function teardown(): void {
  if (tl) {
    tl.kill();
    tl = null;
  }
  if (deconstructST) {
    deconstructST.kill();
    deconstructST = null;
  }
  if (onResize) {
    window.removeEventListener("resize", onResize);
    onResize = null;
  }
  if (onScroll) {
    window.removeEventListener("scroll", onScroll);
    onScroll = null;
  }
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  if (scrollRaf) cancelAnimationFrame(scrollRaf);
  if (armRaf) cancelAnimationFrame(armRaf);
  resizeRaf = scrollRaf = armRaf = 0;
}

function init(): void {
  teardown();
  // Invalide les continuations asynchrones (fonts, rAF) d'un init précédent.
  const myGen = ++gen;

  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  const word = hero.querySelector<HTMLElement>("[data-title-word]");
  const title = hero.querySelector<HTMLElement>("[data-hero-title]");
  const baseSvg = hero.querySelector<SVGSVGElement>("[data-plan-base]");
  const hotSvg = hero.querySelector<SVGSVGElement>("[data-plan-hot-svg]");
  const datum = hero.querySelector<HTMLElement>("[data-datum]");
  const read = hero.querySelector<HTMLElement>("[data-datum-read]");
  const fades = gsap.utils.toArray<HTMLElement>("[data-bp-fade]", hero);
  if (!word || !title) return;

  const chars = splitWord(word);
  const sig = chars[chars.length - 1];
  const charsHead = chars.slice(0, -1);
  // `astro:page-load` peut rejouer sur le même DOM : l'entrée repart avec des
  // clips fermés, pas avec l'overflow libéré d'une passe précédente.
  hero.classList.remove("is-done");

  // Deep-link #plan : dévoile le plan complet au chargement (lien partageable).
  const plan = hero.querySelector<HTMLElement>("[data-plan]");
  if (plan && window.location.hash === "#plan") plan.classList.add("is-open");

  const rebuild = (): void => {
    if (baseSvg && hotSvg) buildPlan(hero, baseSvg, hotSvg);
    if (datum) positionDatum(hero, datum);
  };
  rebuild();
  onResize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(rebuild);
  };
  window.addEventListener("resize", onResize);
  document.fonts?.ready.then(() => {
    rebuild();
    // La police custom peut changer la hauteur du titre : la distance
    // épinglée par le ScrollTrigger doit être recalculée en conséquence.
    ScrollTrigger.refresh();
  });

  // Cote vivante : lecture au scroll (rAF-throttlée).
  if (datum) {
    updateDatum(hero, datum, read);
    onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        updateDatum(hero, datum, read);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (prefersReducedMotion()) {
    title.style.visibility = "visible";
    gsap.set(chars, { yPercent: 0 });
    gsap.set(fades, { autoAlpha: 1, y: 0 });
    hero.style.setProperty("--bp-grid", "1");
    hero.style.setProperty("--bp-draw", "1");
    if (datum) datum.style.setProperty("--datum-op", "0.5");
    hero.classList.add("is-done");
    return;
  }

  hero.style.setProperty("--bp-grid", "0");
  hero.style.setProperty("--bp-draw", "0");
  let entryDone = false;

  // Le pin (hero épinglé pendant la déconstruction) s'arme DÈS l'init, une
  // frame plus tard : hors du dispatch `astro:page-load`, dont l'init de
  // smooth-scroll tue tous les ScrollTriggers. Armé seulement à la fin de
  // l'entrée (comme avant), le pin-spacer s'insérait ~1.7s après le
  // chargement : layout shift, et un scroll pendant l'entrée emportait le
  // hero à mi-composition puis le faisait sauter à la création du pin. Sans
  // le pin, le titre (~150-200px de haut) quitterait de toute façon l'écran
  // en un seul geste de scroll, avant d'avoir fini de se démonter.
  gsap.registerPlugin(ScrollTrigger);
  armRaf = requestAnimationFrame(() => {
    armRaf = 0;
    if (myGen !== gen) return;
    deconstructST = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: () => `+=${Math.round(window.innerHeight * 0.45)}`,
      pin: true,
      scrub: 0.3,
      onUpdate: (self) => {
        hero.style.setProperty("--bp-focus", self.progress.toFixed(3));
        // Pendant l'entrée, les .from() possèdent les transforms des
        // lettres : la déconstruction n'écrit qu'une fois la composition
        // finie (rattrapage dans onComplete si on a scrollé entre-temps).
        if (entryDone) updateDeconstruct(chars, self.progress);
      },
    });
  });

  // L'entrée du titre attend la police définitive : partie avec la fallback,
  // Archivo swapperait en plein vol (hard refresh / cache froid) et les
  // lettres changeraient de forme à mi-montée. Plafond court pour ne jamais
  // bloquer le hero sur un réseau lent (les woff2 sont préchargées).
  const fontsReady: Promise<unknown> = document.fonts
    ? Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])
    : Promise.resolve();

  fontsReady.then(() => {
    if (myGen !== gen) return;
    title.style.visibility = "visible";
    const p = { grid: 0, draw: 0 };

    tl = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => {
        hero.classList.add("is-done");
        entryDone = true;
        if (deconstructST) updateDeconstruct(chars, deconstructST.progress);
      },
    });

    tl
      // Le plan se dessine (balayage) pendant que la grille se révèle.
      .to(
        p,
        {
          draw: 1,
          duration: 0.7,
          ease: "power2.inOut",
          onUpdate: () => hero.style.setProperty("--bp-draw", p.draw.toFixed(3)),
        },
        0,
      )
      .to(
        p,
        {
          grid: 1,
          duration: 0.6,
          ease: "power2.out",
          onUpdate: () => hero.style.setProperty("--bp-grid", p.grid.toFixed(3)),
        },
        0.05,
      )
      // Le nom se compose par-dessus le plan.
      .from(charsHead, { yPercent: 118, duration: 0.72, stagger: 0.04 }, 0.34)
      // La signature rebondit : back.out(1.9) dépasse la position finale de
      // ~12% de la course (118 yPercent) ≈ 0.13em vers le haut au pic. Sa
      // fenêtre de clip a le padding-top qu'il faut pour l'absorber (0.1em +
      // ~0.05em d'encre sous le bord, cf. CSS .hero__clip:last-child) : rien
      // ne se fait couper pendant le rebond.
      .from(sig, { yPercent: 118, duration: 0.6, ease: "back.out(1.9)" }, ">-0.28")
      .fromTo(
        fades,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 },
        0.5,
      );
  });

  // La cote apparaît en douceur une fois le plan dessiné.
  if (datum) updateDatum(hero, datum, read);
}

export function bootstrapBlueprint(): void {
  document.addEventListener("astro:page-load", init);
}
