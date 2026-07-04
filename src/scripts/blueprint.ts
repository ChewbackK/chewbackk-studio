/**
 * blueprint.ts - direction « Blueprint » du hero.
 *
 * Trois rôles :
 *  1. Entrée : le nom se compose glyphe par glyphe (le dernier « k », la
 *     signature, se verrouille en dernier), la grille ambiante se révèle, le
 *     cartouche et les CTA se tamponnent. Une seule timeline, chaînée.
 *  2. Le PLAN : un calque SVG rempli à partir des cotes RÉELLES du hero
 *     (getBoundingClientRect) : largeur/hauteur du titre en px, grille,
 *     repères aux coins, annotations mono. Reconstruit au resize et une fois
 *     les polices chargées (les mesures en dépendent).
 *  3. Le bouton « Voir le plan » : révèle tout le plan pour le clavier et le
 *     tactile (là où la lampe curseur n'existe pas).
 *
 * Contraintes projet : idempotent sur `astro:page-load`, teardown d'abord.
 * reduced-motion → tout est posé à l'état final, aucune timeline, aucun rAF.
 * Le calque plan est aria-hidden ; le <h1> garde le nom complet et son contraste.
 */
import gsap from "gsap";
import { prefersReducedMotion } from "./motion";

let tl: gsap.core.Timeline | null = null;
let resizeRaf = 0;
let onResize: (() => void) | null = null;
let onToggle: (() => void) | null = null;
let toggleBtn: HTMLElement | null = null;

/** Enveloppe chaque glyphe du mot dans un span (clip + char). Idempotent. */
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

/** Lit une couleur token (ex. --c-accent-rgb → "198, 242, 78"). */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

type Box = { x: number; y: number; w: number; h: number };

function relBox(el: Element, origin: DOMRect): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

/** Construit le SVG du plan à partir des mesures réelles du hero. */
function buildPlan(hero: HTMLElement, svg: SVGSVGElement): void {
  const origin = hero.getBoundingClientRect();
  const W = Math.round(origin.width);
  const H = Math.round(origin.height);
  if (W === 0 || H === 0) return;

  const rgb = cssVar("--c-accent-rgb") || "198, 242, 78";
  const accentHex = (cssVar("--c-accent") || "#c6f24e").toUpperCase();
  const line = `rgba(${rgb}, 0.55)`;
  const faint = `rgba(${rgb}, 0.16)`;
  const ink = `rgba(${rgb}, 0.9)`;
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
    opts: { size?: number; fill?: string; anchor?: string } = {},
  ): string =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ` +
    `style="font-family:'Martian Mono',monospace;font-size:${opts.size ?? 12}px;` +
    `letter-spacing:0.04em;fill:${opts.fill ?? ink};text-anchor:${opts.anchor ?? "start"}">` +
    `${str.toUpperCase()}</text>`;

  const parts: string[] = [];

  // 1. Grille (mêmes mailles que la grille ambiante) : repères de construction.
  const grid: string[] = [];
  for (let x = cellPx; x < W; x += cellPx)
    grid.push(`M${x.toFixed(0)} 0V${H}`);
  for (let y = cellPx; y < H; y += cellPx)
    grid.push(`M0 ${y.toFixed(0)}H${W}`);
  parts.push(`<path d="${grid.join("")}" stroke="${faint}" stroke-width="1" fill="none"/>`);

  // 2. Cadre du titre + repères aux 4 coins.
  parts.push(
    `<rect x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" width="${t.w.toFixed(1)}" height="${t.h.toFixed(1)}" fill="none" stroke="${line}" stroke-width="1" stroke-dasharray="2 4"/>`,
  );
  const cross = (cx: number, cy: number): string =>
    `<path d="M${(cx - 7).toFixed(1)} ${cy.toFixed(1)}h14 M${cx.toFixed(1)} ${(cy - 7).toFixed(1)}v14" stroke="${line}" stroke-width="1.5"/>`;
  parts.push(cross(t.x, t.y), cross(t.x + t.w, t.y), cross(t.x, t.y + t.h), cross(t.x + t.w, t.y + t.h));

  // 3. Cote horizontale (largeur réelle du titre).
  const dyW = t.y + t.h + 22;
  parts.push(
    `<path d="M${t.x.toFixed(1)} ${dyW}h${t.w.toFixed(1)} M${t.x.toFixed(1)} ${(dyW - 5).toFixed(1)}v10 M${(t.x + t.w).toFixed(1)} ${(dyW - 5).toFixed(1)}v10" stroke="${line}" stroke-width="1"/>`,
  );
  parts.push(
    `<rect x="${(t.x + t.w / 2 - 34).toFixed(1)} " y="${(dyW - 10).toFixed(1)}" width="68" height="18" fill="${cssVar("--c-bg") || "#0a0a0a"}"/>`,
    mono(t.x + t.w / 2, dyW + 4, `${Math.round(t.w)} px`, { anchor: "middle", size: 12 }),
  );

  // 4. Cote verticale (hauteur réelle du titre).
  const dxH = t.x - 22;
  parts.push(
    `<path d="M${dxH.toFixed(1)} ${t.y.toFixed(1)}v${t.h.toFixed(1)} M${(dxH - 5).toFixed(1)} ${t.y.toFixed(1)}h10 M${(dxH - 5).toFixed(1)} ${(t.y + t.h).toFixed(1)}h10" stroke="${line}" stroke-width="1"/>`,
    `<g transform="translate(${(dxH - 8).toFixed(1)} ${(t.y + t.h / 2).toFixed(1)}) rotate(-90)">${mono(0, 0, `${Math.round(t.h)} px`, { anchor: "middle" })}</g>`,
  );

  // 5. Annotation typo, posée sous la cote de largeur (évite l'eyebrow au-dessus
  //    du titre). Petit tiret repère vers le bas du titre.
  if (wide) {
    const ay = t.y + t.h + 44;
    parts.push(
      `<path d="M${t.x.toFixed(1)} ${(t.y + t.h + 4).toFixed(1)}v${(ay - t.y - t.h - 14).toFixed(1)}" stroke="${line}" stroke-width="1"/>`,
      mono(t.x + 8, ay, `Archivo · 900 · ${fs}px`, { fill: ink }),
    );
  }

  // 6. Annotation eyebrow.
  if (eyebrow) {
    const e = relBox(eyebrow, origin);
    parts.push(
      `<path d="M${(e.x + e.w + 10).toFixed(1)} ${(e.y + e.h / 2).toFixed(1)}h40" stroke="${line}" stroke-width="1"/>`,
      mono(e.x + e.w + 56, e.y + e.h / 2 + 4, "label · mono", { fill: `rgba(${rgb},0.8)` }),
    );
  }

  // 7. Annotation CTA (le vert = l'action). Encadré + hex réel.
  if (cta && wide) {
    const c = relBox(cta, origin);
    parts.push(
      `<rect x="${(c.x - 4).toFixed(1)}" y="${(c.y - 4).toFixed(1)}" width="${(c.w + 8).toFixed(1)}" height="${(c.h + 8).toFixed(1)}" fill="none" stroke="${line}" stroke-width="1"/>`,
      `<path d="M${(c.x + c.w + 6).toFixed(1)} ${(c.y - 4).toFixed(1)}l18 -18" stroke="${line}" stroke-width="1"/>`,
      mono(c.x + c.w + 28, c.y - 24, `CTA · ${accentHex}`, { fill: ink }),
    );
  }

  // 8. Cartouche (bloc-titre) en bas à droite, comme sur un plan.
  const bx = W - 20;
  const by = H - 84;
  parts.push(
    mono(bx, by, "Chewbackk Studio", { anchor: "end", fill: ink, size: 13 }),
    mono(bx, by + 18, "Plan · héro · feuille 01", { anchor: "end", fill: `rgba(${rgb},0.7)` }),
    mono(bx, by + 36, `${W} × ${H} px · grille ${Math.round(cellPx)}`, { anchor: "end", fill: `rgba(${rgb},0.7)` }),
  );

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = parts.join("");
}

function scheduleRebuild(hero: HTMLElement, svg: SVGSVGElement): void {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => buildPlan(hero, svg));
}

function teardown(): void {
  if (tl) {
    tl.kill();
    tl = null;
  }
  if (onResize) {
    window.removeEventListener("resize", onResize);
    onResize = null;
  }
  if (onToggle && toggleBtn) {
    toggleBtn.removeEventListener("click", onToggle);
    onToggle = null;
    toggleBtn = null;
  }
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
  }
}

function init(): void {
  teardown();

  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  const word = hero.querySelector<HTMLElement>("[data-title-word]");
  const title = hero.querySelector<HTMLElement>("[data-hero-title]");
  const svg = hero.querySelector<SVGSVGElement>("[data-plan-svg]");
  const plan = hero.querySelector<HTMLElement>("[data-plan]");
  const fades = gsap.utils.toArray<HTMLElement>("[data-bp-fade]", hero);
  if (!word || !title) return;

  const chars = splitWord(word);
  const sig = chars[chars.length - 1];
  const charsHead = chars.slice(0, -1); // toutes sauf la signature

  // Bouton « Voir le plan » (clavier + tactile).
  toggleBtn = hero.querySelector<HTMLElement>("[data-plan-toggle]");
  const label = hero.querySelector<HTMLElement>("[data-plan-toggle-label]");
  if (toggleBtn && plan) {
    onToggle = () => {
      const open = plan.classList.toggle("is-open");
      toggleBtn?.setAttribute("aria-pressed", String(open));
      if (label) label.textContent = open ? "Masquer le plan" : "Voir le plan";
      if (open) plan.classList.remove("is-lit");
    };
    toggleBtn.addEventListener("click", onToggle);

    // Deep-link : #plan ouvre le plan au chargement (lien partageable).
    if (window.location.hash === "#plan") onToggle();
  }

  // Le plan se mesure sur le rendu réel : (re)construire au resize et une fois
  // les polices chargées (sinon les cotes sont fausses).
  if (svg) {
    buildPlan(hero, svg);
    onResize = () => scheduleRebuild(hero, svg);
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => buildPlan(hero, svg));
  }

  title.style.visibility = "visible";

  if (prefersReducedMotion()) {
    gsap.set(chars, { yPercent: 0, scale: 1 });
    gsap.set(fades, { autoAlpha: 1, y: 0 });
    hero.style.setProperty("--bp-grid", "1");
    hero.classList.add("is-done");
    return;
  }

  // Grille ambiante masquée au départ, révélée en douceur.
  hero.style.setProperty("--bp-grid", "0");
  const grid = { v: 0 };

  tl = gsap.timeline({
    defaults: { ease: "power4.out" },
    onComplete: () => hero.classList.add("is-done"),
  });

  tl.to(
    grid,
    {
      v: 1,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => hero.style.setProperty("--bp-grid", grid.v.toFixed(3)),
    },
    0,
  )
    // Montée glyphe par glyphe (sauf la signature), puis le « k » se pose en
    // dernier avec un léger rebond vertical. Aucune mise à l'échelle : scaler le
    // dernier glyphe le rétrécissait et « coupait » le mot à droite en cours d'anim.
    .from(
      charsHead,
      { yPercent: 118, duration: 0.72, stagger: 0.04 },
      0.12,
    )
    .from(
      sig,
      { yPercent: 118, duration: 0.6, ease: "back.out(1.9)" },
      ">-0.28",
    )
    .fromTo(
      fades,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 },
      0.34,
    );
}

export function bootstrapBlueprint(): void {
  document.addEventListener("astro:page-load", init);
}
