import type { DecisionCase, Scenario, SharedAssumptions } from './schema.ts';

/**
 * Deterministic job-offer decision engine.
 *
 * Pure functions only: no I/O, no dates, no randomness, no LLM.
 * Every number in the recommendation is computed here and testable.
 *
 * Conventions:
 * - All money values are annual amounts in the case currency unless suffixed.
 * - A year has WORKDAYS_PER_YEAR working days; effective working weeks are
 *   reduced by PTO. Public holidays are deliberately ignored (documented
 *   limitation — they affect all scenarios roughly equally).
 * - "Guaranteed" = contractually committed value. "Expected" = guaranteed
 *   plus risk-adjusted variable value (bonus x payout, equity x (1 - discount)).
 * - Ranking basis ("decision value") = expected value - work costs
 *   - amortized transition cost - commute time priced at the user's hourly
 *   time value (only when the user has set one).
 */

export const WORKDAYS_PER_YEAR = 260;

export interface ScenarioMetrics {
    scenarioId: string;
    label: string;
    /** Contractual annual value incl. amortized signing bonus. */
    guaranteedAnnual: number;
    /** Risk-adjusted variable value (bonus + discounted equity). */
    expectedVariableAnnual: number;
    /** guaranteed + expected variable. */
    expectedAnnual: number;
    /** Share of expected value that is not guaranteed (0..1). */
    atRiskShare: number;
    /** Recurring work costs: commute out-of-pocket + other. */
    annualWorkCosts: number;
    /** One-time transition cost spread over expected tenure. */
    amortizedTransitionCost: number;
    netGuaranteedAnnual: number;
    netExpectedAnnual: number;
    /** Hours physically worked per year (weekly hours x effective weeks). */
    workedHoursAnnual: number;
    commuteHoursAnnual: number;
    totalHoursAnnual: number;
    /** Net expected value per total hour committed (worked + commuted). null if no hours. */
    effectiveHourly: number | null;
    /** Commute hours priced at the user's time value; null when no time value set. */
    commuteTimeCost: number | null;
    /** The ranking basis. */
    decisionValue: number;
    ptoDays: number;
    onsiteDaysPerWeek: number;
    /** Effective working weeks per year after PTO. */
    effectiveWeeks: number;
    /** Component breakdown used for driver analysis. */
    components: Record<ComponentKey, number>;
}

export type ComponentKey =
    | 'baseSalary'
    | 'guaranteedExtras'
    | 'signingBonusAmortized'
    | 'expectedBonus'
    | 'expectedEquity'
    | 'workCosts'
    | 'transitionCost'
    | 'commuteTimeCost';

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
    baseSalary: 'Base salary',
    guaranteedExtras: 'Guaranteed extras (bonus, pension match, stipends)',
    signingBonusAmortized: 'Signing bonus (spread over expected tenure)',
    expectedBonus: 'Expected variable bonus',
    expectedEquity: 'Risk-adjusted equity',
    workCosts: 'Recurring work costs',
    transitionCost: 'One-time transition cost (spread over tenure)',
    commuteTimeCost: 'Commute time at your time value',
};

export function computeScenarioMetrics(s: Scenario, a: SharedAssumptions): ScenarioMetrics {
    const tenure = Math.max(a.expectedTenureYears, 0.5);

    const effectiveWeeks = Math.max(0, (WORKDAYS_PER_YEAR - s.time.ptoDays) / 5);

    const pensionValue = s.comp.baseSalary * (s.comp.pensionMatchPercent / 100);
    const signingAmortized = s.comp.signingBonus / tenure;
    const guaranteedExtras = s.comp.guaranteedBonus + pensionValue + s.comp.otherGuaranteedAnnual;
    const guaranteedAnnual = s.comp.baseSalary + guaranteedExtras + signingAmortized;

    const expectedBonus =
        s.comp.baseSalary * (s.comp.targetBonusPercent / 100) * (s.comp.bonusPayoutPercent / 100);
    const expectedEquity = s.comp.equityAnnual * (1 - s.comp.equityRiskDiscountPercent / 100);
    const expectedVariableAnnual = expectedBonus + expectedEquity;
    const expectedAnnual = guaranteedAnnual + expectedVariableAnnual;

    const atRiskShare = expectedAnnual > 0 ? expectedVariableAnnual / expectedAnnual : 0;

    const onsiteDaysAnnual = s.time.onsiteDaysPerWeek * effectiveWeeks;
    const commuteHoursAnnual = ((s.time.commuteMinutesOneWay * 2) / 60) * onsiteDaysAnnual;
    const commuteOutOfPocket = s.costs.commuteCostPerDay * onsiteDaysAnnual;
    const annualWorkCosts = commuteOutOfPocket + s.costs.otherAnnualWorkCosts;
    const amortizedTransitionCost = s.costs.oneTimeTransitionCost / tenure;

    const workedHoursAnnual = s.time.weeklyHours * effectiveWeeks;
    const totalHoursAnnual = workedHoursAnnual + commuteHoursAnnual;

    const netGuaranteedAnnual = guaranteedAnnual - annualWorkCosts;
    const netExpectedAnnual = expectedAnnual - annualWorkCosts;

    const commuteTimeCost = a.hourlyTimeValue != null ? commuteHoursAnnual * a.hourlyTimeValue : null;

    const decisionValue =
        netExpectedAnnual - amortizedTransitionCost - (commuteTimeCost ?? 0);

    const effectiveHourly = totalHoursAnnual > 0 ? netExpectedAnnual / totalHoursAnnual : null;

    return {
        scenarioId: s.id,
        label: s.label,
        guaranteedAnnual,
        expectedVariableAnnual,
        expectedAnnual,
        atRiskShare,
        annualWorkCosts,
        amortizedTransitionCost,
        netGuaranteedAnnual,
        netExpectedAnnual,
        workedHoursAnnual,
        commuteHoursAnnual,
        totalHoursAnnual,
        effectiveHourly,
        commuteTimeCost,
        decisionValue,
        ptoDays: s.time.ptoDays,
        onsiteDaysPerWeek: s.time.onsiteDaysPerWeek,
        effectiveWeeks,
        components: {
            baseSalary: s.comp.baseSalary,
            guaranteedExtras,
            signingBonusAmortized: signingAmortized,
            expectedBonus,
            expectedEquity,
            workCosts: -annualWorkCosts,
            transitionCost: -amortizedTransitionCost,
            commuteTimeCost: -(commuteTimeCost ?? 0),
        },
    };
}

export interface Driver {
    key: ComponentKey;
    label: string;
    /** Positive = favors the leader; negative = favors the runner-up. */
    delta: number;
}

export interface BreakEven {
    kind: 'baseSalary' | 'onsiteDays' | 'timeValue' | 'bonusPayout';
    /** Scenario the threshold applies to. */
    scenarioId: string;
    scenarioLabel: string;
    description: string;
    value: number;
}

export type Verdict = 'leader' | 'close' | 'insufficient';
export type Confidence = 'high' | 'medium' | 'low';

export interface Recommendation {
    verdict: Verdict;
    /** Present when verdict is 'leader' or 'close'. */
    leaderId: string | null;
    leaderLabel: string | null;
    runnerUpId: string | null;
    runnerUpLabel: string | null;
    /** Annual decision-value gap between leader and runner-up. */
    annualGap: number;
    closeCallThreshold: number;
    confidence: Confidence;
    drivers: Driver[];
    breakEvens: BreakEven[];
    caveats: string[];
    missingInfo: string[];
}

export interface ComparisonResult {
    metrics: ScenarioMetrics[];
    /** Sorted best-first by decision value. */
    ranking: ScenarioMetrics[];
    recommendation: Recommendation;
}

function includedScenarios(c: DecisionCase): Scenario[] {
    return c.scenarios.filter((s) => s.included);
}

/** A scenario is usable when it has any compensation at all and some working time. */
function isUsable(s: Scenario): boolean {
    return s.comp.baseSalary > 0 && s.time.weeklyHours > 0;
}

export function compareCase(c: DecisionCase): ComparisonResult {
    const a = c.assumptions;
    const scenarios = includedScenarios(c);
    const metrics = scenarios.map((s) => computeScenarioMetrics(s, a));
    const ranking = [...metrics].sort((x, y) => y.decisionValue - x.decisionValue);

    const usable = scenarios.filter(isUsable);
    const missingInfo = collectMissingInfo(scenarios, a);
    const caveats = collectCaveats(scenarios, a);

    if (usable.length < 2) {
        return {
            metrics,
            ranking,
            recommendation: {
                verdict: 'insufficient',
                leaderId: null,
                leaderLabel: null,
                runnerUpId: null,
                runnerUpLabel: null,
                annualGap: 0,
                closeCallThreshold: 0,
                confidence: 'low',
                drivers: [],
                breakEvens: [],
                caveats,
                missingInfo:
                    missingInfo.length > 0
                        ? missingInfo
                        : ['Enter a base salary and weekly hours for at least two scenarios to compare them.'],
            },
        };
    }

    const leader = ranking[0];
    const runnerUp = ranking[1];
    const gap = leader.decisionValue - runnerUp.decisionValue;

    const avgMagnitude =
        (Math.abs(leader.decisionValue) + Math.abs(runnerUp.decisionValue)) / 2;
    const closeCallThreshold = avgMagnitude * (a.closeCallPercent / 100);
    const isClose = gap <= closeCallThreshold;

    const drivers = computeDrivers(leader, runnerUp);
    const leaderScenario = scenarios.find((s) => s.id === leader.scenarioId)!;
    const runnerUpScenario = scenarios.find((s) => s.id === runnerUp.scenarioId)!;
    const breakEvens = computeBreakEvens(
        leader,
        runnerUp,
        leaderScenario,
        runnerUpScenario,
        gap,
        a,
    );

    const confidence = assessConfidence(isClose, missingInfo, leader, runnerUp);

    return {
        metrics,
        ranking,
        recommendation: {
            verdict: isClose ? 'close' : 'leader',
            leaderId: leader.scenarioId,
            leaderLabel: leader.label,
            runnerUpId: runnerUp.scenarioId,
            runnerUpLabel: runnerUp.label,
            annualGap: gap,
            closeCallThreshold,
            confidence,
            drivers,
            breakEvens,
            caveats,
            missingInfo,
        },
    };
}

/** Top contributors to the gap between leader and runner-up, largest first. */
export function computeDrivers(leader: ScenarioMetrics, runnerUp: ScenarioMetrics, top = 3): Driver[] {
    const keys = Object.keys(COMPONENT_LABELS) as ComponentKey[];
    return keys
        .map((key) => ({
            key,
            label: COMPONENT_LABELS[key],
            delta: leader.components[key] - runnerUp.components[key],
        }))
        .filter((d) => Math.abs(d.delta) > 0.5)
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
        .slice(0, top);
}

/**
 * Thresholds at which the runner-up would overtake the leader.
 * Each threshold is solved from the decision-value equation, holding
 * everything else constant.
 */
export function computeBreakEvens(
    leader: ScenarioMetrics,
    runnerUp: ScenarioMetrics,
    leaderScenario: Scenario,
    runnerUpScenario: Scenario,
    gap: number,
    a: SharedAssumptions,
): BreakEven[] {
    const out: BreakEven[] = [];
    if (gap <= 0) return out;

    // 1. Base salary the runner-up would need. Base flows into pension match
    //    and target bonus, so dValue/dBase = 1 + match% + target% x payout%.
    const rc = runnerUpScenario.comp;
    const baseMultiplier =
        1 + rc.pensionMatchPercent / 100 + (rc.targetBonusPercent / 100) * (rc.bonusPayoutPercent / 100);
    if (baseMultiplier > 0 && rc.baseSalary > 0) {
        const neededBase = rc.baseSalary + gap / baseMultiplier;
        out.push({
            kind: 'baseSalary',
            scenarioId: runnerUpScenario.id,
            scenarioLabel: runnerUpScenario.label,
            description: `${runnerUpScenario.label} overtakes at a base salary of about`,
            value: neededBase,
        });
    }

    // 2. Onsite days: if the runner-up loses ground to commuting, fewer onsite
    //    days could flip the result.
    const rt = runnerUpScenario.time;
    const rMetrics = runnerUp;
    if (rt.onsiteDaysPerWeek > 0 && rMetrics.effectiveWeeks > 0) {
        const perDayAnnualCost =
            rMetrics.effectiveWeeks *
            (runnerUpScenario.costs.commuteCostPerDay +
                ((rt.commuteMinutesOneWay * 2) / 60) * (a.hourlyTimeValue ?? 0));
        if (perDayAnnualCost > 0) {
            const daysToCut = gap / perDayAnnualCost;
            const threshold = rt.onsiteDaysPerWeek - daysToCut;
            if (threshold >= 0) {
                out.push({
                    kind: 'onsiteDays',
                    scenarioId: runnerUpScenario.id,
                    scenarioLabel: runnerUpScenario.label,
                    description: `${runnerUpScenario.label} overtakes if onsite days fall below about`,
                    value: threshold,
                });
            }
        }
    }

    // 3. Value of personal time at which the ranking flips (only meaningful
    //    when commute hours differ).
    const hoursDiff = leader.commuteHoursAnnual - runnerUp.commuteHoursAnnual;
    if (Math.abs(hoursDiff) > 1) {
        const currentT = a.hourlyTimeValue ?? 0;
        // decisionValue(t) = base - commuteHours x t. Flip where values equal.
        const leaderBase = leader.decisionValue + leader.commuteHoursAnnual * currentT;
        const runnerBase = runnerUp.decisionValue + runnerUp.commuteHoursAnnual * currentT;
        const tStar = (leaderBase - runnerBase) / hoursDiff;
        if (tStar > 0 && Number.isFinite(tStar) && hoursDiff > 0) {
            out.push({
                kind: 'timeValue',
                scenarioId: runnerUp.scenarioId,
                scenarioLabel: runnerUp.label,
                description: `${runnerUp.label} overtakes if you value your time above (per hour)`,
                value: tStar,
            });
        }
    }

    // 4. Bonus payout: if the leader depends on a variable bonus, a weaker
    //    payout could erase its lead.
    const lc = leaderScenario.comp;
    const leaderTargetBonusFull = lc.baseSalary * (lc.targetBonusPercent / 100);
    if (leaderTargetBonusFull > 0) {
        const payoutDropNeeded = (gap / leaderTargetBonusFull) * 100;
        const threshold = lc.bonusPayoutPercent - payoutDropNeeded;
        if (threshold >= 0) {
            out.push({
                kind: 'bonusPayout',
                scenarioId: leaderScenario.id,
                scenarioLabel: leaderScenario.label,
                description: `${leaderScenario.label} loses its lead if bonus payout falls below (%)`,
                value: threshold,
            });
        }
    }

    return out;
}

function collectMissingInfo(scenarios: Scenario[], a: SharedAssumptions): string[] {
    const notes: string[] = [];
    for (const s of scenarios) {
        if (!isUsable(s)) {
            notes.push(`${s.label}: base salary and weekly hours are required before it can be compared.`);
            continue;
        }
        if (s.comp.equityAnnual > 0 && s.comp.equityRiskDiscountPercent === 0) {
            notes.push(
                `${s.label}: equity is counted at full face value. Consider a risk discount unless shares are liquid.`,
            );
        }
        if (s.time.onsiteDaysPerWeek > 0 && s.time.commuteMinutesOneWay === 0) {
            notes.push(`${s.label}: onsite days are set but commute time is 0 — the time cost is not captured.`);
        }
    }
    if (a.hourlyTimeValue == null) {
        const anyCommuteDiff =
            new Set(scenarios.map((s) => s.time.onsiteDaysPerWeek * s.time.commuteMinutesOneWay)).size > 1;
        if (anyCommuteDiff) {
            notes.push(
                'No personal time value set: commute hours are reported but do not affect the ranking. Set one under Assumptions to include them.',
            );
        }
    }
    return notes;
}

function collectCaveats(scenarios: Scenario[], a: SharedAssumptions): string[] {
    const caveats: string[] = [
        'All values are gross (pre-tax). If the scenarios are taxed very differently (other country, contractor status), the comparison can shift.',
        'Public holidays are ignored; they affect all scenarios roughly equally.',
    ];
    if (scenarios.some((s) => s.comp.signingBonus > 0) || scenarios.some((s) => s.costs.oneTimeTransitionCost > 0)) {
        caveats.push(
            `One-time amounts (signing bonus, transition costs) are spread over your expected tenure of ${a.expectedTenureYears} year(s). A shorter stay makes signing bonuses more valuable and transitions more expensive per year.`,
        );
    }
    return caveats;
}

function assessConfidence(
    isClose: boolean,
    missingInfo: string[],
    leader: ScenarioMetrics,
    runnerUp: ScenarioMetrics,
): Confidence {
    if (isClose || missingInfo.length >= 2) return 'low';
    const riskHeavy = leader.atRiskShare > 0.35 || runnerUp.atRiskShare > 0.35;
    if (missingInfo.length === 1 || riskHeavy) return 'medium';
    return 'high';
}
