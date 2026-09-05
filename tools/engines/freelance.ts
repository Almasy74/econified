export function calculateFreelanceRateCalculator(inputs: Record<string, number>) {
    const effectiveAnnualRevenue = inputs.targetSalary * (1 + (inputs.overheadPercent / 100));
    const totalBillableHours = inputs.billableHoursPerWeek * inputs.weeksWorked;

    const freelanceHourlyRate = totalBillableHours > 0 ? effectiveAnnualRevenue / totalBillableHours : 0;
    const freelanceDayRate = freelanceHourlyRate * 8;

    return {
        freelanceHourlyRate,
        freelanceDayRate,
        effectiveAnnualRevenue
    };
}

export function calculateFreelanceRisk(inputs: Record<string, number>) {
    const monthlyBurn = inputs.monthlyBurnRate;
    const savings = inputs.savingsBuffer;

    const runwayMonths = monthlyBurn > 0 ? savings / monthlyBurn : Infinity;

    // Risk score 0-10 based on runway and gap probability
    // 6 months runway is "safe" (score 3), < 3 months is "risky" (score 7+)
    let riskScore = (10 - Math.min(10, runwayMonths * 1.5)) + (inputs.gapProbability / 10);
    riskScore = Math.min(10, Math.max(0, riskScore));

    // Minimum safe rate to cover burn + buffer for gaps
    const annualBurn = monthlyBurn * 12;
    const gapMultiplier = 1 + (inputs.gapProbability / 100);
    const minSafeAnnualRevenue = annualBurn * gapMultiplier;
    const billableHours = inputs.billableHoursPerYear ?? 1000;
    const minimumSafeRate = billableHours > 0 ? minSafeAnnualRevenue / billableHours : Infinity;

    return {
        runwayMonths,
        riskScore,
        minimumSafeRate
    };
}
