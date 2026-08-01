# Aperçus de la page réalisations

Fichiers utilisés par `src/pages/realisations.astro`. Générés le 01/08/2026 via `ffmpeg` (vidéo/images) et Playwright + Chrome (captures d'écran) — aucun des deux n'est une dépendance déclarée du projet (`package.json`), ce sont des outils ponctuels utilisés hors du tooling du repo.

## `axel-mahe-preview.webm` / `.mp4` / `axel-mahe-poster.jpg`

Extrait de 5 s du showreel réalisateur d'Axel Mahé (fichier source `assets/video/hero.mp4`, ~11 Mo, dans le repo `portfolio_shaxe` — pas ici, trop lourd pour être committé). Segment choisi manuellement (`t=23.3s` à `t=28.3s`) : un plan atmosphérique de transition suivi d'une explosion de feu, plus impactant qu'un extrait aléatoire.

```bash
SRC=chemin/vers/portfolio_shaxe/assets/video/hero.mp4
FILTER="crop=1280:536:0:92,scale=800:-2,fade=t=in:st=0:d=0.25,fade=t=out:st=4.6:d=0.4"
# crop=1280:536:0:92 : recadrage centré en 2.39:1 (format cinéma, cf.
# data-reel="2.39:1" sur le site source lui-même) à partir du 1280x720 d'origine.

# WebM (VP9) — format principal
ffmpeg -ss 23.3 -i "$SRC" -t 5.0 -vf "$FILTER" -an \
  -c:v libvpx-vp9 -b:v 900k -crf 32 -deadline good -cpu-used 2 \
  axel-mahe-preview.webm

# MP4 (H.264) — repli pour les navigateurs sans VP9
ffmpeg -ss 23.3 -i "$SRC" -t 5.0 -vf "$FILTER" -an \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart \
  axel-mahe-preview.mp4

# Poster (frame fixe à t=25.8s, pendant le pic du feu — sert d'attribut
# poster du <video> ET de fallback prefers-reduced-motion)
ffmpeg -ss 25.8 -i "$SRC" -vf "crop=1280:536:0:92,scale=800:-2" -frames:v 1 -q:v 4 \
  axel-mahe-poster.jpg
```

Pour changer de segment : ré-extraire des montages de frames (`ffmpeg -vf "fps=1/5,scale=480:-1"` puis `tile=4x4`) et regarder les images avant de fixer `-ss`/`-t`, plutôt que deviner à l'aveugle.

## `chewcast-duo.webp`

Montage à 2 captures côte à côte de l'app Chewcast (repo `P-3/chewcast`, Express + SQLite) tournant en local sur `localhost:3000`, viewport mobile (c'est une PWA terrain). Gauche : écran d'accueil (logo + prochaine session). Droite : **un vrai résultat** de l'analyse "Où aller ?" (`/recommander`) — pas une capture statique d'un formulaire vide, mais le calcul réel du moteur de scoring (`public/js/engine.js`, fonction `scorerSpotComplet`, 7 facteurs : vent/marée/courant/structures/saison/météo/profondeur) sur les vraies données du jour (coefficient de marée via maree.info, météo via l'API météo), déclenché en pilotant un vrai clic sur "Analyser les spots" avec Playwright.

```bash
# Lancer l'app localement d'abord : node server.js (depuis le repo chewcast)
# nécessite au moins un spot en base (database/chewcast.db) pour produire un résultat

# Capture 1 : écran d'accueil
node -e "
import('playwright-core').then(async ({ chromium }) => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'chewcast-home.png' });
  await browser.close();
});
"

# Capture 2 : résultat réel d'une analyse (routing en hash, cf. router.js
# createWebHashHistory -> /#/recommander)
node -e "
import('playwright-core').then(async ({ chromium }) => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 430, height: 1250 } });
  await page.goto('http://localhost:3000/#/recommander', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('button:has-text(\"Analyser les spots\")').click();
  await page.waitForTimeout(4000); // appels réseau maree.info + météo
  await page.screenshot({ path: 'chewcast-result.png' });
  await browser.close();
});
"
```

Recadrage à un ratio proche de la fenêtre d'aperçu de la carte (~2.4:1) AVANT montage, pas de resize forcé après coup (déforme/coupe au hasard) :

```bash
magick chewcast-home.png   -crop 430x350+0+0   +repage cell-left.png
magick chewcast-result.png -crop 430x345+0+610 +repage cell-right.png   # offset Y à ajuster si le layout change
magick cell-left.png cell-right.png +append -quality 85 chewcast-duo.webp
```

`playwright-core` n'est pas une dépendance du projet — installer temporairement (`npm install playwright-core --no-save`) dans un dossier de travail, le binaire Chrome système (`/usr/bin/google-chrome`) suffit, pas besoin de télécharger les navigateurs Playwright.

## `portfolio-perso-preview.webp`

Capture du hero du portfolio personnel (repo `portfolio`, `npm run build` puis servi en local, ex. `npx serve dist`), recadrée pour ne montrer QUE la typographie "EVAN Bouvier" — **le hero complet affiche aussi la ligne d'emploi actuel, à exclure systématiquement de tout ce qui est publié sur du contenu Chewbackk Studio** (voir CLAUDE.md du repo Ops si besoin de contexte sur cette règle).

```bash
node -e "
import('playwright-core').then(async ({ chromium }) => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'portfolio-full.png' });
  await browser.close();
});
"
```

Crop `(250, 150, 1350, 525)` sur le PNG obtenu (zone "EVAN Bouvier" uniquement, s'arrête avant la ligne d'emploi) puis export WebP qualité 85.

## Notes

- Deux formats étaient générés par le pipeline ffmpeg à l'origine (`.jpg`/`.webp` pour Chewcast et Portfolio, `.webp`/`.jpg` pour le poster Axel Mahé) — seul le format réellement importé dans `realisations.astro` est gardé ici, les doublons ont été supprimés avant le premier commit de ce dossier.
- Si `chewcast-duo.webp` ou `portfolio-perso-preview.webp` doivent être régénérés après une refonte visuelle de ces sites, reprendre les commandes ci-dessus avec les repos à jour plutôt que de les considérer figés.
