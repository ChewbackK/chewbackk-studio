# Galerie — Axel Mahé (page de détail /realisations/axel-mahe)

Captures réelles du site https://axel-mahe.netlify.app, générées le 02/08/2026
via Playwright (`playwright-core`, pas une dépendance déclarée — installée
ponctuellement avec `npm install playwright-core --no-save` dans un dossier
de travail hors repo) + Chrome système (`/usr/bin/google-chrome`), puis
recadrées/encodées en WebP qualité 85 avec ImageMagick `magick`. Même
méthode que `src/assets/previews/README.md`.

Le site utilise une intro façon amorce de pellicule SMPTE (`#preloader`,
décompte 3→1) : capturer avant sa disparition tombe sur l'écran de
décompte, pas sur le contenu réel. Solution retenue : attendre
`page.waitForSelector('#preloader', { state: 'hidden' })` plutôt qu'un délai
fixe fragile.

Piège annexe rencontré sur `/projets` uniquement : le header (logo + nav) y
apparaît avec un fade-in plus lent que sur les autres pages — une capture
à 2s d'attente après `load` tombait sur un bandeau noir sans nav.
Repris avec 5s d'attente, header présent. Toutes les captures utilisent une
fenêtre plus grande que la zone visée (1760×1300 ou 1760×1500) puis un
recadrage précis après coup (`-crop WxH+0+0`), pour éviter le bug connu de
troncature de Chrome headless quand `--window-size` colle exactement à la
cible.

## `axel-mahe-hero.webp` (1760×1300)

Page d'accueil (`/`), après disparition du preloader + 2s de stabilisation
des animations d'entrée. Montre le titre "AXEL Mahé", le bandeau
REC/TIMECODE, les repères de ratio (1.33/1.85/2.39:1) et la légende de
scène en bas — l'esthétique "slate de cinéma" du site.

```bash
node -e "
import('playwright-core').then(async ({ chromium }) => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1760, height: 1300 } });
  await page.goto('https://axel-mahe.netlify.app/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForSelector('#preloader', { state: 'hidden', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'raw-hero.png' });
  await browser.close();
});
"
magick raw-hero.png -quality 85 axel-mahe-hero.webp
```

## `axel-mahe-realisations-dyka.webp` (1760×1035)

Page `/realisations`, film "DYKA" (`#filmDyka`, premier film de la liste),
recadrée juste après la première rangée de la "Galerie — Stills" pour
éviter une rangée coupée à moitié.

```bash
# même goto/wait pattern sur https://axel-mahe.netlify.app/realisations,
# scrollTo(0, 550) pour amener la carte DYKA + sa galerie de stills à l'écran
magick raw-realisations-cards.png -crop 1760x1035+0+0 +repage axel-mahe-realisations-dyka.webp
```

## `axel-mahe-associations.webp` (1760×1400)

Page `/associations`, entrée "Ramdam" (radio étudiante de Valenciennes,
vidéo d'annonce + soirée de lancement réalisées par Axel) + première
rangée de la galerie "Cabaret des curiosités". Thème clair (fond crème,
accent orange) — contraste avec le reste du site, montre l'étendue de la
direction artistique.

```bash
# viewport 1760x1500 (plus de hauteur que le hero, page plus longue)
magick raw-associations-tall.png -crop 1760x1400+0+0 +repage axel-mahe-associations.webp
```

## `axel-mahe-projets.webp` (1760×1215)

Page `/projets` ("Contact sheet" — projets annexes en dehors des gros
tournages : covers, courts perso, collaborations). Recadrée juste avant la
5ᵉ entrée pour rester sur un cadrage propre à 4 entrées.

```bash
# 5s d'attente après 'load' (voir piège header ci-dessus)
magick raw-projets-v2.png -crop 1760x1215+0+0 +repage axel-mahe-projets.webp
```
