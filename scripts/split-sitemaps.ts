import fs from 'node:fs/promises';
import path from 'node:path';

async function splitSitemaps() {
    console.log('Splitting Sitemaps Thematically...');

    const sitemapPath = path.resolve('dist/sitemap-0.xml');

    try {
        const sitemapData = await fs.readFile(sitemapPath, 'utf-8');

        // Extract all <url> blocks
        const urlBlocks = sitemapData.match(/<url>[\s\S]*?<\/url>/g) || [];

        const coreUrls: string[] = [];
        const destinationUrls: string[] = [];
        const corridorUrls: string[] = [];

        for (const block of urlBlocks) {
            if (block.includes('/salary-in-')) {
                destinationUrls.push(block);
            } else if (block.includes('/salary/') || block.includes('/salary-equivalent-')) {
                corridorUrls.push(block);
            } else {
                coreUrls.push(block);
            }
        }

        const buildXml = (urls: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.join('\n')}
</urlset>`;

        await fs.writeFile(path.resolve('dist/sitemap-core.xml'), buildXml(coreUrls));
        await fs.writeFile(path.resolve('dist/sitemap-destinations.xml'), buildXml(destinationUrls));
        await fs.writeFile(path.resolve('dist/sitemap-corridors.xml'), buildXml(corridorUrls));

        console.log(`✅ Generated sitemap-core.xml (${coreUrls.length} URLs)`);
        console.log(`✅ Generated sitemap-destinations.xml (${destinationUrls.length} URLs)`);
        console.log(`✅ Generated sitemap-corridors.xml (${corridorUrls.length} URLs)`);

        // Update the sitemap index
        const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://econified.com/sitemap-core.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://econified.com/sitemap-destinations.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://econified.com/sitemap-corridors.xml</loc>
  </sitemap>
</sitemapindex>`;

        await fs.writeFile(path.resolve('dist/sitemap-index.xml'), sitemapIndexXml);
        console.log('✅ Updated sitemap-index.xml');

    } catch (error) {
        console.error('❌ Sitemap Splitting Error:', error);
        process.exit(1);
    }
}

splitSitemaps();
