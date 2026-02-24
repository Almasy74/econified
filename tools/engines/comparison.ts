export function calculateContractorVsEmployee(inputs: Record<string, number>) {
    const employeeTotalPay = inputs.employeeSalary;

    const contractorGross = inputs.contractorHourlyRate * inputs.contractorHoursPerWeek * inputs.contractorWeeksPerYear;

    // Subtract overhead / taxes / lost benefits proxy (e.g., 30%)
    const contractorOverhead = contractorGross * (inputs.contractorOverheadPercent / 100);
    const contractorNetEquivalent = contractorGross - contractorOverhead;

    const difference = contractorNetEquivalent - employeeTotalPay;
    const differencePercent = (difference / employeeTotalPay) * 100;

    return {
        employeeTotalPay,
        contractorGross,
        contractorNetEquivalent,
        difference,
        differencePercent
    };
}

export function calculateRemotePayAdjuster(inputs: Record<string, number>) {
    const basePay = inputs.baseSalary;

    const ratio = inputs.targetIndex / inputs.homeIndex;
    const adjustedPay = basePay * ratio;

    const difference = adjustedPay - basePay;
    const differencePercent = (difference / basePay) * 100;

    return {
        adjustedPay,
        difference,
        differencePercent
    };
}

export function calculateCommuteCost(inputs: Record<string, number>) {
    const dailyDistance = inputs.oneWayDistance * 2;
    const dailyTimeHours = (inputs.oneWayTimeMinutes * 2) / 60;
    const yearlyWorkDays = inputs.daysPerWeek * inputs.weeksPerYear;

    const totalYearlyDistance = dailyDistance * yearlyWorkDays;
    const totalYearlyCommuteHours = dailyTimeHours * yearlyWorkDays;

    const fuelCost = totalYearlyDistance * inputs.costPerUnitDistance;
    const implicitTimeCost = totalYearlyCommuteHours * inputs.hourlyValue;
    const totalAnnualCost = fuelCost + implicitTimeCost;

    return {
        fuelCost,
        implicitTimeCost,
        totalAnnualCost
    };
}

export function calculateSalaryIncrease(inputs: Record<string, number>) {
    const increaseAmount = inputs.newSalary - inputs.oldSalary;
    const increasePercent = (increaseAmount / inputs.oldSalary) * 100;
    const monthlyIncrease = increaseAmount / 12;

    return {
        increaseAmount,
        increasePercent,
        monthlyIncrease
    };
}
