/**
 * Shared HTML renderer for decision-comparison results.
 * Used by the live workflow page and the read-only shared-report page,
 * so the report never drifts between the two.
 *
 * Pure: (case, comparison result) -> HTML string. All user-provided text
 * is escaped before interpolation.
 */

import type { DecisionCase } from '../../tools/decision/schema.ts';
import type { ComparisonResult, ScenarioMetrics } from '../../tools/decision/engine.ts';
import { COMPONENT_LABELS } from '../../tools/decision/engine.ts';

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function buildResultsHtml(c: DecisionCase, result: ComparisonResult): string {
    const esc = escapeHtml;
    const rec = result.recommendation;

    const fmtMoney = (v: number): string => {
        if (v === 0) v = 0; // normalize -0
        return new Intl.NumberFormat(typeof navigator !== 'undefined' ? navigator.language : 'en-US', {
            style: 'currency',
            currency: c.assumptions.currency,
            maximumFractionDigits: 0,
        }).format(v);
    };
    const fmtHours = (v: number): string => `${Math.round(v).toLocaleString()} h`;
    const fmtNum = (v: number, digits = 1): string => v.toLocaleString(undefined, { maximumFractionDigits: digits });

    if (rec.verdict === 'insufficient') {
        return `
            <div class="verdict-card insufficient">
                <h3>Not enough information yet</h3>
                <ul>${rec.missingInfo.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
            </div>`;
    }

    const verdictClass = rec.verdict === 'close' ? 'close' : '';
    const headline =
        rec.verdict === 'close'
            ? `${esc(rec.leaderLabel!)} and ${esc(rec.runnerUpLabel!)} are financially close`
            : `${esc(rec.leaderLabel!)} is stronger under your current assumptions`;
    const gapLine =
        rec.verdict === 'close'
            ? `The gap is ${fmtMoney(rec.annualGap)} per year — inside your ${fmtNum(c.assumptions.closeCallPercent)}% close-call tolerance. Treat this as a decision about preferences, not money.`
            : `Estimated advantage: <strong>${fmtMoney(rec.annualGap)} per year</strong> over ${esc(rec.runnerUpLabel!)}, on expected value net of costs${c.assumptions.hourlyTimeValue != null ? ' and commute time at your time value' : ''}.`;

    const tableRows: Array<[string, (m: ScenarioMetrics) => string]> = [
        ['Guaranteed annual value', (m) => fmtMoney(m.guaranteedAnnual)],
        ['Expected annual value', (m) => fmtMoney(m.expectedAnnual)],
        ['Share of value at risk', (m) => `${fmtNum(m.atRiskShare * 100, 0)}%`],
        ['Recurring work costs', (m) => fmtMoney(-m.annualWorkCosts)],
        ['Switching cost (per year of tenure)', (m) => fmtMoney(-m.amortizedTransitionCost)],
        ['Net expected value', (m) => fmtMoney(m.netExpectedAnnual)],
        ['Hours worked per year', (m) => fmtHours(m.workedHoursAnnual)],
        ['Commute hours per year', (m) => fmtHours(m.commuteHoursAnnual)],
        ['Effective hourly value', (m) => (m.effectiveHourly != null ? fmtMoney(m.effectiveHourly) + '/h' : '—')],
        ['PTO days', (m) => fmtNum(m.ptoDays, 0)],
    ];
    if (c.assumptions.hourlyTimeValue != null) {
        tableRows.push(['Commute time cost (your valuation)', (m) => fmtMoney(-(m.commuteTimeCost ?? 0))]);
    }
    tableRows.push(['Decision value (ranking basis)', (m) => fmtMoney(m.decisionValue)]);

    const included = result.metrics;
    const leaderId = rec.leaderId;

    const table = `
        <div class="comparison-table-wrap results-block">
            <table class="comparison-table">
                <caption class="field-hint" style="text-align:left; caption-side: bottom; margin-top: 0.5rem;">
                    All amounts are annual, gross, in ${esc(c.assumptions.currency)}. “Expected” values discount bonuses and equity by your own risk assumptions.
                </caption>
                <thead>
                    <tr><th scope="col" style="text-align:left;">Dimension</th>${included
                        .map((m) => `<th scope="col">${esc(m.label)}${m.scenarioId === leaderId ? ' ★' : ''}</th>`)
                        .join('')}</tr>
                </thead>
                <tbody>
                    ${tableRows
                        .map(
                            ([label, get]) => `
                        <tr><th scope="row">${esc(label)}</th>${included
                                .map((m) => `<td class="${m.scenarioId === leaderId ? 'winner' : ''}">${get(m)}</td>`)
                                .join('')}</tr>`,
                        )
                        .join('')}
                </tbody>
            </table>
        </div>`;

    const drivers = rec.drivers.length
        ? `<div class="results-block">
                <h3>What drives the result</h3>
                <ol>${rec.drivers
                    .map(
                        (d) =>
                            `<li><strong>${esc(COMPONENT_LABELS[d.key])}:</strong> ${
                                d.delta >= 0 ? 'favors' : 'works against'
                            } ${esc(rec.leaderLabel!)} by ${fmtMoney(Math.abs(d.delta))} per year.</li>`,
                    )
                    .join('')}</ol>
           </div>`
        : '';

    const breakEvens = rec.breakEvens.length
        ? `<div class="results-block">
                <h3>What would change the answer</h3>
                <ul>${rec.breakEvens
                    .map((b) => {
                        const val =
                            b.kind === 'baseSalary'
                                ? fmtMoney(b.value)
                                : b.kind === 'timeValue'
                                  ? fmtMoney(b.value) + '/h'
                                  : b.kind === 'onsiteDays'
                                    ? `${fmtNum(b.value)} days/week`
                                    : `${fmtNum(b.value, 0)}%`;
                        return `<li>${esc(b.description)} <strong>${val}</strong>.</li>`;
                    })
                    .join('')}</ul>
                <p class="field-hint">The base-salary threshold doubles as a negotiation target for ${esc(rec.runnerUpLabel!)}.</p>
           </div>`
        : '';

    const missing = rec.missingInfo.length
        ? `<div class="results-block">
                <h3>Worth confirming</h3>
                <ul>${rec.missingInfo.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
           </div>`
        : '';

    const caveats = `<div class="results-block">
            <h3>Assumptions and limits</h3>
            <ul>${rec.caveats.map((cv) => `<li>${esc(cv)}</li>`).join('')}</ul>
            <p class="field-hint">Confidence in this comparison: <strong>${rec.confidence}</strong>
            (based on how close the scenarios are, how much value is at risk, and what is still unconfirmed).
            This is an economic comparison, not financial advice.</p>
        </div>`;

    return `
        <div class="verdict-card ${verdictClass}">
            <h3>${headline}</h3>
            <p style="margin-bottom: 0;">${gapLine}</p>
        </div>
        ${table}${drivers}${breakEvens}${missing}${caveats}`;
}
