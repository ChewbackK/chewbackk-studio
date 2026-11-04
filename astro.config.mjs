// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import injectModulePreload from './scripts/vite-modulepreload.mjs';

// https://astro.build/config
export default defineConfig({
  // URL de production : utilisée pour le sitemap et les URLs canoniques.
  site: 'https://chewbackk-studio.evanbouvier.fr',
  // Compression HTML "classique" (sensible au HTML) plutôt que le défaut
  // d'Astro 7 ('jsx') : en mode jsx, un saut de ligne entre un mot et une
  // balise inline est supprimé, ce qui collait des mots à l'écran (ex.
  // « template.Et » dans le titre du manifeste, « viaWeb3Forms » dans les
  // mentions légales). Ce mode garde le texte tel qu'il est écrit.
  compressHTML: true,
  // injectModulePreload : ajoute les <link rel="modulepreload"> manquants
  // pour les chunks importés statiquement entre eux (ex. motion.js, le
  // bundle gsap + ScrollTrigger), évitant un aller-retour réseau séquentiel
  // avant leur découverte. Cf. commentaire dans scripts/vite-modulepreload.mjs.
  integrations: [sitemap(), injectModulePreload()],
});
