// Shared calculator runtime for tool pages and embeds.
// Reads the definition from the form's data attributes, runs the pure engine,
// and formats outputs. Kept DOM-tolerant so pages can omit optional blocks.
import { engineMap } from '../utils/engineMap.ts';

declare global {
    interface Window { Currency: any; plausible?: (event: string, opts?: any) => void; }
}

export function trackEvent(eventName: string, props: Record<string, string> = {}) {
    if (typeof window !== 'undefined' && window.plausible) {
        window.plausible(eventName, { props });
    }
}

export function initCalculator(context: Record<string, string> = {}) {
    const form = document.getElementById('calc-form') as HTMLFormElement | null;
    const definitionStr = form?.dataset.definition;
    const definition = definitionStr ? JSON.parse(definitionStr) : null;
    if (!form || !definition) return;

    const inputs = Array.from(form.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    const slug = form.dataset.fn || '';

    const currIn = document.getElementById('currency-override') as HTMLSelectElement | null;
    const advToggle = document.getElementById('advanced-toggle') as HTMLInputElement | null;
    const advPanel = document.getElementById('advanced-inputs');
    const resultCta = document.getElementById('result-cta') as HTMLAnchorElement | null;
    const ctaHrefTemplate = resultCta?.getAttribute('href') || '';
    const allInputDefs = [...definition.inputs, ...(definition.advanced?.inputs || [])];
    let interactionCount = 0;

    // Prefill from query params so upstream tools can hand their results over
    // (e.g. commute -> remote-vs-office). Only fills known inputs with finite numbers.
    const params = new URLSearchParams(window.location.search);
    let prefilled = false;
    inputs.forEach(input => {
        const raw = params.get(input.name);
        if (raw !== null && Number.isFinite(parseFloat(raw))) {
            input.value = String(parseFloat(raw));
            prefilled = true;
        }
    });
    if (prefilled) trackEvent('tool_prefilled', { tool: slug, ...context });

    function calculate() {
        if (!window.Currency) return;

        const localCurrency = currIn ? currIn.value : window.Currency.get();
        const values: Record<string, number> = {};

        inputs.forEach(input => {
            let val = parseFloat(input.value) || 0;
            const inputDef = allInputDefs.find((i: any) => i.name === input.name);
            if (inputDef && inputDef.unit === 'currency') {
                val = window.Currency.convertToUSD(val, localCurrency);
            }
            values[input.name] = val;
        });
        values.advancedMode = advToggle && advToggle.checked ? 1 : 0;

        if (slug === 'pto-value-calculator' && (values.ptoDays + values.holidays >= 260 || values.hoursPerDay <= 0)) {
            definition.outputs.forEach((output: any) => {
                const el = document.getElementById(`out-${output.name}`);
                if (el) el.textContent = 'Check leave days and hours';
            });
            return;
        }

        const calcFn = engineMap[slug];
        if (!calcFn) {
            console.error(`Missing engine map for tool: ${slug}`);
            return;
        }

        const results = calcFn(values);

        Object.entries(results).forEach(([key, val]) => {
            const el = document.getElementById(`out-${key}`);
            if (el) {
                const unit = el.dataset.unit;
                if (unit === 'percent') {
                    el.textContent = (typeof val === 'number' && val > 0 ? '+' : '') + (typeof val === 'number' ? val.toFixed(1) : val) + '%';
                } else if (unit === 'percentValue') {
                    el.textContent = (typeof val === 'number' ? val.toFixed(1) : val) + '%';
                } else if (unit === 'number') {
                    el.textContent = typeof val === 'number' ? val.toLocaleString('en-US', { maximumFractionDigits: 1 }) : val;
                } else if (unit === 'text') {
                    el.textContent = val as string;
                } else {
                    const amount = typeof val === 'number' ? window.Currency.convertFromUSD(val, localCurrency) : 0;
                    const precision = definition.outputs.find((o: any) => o.name === key)?.precision;
                    el.textContent = precision !== undefined
                        ? new Intl.NumberFormat(undefined, { style: 'currency', currency: localCurrency, minimumFractionDigits: precision, maximumFractionDigits: precision }).format(amount)
                        : window.Currency.format(amount, localCurrency);
                }
            }
        });

        // Fill {outputName} tokens in the result CTA link with current USD values,
        // so the next step receives the numbers the user already produced.
        if (resultCta && ctaHrefTemplate) {
            resultCta.href = ctaHrefTemplate.replace(/\{(\w+)\}/g, (_m, name) => {
                const v = (results as Record<string, any>)[name];
                return typeof v === 'number' ? String(Math.round(v)) : '';
            });
        }

        interactionCount++;
        if (interactionCount === 2) {
            trackEvent('calculation_run', { tool: slug, ...context });
        }
    }

    window.addEventListener('currencyChanged', (e: any) => {
        if (currIn) {
            currIn.value = e.detail.currency;
            calculate();
        }
    });

    function initSync() {
        if (window.Currency) {
            if (currIn) currIn.value = window.Currency.get();
            calculate();
        }
    }
    window.addEventListener('currencyReady', initSync);
    initSync();

    trackEvent('tool_loaded', { tool: slug, ...context });

    inputs.forEach(input => input.addEventListener('input', calculate));
    if (currIn) currIn.addEventListener('change', calculate);

    // Advanced mode: swap the single overhead input for itemized components
    if (advToggle && advPanel) {
        const replaced = (definition.advanced?.replaces || []) as string[];
        advToggle.addEventListener('change', () => {
            advPanel.hidden = !advToggle.checked;
            replaced.forEach(name => {
                const group = form.querySelector(`.input-group[data-input-name="${name}"]`) as HTMLElement | null;
                if (group) group.hidden = advToggle.checked;
            });
            calculate();
            trackEvent('advanced_mode_toggled', { tool: slug, enabled: String(advToggle.checked), ...context });
        });
    }

    // Preset selects fill their target input; manual edits reset the select
    const presetSelects = Array.from(form.querySelectorAll('.preset-select')) as HTMLSelectElement[];
    presetSelects.forEach(select => {
        const target = document.getElementById(select.dataset.fills || '') as HTMLInputElement | null;
        if (!target) return;
        select.addEventListener('change', () => {
            if (select.value !== '') {
                const inputDef = allInputDefs.find((i: any) => i.name === target.name);
                const currency = currIn ? currIn.value : window.Currency.get();
                target.value = String(inputDef?.unit === 'currency'
                    ? window.Currency.convertFromUSD(Number(select.value), currency)
                    : Number(select.value));
                calculate();
            }
        });
        target.addEventListener('input', () => {
            if (select.value !== '' && target.value !== select.value) select.value = '';
        });
    });

    // Interest-test signal: how many act on the offer shown with their result
    if (resultCta) {
        resultCta.addEventListener('click', () => {
            // Do not send output-bearing query parameters to analytics.
            trackEvent('result_cta_clicked', { tool: slug, target: new URL(resultCta.href).pathname, ...context });
        });
    }

    // Track related tool clicks
    const relatedLinks = Array.from(document.querySelectorAll('[data-analytics="related-tool-click"]'));
    relatedLinks.forEach(link => {
        link.addEventListener('click', () => {
            trackEvent('related_tool_clicked', { source_tool: slug, target: link.getAttribute('href') || '', ...context });
        });
    });
}
