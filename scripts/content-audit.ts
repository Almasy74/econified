import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { engineMap } from '../src/utils/engineMap.ts';

const root = path.resolve('dist');
async function htmlFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(entries.map(e => e.isDirectory() ? htmlFiles(path.join(dir, e.name))
        : Promise.resolve(e.name.endsWith('.html') ? [path.join(dir, e.name)] : [])));
    return nested.flat();
}
const files = await htmlFiles(root);
let links = 0;
for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    const relative = path.relative(root, file).replaceAll('\\', '/');
    for (const match of html.matchAll(/<a\b[^>]*href="([^"#]+)[^"]*"/g)) {
        let href = match[1].replaceAll('&amp;', '&');
        if (href.startsWith('https://econified.com/')) href = href.slice('https://econified.com'.length);
        if (!href.startsWith('/') || href.startsWith('//')) continue;
        const pathname = new URL(href, 'https://econified.com').pathname;
        const target = path.join(root, pathname, pathname.endsWith('/') ? 'index.html' : '');
        await fs.access(target).catch(() => { throw new Error(`${relative}: broken internal link ${href}`); });
        links++;
    }
    if (/^(salary-in-|salary-equivalent-|salary\/|salary-calculator\/|remote-salary-calculator\/)/.test(relative)) {
        assert.match(html, /http-equiv="refresh"/i, `${relative}: withdrawn estimate must redirect`);
        assert.ok(!html.includes('calc-form'), `${relative}: withdrawn calculator still rendered`);
    }
    assert.ok(!html.includes('Econified Editorial Team'), `${relative}: undocumented team attribution`);
}
const paused = await fs.readFile(path.join(root, 'global-salary/index.html'), 'utf8');
assert.match(paused, /noindex/);
assert.ok(!paused.includes('adsbygoogle.js'));

const registry = JSON.parse(await fs.readFile('tools/registry.json', 'utf8'));
for (const tool of registry.filter((t: any) => t.status === 'active')) {
    const def = JSON.parse(await fs.readFile(`tools/definitions/${tool.slug}.json`, 'utf8'));
    const inputs = Object.fromEntries(def.inputs.map((i: any) => [i.name, tool.defaults?.[i.name] ?? i.default ?? 0]));
    const results = engineMap[tool.slug](inputs);
    for (const output of def.outputs) {
        assert.ok(output.name in results, `${tool.slug}: missing engine output ${output.name}`);
        const result = results[output.name];
        assert.ok(typeof result === 'string' || Number.isFinite(result), `${tool.slug}: invalid default result ${output.name}`);
    }
}
console.log(`Content audit passed: ${files.length} HTML pages, ${links} internal links, ${registry.length} calculator default scenarios, withdrawn location pages.`);
