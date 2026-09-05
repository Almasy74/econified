import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateContractorVsEmployee, calculateCommuteCost } from './comparison.ts';

const simpleBase = {
    employeeSalary: 100000,
    contractorHourlyRate: 75,
    contractorHoursPerWeek: 40,
    contractorWeeksPerYear: 46,
    contractorOverheadPercent: 30
};

test('commute example separates vehicle and parking costs from time', () => {
    const base = { oneWayDistance: 15, oneWayTimeMinutes: 30, daysPerWeek: 5,
        weeksPerYear: 48, costPerUnitDistance: 0.5, hourlyValue: 25, parkingAndTollsPerDay: 5 };
    const full = calculateCommuteCost(base);
    assert.equal(full.annualCashCost, 4800);
    assert.equal(full.monthlyCashCost, 400);
    assert.equal(full.totalYearlyCommuteHours, 240);
    assert.equal(full.totalAnnualCost, 10800);
    const hybrid = calculateCommuteCost({ ...base, daysPerWeek: 3 });
    assert.equal(hybrid.annualCashCost, 2880);
    assert.equal(hybrid.totalAnnualCost, 6480);
    assert.equal(calculateCommuteCost({ ...base, daysPerWeek: 0 }).totalAnnualCost, 0);
});

test('contractor simple: known scenario', () => {
    const r = calculateContractorVsEmployee({ ...simpleBase });
    assert.equal(r.contractorGross, 75 * 40 * 46); // 138,000
    assert.equal(r.contractorNetEquivalent, 138000 * 0.7); // 96,600
    assert.equal(r.difference, 96600 - 100000);
});

test('contractor simple: overhead is applied exactly once to gross', () => {
    const r = calculateContractorVsEmployee({ ...simpleBase });
    assert.equal(r.contractorNetEquivalent, r.contractorGross * (1 - simpleBase.contractorOverheadPercent / 100));
});

test('contractor: unpaid weeks affect gross only, never the overhead percentage', () => {
    // Taking 2 more unpaid weeks must scale the result linearly through gross;
    // the effective overhead percent must be unchanged (no double-counting path).
    const fullYear = calculateContractorVsEmployee({ ...simpleBase, contractorWeeksPerYear: 48 });
    const withPto = calculateContractorVsEmployee({ ...simpleBase, contractorWeeksPerYear: 46 });
    assert.equal(fullYear.effectiveOverheadPercent, withPto.effectiveOverheadPercent);
    assert.ok(Math.abs(withPto.contractorNetEquivalent / fullYear.contractorNetEquivalent - 46 / 48) < 1e-9);
});

test('contractor: higher rate never lowers the result (monotonic)', () => {
    let prev = -Infinity;
    for (let rate = 10; rate <= 200; rate += 5) {
        const r = calculateContractorVsEmployee({ ...simpleBase, contractorHourlyRate: rate });
        assert.ok(r.contractorNetEquivalent >= prev, `net decreased at rate ${rate}`);
        prev = r.contractorNetEquivalent;
    }
});

test('contractor: break-even rate reproduces the employee salary (simple mode)', () => {
    const r = calculateContractorVsEmployee({ ...simpleBase });
    const atBreakEven = calculateContractorVsEmployee({ ...simpleBase, contractorHourlyRate: r.breakEvenRate });
    assert.ok(Math.abs(atBreakEven.contractorNetEquivalent - simpleBase.employeeSalary) < 0.01);
});

const advancedBase = {
    employeeSalary: 100000,
    contractorHourlyRate: 75,
    contractorHoursPerWeek: 40,
    contractorWeeksPerYear: 46,
    advancedMode: 1,
    extraPayrollTaxPercent: 7.65,
    lostPensionMatchPercent: 4,
    riskPremiumPercent: 3,
    healthInsuranceDeltaAnnual: 8000,
    adminSoftwareInsuranceAnnual: 3000,
    otherOperatingAnnual: 0
};

test('contractor advanced: components sum as documented', () => {
    const r = calculateContractorVsEmployee({ ...advancedBase });
    const gross = 75 * 40 * 46;
    const expected = gross * (1 - (7.65 + 4 + 3) / 100) - (8000 + 3000);
    assert.ok(Math.abs(r.contractorNetEquivalent - expected) < 0.01);
});

test('contractor advanced: break-even rate reproduces the employee salary', () => {
    const r = calculateContractorVsEmployee({ ...advancedBase });
    const atBreakEven = calculateContractorVsEmployee({ ...advancedBase, contractorHourlyRate: r.breakEvenRate });
    assert.ok(Math.abs(atBreakEven.contractorNetEquivalent - advancedBase.employeeSalary) < 0.01);
});

test('contractor advanced: ignores the simple overhead input', () => {
    const withStale = calculateContractorVsEmployee({ ...advancedBase, contractorOverheadPercent: 30 });
    const without = calculateContractorVsEmployee({ ...advancedBase });
    assert.equal(withStale.contractorNetEquivalent, without.contractorNetEquivalent);
});

const commuteBase = {
    oneWayDistance: 15,
    oneWayTimeMinutes: 30,
    daysPerWeek: 5,
    weeksPerYear: 48,
    costPerUnitDistance: 0.76,
    hourlyValue: 50
};

test('commute: known scenario', () => {
    const r = calculateCommuteCost({ ...commuteBase });
    assert.ok(Math.abs(r.fuelCost - 30 * 240 * 0.76) < 0.01); // 5,472
    assert.equal(r.implicitTimeCost, 1 * 240 * 50); // 12,000
    assert.ok(Math.abs(r.totalAnnualCost - (5472 + 12000)) < 0.01);
});

test('commute: cost is monotonic in per-unit rate and distance', () => {
    let prev = -Infinity;
    for (let c = 0.1; c <= 1.5; c += 0.1) {
        const r = calculateCommuteCost({ ...commuteBase, costPerUnitDistance: c });
        assert.ok(r.totalAnnualCost >= prev);
        prev = r.totalAnnualCost;
    }
    prev = -Infinity;
    for (let d = 1; d <= 60; d += 5) {
        const r = calculateCommuteCost({ ...commuteBase, oneWayDistance: d });
        assert.ok(r.totalAnnualCost >= prev);
        prev = r.totalAnnualCost;
    }
});
