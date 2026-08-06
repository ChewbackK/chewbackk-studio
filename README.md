# Chewbackk Studio

Site vitrine de Chewbackk Studio (micro-entreprise de développement web d'Evan Bouvier),
en production sur [chewbackk-studio.evanbouvier.fr](https://chewbackk-studio.evanbouvier.fr).

## Stack

- [Astro](https://astro.build) (statique, `output: 'static'`)
- GSAP + Lenis pour les animations/scroll
- MDX (`@astrojs/mdx`) + sitemap (`@astrojs/sitemap`)

## Structure

```
src/pages/
├── index.astro                     # Accueil
├── services.astro                  # Offre
├── realisations.astro              # Liste des projets livrés
├── realisations/
│   ├── axel-mahe.astro             # Détail projet — portfolio Axel Mahé
│   ├── chewcast.astro              # Détail projet — Chewcast
│   └── portfolio-personnel.astro   # Détail projet — evanbouvier.fr
├── contact.astro                   # Formulaire de contact (Web3Forms)
├── mentions-legales.astro
└── 404.astro
```

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
