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
