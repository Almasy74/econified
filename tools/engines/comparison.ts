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
