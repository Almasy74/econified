import { test } from 'node:test';
import assert from 'node:assert/strict';

import { emptyCase, emptyScenario, type DecisionCase, type Scenario } from './schema.ts';
import { compareCase, computeScenarioMetrics, WORKDAYS_PER_YEAR } from './engine.ts';

const NOW = '2026-07-18T00:00:00.000Z';

function makeCase(overrides?: Partial<DecisionCase>): DecisionCase {
    const c = emptyCase(NOW);
    return { ...c, ...overrides };
}

function scenario(id: string, label: string, patch: DeepPartial<Scenario>): Scenario {
    const s = emptyScenario(id, label, id === 'current' ? 'current' : 'offer', true);
    return {
        ...s,
        ...patch,
        comp: { ...s.comp, ...(patch.comp ?? {}) },
        time: { ...s.time, ...(patch.time ?? {}) },
        costs: { ...s.costs, ...(patch.costs ?? {}) },
    } as Scenario;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

// ---------------------------------------------------------------- metrics

test('guaranteed value includes base, guaranteed bonus, pension match, stipends and amortized signing bonus', () => {
    const c = makeCase();
    const s = scenario('offer-a', 'Offer A', {
        comp: {
            baseSalary: 100_000,
            guaranteedBonus: 5_000,
            pensionMatchPercent: 5,
            otherGuaranteedAnnual: 2_000,
            signingBonus: 9_000, // tenure 3y -> 3,000/yr
        },
    });
    const m = computeScenarioMetrics(s, c.assumptions);
    assert.equal(m.guaranteedAnnual, 100_000 + 5_000 + 5_000 + 2_000 + 3_000);
});

test('expected variable value applies bonus payout and equity risk discount', () => {
    const c = makeCase();
    const s = scenario('offer-a', 'Offer A', {
        comp: {
            baseSalary: 100_000,
            targetBonusPercent: 20,
            bonusPayoutPercent: 75, // 100k * 20% * 75% = 15,000
            equityAnnual: 40_000,
            equityRiskDiscountPercent: 50, // -> 20,000
        },
    });
    const m = computeScenarioMetrics(s, c.assumptions);
    assert.equal(m.expectedVariableAnnual, 15_000 + 20_000);
    assert.equal(m.expectedAnnual, 100_000 + 35_000);
    assert.ok(Math.abs(m.atRiskShare - 35_000 / 135_000) < 1e-9);
});

test('commute hours and costs scale with onsite days and PTO-adjusted weeks', () => {
    const c = makeCase();
    const s = scenario('offer-a', 'Offer A', {
        comp: { baseSalary: 100_000 },
        time: { weeklyHours: 40, onsiteDaysPerWeek: 3, commuteMinutesOneWay: 30, ptoDays: 10 },
        costs: { commuteCostPerDay: 10 },
    });
    const m = computeScenarioMetrics(s, c.assumptions);
    const weeks = (WORKDAYS_PER_YEAR - 10) / 5; // 50
    assert.equal(m.effectiveWeeks, weeks);
    assert.equal(m.commuteHoursAnnual, 1 * 3 * weeks); // 1h/day round trip
    assert.equal(m.annualWorkCosts, 10 * 3 * weeks);
    assert.equal(m.workedHoursAnnual, 40 * weeks);
});

test('commute time only affects decision value when a time value is set', () => {
    const c = makeCase();
    const s = scenario('offer-a', 'Offer A', {
        comp: { baseSalary: 100_000 },
        time: { weeklyHours: 40, onsiteDaysPerWeek: 5, commuteMinutesOneWay: 60, ptoDays: 25 },
    });
    const without = computeScenarioMetrics(s, { ...c.assumptions, hourlyTimeValue: null });
    const withTv = computeScenarioMetrics(s, { ...c.assumptions, hourlyTimeValue: 20 });
    assert.equal(without.commuteTimeCost, null);
    assert.equal(without.decisionValue, without.netExpectedAnnual);
    assert.ok(withTv.commuteTimeCost! > 0);
    assert.ok(withTv.decisionValue < without.decisionValue);
});

// ---------------------------------------------------------------- comparison

function twoScenarioCase(a: Scenario, b: Scenario, patchAssumptions?: object): DecisionCase {
    const c = makeCase();
    return {
        ...c,
        assumptions: { ...c.assumptions, ...(patchAssumptions ?? {}) },
        scenarios: [a, b],
    };
}

test('clear salary gap produces a leader verdict with base salary as top driver', () => {
    const cur = scenario('current', 'Current job', { comp: { baseSalary: 80_000 } });
    const off = scenario('offer-a', 'Offer A', { comp: { baseSalary: 100_000 } });
    const result = compareCase(twoScenarioCase(cur, off));
    assert.equal(result.recommendation.verdict, 'leader');
    assert.equal(result.recommendation.leaderId, 'offer-a');
    assert.equal(result.recommendation.drivers[0].key, 'baseSalary');
    assert.equal(result.recommendation.annualGap, 20_000);
});

test('near-identical scenarios are reported as a close call', () => {
    const cur = scenario('current', 'Current job', { comp: { baseSalary: 100_000 } });
    const off = scenario('offer-a', 'Offer A', { comp: { baseSalary: 101_000 } });
    const result = compareCase(twoScenarioCase(cur, off)); // 1% gap < 2.5% threshold
    assert.equal(result.recommendation.verdict, 'close');
});

test('missing salary on one scenario yields insufficient verdict', () => {
    const cur = scenario('current', 'Current job', { comp: { baseSalary: 100_000 } });
    const off = scenario('offer-a', 'Offer A', { comp: { baseSalary: 0 } });
    const result = compareCase(twoScenarioCase(cur, off));
    assert.equal(result.recommendation.verdict, 'insufficient');
    assert.ok(result.recommendation.missingInfo.some((m) => m.includes('Offer A')));
});

test('a commute-heavy higher offer can lose once time is valued', () => {
    const remote = scenario('current', 'Current remote job', {
        comp: { baseSalary: 95_000 },
        time: { weeklyHours: 40, onsiteDaysPerWeek: 0, commuteMinutesOneWay: 0, ptoDays: 25 },
    });
    const onsite = scenario('offer-a', 'Onsite offer', {
        comp: { baseSalary: 105_000 },
        time: { weeklyHours: 40, onsiteDaysPerWeek: 5, commuteMinutesOneWay: 45, ptoDays: 25 },
        costs: { commuteCostPerDay: 12 },
    });

    const withoutTime = compareCase(twoScenarioCase(remote, onsite, { hourlyTimeValue: null }));
    assert.equal(withoutTime.recommendation.leaderId, 'offer-a');

    const withTime = compareCase(twoScenarioCase(remote, onsite, { hourlyTimeValue: 30 }));
    // 45min x2 x5d x47wk = 352.5h; at 30/h = 10,575 + 2,820 commute cost > 10,000 gap
    assert.equal(withTime.recommendation.leaderId, 'current');
});

test('base salary break-even accounts for pension and bonus multipliers', () => {
    const cur = scenario('current', 'Current job', {
        comp: { baseSalary: 90_000, pensionMatchPercent: 10, targetBonusPercent: 10, bonusPayoutPercent: 100 },
    });
    const off = scenario('offer-a', 'Offer A', { comp: { baseSalary: 120_000 } });
    const result = compareCase(twoScenarioCase(cur, off));
    const be = result.recommendation.breakEvens.find((b) => b.kind === 'baseSalary');
    assert.ok(be);
    // gap: 120,000 - (90,000 * 1.2) = 12,000; multiplier 1.2 -> +10,000 base
    assert.ok(Math.abs(be!.value - 100_000) < 1);

    // Verify the break-even actually flips the ranking.
    const curRaised = scenario('current', 'Current job', {
        comp: { baseSalary: be!.value + 1, pensionMatchPercent: 10, targetBonusPercent: 10, bonusPayoutPercent: 100 },
    });
    const flipped = compareCase(twoScenarioCase(curRaised, off));
    assert.equal(flipped.recommendation.leaderId, 'current');
});

test('time value break-even matches the flip point', () => {
    const remote = scenario('current', 'Remote', {
        comp: { baseSalary: 95_000 },
        time: { weeklyHours: 40, onsiteDaysPerWeek: 0, commuteMinutesOneWay: 0, ptoDays: 25 },
    });
    const onsite = scenario('offer-a', 'Onsite', {
        comp: { baseSalary: 105_000 },
        time: { weeklyHours: 40, onsiteDaysPerWeek: 5, commuteMinutesOneWay: 45, ptoDays: 25 },
    });
    const result = compareCase(twoScenarioCase(remote, onsite, { hourlyTimeValue: null }));
    const be = result.recommendation.breakEvens.find((b) => b.kind === 'timeValue');
    assert.ok(be);

    const above = compareCase(twoScenarioCase(remote, onsite, { hourlyTimeValue: be!.value + 0.5 }));
    assert.equal(above.recommendation.leaderId, 'current');
    const below = compareCase(twoScenarioCase(remote, onsite, { hourlyTimeValue: Math.max(0, be!.value - 0.5) }));
    assert.equal(below.recommendation.leaderId, 'offer-a');
});

test('three scenarios rank correctly and recommendation compares top two', () => {
    const cur = scenario('current', 'Current', { comp: { baseSalary: 80_000 } });
    const a = scenario('offer-a', 'Offer A', { comp: { baseSalary: 110_000 } });
    const b = scenario('offer-b', 'Offer B', { comp: { baseSalary: 100_000 } });
    const c = makeCase();
    const result = compareCase({ ...c, scenarios: [cur, a, b] });
    assert.deepEqual(
        result.ranking.map((m) => m.scenarioId),
        ['offer-a', 'offer-b', 'current'],
    );
    assert.equal(result.recommendation.leaderId, 'offer-a');
    assert.equal(result.recommendation.runnerUpId, 'offer-b');
});

test('equity at full face value is flagged as missing info', () => {
    const cur = scenario('current', 'Current', { comp: { baseSalary: 100_000 } });
    const off = scenario('offer-a', 'Offer A', {
        comp: { baseSalary: 90_000, equityAnnual: 30_000, equityRiskDiscountPercent: 0 },
    });
    const result = compareCase(twoScenarioCase(cur, off));
    assert.ok(result.recommendation.missingInfo.some((m) => m.includes('full face value')));
});
