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

export function calculateJobOfferComparison(inputs: Record<string, number>) {
    const calcTC = (base: number, bonus: number, pension: number, equity: number, stipend: number, health: number) => {
        return base * (1 + (bonus / 100)) + (base * (pension / 100)) + equity + stipend + health;
    };

    const tcOfferA = calcTC(
        inputs.baseSalaryA,
        inputs.bonusPercentA,
        inputs.pensionMatchA,
        inputs.equityA,
        inputs.remoteStipendA,
        inputs.healthBenefitsA
    );

    const tcOfferB = calcTC(
        inputs.baseSalaryB,
        inputs.bonusPercentB,
        inputs.pensionMatchB,
        inputs.equityB,
        inputs.remoteStipendB,
        inputs.healthBenefitsB
    );

    const difference = tcOfferA - tcOfferB;
    const differencePercent = tcOfferB > 0 ? (difference / tcOfferB) * 100 : 0;

    return {
        tcOfferA,
        tcOfferB,
        difference,
        differencePercent
    };
}

export function calculateBurnoutCost(inputs: Record<string, number>) {
    const weeklyHours = inputs.hoursPerWeek;
    const optimalHours = inputs.optimalHours;
    const salary = inputs.salary;

    const hourlyRate = salary / (52 * optimalHours);
    const extraHoursPerWeek = Math.max(0, weeklyHours - optimalHours);

    const unpaidLaborValue = extraHoursPerWeek * hourlyRate * 52;
    const effectiveHourlyRate = salary / (52 * weeklyHours);
    const hiddenUnpaidLabor = extraHoursPerWeek * 52;

    return {
        unpaidLaborValue,
        effectiveHourlyRate,
        hiddenUnpaidLabor
    };
}

export function calculatePromotionValue(inputs: Record<string, number>) {
    const currentSalary = inputs.currentSalary;
    const newSalary = inputs.newSalary;
    const extraHoursPerWeek = inputs.extraHours;
    const respHoursPerWeek = inputs.extraResponsibilityHours;
    const commuteIncrease = inputs.commuteIncrease;

    const baseHours = 40;
    const currentYearlyHours = baseHours * 52;
    const newYearlyHours = (baseHours + extraHoursPerWeek + respHoursPerWeek) * 52;

    const currentHourly = currentSalary / currentYearlyHours;
    const newEffectiveHourly = (newSalary - commuteIncrease) / newYearlyHours;

    const increaseAmount = newSalary - currentSalary;
    const percentRealIncrease = currentHourly > 0 ? ((newEffectiveHourly - currentHourly) / currentHourly) * 100 : 0;

    const breakEvenSalary = (currentHourly * newYearlyHours) + commuteIncrease;

    return {
        newEffectiveHourly,
        percentRealIncrease,
        breakEvenSalary
    };
}


export function calculateRemoteVsOffice(inputs: Record<string, number>) {
    const remoteDays = inputs.remoteDays;
    const annualCommuteCost = inputs.commuteCost;
    const officeDays = 5 - remoteDays;

    const foodCost = inputs.foodCoffeeCost * officeDays * 48;
    const rentSavings = inputs.rentDifference * 12;
    const timeValue = inputs.timeSavedHours * officeDays * 48 * 25;

    const realSalaryAdjustment = annualCommuteCost + foodCost + rentSavings + timeValue;
    const remoteEquivalentRaise = inputs.baseSalary > 0 ? (realSalaryAdjustment / inputs.baseSalary) * 100 : 0;

    return {
        realSalaryAdjustment,
        remoteEquivalentRaise
    };
}

export function calculateQuitDate(inputs: Record<string, number>) {
    const {
        currentSavings,
        monthlyExpenses,
        annualSalary,
        savingsRate,
        expectedReturn = 5,
        sideIncome = 0
    } = inputs;

    const monthlyNetSalary = (annualSalary / 12) * 0.75; // Rough estimate after tax
    const monthlySavingsFromSalary = monthlyNetSalary * (savingsRate / 100);
    const totalMonthlySavings = monthlySavingsFromSalary + sideIncome;

    const safetyTarget = monthlyExpenses * 6;
    const independenceTarget = monthlyExpenses * 12 * 25;

    const r = (expectedReturn / 100) / 12;

    function monthsToTarget(target: number) {
        if (currentSavings >= target) return 0;
        if (totalMonthlySavings <= 0) return Infinity;
        if (r === 0) return (target - currentSavings) / totalMonthlySavings;

        const n = Math.log((target * r + totalMonthlySavings) / (currentSavings * r + totalMonthlySavings)) / Math.log(1 + r);
        return Math.max(0, n);
    }

    const monthsToSafety = monthsToTarget(safetyTarget);
    const monthsToIndependence = monthsToTarget(independenceTarget);

    return {
        monthsToSafety: Math.round(monthsToSafety * 10) / 10,
        monthsToIndependence: Math.round(monthsToIndependence * 10) / 10,
        currentRunwayMonths: Math.round((currentSavings / monthlyExpenses) * 10) / 10,
        requiredSavingsForSafety: safetyTarget
    };
}

export function calculateLayoffSurvival(inputs: Record<string, number>) {
    const {
        savings,
        monthlyExpenses,
        severance = 0,
        unemploymentBenefits = 0,
        debtPayments = 0
    } = inputs;

    const totalMonthlyBurn = monthlyExpenses + debtPayments;
    const initialBuffer = savings + severance;
    const benefitDuration = 6;
    const totalBenefits = unemploymentBenefits * benefitDuration;

    const totalFinancialRunway = initialBuffer + totalBenefits;
    const survivalMonths = totalFinancialRunway / totalMonthlyBurn;

    let riskLevel = "Low";
    if (survivalMonths < 3) riskLevel = "Critical";
    else if (survivalMonths < 6) riskLevel = "High";
    else if (survivalMonths < 12) riskLevel = "Medium";

    return {
        survivalMonths: Math.round(survivalMonths * 10) / 10,
        riskLevel,
        monthlyBurn: totalMonthlyBurn,
        recommendedEmergencyFund: totalMonthlyBurn * 6
    };
}
