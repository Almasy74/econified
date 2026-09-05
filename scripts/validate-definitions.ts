import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Define the strict schema for tool definitions
const inputSchema = z.object({
    name: z.string(),
    type: z.literal('number'),
    unit: z.string().optional(),
    label: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    placeholder: z.string().optional(),
    default: z.number().optional(),
    presets: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
    presetLabel: z.string().optional()
});

const definitionSchema = z.object({
    title: z.string().min(5),
    description: z.string().min(10),
    quickAnswer: z.string().min(20).optional(),
    resultNote: z.string().min(20).optional(),
    relatedGuides: z.array(z.object({ href: z.string().regex(/^\/guides\/.+\/$/), label: z.string().min(5) })).optional(),
    sources: z.array(z.object({ href: z.string().url(), label: z.string().min(5) })).optional(),
    inputs: z.array(inputSchema).min(1),
    advanced: z.object({
        label: z.string(),
        replaces: z.array(z.string()),
        inputs: z.array(inputSchema).min(1)
    }).optional(),
    resultCta: z.object({
        label: z.string(),
        href: z.string(),
        note: z.string().optional()
    }).optional(),
    outputs: z.array(z.object({
        name: z.string(),
        unit: z.string().optional(),
        precision: z.number().int().min(0).max(4).optional(),
        label: z.string()
    })).min(1),
    methodSummary: z.array(z.string()).min(1),
    assumptions: z.array(z.string()).min(1),

    // Strict Constraints (Content Quality Gates)
    insights: z.array(z.string()).min(2, "Must have at least 2 insights").max(3, "Cannot have more than 3 insights"),
    faqs: z.array(z.object({
        q: z.string(),
        a: z.string()
    })).min(6, "Must define at least 6 FAQs").max(10, "Cannot have more than 10 FAQs"),

    clusters: z.array(z.string()).min(1),
    useCases: z.array(z.string()).length(3, "Must define exactly 3 use cases"),
    nextDecision: z.string().nullable().optional(),
    upstreamDecision: z.string().nullable().optional()
});

// Collect every human-readable string in a definition for text-consistency checks.
function collectText(definition: any): string {
    const parts: string[] = [
        definition.title, definition.description,
        ...(definition.methodSummary || []), ...(definition.assumptions || []),
        ...(definition.insights || []),
        ...(definition.faqs || []).flatMap((f: any) => [f.q, f.a]),
        definition.richContent || ''
    ];
    return parts.join('\n');
}

// Guard: overhead must never be described as including vacation/PTO without an
// explicit exclusion - that is how the double-counting bug was introduced.
function checkOverheadVacation(text: string): string[] {
    const errors: string[] = [];
    const sentences = text.replace(/<[^>]+>/g, ' ').split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
        const mentionsOverhead = /\b(overhead|buffer)\b/i.test(s);
        const claimsInclusion = /\b(includes?|covers?|accounts? for)\b/i.test(s);
        const mentionsPto = /\b(vacation|PTO|holidays|unpaid weeks)\b/i.test(s);
        const hasExclusion = /\b(not|never|exclud\w*|except\w*|belongs? in)\b/i.test(s);
        if (mentionsOverhead && claimsInclusion && mentionsPto && !hasExclusion) {
            errors.push(`Overhead described as including vacation/PTO without exclusion: "${s.trim().slice(0, 140)}..."`);
        }
    }
    return errors;
}

// Guard: every per-mile rate quoted in text or presets must exist in the model's sources.
function checkRatesAgainstModel(definition: any, model: any): string[] {
    const errors: string[] = [];
    const allowed = new Set<number>(
        (model.sources || []).filter((s: any) => typeof s.value === 'number').map((s: any) => s.value)
    );
    if (allowed.size === 0) return errors;

    const text = collectText(definition);
    for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*cents per mile/gi)) {
        const asDollars = parseFloat(m[1]) / 100;
        if (!allowed.has(asDollars)) {
            errors.push(`Rate "${m[1]} cents per mile" not found in model sources (allowed: ${[...allowed].join(', ')}).`);
        }
    }
    for (const m of text.matchAll(/\$(0\.\d+)\s*(?:per mile|\/\s*mile)/gi)) {
        if (!allowed.has(parseFloat(m[1]))) {
            errors.push(`Rate "$${m[1]}/mile" not found in model sources (allowed: ${[...allowed].join(', ')}).`);
        }
    }
    const allInputs = [...(definition.inputs || []), ...((definition.advanced || {}).inputs || [])];
    for (const input of allInputs) {
        for (const p of input.presets || []) {
            if (!allowed.has(p.value)) {
                errors.push(`Preset value ${p.value} on input "${input.name}" not found in model sources.`);
            }
        }
    }
    return errors;
}

// Guard: destination salary pages must stay noindexed until the data model
// carries real FX rates - col_index ratios alone are USD figures and must not
// be labeled as local currency.
async function checkSalaryPagesFxGuard(): Promise<string[]> {
    const errors: string[] = [];
    const colData = JSON.parse(await fs.readFile(path.resolve('src/data/col-indices.json'), 'utf-8'));
    const hasFx = Object.values(colData).every((e: any) => typeof e.fx_usd_to_local === 'number');
    if (hasFx) return errors;

    const pages = [
        'src/pages/salary-in-[destination]/index.astro',
        'src/pages/salary-equivalent-100k-us-in-[destination]/index.astro',
        'src/pages/salary/[origin]-to-[destination]/index.astro'
    ];
    for (const page of pages) {
        const src = await fs.readFile(path.resolve(page), 'utf-8');
        if (!/const isIndexable = false/.test(src)) {
            errors.push(`${page}: must keep "const isIndexable = false" until col-indices.json entries carry fx_usd_to_local.`);
        }
    }
    return errors;
}

async function validateDefinitions() {
    console.log('Validating JSON Definitions...');
    let hasErrors = false;

    const registryPath = path.resolve('tools/registry.json');
    const registryData = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryData);

    for (const entry of registry) {
        const defPath = path.resolve(`tools/definitions/${entry.slug}.json`);
        try {
            const defData = await fs.readFile(defPath, 'utf-8');
            const definition = JSON.parse(defData);

            console.log(`Checking ${entry.slug}.json ...`);

            // Zod Validation
            definitionSchema.parse(definition);

            const consistencyErrors: string[] = [];
            consistencyErrors.push(...checkOverheadVacation(collectText(definition)));

            // Model consistency (formula source of truth, if one exists for this tool)
            let model: any = null;
            try {
                model = JSON.parse(await fs.readFile(path.resolve(`tools/models/${entry.slug}.model.json`), 'utf-8'));
            } catch (e) {}
            if (model) {
                if (entry.updatedAt && model.reviewedAt && entry.updatedAt > model.reviewedAt) {
                    consistencyErrors.push(`registry updatedAt (${entry.updatedAt}) is newer than model reviewedAt (${model.reviewedAt}). Review the model or do not bump updatedAt.`);
                }
                consistencyErrors.push(...checkRatesAgainstModel(definition, model));
            }

            if (consistencyErrors.length > 0) {
                hasErrors = true;
                console.error(`\n❌ Consistency errors in ${entry.slug}.json:`);
                consistencyErrors.forEach(e => console.error(`  - ${e}`));
            }

        } catch (error: any) {
            hasErrors = true;
            console.error(`\n❌ Error validating ${entry.slug}.json:`);
            if (error instanceof z.ZodError) {
                error.errors.forEach(e => console.error(`  - [${e.path.join('.')}] ${e.message}`));
            } else {
                console.error(error.message);
            }
        }
    }

    const fxErrors = await checkSalaryPagesFxGuard();
    if (fxErrors.length > 0) {
        hasErrors = true;
        console.error('\n❌ Salary page FX guard:');
        fxErrors.forEach(e => console.error(`  - ${e}`));
    }

    if (hasErrors) {
        console.error('\n🚨 Build Failed: Definition validation errors detected. See above.');
        process.exit(1);
    } else {
        console.log('\n✅ All definitions passed strict schema and consistency validation.');
    }
}

validateDefinitions();
