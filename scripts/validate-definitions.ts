import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Define the strict schema for tool definitions
const definitionSchema = z.object({
    title: z.string().min(5),
    description: z.string().min(10),
    inputs: z.array(z.object({
        name: z.string(),
        type: z.literal('number'),
        unit: z.string().optional(),
        label: z.string(),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
        placeholder: z.string().optional()
    })).min(1),
    outputs: z.array(z.object({
        name: z.string(),
        unit: z.string().optional(),
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

    if (hasErrors) {
        console.error('\n🚨 Build Failed: Definition validation errors detected. See above.');
        process.exit(1);
    } else {
        console.log('\n✅ All definitions passed strict schema validation.');
    }
}

validateDefinitions();
