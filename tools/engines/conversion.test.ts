import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePTOValue } from './conversion.ts';

test('PTO is included in salary; more leave increases pay per worked hour', () => {
    const base = { annualSalary: 80000, ptoDays: 15, holidays: 10, hoursPerDay: 8 };
    const a = calculatePTOValue(base);
    const b = calculatePTOValue({ ...base, ptoDays: 25 });
    assert.ok(Math.abs(a.totalPTOValue - 7692.3076923) < 0.01);
    assert.ok(Math.abs(a.effectiveHourlyRate - 42.55319149) < 0.01);
    assert.ok(Math.abs(b.effectiveHourlyRate - 44.44444444) < 0.01);
    assert.equal('realSalary' in a, false);
    assert.equal(a.valuePerDay, b.valuePerDay);
});
test('PTO handles no leave without producing infinite hourly pay', () => {
    const base = { annualSalary: 104000, ptoDays: 0, holidays: 0, hoursPerDay: 8 };
    assert.equal(calculatePTOValue(base).effectiveHourlyRate, 50);
    assert.equal(calculatePTOValue({ ...base, ptoDays: 260 }).effectiveHourlyRate, 0);
});
