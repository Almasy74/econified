import {
    calculateHourlyToSalary,
    calculateSalaryToHourly,
    calculateMonthlyToYearly,
    calculateDailyRateToSalary,
    calculateAnnualSalaryToMonthly,
    calculateWeeklyToAnnualPay,
    calculateBiweeklyToAnnual,
    calculatePTOValue
} from '../../tools/engines/conversion.ts';

import {
    calculateFreelanceRateCalculator,
    calculateFreelanceRisk
} from '../../tools/engines/freelance.ts';

import {
    calculateContractorVsEmployee,
    calculateRemotePayAdjuster,
    calculateCommuteCost,
    calculateSalaryIncrease,
    calculateJobOfferComparison,
    calculateBurnoutCost,
    calculatePromotionValue,
    calculateRemoteVsOffice
} from '../../tools/engines/comparison.ts';

export const engineMap: Record<string, (inputs: Record<string, number>) => Record<string, number>> = {
    'hourly-to-salary': calculateHourlyToSalary,
    'salary-to-hourly': calculateSalaryToHourly,
    'freelance-rate-calculator': calculateFreelanceRateCalculator,
    'monthly-to-yearly-salary': calculateMonthlyToYearly,
    'daily-rate-to-salary': calculateDailyRateToSalary,
    'annual-salary-to-monthly': calculateAnnualSalaryToMonthly,
    'weekly-to-annual-pay': calculateWeeklyToAnnualPay,
    'biweekly-to-annual-pay': calculateBiweeklyToAnnual,
    'contractor-vs-employee': calculateContractorVsEmployee,
    'remote-pay-adjuster': calculateRemotePayAdjuster,
    'commute-cost-calculator': calculateCommuteCost,
    'salary-increase-calculator': calculateSalaryIncrease,
    'pto-value-calculator': calculatePTOValue,
    'job-offer-comparison': calculateJobOfferComparison,
    'burnout-cost-calculator': calculateBurnoutCost,
    'promotion-value-calculator': calculatePromotionValue,
    'remote-vs-office-calculator': calculateRemoteVsOffice,
    'freelance-risk-calculator': calculateFreelanceRisk
};
