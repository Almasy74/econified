import fs from 'node:fs/promises';
import path from 'node:path';

async function auditSitemap() {
    console.log('Auditing Sitemap...');

    const registryPath = path.resolve('tools/registry.json');
    const sitemapPath = path.resolve('dist/sitemap-core.xml'); // Check the newly split core sitemap

    const registryData = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryData);
    const expectedSlugs = registry
        .filter((tool: any) => tool.status === 'active')
        .map((tool: any) => `/${tool.slug}/`);

    try {
        const sitemapData = await fs.readFile(sitemapPath, 'utf-8');

        // Check if every expected slug is truly in the generated XML
        const missingSlugs = expectedSlugs.filter((slug: string) => !sitemapData.includes(slug));

        if (missingSlugs.length > 0) {
            console.error('❌ Sitemap Audit Failed! The following tools from registry.json are missing from the sitemap:');
            console.error(missingSlugs);
            process.exit(1);
        }

        console.log('✅ Sitemap Audit Passed. All tools are present.');

    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.error('❌ Sitemap Audit Failed! sitemap-core.xml not found.');
        } else {
            console.error('❌ Sitemap Audit Error:', error);
        }
        process.exit(1);
    }
}

auditSitemap();
