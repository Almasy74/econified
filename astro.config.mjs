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

// Destination pages that are indexable (matches salary-in-[destination]/index.astro logic)
const indexableDestinations = ['spain', 'portugal', 'uk', 'united kingdom'];

// https://astro.build/config
export default defineConfig({
    site: 'https://econified.com', // Required for sitemap to work
    trailingSlash: 'always', // Strictly enforce trailing slash for canonical URLs
    integrations: [sitemap({
        filter: (page) => {
            // Exclude noindexed tool pages
            if (noindexPaths.some(p => page.endsWith(p))) return false;
            // Exclude noindexed destination pages
            if (page.includes('/salary-in-')) {
                const dest = page.match(/\/salary-in-([^/]+)\//)?.[1];
                return dest ? indexableDestinations.includes(dest.toLowerCase()) : false;
            }
            // Exclude all corridor and equivalency pages (all noindexed)
            if (page.includes('/salary/') && page.includes('-to-')) return false;
            if (page.includes('/salary-equivalent-')) return false;
            return true;
        }
    })],
});
