// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

import injectModulePreload from './scripts/vite-modulepreload.mjs';

// https://astro.build/config
export default defineConfig({
  // URL de production : utilisée pour le sitemap et les URLs canoniques.
  site: 'https://chewbackk-studio.evanbouvier.fr',
  // injectModulePreload : ajoute les <link rel="modulepreload"> manquants
  // pour les chunks importés statiquement entre eux (ex. motion.js, le
  // bundle gsap + ScrollTrigger), évitant un aller-retour réseau séquentiel
  // avant leur découverte. Cf. commentaire dans scripts/vite-modulepreload.mjs.
  integrations: [sitemap(), mdx(), injectModulePreload()],
});
