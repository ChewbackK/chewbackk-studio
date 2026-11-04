# Chewbackk Studio

Site vitrine de Chewbackk Studio (micro-entreprise de développement web d'Evan Bouvier),
en production sur [chewbackk-studio.evanbouvier.fr](https://chewbackk-studio.evanbouvier.fr).

## Stack

- [Astro 7](https://astro.build) (statique, `output: 'static'`), Node >= 22.23.4
- GSAP + Lenis pour les animations/scroll
- Sitemap (`@astrojs/sitemap`)
- Dépendances et actions GitHub tenues à jour par Dependabot (`.github/dependabot.yml`)

## Structure

```
src/
├── content/projets/                # Une fiche Markdown par réalisation
│   ├── axel-mahe.md
│   ├── chewcast.md
│   └── portfolio-personnel.md
├── content.config.ts               # Schéma des fiches projet (champs, formats)
├── components/                     # Navbar, Footer, Seo, hero, PageHead, CtaSection...
├── styles/                         # tokens, globals, effects, components (boutons)
└── pages/
    ├── index.astro                 # Accueil
    ├── services.astro              # Offre
    ├── realisations.astro          # Liste des projets (générée depuis les fiches)
    ├── realisations/[slug].astro   # Page de détail, une par fiche
    ├── contact.astro               # Formulaire de contact (Web3Forms)
    ├── mentions-legales.astro
    └── 404.astro
```

## Ajouter un projet

1. Déposer les visuels dans `src/assets/` : un aperçu pour la carte (`src/assets/previews/`)
   et les captures de la galerie (`src/assets/gallery/<projet>/`).
2. Copier une fiche existante de `src/content/projets/` sous le nom voulu : `mon-projet.md`
   donnera l'URL `/realisations/mon-projet/`.
3. Remplir le frontmatter (nom, ordre, `client` ou `perso`, tags, résumé, meta description,
   aperçu, galerie) et écrire la description longue en Markdown sous le frontmatter.

`npm run build` signale tout champ manquant ou mal formé (rôle absent pour un projet client,
meta description de plus de 155 caractères, image introuvable...).

## Commandes

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # Production → dist/
npm run preview   # Preview du build
```

## Déploiement

GitHub Pages via `.github/workflows/deploy.yml`, déclenché à chaque push sur `main`. Domaine
personnalisé `chewbackk-studio.evanbouvier.fr` configuré dans Settings → Pages du repo ; la zone
DNS est chez Netlify DNS (nameservers `*.p07.nsone.net`), pas OVH.
