# RAPPORT-AUDIT-CHANGEMENTS.md : audit des changements de la session

Auto-audit des modifications livrées sur `proto/blueprint` (hero Blueprint +
responsive mobile), méthode, preuves, conformité aux règles du repo, et
réserves résiduelles. Rédigé après relecture critique du code livré, pas
seulement des résultats de tests.

## 1. Périmètre

Plage : `127de80..831657b` (17 commits, ~2 650 lignes ajoutées / 82 retirées).

Deux chantiers successifs :

- **Hero Blueprint** (`cc184dc` -> `d9ea2b1`) : fix des lettres coupées à
  l'entrée, rebond du k signature, hero = un écran, pin + palier + dérive au
  scroll desktop.
- **Responsive mobile** (`d9b2f6f` -> `831657b`) : exécution du
  PLAN-RESPONSIVE-MOBILE (C1 à C7) avec banc de vérification.

Hors périmètre de cet audit (pas produits dans cette session) :

- `3d0816e` (pages services / réalisations / contact / mentions légales,
  dont `contact-form.ts`) : seul le LAYOUT de /contact a été corrigé et
  vérifié ici ; le comportement runtime du formulaire (validation, envoi
  Web3Forms, états) n'a PAS été audité.
- `839d8e6` (commit d'AUDIT.md) : fichier rédigé dans la session, committé
  en dehors.
- Note de traçabilité : `6fa50ff` contient, en plus du fix 320 px, le
  travail burger préexistant qui se trouvait non committé dans l'arbre
  (Navbar + nav-menu.ts) ; sans lui le commit aurait référencé un module
  inexistant. C'est indiqué dans le message de commit.

## 2. Méthode

- Chaque bug d'abord REPRODUIT et MESURÉ (headless Chrome piloté en CDP :
  mesures DOM/canvas au centième de pixel, molette réelle, émulation
  385x817 / 320x640 / tactile), puis corrigé, puis re-mesuré.
- Banc reproductible committé : `scripts/audit-mobile.mjs` (7 verdicts
  OK/KO, code de sortie non nul si échec). État avant corrections :
  6 KO / 1 OK ; état final : **7/7 OK**.
- Garde-fous permanents entre chaque commit : `npx astro check` (0 erreur),
  `npm run build` (5 pages), et non-régression desktop incluse dans le banc.

## 3. Changements et preuves

### Hero (desktop)

| Sujet | Avant (mesuré) | Après (mesuré) |
|---|---|---|
| Lettres à l'entrée | w/a/k rasées jusqu'à 8,6 px à droite (fenêtres de clip trop étroites face au letter-spacing négatif) | Diff état-entrée vs final : **0 pixel** ; marges d'encre >= 11 px |
| Rebond du k signature | back.out retiré (le dépassement se coupait) | back.out(1.9) restauré, fenêtre du dernier clip agrandie (padding-top 0.1em compensé margin-top -0.04em) ; vérifié au pic figé : baseline commune à 0,02 px près, hauteur de ligne inchangée |
| Police à l'entrée | Entrée lancée sans attendre Archivo (swap possible en plein vol après hard refresh) | Entrée calée sur `document.fonts.ready`, plafond 800 ms |
| Taille du hero | Navbar 69 px + hero 100svh (bas du hero sous le pli) + pin tardif (~1,7 s : layout shift) | `--nav-h` partagé, hero = `100svh - nav - 1px` : `heroBottom == innerHeight` au px ; pin armé dès l'init (une frame) |
| Scroll | Pin démarrant après l'offset navbar, réponse quasi nulle sur les premiers crans (mapping linéaire) | Pin `start: 0` (pixel zéro), effet easé sur 35 % de 75 % de viewport, palier de contemplation avec dérive douce, réversible (traces molette : fixed/heroTop 69 stable, focus 0.56 -> 1.00, libération, re-pin en remontant) |

### Mobile (C1 à C7)

| # | Avant (mesuré) | Après (mesuré) |
|---|---|---|
| C1 | /contact : scrollWidth 503/385 et 500/320 (une option de 59 caractères imposait ~484 px au formulaire via min-width:auto) | 385/385 et 320/320, cause commentée dans le CSS |
| C2 | Toutes pages : 347/320 (navbar avec burger) | 320/320 partout |
| C3 | Cartouche du plan dessiné SUR le bouton « Voir les services », cote « Y xxx PX » SUR le titre (collisions bbox confirmées) | Plan allégé < 640 px : 0 texte de cartouche, cote masquée, 0 collision ; cartouche de retour en desktop (3 textes) |
| C4 | Pin tactile : 613 px de swipe retenus, titre fantôme 18 % d'alpha à l'arrêt | `(pointer: coarse)` : aucun pin, effet sur ~30 % de viewport pendant la sortie naturelle ; la page bouge dès le 1er cran (heroTop 69 -> 1 après 140 px) ; desktop inchangé |
| C5 | Menu ouvert : hero à pleine luminosité dessous, aria-label figé, scroll libre | Scrim rgba(bg, 0.78), scroll gelé (CSS natif/tactile + `scrollFreeze` Lenis), aria-label Ouvrir/Fermer, Échap rend le focus, fermeture au repassage > 640 px, teardown propre |
| C6 | « Délai » 55 px pour une boîte de 47 px (collé à sa valeur) | Boîte 4.25em (56,7 px), mesuré non tronqué |
| C7 | Badge « 01 » flottant entre les deux lignes de l'eyebrow | `align-items: baseline`, ancré à la 1re ligne (vérifié en capture) |

Vérifications transverses re-passées en fin de course : reveals mobiles
déclenchés au scroll (opacités à 1), reduced-motion sans pin ni rAF,
`astro check` 0 erreur, build OK.

## 4. Conformité aux règles du repo (CLAUDE.md)

- Français partout, y compris commentaires et messages de commit : oui.
- Aucun tiret cadratin : grep du caractère dans `src/` = 0 occurrence
  (deux introduites en début de session, purgées dans `831657b`).
- Tokens uniquement : les seules « nouvelles couleurs » sont des
  `rgba(var(--c-bg-rgb) / --c-accent-rgb, alpha)` ; aucun hex en dur ajouté,
  aucun `--sp-*` inexistant utilisé.
- Pas de framework client, GSAP + ScrollTrigger + Lenis seulement : oui.
- Pattern `astro:page-load` + teardown-avant-init : respecté et étendu
  (jeton `gen` pour les continuations asynchrones, armement du
  ScrollTrigger hors du dispatch, nav-menu compatible `transition:persist`).
- `prefers-reduced-motion` : chemins dédiés conservés (entrée posée, pas de
  pin, `scrollFreeze` no-op sans instance Lenis, verrou de scroll du menu
  assuré par le CSS seul).
- Fichiers verrouillés (deploy.yml, CNAME, site, deps) : non touchés.

## 5. Réserves et risques résiduels (l'important)

1. **[P1, accessibilité] Focus non piégé menu ouvert.** Le scrim voile la
   page mais la tabulation atteint toujours les éléments dessous
   (skip-link, CTA du hero...) : un utilisateur clavier peut « sortir » du
   menu sans le fermer. Recommandation : poser `inert` sur `#contenu` et le
   footer quand le menu est ouvert (retiré à la fermeture), ou piège de
   focus. Non couvert par le banc automatique.
2. **[Assumé, design] Titre à 18 % d'alpha en fin de déconstruction.**
   État transitoire piloté par le scroll, sous le seuil AA pendant cette
   phase ; le nom complet reste porté par l'`aria-label` du h1. Choix
   validé visuellement, à garder en tête si le palier s'allonge encore.
3. **[Assumé, comportement] Détection du pointeur à l'init seulement.**
   Un convertible qui bascule souris <-> tactile en cours de session garde
   le mode initial jusqu'à la navigation suivante. Commenté dans le code.
4. **[À mesurer] LCP.** L'entrée du titre attend les fonts (<= 800 ms) et le
   titre est masqué avant ça : l'élément LCP réel et son timing restent à
   mesurer (déjà tracé dans AUDIT.md §5).
5. **[Couverture] Chrome headless uniquement.** Safari (svh, text-stroke,
   mask), Firefox et devices réels non couverts par le banc ; passe
   manuelle multi-navigateurs recommandée avant go-live. Le zoom écran
   2K du propriétaire est couvert par le raisonnement en `em`, pas par un
   test dédié.
6. **[Hors audit] Runtime du formulaire /contact** (`contact-form.ts`,
   commit `3d0816e`) : layout corrigé et vérifié, logique d'envoi non
   auditée ici (validation, honeypot, états, erreurs réseau).
7. **[Micro] Convergence du scrub.** Échantillon « settle » à focus 0.008
   700 ms après le dernier cran (asymptote du scrub 0.3 + lerp Lenis) :
   converge vers 0, sans effet visible.
8. **[Cohérence à maintenir] Seuil 640.** Le cartouche est conditionné à la
   largeur du HERO (px mesurés) et la cote au viewport (media query) :
   équivalents aujourd'hui (hero full-bleed), à garder synchrones si le
   layout change.
9. **[Repo] `proto/blueprint` jamais poussée.** Tout le travail vit en
   local : risque de perte, et le site déployé (main) ne reflète rien de
   tout ça. Pousser dès que possible.
10. **[Docs] CLAUDE.md périmé** sur l'état courant (déjà au backlog
    d'AUDIT.md, non traité ici).

## 6. Verdict

Les objectifs demandés sont atteints et prouvés par des mesures
reproductibles (banc committé, 7/7). Les invariants desktop ont été
re-vérifiés après chaque commit. Restent : un vrai point d'accessibilité à
traiter (focus/`inert`, réserve n°1), des passes navigateurs réels, et le
push de la branche.
