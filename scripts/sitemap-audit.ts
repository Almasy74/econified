import fs from 'node:fs/promises';
import path from 'node:path';

const origin = 'https://econified.com';
const dist = path.resolve('dist');
const priorityPaths = [
    '/commute-cost-calculator/', '/contractor-vs-employee/',
    '/pto-value-calculator/', '/job-offer-comparison/',
    '/guides/commute-true-cost/', '/guides/contractor-markup-guide/',
    '/guides/compare-job-offers-correctly/', '/tools/remote-work-economics/'
];
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const links = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)]
    .map(m => new URL(m[1].replace(/&amp;/g, '&'), origin))
    .filter(url => url.origin === origin).map(url => url.pathname);
const htmlPath = (pathname: string) => path.join(dist, pathname.replace(/^\//, ''), 'index.html');

async function audit() {
    const errors: string[] = [];
    const index = await fs.readFile(path.join(dist, 'sitemap-index.xml'), 'utf8');
    const allUrls: string[] = [];
    for (const sitemap of locs(index)) {
        const urls = locs(await fs.readFile(path.join(dist, new URL(sitemap).pathname), 'utf8'));
        if (!urls.length) errors.push(`Empty sitemap listed in index: ${sitemap}`);
        allUrls.push(...urls);
    }
    if (new Set(allUrls).size !== allUrls.length) errors.push('Duplicate sitemap URLs.');
    const htmlByPath = new Map<string, string>();
    for (const address of allUrls) {
        const url = new URL(address);
        if (url.origin !== origin || !url.pathname.endsWith('/') || url.search) errors.push(`Noncanonical sitemap URL: ${address}`);
        try {
            const html = await fs.readFile(htmlPath(url.pathname), 'utf8');
            htmlByPath.set(url.pathname, html);
            if (/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html)) errors.push(`Noindexed URL in sitemap: ${address}`);
            if (!html.includes(`rel="canonical" href="${address}"`)) errors.push(`Missing/mismatched canonical: ${address}`);
        } catch { errors.push(`Missing built HTML: ${address}`); }
    }
    const registry = JSON.parse(await fs.readFile('tools/registry.json', 'utf8'));
    for (const tool of registry.filter((t: any) => t.status === 'active')) {
        const def = JSON.parse(await fs.readFile(`tools/definitions/${tool.slug}.json`, 'utf8'));
        const present = allUrls.includes(`${origin}/${tool.slug}/`);
        if (present === !!def.noindex) errors.push(`Tool sitemap/noindex mismatch: ${tool.slug}`);
    }
    // Follow indexable internal links from home to make priority content discoverable.
    const distances = new Map<string, number>([['/', 0]]);
    const queue = ['/'];
    for (const current of queue) {
        for (const next of links(htmlByPath.get(current) || '')) {
            if (htmlByPath.has(next) && !distances.has(next)) {
                distances.set(next, distances.get(current)! + 1);
                queue.push(next);
            }
        }
    }
    for (const pathname of priorityPaths) {
        if (!htmlByPath.has(pathname)) errors.push(`Priority page absent from sitemap: ${pathname}`);
        if ((distances.get(pathname) ?? Infinity) > 3) errors.push(`Priority page more than 3 links from home: ${pathname}`);
        for (const linked of links(htmlByPath.get(pathname) || '')) {
            if (!linked.endsWith('/')) continue;
            try { await fs.access(htmlPath(linked)); }
            catch { errors.push(`Broken internal link on ${pathname}: ${linked}`); }
        }
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`Sitemap audit passed: ${allUrls.length} indexable canonical pages; ${priorityPaths.length} priority pages reachable within 3 links.`);
}
audit().catch(error => { console.error(error); process.exitCode = 1; });
