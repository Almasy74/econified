import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    site: 'https://econified.com', // Required for sitemap to work
    trailingSlash: 'always', // Strictly enforce trailing slash for canonical URLs
    integrations: [sitemap()],
});
