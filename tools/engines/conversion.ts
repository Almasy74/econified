export function calculateHourlyToSalary(inputs: Record<string, number>) {
  const annualSalary = inputs.hourlyRate * inputs.hoursPerWeek * inputs.weeksPerYear;
  const monthlySalary = annualSalary / 12;
  return { annualSalary, monthlySalary };
}

export function calculateSalaryToHourly(inputs: Record<string, number>) {
  const hourlyRate = inputs.annualSalary / (inputs.hoursPerWeek * inputs.weeksPerYear);
  return { hourlyRate };
}

export function calculateFreelanceRateCalculator(inputs: Record<string, number>) {
  const freelanceHourlyRate = inputs.targetSalary / (inputs.billableHoursPerWeek * inputs.weeksWorked);
  return { freelanceHourlyRate };
}
