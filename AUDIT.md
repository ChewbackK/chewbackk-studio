# AUDIT.md : grille d'audit complète du site

Grille de contrôle exhaustive pour auditer `chewbackk-studio` avant (et après) le
go-live. Spécifique à CE projet : Astro 6 statique sur GitHub Pages, TypeScript
strict, GSAP + ScrollTrigger + Lenis, zéro framework client, zéro backend, repo
public, formulaire Web3Forms à venir.

## Comment s'en servir

- Chaque case est un point de contrôle : cocher = vérifié (pas « corrigé »).
  Ce qui échoue part dans un ticket/TODO avec sa priorité.
- Priorités : **[P0]** bloquant pour le go-live, **[P1]** important mais non
  bloquant, **[P2]** amélioration. Les items sans étiquette sont P1 par défaut.
- Hors périmètre (site 100 % statique, sans backend ni compte utilisateur) :
  injection SQL, gestion de sessions/auth, CSRF côté serveur, stockage de mots
  de passe. Inutile d'auditer ce qui n'existe pas ; le périmètre réel est :
  chaîne d'approvisionnement, XSS, DNS/domaine, formulaire tiers, vie privée.

---

## 1. Sécurité

### 1.1 Chaîne d'approvisionnement (npm)

- [ ] `npm audit` propre (ou vulnérabilités analysées et acceptées par écrit).
- [ ] `package-lock.json` committé et à jour (aucune installation sans lockfile).
- [ ] Dépendances minimales : chaque entrée de `package.json` est justifiée
      (astro, gsap, lenis, mdx, sitemap, check/typescript ; rien d'autre ne
      doit apparaître sans raison).
- [ ] `@astrojs/mdx` : réellement utilisé ? Si aucune page `.mdx` n'existe au
      go-live, retirer l'intégration (surface en moins).
- [ ] Versions épinglées de façon cohérente (caret `^` assumé OU versions
      exactes, mais une seule politique).
- [ ] Dependabot ou Renovate activé sur le repo (alertes de sécurité GitHub au
      minimum : Settings > Security).
- [ ] Aucun script `postinstall` suspect dans l'arbre de dépendances
      (`npm ls`, `npm query ":attr(scripts, [postinstall])"` si besoin).
- [ ] Node 22 partout (local, CI, `engines`) : pas de dérive de version.

### 1.2 Repo public : secrets et historique

- [ ] **[P0]** Aucun secret dans le code NI dans l'historique git complet :
      scanner avec `gitleaks detect` (ou trufflehog) sur tout l'historique,
      pas seulement HEAD.
- [ ] **[P0]** La clé Web3Forms n'est jamais committée : `.env` gitignoré,
      `PUBLIC_WEB3FORMS_KEY` documentée mais absente du repo. (Rappel : une
      clé `PUBLIC_*` finit dans le bundle client de toute façon ; le risque
      n'est pas le repo mais l'abus, voir 1.5.)
- [ ] Emails personnels dans l'historique de commits : décision consciente
      (repo public = adresses moissonnables). Configurer l'email noreply
      GitHub pour la suite si souhaité.
- [ ] Aucune donnée client/perso dans les fichiers (BRIEF.md contient SIRET
      etc. : voulu et public par nature, mais le vérifier).
- [ ] Fichiers sensibles hors repo : `.env`, dumps, exports, captures avec
      infos privées. Vérifier aussi `public/` (tout y est servi tel quel).
- [ ] `.gitignore` couvre `.env`, `.env.production`, `dist/`, `.astro/`,
      `node_modules/` (déjà le cas : re-vérifier après tout ajout d'outillage).

### 1.3 GitHub / CI / déploiement

- [ ] Actions épinglées par SHA (`actions/checkout@<sha>` plutôt que `@v4`) ou
      décision consciente de rester sur les tags mutables. Idem
      `withastro/action` et `actions/deploy-pages`.
- [ ] `permissions:` du workflow au strict minimum (c'est déjà
      `contents: read, pages: write, id-token: write` : ne pas élargir).
- [ ] Aucun secret injecté au build qui finirait dans `dist/` par accident.
- [ ] Protection de la branche `main` (PR obligatoire ou au minimum pas de
      force-push), environnement `github-pages` restreint à `main`.
- [ ] Point d'attention documenté dans CLAUDE.md : le job `build` ne passe pas
      explicitement d'artifact au job `deploy`. Vérifier qu'un déploiement
      publie bien le build du commit courant (déployer un changement visible
      et contrôler en ligne).
- [ ] Le déploiement ne part QUE de `main` (les branches proto ne déploient
      jamais) : re-vérifier les triggers.
- [ ] Logs d'Actions : pas d'échos de variables sensibles.

### 1.4 Domaine, DNS, transport

- [ ] **[P0]** HTTPS forcé sur GitHub Pages (case « Enforce HTTPS » cochée) ;
      `http://` redirige bien en 301 vers `https://`.
- [ ] Le CNAME DNS `chewbackk-studio.evanbouvier.fr` pointe vers
      `<user>.github.io` et le fichier `public/CNAME` correspond exactement
      (désynchronisation = domaine cassé ou repris).
- [ ] Risque de **subdomain takeover** : si le repo est renommé/supprimé ou le
      custom domain retiré côté GitHub, le CNAME DNS devient orphelin et
      revendicable. Documenter la procédure de démontage dans le bon ordre.
- [ ] Enregistrement CAA sur `evanbouvier.fr` (limite les AC autorisées à
      émettre : Let's Encrypt pour Pages) : optionnel mais recommandé.
- [ ] Certificat valide, renouvellement auto Pages OK (tester après chaque
      changement DNS).
- [ ] Pas de contenu mixte (aucune ressource `http://` : grep `http://` dans
      `src/` et `dist/`, hors liens sortants volontaires).
- [ ] En-têtes de sécurité : GitHub Pages n'autorise AUCUN header custom.
      Décider en connaissance : CSP via `<meta http-equiv>` (couvre
      script-src/style-src mais PAS frame-ancestors ni report-uri), ou
      accepter l'absence en la documentant. Tester sur Mozilla Observatory
      et acter le score atteignable sur Pages.
- [ ] Clickjacking : `frame-ancestors` impossible en meta ; risque réel faible
      (site vitrine sans action authentifiée) : à documenter comme accepté.

### 1.5 Sécurité applicative front

- [ ] **XSS** : aucun contenu d'origine utilisateur ou externe injecté dans le
      DOM. Inventorier tous les `innerHTML` / `insertAdjacentHTML` :
      `blueprint.ts` construit du SVG par `innerHTML` à partir de mesures DOM
      et de tokens internes (OK aujourd'hui) ; poser la règle « jamais de
      donnée externe dans ces gabarits » en commentaire.
- [ ] Aucun `eval`, `new Function`, `javascript:` URL, handler inline.
- [ ] Paramètres d'URL : rien n'est lu depuis `location` pour être réinjecté
      (le deep-link `#plan` ne fait qu'ajouter une classe : OK, à re-vérifier
      à chaque nouveau usage de `location`).
- [ ] Liens externes en `target="_blank"` : `rel="noopener noreferrer"`.
- [ ] Aucune ressource tierce (CDN, fonts Google, analytics) : tout est
      self-hosted. Contrôler l'onglet réseau : 0 requête vers un domaine
      tiers sur toutes les pages (c'est aussi un argument RGPD).
- [ ] SRI : sans objet tant que tout est self-hosted ; l'exiger si un script
      externe apparaît un jour.
- [ ] **Formulaire de contact (Web3Forms), au moment où il arrive** :
  - [ ] clé dans `.env` (`PUBLIC_WEB3FORMS_KEY`), jamais en dur dans le code ;
  - [ ] la clé est publique par design : activer les restrictions côté
        Web3Forms (domaine autorisé) et connaître leur rate-limiting ;
  - [ ] honeypot en place et réellement ignoré des lecteurs d'écran
        (`aria-hidden` + `tabindex="-1"` + autocomplete off) ;
  - [ ] validation côté client : longueur max, format email, trim ; aucune
        confiance dans cette validation (elle est UX, pas sécurité) ;
  - [ ] gestion réseau complète : timeout, offline, réponse non-2xx, JSON
        invalide ; messages d'état en français ; pas de double-submit
        (bouton désactivé pendant l'envoi) ;
  - [ ] case RGPD non pré-cochée qui bloque l'envoi (exigence du brief) ;
  - [ ] rien de sensible loggé en console.
- [ ] Obfuscation email/téléphone affichés (anti-moissonnage) ou décision
      assumée de les afficher en clair.

---

## 2. Qualité du code : bugs et robustesse

### 2.1 Cycle de vie Astro (ClientRouter) : la source n°1 de bugs ici

- [ ] Chaque script suit le contrat du projet : `bootstrap*()` attache UN
      listener `astro:page-load` ; `init()` fait `teardown()` d'abord ;
      idempotent si l'événement rejoue.
- [ ] Teardown COMPLET par script : listeners (resize, scroll, pointer,
      visibilitychange), rAF annulés, `ScrollTrigger.kill()`,
      `IntersectionObserver.disconnect()`, timers, instances Lenis détruites.
      Griller la matrice : naviguer 10 fois aller-retour entre pages et
      vérifier (perf devtools) : pas de listeners qui s'empilent, pas de
      double boucle rAF, mémoire stable.
- [ ] Les continuations asynchrones (promesses fonts, `setTimeout`, rAF)
      vérifient un jeton de génération après un re-init (motif `gen` de
      `blueprint.ts`) : l'appliquer partout où c'est pertinent.
- [ ] Ordre d'exécution des listeners `astro:page-load` : aucun script ne doit
      dépendre de passer avant/après un autre (smooth-scroll tue tous les
      ScrollTriggers : toute création de trigger doit survivre, cf. le rAF
      d'armement de blueprint.ts).
- [ ] Navigation arrière/avant (bfcache, restauration de scroll) : état
      cohérent, pas de hero à moitié déconstruit ni d'entrée rejouée en double.
- [ ] `transition:persist` (Navbar) : pas de doubles listeners sur l'élément
      persistant après navigation.

### 2.2 Animations et rendu

- [ ] `prefers-reduced-motion` : CSS (neutralisation globale) ET JS (état
      final posé, AUCUNE boucle rAF : `gsap.ticker.sleep()`).
      Tester les DEUX sens de bascule au runtime (`onReducedMotionChange`
      est-il branché ou la préférence n'est-elle lue qu'à l'init ?).
- [ ] Aucun contenu accessible uniquement via une animation ou un survol
      (la lampe et le plan sont décoratifs ; le `<h1>` porte le nom complet).
- [ ] Resize / rotation : mesures recalculées (rebuild du plan, refresh
      ScrollTrigger), pas de cotes SVG périmées.
- [ ] Zoom navigateur 90/110/125 % et échelles OS (écran 2K) : pas de
      coupures de glyphes ni de décalages (les leçons des fixes lettres :
      fenêtres de clip avec marge en `em`, jamais en px implicites).
- [ ] Cross-browser : Safari (svh, `-webkit-text-stroke`, `mask-image`
      préfixé, scroll momentum + Lenis, `position: fixed` + pin), Firefox
      (mask, scrollbar), Chrome. Mobile iOS et Android réels, pas seulement
      l'émulation.
- [ ] Sans JavaScript : contenu lisible, hero statique visible (pas de
      `visibility: hidden` orpheline grâce au flag `html.js`), navigation OK.
- [ ] Polices : woff2 présents, preload cohérent avec l'usage réel,
      comportement vérifié en cache froid ET chaud ; le plafond d'attente
      (800 ms) de l'entrée du hero fonctionne réseau lent (throttling 3G).
- [ ] Un seul `[data-hero]` par page : le module blueprint gère un singleton
      (état au niveau module) ; documenter/verrouiller cette hypothèse.
- [ ] `will-change` : usage limité et mesuré (9 layers de lettres : OK ;
      ne pas en semer ailleurs sans mesure).

### 2.3 Correction du code

- [ ] `npx astro check` sans erreur ni warning (l'exiger aussi en CI, cf. 9).
- [ ] TypeScript strict réel : pas de `any`, pas de `!` non justifié, retours
      typés ; les accès DOM (`querySelector`) gèrent le `null`.
- [ ] Nombres magiques commentés à l'endroit où ils vivent (0.55em de levée,
      0.12em de fenêtre de clip, `FOCUS_SPAN`, exposant 1.7, 800 ms de
      plafond fonts, 0.75 de pin...) : chaque constante dit POURQUOI.
- [ ] Unités cohérentes : tout ce qui dépend du corps de texte en `em`,
      les distances de scroll en fraction de viewport, pas de px en dur qui
      casseraient à une autre taille.
- [ ] Pas de duplication de logique entre scripts (la préférence de motion ne
      se lit QUE via `motion.ts` ; une seule formule d'easing du focus...).
- [ ] Gestion d'erreurs des APIs navigateur optionnelles (`document.fonts`,
      `matchMedia`, `IntersectionObserver`) : dégradation propre.
- [ ] Aucune erreur ni warning console sur toutes les pages, tous scénarios
      (chargement, navigation, resize, reduced-motion).

### 2.4 Code mort et cohérence de l'arborescence

- [ ] **Composants/scripts orphelins à trancher** (supprimer ou documenter
      pourquoi ils restent) : `Hero.astro` (504 lignes), `Intro.astro`,
      `hero-cursor.ts`, `hero-intro.ts`, `hero-studio.ts`, `intro.ts`.
      Vérifier qu'aucune page ne les importe ; le code mort n'est pas bundlé
      mais coûte en maintenance et en compréhension.
- [ ] `effects.css` : classes réellement utilisées (purger les `.reveal` et
      autres si plus consommées).
- [ ] Un seul « hero system » vivant (HeroBlueprint + blueprint.ts + lamp.ts) :
      l'arborescence doit le rendre évident.
- [ ] Dossiers prévus par les conventions (`src/content/` pour les
      collections) : créés seulement quand utilisés.

---

## 3. Maintenabilité, commentaires, documentation

- [ ] **CLAUDE.md à jour** : l'état courant (« Current state ») ne mentionne ni
      la branche réelle (`proto/blueprint`), ni `contact-form.ts` déjà
      présent, ni le hero Blueprint. Le remettre en phase à chaque tranche.
- [ ] BRIEF.md vs réalité : lister les écarts (pages manquantes, choix de
      design différents) et les faire arbitrer plutôt que laisser dériver.
- [ ] README : commandes, prérequis (Node 22), déploiement, structure du
      projet ; un nouveau dev doit démarrer sans aide.
- [ ] Commentaires : ils expliquent le POURQUOI et les contraintes
      (conventions du repo : français, pas de tiret cadratin). Vérifier que
      les gros blocs de commentaires restent vrais après chaque refactor
      (ex. : les commentaires du pin ont dû suivre pin -> sans pin -> pin).
- [ ] Doc de tête de fichier pour chaque script de `src/scripts/` : rôle,
      cycle de vie, garanties (reduced-motion, teardown) ; c'est le contrat.
- [ ] Conventions de nommage cohérentes : BEM côté CSS (`hero__`, `nav__`),
      data-attributes (`data-hero`, `data-plan...`) inventoriés et uniques.
- [ ] Tokens : AUCUNE couleur/espacement en dur hors `tokens.css`
      (grep `#[0-9a-fA-F]{3,6}` et `px` dans les composants ; exceptions
      justifiées en commentaire). Piège documenté des `--sp-*` intermédiaires
      inexistants (`--sp-5`...) : rappeler la liste fermée.
- [ ] Taille/complexité : `blueprint.ts` (454 lignes) encore lisible ;
      découper si une nouvelle responsabilité s'ajoute.
- [ ] Git : messages homogènes (`proto(blueprint): ...`), commits atomiques,
      branches nettoyées après merge ; définir la stratégie de merge
      `proto/blueprint` -> `main` (squash ? merge ?) avant le go-live.
- [ ] Aucun `TODO`/`FIXME` silencieux : les inventorier (grep) et les
      transformer en tickets ou les résoudre.
- [ ] Fichiers de config commentés (`astro.config.mjs` l'est ; garder ce
      niveau pour tout ajout).

---

## 4. Accessibilité (WCAG 2.2 AA)

### 4.1 Structure et sémantique

- [ ] Landmarks : `header`, `main#contenu`, `footer`, `nav` avec
      `aria-label` ; un seul `h1` par page ; hiérarchie de titres sans saut.
- [ ] Le `<h1>` éclaté en spans porte `aria-label="Chewbackk Studio"` et les
      spans décoratifs ne produisent pas de lecture lettre à lettre
      (vérifier au lecteur d'écran réel : NVDA + Firefox, VoiceOver + Safari).
- [ ] Tout le décor est `aria-hidden="true"` (plan SVG, cote vivante, fond) et
      n'apparaît pas dans l'arbre d'accessibilité.
- [ ] `lang="fr"` sur `<html>` ; titres de pages uniques et descriptifs.
- [ ] Images futures : `alt` utile ou `alt=""` si décoratives.

### 4.2 Clavier et focus

- [ ] Skip-link fonctionnel (visible au focus, cible `#contenu`).
- [ ] Parcours tab complet dans l'ordre logique, aucun piège, aucun élément
      interactif inatteignable ; `:focus-visible` contrasté partout (anneau
      accent : vérifier sur fond accent aussi, ex. bouton CTA).
- [ ] **Scroll clavier avec Lenis + pin** : PgDn/PgUp, espace, flèches, Home/
      End fonctionnent pendant et après la phase épinglée du hero ; le focus
      qui sort du hero ne reste pas piégé visuellement sous un élément fixe.
- [ ] Navigation au clavier après une navigation ClientRouter : le focus est
      géré (pas perdu dans le vide), le scroll revient en haut.

### 4.3 Contrastes et lisibilité

- [ ] Toutes les paires texte/fond passent AA (≥ 4.5:1 corps, ≥ 3:1 grands
      textes) : re-mesurer après tout changement de token, y compris états
      hover/focus/actif, texte sur `--c-accent`, et les alphas du plan
      (`rgba(...)` sur fond sombre) quand ils portent du TEXTE (les cotes
      mono du SVG).
- [ ] Interdiction projet du « petit texte gris pâle » respectée partout.
- [ ] Zoom texte 200 % et reflow 320 px sans perte de contenu ni scroll
      horizontal (tester réellement à 320 px : un débordement a déjà eu lieu).
- [ ] Cibles tactiles ≥ 44x44 px (liens nav, CTA).

### 4.4 Mouvement

- [ ] `prefers-reduced-motion: reduce` : aucun mouvement (entrée posée, pas de
      pin, pas de lampe, transitions CSS neutralisées), contenu complet.
- [ ] Pas de clignotement > 3 flashs/s ; pas de parallaxe nauséogène (le
      bazar des lettres reste court et débrayable).
- [ ] Le formulaire (futur) annonce ses états aux lecteurs d'écran
      (`role="status"` / `role="alert"`), erreurs liées par
      `aria-describedby`, labels toujours visibles.

### 4.5 Outils

- [ ] Passe axe DevTools + WAVE sur chaque page ; passe manuelle lecteur
      d'écran (au moins VoiceOver ou NVDA) ; passe « clavier seul » complète.

---

## 5. Performance / Web Vitals

- [ ] **LCP** : identifier l'élément LCP réel du hero (le titre est masqué
      jusqu'à fonts + entrée : le LCP est peut-être le fond ou l'eyebrow).
      Mesurer et décider si l'entrée retarde trop la perception ; budget
      LCP < 2.5 s en mobile simulé.
- [ ] **CLS ≈ 0** : pin-spacer présent dès l'init, entrée du hero sans
      poussée de layout, swap de police maîtrisé (envisager
      `size-adjust`/metrics override sur la fallback si un flash de
      reflow se mesure), pas d'image sans dimensions.
- [ ] **INP / fluidité** : boucles rAF uniquement quand nécessaire (lampe en
      pause hors-vue et onglet caché : vérifié ; garder ce contrat pour tout
      nouvel effet), pas de layout thrashing au scroll (lectures DOM
      throttlées en rAF), scrub léger.
- [ ] Poids JS : gsap + ScrollTrigger + Lenis (~90-110 KB min+gz au total) :
      mesurer le bundle réel par page (`dist/`), vérifier que les scripts
      morts ne sont pas bundlés, pas de double inclusion via plusieurs
      entry points.
- [ ] Poids fonts : les deux variables woff2 subsetées ; contrôler la taille
      réelle des fichiers et le sous-ensemble (latin + FR uniquement).
- [ ] CSS : inliné/scopé par Astro ; pas de CSS mort massif (effects.css).
- [ ] Cache : assets Astro hashés (immutable de fait) ; `public/fonts/` non
      hashé : politique de cache GitHub Pages (max-age 600 s) connue et
      acceptée ; renommer les fichiers si on veut du long-cache.
- [ ] Compression : Pages sert gzip/brotli automatiquement (vérifier les
      en-têtes de réponse en prod).
- [ ] Aucune requête réseau superflue : 0 tierce partie, pas de polling.
- [ ] Mesures : Lighthouse mobile + desktop sur chaque page (viser ≥ 90
      partout), WebPageTest sur 3G rapide, onglet Performance sur le scroll
      du hero (60 fps, pas de long tasks > 50 ms récurrentes).
- [ ] Écran 2K/144 Hz du propriétaire : scroll fluide, pas de jank au pin.

---

## 6. SEO et contenu

- [ ] Title + meta description uniques et soignés PAR page (via `Seo.astro`).
- [ ] Canonical exact (dérivé de `site` : re-vérifier après tout changement
      de domaine), pas de contenu dupliqué www/apex.
- [ ] **Image Open Graph** : absente aujourd'hui : à créer (1200x630),
      poids raisonnable, testée sur les débogueurs (opengraph.xyz).
- [ ] Sitemap généré et accessible ; `robots.txt` cohérent ; soumettre le
      sitemap dans Google Search Console + Bing Webmaster une fois en ligne.
- [ ] **Page 404 personnalisée** (`src/pages/404.astro`) : absente : à créer
      (GitHub Pages la sert automatiquement si `404.html` existe).
- [ ] **Liens internes morts** : la nav et le footer pointent vers
      `/services`, `/realisations`, `/contact`, `/mentions-legales` qui
      n'existent pas encore. Acceptable en proto, **[P0] bloquant au
      go-live** : aucune 404 atteignable depuis le chrome du site.
- [ ] Données structurées JSON-LD : `ProfessionalService`/`Person` (nom,
      zone, services, URL) ; valider au Rich Results Test.
- [ ] Redirections : décider du sort de l'ancien domaine `.github.io`
      (Pages redirige automatiquement vers le custom domain : vérifier).
- [ ] Contenu : orthographe/typo FR (espaces insécables avant `: ; ! ?`,
      guillemets « », pas de tiret cadratin), cohérence de ton, aucune
      promesse légale hasardeuse (délais, prix) non validée.
- [ ] Favicons complets (SVG + ICO présents ; ajouter `apple-touch-icon`
      et `manifest` si PWA-lite souhaitée : optionnel).

---

## 7. Légal / RGPD (site pro FR, micro-entreprise)

- [ ] **[P0]** `/mentions-legales` complète avant go-live : identité, SIRET,
      SIREN, APE 6201Z, mention « TVA non applicable, art. 293 B du CGI »,
      hébergeur (GitHub Inc. + adresse), directeur de publication, contact.
      Les valeurs exactes viennent de BRIEF.md ; le placeholder `[ADRESSE]`
      doit être rempli (ne jamais inventer).
- [ ] **[P0]** Footer de CHAQUE page : lien mentions légales + mention TVA.
- [ ] Politique de confidentialité dès que le formulaire existe : données
      collectées, finalité, sous-traitant (Web3Forms : transfert et
      localisation), durée de conservation, droits d'accès/suppression,
      contact. Lien depuis le formulaire.
- [ ] Consentement RGPD du formulaire : case NON pré-cochée, bloquante,
      libellé explicite.
- [ ] Cookies/traceurs : zéro aujourd'hui donc pas de bandeau requis ;
      re-évaluer si un jour analytics (préférer un outil exempté CNIL type
      auto-hébergé anonymisé, sinon bandeau).
- [ ] Licences : fonts OFL (fichiers de licence présents dans `src/fonts/` :
      les garder synchronisés avec les fonts réellement embarquées) ; toute
      image/icône future avec licence compatible usage commercial.
- [ ] Le nom/la marque « Chewbackk Studio » : vérification sommaire de
      disponibilité (INPI) si pas déjà fait : P2 mais prudent.

---

## 8. Contenu du build et artefacts

- [ ] Inspecter `dist/` après build : rien d'inattendu (sourcemaps ?, fichiers
      de dev, `.DS_Store`, doublons de fonts), taille totale raisonnable.
- [ ] `public/` ne contient QUE ce qui doit être servi (tout y part en prod).
- [ ] Le HTML généré est propre : pas d'attributs de debug, pas de
      commentaires sensibles, minification OK.
- [ ] Vérifier `sitemap-index.xml` généré : URLs finales correctes (domaine,
      pas de pages fantômes).

---

## 9. CI / qualité continue / exploitation

- [ ] Pipeline : ajouter `astro check` (types) au build CI ; envisager
      `npm audit --audit-level=high` (bloquant ou informatif au choix).
- [ ] Linter/formatteur : AUCUN configuré aujourd'hui. Décider : ESLint
      (typescript + astro plugin) + Prettier + Stylelint, ou statu quo
      documenté. Un linter attrape les bugs de teardown/promesses oubliées.
- [ ] Tests : pas de suite aujourd'hui. Stratégie minimale recommandée :
      build + check en CI, plus un smoke test headless (le harnais CDP de
      debug du hero peut devenir `scripts/verify-hero.mjs` : entrée sans
      lettres coupées, pin engage/release, reduced-motion sans rAF).
      P2 : budgets Lighthouse CI.
- [ ] Procédure de rollback écrite : `git revert` sur main = redéploiement
      auto ; qui/comment en cas d'urgence.
- [ ] Monitoring : uptime externe (UptimeRobot ou équivalent) sur la prod ;
      Search Console branchée ; décision consciente de n'avoir AUCUNE
      télémétrie front (cohérent avec zéro-tracking) et donc s'appuyer sur
      des tests manuels réguliers multi-navigateurs.
- [ ] Sauvegarde : le repo GitHub est la source unique ; un clone/mirror
      local ou secondaire existe (perte de compte = perte du site).

---

## 10. Matrice de tests manuels (à dérouler avant chaque mise en prod)

Navigateurs/appareils :

- [ ] Chrome, Firefox, Safari desktop (dernière version).
- [ ] iOS Safari réel ; Android Chrome réel.
- [ ] 320 px, 375 px, 768 px, 1440 px, 2K/2560 px (l'écran du propriétaire),
      et un test avec zoom navigateur 125 %.

Scénarios :

- [ ] Chargement cache froid (hard refresh) ET cache chaud : entrée du hero
      propre, aucune lettre coupée, pas de swap de police visible.
- [ ] Scroll molette cran par cran, trackpad avec inertie, clavier seul,
      tactile : pin dès le premier cran, palier, libération, remontée
      symétrique, aucun blocage.
- [ ] Navigation entre toutes les pages (ClientRouter) puis retour : hero
      ré-initialisé proprement, pas de fuite (10 allers-retours).
- [ ] `prefers-reduced-motion` activé : tout statique, tout lisible, 0 rAF.
- [ ] JavaScript désactivé : contenu et navigation utilisables.
- [ ] Réseau lent (throttling 3G) : ordre d'apparition acceptable, plafond
      fonts respecté, aucun état cassé.
- [ ] Onglet en arrière-plan puis retour : boucles bien réveillées, pas de
      saut d'animation (lagSmoothing).
- [ ] Lecteur d'écran : parcours de la home complète.
- [ ] Impression (Ctrl+P) : pas indispensable, mais vérifier que ça ne sort
      pas une page noire illisible : P2.

---

## 11. Écarts déjà connus à date (état des lieux honnête)

À convertir en tickets, c'est le point de départ de l'audit :

- [ ] Pages `/services`, `/realisations`, `/contact`, `/mentions-legales`
      absentes alors que la nav/footer pointent dessus (P0 go-live).
- [ ] Pas de page 404 personnalisée.
- [ ] Pas d'image Open Graph.
- [ ] CLAUDE.md périmé sur l'état courant (branche, contact-form.ts, hero).
- [ ] Composants/scripts hérités des prototypes précédents à purger
      (`Hero.astro`, `Intro.astro`, `hero-*.ts`, `intro.ts`).
- [ ] `proto/blueprint` jamais poussé : tout le travail vit en local
      (risque de perte ; pousser au moins la branche).
- [ ] Aucun linter, aucun test automatisé, `astro check` pas en CI.
- [ ] Question ouverte du workflow deploy (artifact build -> deploy) à
      valider par un déploiement témoin.
- [ ] `[ADRESSE]` du légal à remplir avant go-live.
- [ ] `@astrojs/mdx` installé mais (a priori) pas encore utilisé.
