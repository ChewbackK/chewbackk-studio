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

## `chewcast-preview.webp`

Capture d'écran de l'app Chewcast (repo `P-3/chewcast`, Express + SQLite) tournant en local sur `localhost:3000`, viewport mobile (c'est une PWA terrain).

```bash
# Lancer l'app localement d'abord : node server.js (depuis le repo chewcast)
node -e "
import('playwright-core').then(async ({ chromium }) => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'chewcast-full.png' });
  await browser.close();
});
"
```

Puis recadrage sur les 620 premiers pixels de hauteur (logo + carte de session + actions rapides, la partie la plus dense en information) et export en WebP qualité 85 :

```bash
ffmpeg -i chewcast-full.png -vf "crop=430:620:0:0" -c:v libwebp -q:v 85 chewcast-preview.webp
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
- Si `chewcast-preview.webp` ou `portfolio-perso-preview.webp` doivent être régénérés après une refonte visuelle de ces sites, reprendre les commandes ci-dessus avec les repos à jour plutôt que de les considérer figés.
