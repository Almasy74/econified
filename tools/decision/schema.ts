import { z } from 'zod';

/**
 * Decision-case domain model (v1) — Job Offer decision type.
 *
 * Design notes:
 * - All monetary fields within one case share a single currency
 *   (case.assumptions.currency). The engine is currency-agnostic.
 * - The schema is versioned so locally saved cases can be migrated.
 * - Defaults here are storage defaults only; user-visible defaults are
 *   labeled as estimates in the UI. High-impact assumptions (bonus payout,
 *   equity risk discount, value of personal time) are always shown, never
 *   silently applied.
 */

export const SCHEMA_VERSION = 1;

const money = z.number().finite().min(0);
const pct = z.number().finite().min(0).max(100);

export const compensationSchema = z.object({
    /** Annual gross base salary. */
    baseSalary: money.default(0),
    /** Contractually guaranteed annual bonus / 13th month, absolute amount. */
    guaranteedBonus: money.default(0),
    /** Target (variable) bonus as % of base. */
    targetBonusPercent: z.number().finite().min(0).max(300).default(0),
    /** Expected payout of the target bonus, % (100 = full payout). */
    bonusPayoutPercent: pct.default(100),
    /** Employer pension / 401k match as % of base. */
    pensionMatchPercent: pct.default(0),
    /** Other guaranteed recurring value: stipends, allowances, employer-paid health premiums. */
    otherGuaranteedAnnual: money.default(0),
    /** One-time signing bonus (amortized over expected tenure by the engine). */
    signingBonus: money.default(0),
    /** Annual vesting equity value at face value (grant / vesting years). */
    equityAnnual: money.default(0),
    /** Risk discount applied to equity, % (100 = value equity at zero). */
    equityRiskDiscountPercent: pct.default(0),
});

export const timeSchema = z.object({
    /** Realistic expected hours actually worked per week. */
    weeklyHours: z.number().finite().min(0).max(100).default(40),
    /** Days per week required onsite (commuting days). */
    onsiteDaysPerWeek: z.number().finite().min(0).max(7).default(0),
    /** One-way commute, minutes (door to door). */
    commuteMinutesOneWay: z.number().finite().min(0).max(600).default(0),
    /** Paid time off, working days per year. */
    ptoDays: z.number().finite().min(0).max(100).default(25),
});

export const costsSchema = z.object({
    /** Out-of-pocket cost per onsite day: transport, parking, lunch delta. */
    commuteCostPerDay: money.default(0),
    /** Other recurring annual work costs: wardrobe, equipment, childcare delta. */
    otherAnnualWorkCosts: money.default(0),
    /** One-time switching cost: relocation, lost unvested equity, notice-period gap. */
    oneTimeTransitionCost: money.default(0),
});

export const scenarioSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(60),
    kind: z.enum(['current', 'offer']),
    included: z.boolean().default(true),
    comp: compensationSchema,
    time: timeSchema,
    costs: costsSchema,
});

export const sharedAssumptionsSchema = z.object({
    /** Display currency code; all case values are entered in this currency. */
    currency: z.string().length(3).default('USD'),
    /**
     * What one hour of your personal time is worth to you, used to price
     * commute time. null = not set; time is then reported but not ranked.
     */
    hourlyTimeValue: z.number().finite().min(0).nullable().default(null),
    /** Years you expect to stay; amortizes signing bonus and transition costs. */
    expectedTenureYears: z.number().finite().min(0.5).max(20).default(3),
    /** Two scenarios within this % of each other are reported as a close call. */
    closeCallPercent: z.number().finite().min(0).max(25).default(2.5),
});

export const decisionCaseSchema = z.object({
    version: z.literal(SCHEMA_VERSION),
    decisionType: z.literal('job-offer'),
    title: z.string().max(120).default(''),
    createdAt: z.string(),
    updatedAt: z.string(),
    decisionDeadline: z.string().nullable().default(null),
    assumptions: sharedAssumptionsSchema,
    scenarios: z.array(scenarioSchema).min(1).max(3),
});

export type Compensation = z.infer<typeof compensationSchema>;
export type TimeProfile = z.infer<typeof timeSchema>;
export type WorkCosts = z.infer<typeof costsSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type SharedAssumptions = z.infer<typeof sharedAssumptionsSchema>;
export type DecisionCase = z.infer<typeof decisionCaseSchema>;

/** Build an empty scenario with storage defaults applied. */
export function emptyScenario(id: string, label: string, kind: Scenario['kind'], included = true): Scenario {
    return scenarioSchema.parse({
        id,
        label,
        kind,
        included,
        comp: {},
        time: {},
        costs: {},
    });
}

/** Build a fresh case. Timestamps are supplied by the caller (engine stays deterministic). */
export function emptyCase(nowIso: string): DecisionCase {
    return decisionCaseSchema.parse({
        version: SCHEMA_VERSION,
        decisionType: 'job-offer',
        title: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        decisionDeadline: null,
        assumptions: {},
        scenarios: [
            emptyScenario('current', 'Current job', 'current', true),
            emptyScenario('offer-a', 'Offer A', 'offer', true),
            emptyScenario('offer-b', 'Offer B', 'offer', false),
        ],
    });
}

/**
 * Parse a possibly-stale stored case. Returns null rather than throwing so
 * callers can fall back to a fresh case without losing the page.
 */
export function parseStoredCase(raw: unknown): DecisionCase | null {
    const result = decisionCaseSchema.safeParse(raw);
    return result.success ? result.data : null;
}
