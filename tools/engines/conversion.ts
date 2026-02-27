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

export function calculateBiweeklyToAnnual(inputs: Record<string, number>) {
  const annualSalary = inputs.biweeklyPay * 26;
  const monthlySalary = annualSalary / 12;
  return { annualSalary, monthlySalary };
}

export function calculatePTOValue(inputs: Record<string, number>) {
  const annualSalary = inputs.annualSalary;
  const ptoDays = inputs.ptoDays;
  const holidays = inputs.holidays;
  const hoursPerDay = inputs.hoursPerDay;

  const totalPaidDays = ptoDays + holidays;
  const workDaysPerYear = 260; // Standard work days in a year (5 days * 52 weeks)

  const valuePerDay = annualSalary / workDaysPerYear;
  const totalPTOValue = totalPaidDays * valuePerDay;
  const realSalary = annualSalary + totalPTOValue;

  return {
    valuePerDay,
    totalPTOValue,
    realSalary
  };
}

export function calculateMeetingCost(inputs: Record<string, number>) {
  const {
    participantCount,
    avgAnnualSalary,
    meetingDurationMinutes,
    frequencyPerWeek
  } = inputs;

  const hourlyRate = avgAnnualSalary / 2080;
  const costPerPersonPerMinute = hourlyRate / 60;
  const costPerMeeting = participantCount * costPerPersonPerMinute * meetingDurationMinutes;
  const annualCost = costPerMeeting * frequencyPerWeek * 52;

  return {
    costPerMeeting: Math.round(costPerMeeting * 100) / 100,
    annualMeetingCost: Math.round(annualCost * 100) / 100,
    costPerDecision: Math.round((costPerMeeting * 1.2) * 100) / 100
  };
}
