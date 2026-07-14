# PLAN-RESPONSIVE-MOBILE.md : plan de correction du responsive mobile

Mission d'exécution pour l'agent en charge (constats mesurés, corrections
décidées avec le propriétaire, protocole de vérification). Tous les chiffres
ci-dessous ont été mesurés en émulation 385x817 et 320x640 (script
`scripts/audit-mobile.mjs`, fourni) : ne pas re-débattre des constats,
les corriger.

## 0. À lire avant de commencer

- **Lire `CLAUDE.md`** (conventions du repo). Rappels non négociables :
  commentaires et UI en français, **aucun tiret cadratin**, tokens seulement
  (les `--sp-5/7/9...` n'existent PAS), WCAG AA sur chaque paire texte/fond,
  `prefers-reduced-motion` respecté partout, aucun framework client.
- Pattern des scripts : `bootstrap*()` attache UN listener `astro:page-load` ;
  `init()` fait `teardown()` d'abord ; idempotent. Ne pas casser ce contrat.
- Commandes : `npm run dev -- --port 4400`, `npx astro check`,
  `npm run build`, et la vérification objective :
  `BASE=http://localhost:4400 node scripts/audit-mobile.mjs`
  (sortie : JSON + verdicts OK/KO + captures dans `scripts/audit-mobile-out/`).

### Invariants à NE PAS casser (acquis durement, vérifiés au pixel)

- Desktop : navbar + hero = un écran exactement
  (`min-height: calc(100svh - var(--nav-h) - 1px)` dans HeroBlueprint.astro).
- Desktop : pin du hero `start: 0`, `end: 0.75 * innerHeight`, effet sur les
  premiers 35 % (`FOCUS_SPAN`), palier + dérive (`holdProgress`) : comportement
  à conserver À L'IDENTIQUE en pointeur fin.
- Fenêtres de clip des lettres du titre (`.hero__clip`) : `padding-block
  0.06em`, `padding-inline 0.12em` / `margin-inline -0.12em`, et `padding-top
  0.1em` / `margin-top -0.04em` du dernier clip (rebond back.out du k).
  **Ne modifier aucune de ces valeurs** : elles empêchent les lettres coupées.
- L'entrée du titre attend `document.fonts.ready` (plafond 800 ms) ; le
  ScrollTrigger s'arme dans un `requestAnimationFrame` post-init (survie au
  kill-all de smooth-scroll). Conserver.
- `lamp.ts` : ne pas toucher.
- reduced-motion : état final statique, zéro boucle rAF, pas de pin.

---

## C1 [P0] `/contact` : le formulaire sort de l'écran

**Constat mesuré** : scrollWidth 503 px pour 385 de viewport (et 500 pour
320) ; tous les éléments du formulaire font 484 px de large.

**Cause racine (identifiée, ne pas chercher ailleurs)** : le libellé
d'option « Développement & automatisation (appli, scripts, bots, API) »
(59 caractères) impose ~484 px de min-content au
`<select name="project_type">` ; les grilles imbriquées de
`src/pages/contact.astro` (`.quote__form` > `.quote__row` > `.quote__field`)
ont `min-width: auto` par défaut, donc cette largeur remonte jusqu'au
formulaire entier. Le CSS mobile-first (1 colonne < 640 px) est déjà correct.

**Correctif** (bloc `<style>` de `src/pages/contact.astro`, ~lignes 226-264) :

```css
.quote__row,
.quote__field {
  min-width: 0; /* les libellés d'option ne dictent plus la largeur */
}
.quote__field input,
.quote__field select,
.quote__field textarea {
  width: 100%;
  min-width: 0;
}
```

Optionnel (UX, pas nécessaire au fix) : raccourcir le libellé en
« Développement & automatisation (applis, bots, API) ». Garder le sens.

**Acceptation** : audit -> `overflowX: false` sur `/contact` à 385 ET 320 ;
visuel : champs alignés au conteneur, le curseur budget et ses bornes
restent dans l'écran.

Note : le grand vide noir avant le footer sur les captures pleine page est
un artefact (les `.reveal` ne se déclenchent qu'au scroll réel), pas un bug.

---

## C2 [P0] Navbar : déborde de 27 px à 320

**Constat** : toutes les pages ont `scrollWidth 347 / viewport 320` ; le
fautif est `a.nav__cta` (right = 346). Depuis l'ajout du burger, marque +
burger + CTA + gaps ne tiennent plus sous ~350 px.

**Correctif** (`src/components/Navbar.astro`, media query 420 px existante) :
dans `@media (max-width: 420px)` :

- masquer le tag « studio » : `.nav__brand-tag { display: none; }`
- resserrer : `.nav__inner { gap: var(--sp-2); }`

Budget de largeur à 320 (à vérifier après coup) : marque ~110 + burger 36 +
CTA ~70 + 2 gaps 16 + container-pad ~32 = ~264 px : marge saine.

**Acceptation** : audit -> `overflowX: false` sur TOUTES les pages à 320.

---

## C3 [P0] Hero mobile : le plan écrit SUR le contenu

**Constats** : le cartouche (« CHEWBACKK STUDIO / PLAN · HÉRO · FEUILLE 01 /
385 x 748 PX · GRILLE 80 ») est dessiné sur le bouton « Voir les services »
(`cartoucheSurCTA: true`) ; la cote vivante « Y xxx PX » chevauche le titre
(`datumSurTitre: true`).

**Décision du propriétaire : plan allégé sous 640 px** : on garde la grille,
le cadre du titre et les croix ; on supprime cartouche + cote vivante.

**Correctifs** :

1. `src/scripts/blueprint.ts`, dans `buildPlan()` (zone du cartouche,
   `const bx = W - 20; const by = H - 84;`...) : n'ajouter les trois
   `mono(...)` du cartouche que si `W >= 640`. La condition doit vivre DANS
   `buildPlan` (rappelé au resize), pas dans `init`. Commenter : sous 640 px
   le bas du hero est occupé par les CTA, le cartouche n'a pas de place.
2. `src/components/HeroBlueprint.astro` : masquer la cote vivante sous
   640 px :
   ```css
   @media (max-width: 640px) {
     .hero__datum { display: none; }
   }
   ```
3. `src/scripts/blueprint.ts`, `updateDatum()` : sortir tôt si le datum est
   masqué (`if (datum.offsetParent === null) return;`) pour ne pas mesurer
   à chaque scroll pour rien.

**Acceptation** : audit -> `cartoucheTextes: 0`, `datumVisible: false`,
`cartoucheSurCTA: false`, `datumSurTitre: false` à 385 ; desktop ->
`cartoucheTextes: 3` (le cartouche revient).

---

## C4 [P0] Pin au tactile : scroll retenu 613 px + titre fantôme

**Constats** : au doigt, le hero reste épinglé sur ~75 % d'un écran de swipe
(613 px à 385x817) pendant que le titre finit en contours à 18 % d'alpha :
sensation de scroll bloqué, puis de page vide.

**Décision du propriétaire : pas de pin sur pointeur grossier.** La
déconstruction accompagne la sortie naturelle du hero. Le desktop garde
pin + palier + dérive à l'identique.

**Correctif** (`src/scripts/blueprint.ts`, bloc de création du
ScrollTrigger dans `init()`) : au moment d'armer le trigger, détecter le
tactile comme le fait `lamp.ts` (cohérence) :

```ts
const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
```

- **Tactile** (`coarse`) : `pin: false`, `start: 0`,
  `end: () => Math.round(window.innerHeight * 0.3)`, effet étalé sur TOUTE
  la plage (pas de palier ni de dérive : span efficace = 1, drift = 0).
- **Desktop** : configuration actuelle inchangée (pin, 0.75, `FOCUS_SPAN`
  0.35, palier, dérive).

Implémentation suggérée : une seule création de trigger, avec des
constantes locales choisies selon `coarse` (distance, span, drift activé ou
non), plutôt que deux blocs dupliqués. `easeFocus`/`holdProgress` peuvent
prendre le span en paramètre ; garder les valeurs desktop comme défauts et
commenter les deux jeux de réglages. Le rattrapage dans `onComplete` doit
utiliser les mêmes réglages que `onUpdate`.

Note : le choix pointeur fin/grossier se fait à l'init ; un resize ne change
pas le type de pointeur, ne pas sur-ingénier d'écouteur.

**Acceptation** : audit -> mobile : `pinSpacer: false` et
`apresUnCran.pageBouge: true` (la page descend dès le premier cran pendant
que les lettres se déconstruisent) ; desktop : `pinSpacer: true` et
`unePage: true` (non-régression).

---

## C5 [P1] Menu burger : mélangé au hero, aria figé, rien ne le ferme au scroll

**Constats** : menu ouvert, le hero reste à pleine luminosité sous le
dropdown (titre géant + grille + cotes mélangés aux liens) ; l'`aria-label`
du bouton reste « Ouvrir le menu » une fois ouvert ; on peut scroller menu
ouvert.

**Décision du propriétaire : dropdown conservé + scrim + verrouillage.**

**Correctifs** :

1. `src/components/Navbar.astro` : ajouter un voile AVANT `.nav__inner` :
   ```html
   <div class="nav__scrim" data-nav-scrim aria-hidden="true"></div>
   ```
   ```css
   .nav__scrim {
     display: none;
     position: fixed; /* le sticky parent ne crée pas de containing block */
     inset: 0;
     z-index: -1; /* sous le bandeau et le dropdown, au-dessus de la page */
     background: rgba(var(--c-bg-rgb), 0.78);
   }
   .nav__scrim.is-open { display: block; }
   ```
   (Pas de backdrop-filter : coût GPU inutile sur mobile. Vérifier le
   z-index réel : le scrim doit passer AU-DESSUS du contenu de page et SOUS
   `.nav__inner` et le dropdown ; ajuster avec la pile locale du header,
   qui est déjà `z-index: var(--z-nav)`.)
2. `src/styles/globals.css` : `html.is-menu-open { overflow: hidden; }`
   (bloque le scroll natif, tactile compris).
3. `src/scripts/smooth-scroll.ts` : exporter un utilitaire de gel, sans rien
   changer d'autre :
   ```ts
   /** Gèle/relâche le smooth-scroll (menu ouvert). No-op sans instance. */
   export function scrollFreeze(frozen: boolean): void {
     if (frozen) lenis?.stop();
     else lenis?.start();
   }
   ```
4. `src/scripts/nav-menu.ts` :
   - `openMenu()`/`closeMenu()` : basculer l'`aria-label` (« Fermer le
     menu » / « Ouvrir le menu ») en écho d'`aria-expanded` ; ajouter/retirer
     `is-open` sur `[data-nav-scrim]` ; ajouter/retirer `is-menu-open` sur
     `document.documentElement` ; appeler `scrollFreeze(true/false)`.
   - Fermer quand la fenêtre repasse au-dessus de 640 px
     (`matchMedia("(min-width: 641px)")`, écouteur `change`, désabonné au
     teardown) : sinon état zombie en repassant desktop.
   - À la fermeture par Échap : rendre le focus au bouton burger.
   - `teardown()` : remettre l'état propre (scrim fermé, classe html
     retirée, `scrollFreeze(false)`, écouteurs retirés) : une navigation
     menu ouvert ne doit rien laisser traîner.

**Acceptation** : audit -> `menu.scrimVisible: true`,
`menu.ariaLabel: "Fermer le menu"`, `menu.scrollVerrouille: true` menu
ouvert ; manuel : Échap ferme et rend le focus, clic sur le voile ferme,
resize > 640 ferme, navigation ferme, et le hero est voilé (illisible)
sous le menu.

---

## C6 [P1] Hero : « DÉLAI » tronqué dans le bloc

**Constat** : `.hero__block dt { width: 3.5em }` ; « Délai » en Martian Mono
espacé 0.12em mesure ~55 px pour 47 disponibles (le libellé colle la valeur).

**Correctif** (`src/components/HeroBlueprint.astro`) : `width: 4em;` sur
`.hero__block dt`. Vérifier visuellement que la colonne des valeurs reste
alignée sur les trois lignes.

**Acceptation** : audit -> `dtsOK: true`.

---

## C7 [P2] Finitions (optionnelles, à goûter visuellement)

- Eyebrow sur deux lignes : le badge « 01 » flotte entre les lignes
  (`align-items: center`). Essayer `align-items: start` sur
  `.hero__eyebrow` (badge ancré à la première ligne) ; garder ce qui est le
  plus propre à l'œil, à 320 et 385.
- Après C4, dérouler la home au doigt émulé et vérifier que les `.reveal`
  (manifesto, services) apparaissent bien au scroll (ScrollTrigger.refresh
  est déjà appelé après fonts.ready ; c'est une vérification, pas un
  changement).
- (info) Des `path/text` du plan SVG débordent en peinture (overflow
  visible du SVG) sans créer de barre de scroll : toléré, le hero est en
  `overflow: clip`. Ne pas « corriger ».

---

## Ordre de travail et commits

Un chantier = un commit, dans cet ordre (indépendants mais du plus urgent au
moins urgent) :

1. C1 : `fix(contact): le formulaire tient dans l'ecran mobile (min-width des grilles)`
2. C2 : `fix(nav): la barre tient a 320px (tag masque, gaps resserres)`
3. C3 + C6 : `fix(hero): plan allege sous 640px, dt Delai non tronque`
4. C4 : `feat(hero): deconstruction sans pin au tactile`
5. C5 : `feat(nav): scrim + verrouillage du scroll menu ouvert, aria complet`
6. C7 si retenu.

Avant CHAQUE commit : `npx astro check` (0 erreur) + `npm run build` +
`BASE=http://localhost:4400 node scripts/audit-mobile.mjs` (les critères
déjà couverts par les chantiers faits doivent être OK, aucun critère
précédemment OK ne doit repasser KO).

## Vérification finale (tout doit être vert)

1. `node scripts/audit-mobile.mjs` : les 7 verdicts « CRITÈRES DE SORTIE »
   à OK (le script rend un code de sortie non nul sinon).
2. Passe visuelle devtools (mode responsive) : 320, 375, 385, 768, 1440 :
   hero au repos + pendant le scroll, menu ouvert/fermé, `/contact` complet
   (champs, curseur, consentement), footer.
3. Desktop non régressé : entrée du titre lettres entières, pin + palier +
   dérive identiques à avant, navbar + hero = un écran.
4. reduced-motion (émuler dans devtools) : tout statique, pas de pin, pas de
   boucle rAF, menu utilisable.
