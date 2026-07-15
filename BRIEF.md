# Brief — Chewbackk Studio

Site vitrine commercial pour Evan Bouvier, développeur web freelance (micro-entreprise créée le 12/06/2026, SIRET 106 290 026 00017, TVA non applicable art. 293 B CGI).

**URL de prod :** https://chewbackk-studio.evanbouvier.fr  
**Repo :** git@github.com:ChewbackK/chewbackk-studio.git  
**Déploiement :** GitHub Pages via GitHub Actions (Node 22, Astro build → dist/)  
**Formulaire :** Web3Forms → bouvierevan-contact@proton.me

---

## Identité

- **Nom de marque :** Chewbackk Studio (deux k)
- **Personne :** Evan Bouvier — développeur, pas une agence, pas un template factory
- **Positionnement :** dev web + services informatiques à la carte. Du simple (site vitrine) au complexe (appli avec back-end). Prix accessibles vs agence, réponse rapide (48h), projets évolutifs, personnalisés.
- **Cible :** tout type de client — TPE locale, étudiant, association, particulier avec un projet tech

---

## Ce que le site doit faire

1. Convaincre un visiteur de contacter Evan plutôt qu'une agence ou Fiverr
2. Montrer la gamme complète des services sans jargon
3. Donner envie de remplir le formulaire de devis
4. Être lui-même une démonstration de ce qu'Evan sait faire (le site doit être beau)

---

## Pages

### 1. Home `/`
- Hero : doit être impressionnant, animé, mémorable. C'est la première impression. Libre au designer de proposer quelque chose de fort — pas de contrainte imposée ici, juste que ça soit vraiment bien.
- Présentation rapide de qui est Evan et ce qu'il fait
- Aperçu des services avec lien vers /services
- Aperçu des réalisations avec lien vers /realisations
- CTA vers /contact tout au long de la page

### 2. Services `/services`
4 catégories :

**Sites web**
- Site vitrine (TPE, artisans, pros)
- Landing page
- Portfolio
- Site avec back-end (espace client, e-commerce, réservation)

**Développement, automatisation et scripts**
- Application web
- Scripts et automatisations
- Bots (hors Discord)
- Intégrations API

**Discord**
- Configuration de serveur
- Bot Discord custom

**Autres**
- Tout projet qui ne rentre pas dans les cases — sur devis

Pas de prix affichés. Le devis est fait sur mesure via le formulaire.

### 3. Réalisations `/realisations`
Deux projets réels + un placeholder :

**Axel Mahé**
- Étudiant réalisateur (futur réalisateur)
- Portfolio cinéma — design sombre, galerie de films
- Front uniquement
- Livré en 2026
- URL : https://axel-mahe.netlify.app

**UDPS 56**
- Association de secourisme (~30 membres)
- Application web + PWA : gestion membres, planning DPS, inventaire véhicules, chat temps réel, notifications push
- Stack : React 18 + Vite + TailwindCSS + Node.js + Express + Prisma + PostgreSQL + Socket.io
- Livré en 2026
- Hébergé : Vercel (front) + VPS (back + BDD)

**Placeholder**
- "Votre projet" — CTA vers /contact

### 4. Contact `/contact`
Deux sections sur une seule page :

**Section Devis**
- Formulaire intelligent : questions sur le besoin → donne une plage de prix estimée (pas de prix fixe affiché)
- Champs : nom, email, type de projet (liste des catégories), description libre, budget approximatif (fourchettes larges : < 500€ / 500-1500€ / 1500-3000€ / 3000€+), délai souhaité
- Envoi via Web3Forms (access_key à renseigner) → bouvierevan-contact@proton.me
- Honeypot anti-spam
- États : envoi en cours / succès / erreur — en français

**Section Contact simple**
- Email direct : bouvierevan-contact@proton.me
- Réponse garantie en 48h
- Pas de téléphone

L'estimation de prix affichée doit rester indicative et en fourchettes larges, accompagnée de la mention explicite : « Estimation indicative — le devis ferme est établi après un échange sur votre projet. » L'estimation ne doit jamais ressembler à un prix ferme.




### 5. Mentions légales `/mentions-legales`
Contenu minimal légalement requis (LCEN) :
- Éditeur : Evan Bouvier, EI micro-entreprise
- SIRET : 106 290 026 00017
- SIREN : 106 290 026
- APE : 6201Z
- TVA non applicable, art. 293 B du CGI
- Adresse : mettre un placeholder `[ADRESSE]` — à compléter avant mise en ligne (domiciliation commerciale envisagée)
- Hébergeur : GitHub, Inc. — 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA
- Directeur de publication : Evan Bouvier

---

## Stack technique (non négociable)

- **Framework :** Astro 6.4+ (output static), Node 22
- **Intégrations :** @astrojs/sitemap, @astrojs/mdx
- **Animations :** GSAP 3 + ScrollTrigger + Lenis — îlots client:load/client:visible
- **Formulaire :** Web3Forms (champ caché access_key, honeypot, fetch POST JSON)
- **Transitions de page :** ClientRouter (astro:transitions)
- **Pas de :** React, Vue, Three.js, Barba.js, jQuery
- **Déploiement :** GitHub Actions → GitHub Pages (workflow existant dans .github/workflows/deploy.yml)
- **Domaine custom :** CNAME dans public/ (déjà en place)

---

## Design — AUCUNE contrainte imposée

Le designer repart de zéro. Aucune palette, aucune typo, aucune direction imposée par ce brief.

Seules contraintes :
- Le site doit être **vraiment beau et original** — pas un template, pas quelque chose qu'une IA sort en 5 minutes
- **Accessible** — contraste WCAG AA sur tous les couples texte/fond
- **Lisible par n'importe qui** — pas que des devs. Le client potentiel est un artisan, un étudiant, une PME. Pas de jargon dans les textes.
- **Reduced-motion** respecté sur toutes les animations
- **Mobile-first** — responsive jusqu'à 320px

Le hero doit être le moment le plus fort du site. Animation au chargement, typographie, layout — tout est libre. C'est là que le designer doit prendre un vrai risque esthétique justifié.

---

## Contraintes légales

- Mention "TVA non applicable, art. 293 B du CGI" visible sur toute page où des prix ou services sont mentionnés
- Lien mentions légales dans le footer sur toutes les pages
- Formulaire : pas de tracking, pas de cookies tiers

### RGPD / données du formulaire
Le formulaire de devis collecte nom, email et description de projet, transmis via Web3Forms (service tiers). Le site doit donc :

Une case à cocher de consentement obligatoire sur le formulaire, non pré-cochée, avant envoi : « J'accepte que mes données soient utilisées pour être recontacté concernant ma demande. Elles ne sont ni revendues ni utilisées à d'autres fins. »
Une mention de confidentialité accessible (bloc dans /mentions-legales ou page /confidentialite) précisant : données collectées (nom, email, message), finalité (répondre à la demande de devis), transmission via Web3Forms, durée de conservation, et droit d'accès/suppression par email.
Le formulaire ne s'envoie pas si la case n'est pas cochée.

---

## Ce qui existe déjà dans le repo

```
chewbackk-studio/
├── .github/workflows/deploy.yml   # GitHub Actions — NE PAS MODIFIER
├── astro.config.mjs               # site URL configurée
├── package.json                   # astro, gsap, lenis, sitemap, mdx installés
├── public/
│   ├── CNAME                      # chewbackk-studio.evanbouvier.fr
│   └── robots.txt
└── src/
    ├── content/                   # vide — à remplir
    ├── styles/                    # tokens.css, globals.css, effects.css — peuvent être remplacés
    ├── components/                # Seo.astro, Navbar, Footer — peuvent être remplacés
    ├── layouts/BaseLayout.astro   # peut être remplacé
    └── pages/
        ├── index.astro            # placeholder — à remplacer
        ├── services.astro         # placeholder — à remplacer
        ├── realisations.astro     # placeholder — à remplacer
        ├── contact.astro          # placeholder — à remplacer
        └── mentions-legales.astro # n'existe pas encore
```

Tout le contenu de `src/` peut être remplacé. La structure `public/`, `astro.config.mjs`, `package.json` et `.github/` sont à conserver.

---

## Clé Web3Forms

À générer sur https://web3forms.com avec l'adresse bouvierevan-contact@proton.me.  
Mettre la clé en variable dans un fichier `.env` (`PUBLIC_WEB3FORMS_KEY`) et la référencer dans le composant ContactForm.
