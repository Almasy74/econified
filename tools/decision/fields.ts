/**
 * Field metadata for the job-offer decision workflow.
 * Shared by the Astro template (server render) and the client script
 * (serialization), so labels, hints and constraints stay in one place.
 */

export type FieldGroup = 'comp' | 'time' | 'costs';
export type FieldUnit = 'money' | 'percent' | 'hours' | 'days' | 'minutes' | 'years';

export interface FieldDef {
    group: FieldGroup;
    key: string;
    label: string;
    hint?: string;
    unit: FieldUnit;
    min: number;
    max?: number;
    step?: number;
    /** Value pre-filled in the form. Always visible to the user, never silent. */
    defaultValue?: number;
    /** Fields required before a scenario can be compared. */
    required?: boolean;
}

export interface FieldSection {
    id: string;
    title: string;
    intro: string;
    fields: FieldDef[];
}

export const SCENARIO_SECTIONS: FieldSection[] = [
    {
        id: 'guaranteed',
        title: 'Guaranteed pay',
        intro: 'Contractually committed value only. Anything that depends on performance or company results goes under variable pay.',
        fields: [
            { group: 'comp', key: 'baseSalary', label: 'Base salary (annual, gross)', unit: 'money', min: 0, required: true },
            { group: 'comp', key: 'guaranteedBonus', label: 'Guaranteed bonus / 13th month (annual)', unit: 'money', min: 0 },
            { group: 'comp', key: 'pensionMatchPercent', label: 'Employer pension / 401k match (% of base)', unit: 'percent', min: 0, max: 100, step: 0.5 },
            { group: 'comp', key: 'otherGuaranteedAnnual', label: 'Stipends, allowances, employer-paid premiums (annual)', hint: 'Anything paid to you or on your behalf every year regardless of performance.', unit: 'money', min: 0 },
            { group: 'comp', key: 'signingBonus', label: 'Signing bonus (one-time)', hint: 'Spread over your expected tenure in the results.', unit: 'money', min: 0 },
        ],
    },
    {
        id: 'variable',
        title: 'Variable and uncertain pay',
        intro: 'Value that is promised but not guaranteed. The estimates below are discounted for risk in the results.',
        fields: [
            { group: 'comp', key: 'targetBonusPercent', label: 'Target bonus (% of base)', unit: 'percent', min: 0, max: 300, step: 0.5 },
            { group: 'comp', key: 'bonusPayoutPercent', label: 'Expected bonus payout (%)', hint: '100 = you expect the full target every year. Ask what the team actually received the last 2–3 years.', unit: 'percent', min: 0, max: 100, step: 1, defaultValue: 100 },
            { group: 'comp', key: 'equityAnnual', label: 'Equity vesting per year (face value)', hint: 'Total grant divided by vesting years.', unit: 'money', min: 0 },
            { group: 'comp', key: 'equityRiskDiscountPercent', label: 'Equity risk discount (%)', hint: '0 = liquid public shares at face value. 50–90 is common for private companies. 100 = value equity at zero.', unit: 'percent', min: 0, max: 100, step: 5, defaultValue: 0 },
        ],
    },
    {
        id: 'time',
        title: 'Time and working pattern',
        intro: 'Use realistic numbers, not contractual ones. The gap between the two is often where a good offer turns bad.',
        fields: [
            { group: 'time', key: 'weeklyHours', label: 'Realistic hours worked per week', unit: 'hours', min: 0, max: 100, step: 0.5, defaultValue: 40, required: true },
            { group: 'time', key: 'onsiteDaysPerWeek', label: 'Days per week onsite', unit: 'days', min: 0, max: 7, step: 1, defaultValue: 0 },
            { group: 'time', key: 'commuteMinutesOneWay', label: 'Commute one way (minutes, door to door)', unit: 'minutes', min: 0, max: 600, step: 5, defaultValue: 0 },
            { group: 'time', key: 'ptoDays', label: 'Paid time off (days per year)', unit: 'days', min: 0, max: 100, step: 1, defaultValue: 25 },
        ],
    },
    {
        id: 'costs',
        title: 'Costs',
        intro: 'What this job costs you out of pocket.',
        fields: [
            { group: 'costs', key: 'commuteCostPerDay', label: 'Cost per onsite day', hint: 'Transport, parking, the lunch you would not buy at home.', unit: 'money', min: 0 },
            { group: 'costs', key: 'otherAnnualWorkCosts', label: 'Other recurring work costs (annual)', unit: 'money', min: 0 },
            { group: 'costs', key: 'oneTimeTransitionCost', label: 'One-time switching cost', hint: 'Relocation, unvested equity you would walk away from, an unpaid notice gap.', unit: 'money', min: 0 },
        ],
    },
];

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NOK'] as const;
