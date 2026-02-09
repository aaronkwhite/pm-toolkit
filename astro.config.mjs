import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://getpmtoolkit.com',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    // @ts-ignore - Vite plugin type mismatch with Astro's bundled vite
    plugins: [tailwindcss()],
  },
});
