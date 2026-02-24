import {
    calculateHourlyToSalary,
    calculateSalaryToHourly,
    calculateMonthlyToYearly,
    calculateDailyRateToSalary,
    calculateAnnualSalaryToMonthly,
    calculateWeeklyToAnnualPay
} from '../../tools/engines/conversion.ts';

import {
    calculateFreelanceRateCalculator
} from '../../tools/engines/freelance.ts';

import {
    calculateContractorVsEmployee,
    calculateRemotePayAdjuster
} from '../../tools/engines/comparison.ts';

export const engineMap: Record<string, (inputs: Record<string, number>) => Record<string, number>> = {
    'hourly-to-salary': calculateHourlyToSalary,
    'salary-to-hourly': calculateSalaryToHourly,
    'freelance-rate-calculator': calculateFreelanceRateCalculator,
    'monthly-to-yearly-salary': calculateMonthlyToYearly,
    'daily-rate-to-salary': calculateDailyRateToSalary,
    'annual-salary-to-monthly': calculateAnnualSalaryToMonthly,
    'weekly-to-annual-pay': calculateWeeklyToAnnualPay,
    'contractor-vs-employee': calculateContractorVsEmployee,
    'remote-pay-adjuster': calculateRemotePayAdjuster
};
