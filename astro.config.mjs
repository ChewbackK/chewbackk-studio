// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // URL de production : utilisée pour le sitemap et les URLs canoniques.
  site: 'https://chewbackk-studio.evanbouvier.fr',
  integrations: [sitemap(), mdx()],
});
