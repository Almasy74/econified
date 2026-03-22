import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import fs from 'node:fs/promises';
import path from 'node:path';

// Load noindexed slugs
const registryData = await fs.readFile(path.resolve('tools/registry.json'), 'utf-8');
const registry = JSON.parse(registryData);

const noindexPaths = [];
for (const tool of registry) {
  if (tool.status === 'active') {
      try {
          const defData = await fs.readFile(path.resolve(`tools/definitions/${tool.slug}.json`), 'utf-8');
          const def = JSON.parse(defData);
          if (def.noindex) {
            noindexPaths.push(`/${tool.slug}/`);
          }
      } catch (e) {}
  }
}

// https://astro.build/config
export default defineConfig({
    site: 'https://econified.com', // Required for sitemap to work
    trailingSlash: 'always', // Strictly enforce trailing slash for canonical URLs
    integrations: [sitemap({
        filter: (page) => !noindexPaths.some(p => page.endsWith(p))
    })],
});
