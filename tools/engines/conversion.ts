export function calculateHourlyToSalary(inputs: Record<string, number>) {
  const annualSalary = inputs.hourlyRate * inputs.hoursPerWeek * inputs.weeksPerYear;
  const monthlySalary = annualSalary / 12;
  return { annualSalary, monthlySalary };
}

export function calculateSalaryToHourly(inputs: Record<string, number>) {
  const hourlyRate = inputs.annualSalary / (inputs.hoursPerWeek * inputs.weeksPerYear);
  return { hourlyRate };
}

export function calculateMonthlyToYearly(inputs: Record<string, number>) {
  const annualSalary = inputs.monthlySalary * inputs.monthsWorked;
  return { annualSalary };
}

export function calculateDailyRateToSalary(inputs: Record<string, number>) {
  const annualSalary = inputs.dailyRate * inputs.daysPerWeek * inputs.weeksPerYear;
  const monthlySalary = annualSalary / 12;
  return { annualSalary, monthlySalary };
}

export function calculateAnnualSalaryToMonthly(inputs: Record<string, number>) {
  const monthlySalary = inputs.annualSalary / inputs.monthsPaid;
  return { monthlySalary };
}

export function calculateWeeklyToAnnualPay(inputs: Record<string, number>) {
  const annualSalary = inputs.weeklyPay * inputs.weeksWorked;
  const monthlySalary = annualSalary / 12;
  return { annualSalary, monthlySalary };
}
