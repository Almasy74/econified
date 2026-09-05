import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRemoteVsOffice, calculateLayoffSurvival, calculateQuitDate, calculateBurnoutCost, calculatePromotionValue } from './comparison.ts';
import { calculateMeetingCost } from './conversion.ts';
import { calculateFreelanceRisk, calculateFreelanceRateCalculator } from './freelance.ts';

test('remote days increase avoided costs, with cash separate from time', () => {
    const base = { baseSalary: 100000, remoteDays: 3, commuteCost: 3000, rentDifference: 0,
        foodCoffeeCost: 15, timeSavedHours: 1.5, hourlyValue: 25, homeOfficeAnnualCost: 600 };
    const r = calculateRemoteVsOffice(base);
    assert.equal(r.annualCashSavings, 3360);
    assert.equal(r.timeValue, 5400);
    assert.equal(r.realSalaryAdjustment, 8760);
    assert.equal(calculateRemoteVsOffice({ ...base, remoteDays: 0 }).realSalaryAdjustment, 0);
    assert.equal(calculateRemoteVsOffice({ ...base, remoteDays: 5 }).annualCashSavings, 6000);
    assert.equal(calculateRemoteVsOffice({ ...base, hourlyValue: 0 }).realSalaryAdjustment, 3360);
});

test('layoff cannot spend future benefits after cash runs out', () => {
    const base = { savings: 1000, monthlyExpenses: 3000, debtPayments: 0, severance: 0,
        unemploymentBenefits: 1000, benefitDurationMonths: 6 };
    assert.equal(calculateLayoffSurvival(base).survivalMonths, 0.5);
    assert.equal(calculateLayoffSurvival({ ...base, savings: 12000 }).survivalMonths, 6);
    assert.equal(calculateLayoffSurvival({ ...base, savings: 18000, unemploymentBenefits: 0 }).survivalMonths, 6);
    assert.equal(calculateLayoffSurvival({ ...base, savings: 0, unemploymentBenefits: 3000 }).survivalMonths, 6);
    assert.equal(calculateLayoffSurvival({ ...base, savings: 6000, benefitDurationMonths: 0 }).survivalMonths, 2);
});

test('savings target uses adjustable deductions and handles growth without contributions', () => {
    const base = { currentSavings: 10000, monthlyExpenses: 3000, annualSalary: 80000,
        savingsRate: 20, effectiveTaxPercent: 25, expectedReturn: 0, sideIncome: 0 };
    assert.equal(calculateQuitDate(base).monthsToSafety, 8);
    assert.equal(calculateQuitDate({ ...base, effectiveTaxPercent: 100 }).monthsToSafety, Infinity);
    const growth = calculateQuitDate({ ...base, savingsRate: 0, expectedReturn: 5 });
    assert.ok(Number.isFinite(growth.monthsToSafety));
    assert.ok(growth.monthsToSafety > 100);
});

test('published meeting, extra hours, promotion and freelance examples agree with engines', () => {
    assert.equal(calculateMeetingCost({ participantCount: 8, avgAnnualSalary: 90000,
        meetingDurationMinutes: 60, frequencyPerWeek: 1 }).annualMeetingCost, 18000);
    assert.equal(calculateBurnoutCost({ salary: 90000, hoursPerWeek: 50, optimalHours: 40 }).unpaidLaborValue, 22500);
    assert.equal(calculatePromotionValue({ currentSalary: 85000, newSalary: 95000,
        extraHours: 5, extraResponsibilityHours: 2, commuteIncrease: 500 }).breakEvenSalary, 100375);
    assert.equal(calculateFreelanceRisk({ monthlyBurnRate: 4000, savingsBuffer: 24000,
        gapProbability: 20, billableHoursPerYear: 1000 }).minimumSafeRate, 57.6);
    const rate = calculateFreelanceRateCalculator({ targetSalary: 100000, overheadPercent: 30,
        billableHoursPerWeek: 25, weeksWorked: 46 });
    assert.equal(rate.effectiveAnnualRevenue, 130000);
    assert.ok(Math.abs(rate.freelanceHourlyRate - 113.043478) < 0.00001);
});
