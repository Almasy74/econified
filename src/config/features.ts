/**
 * Feature flags and public runtime configuration.
 *
 * The Supabase URL and publishable key are public by design — all data
 * access is protected by Row Level Security on the server. Secrets never
 * belong in this file.
 */

export const FEATURES = {
    /** Optional accounts + cloud-saved decision cases (Phase 4). */
    ACCOUNTS_ENABLED: true,
    /** Paid entitlements UI (Phase 5/6). */
    BILLING_ENABLED: true,
} as const;

export const SUPABASE_URL = 'https://ppaudjummnonvyynswza.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0f5W-PWtFhqP7opzzKhd-w_nimpDSfn';

/**
 * Pricing hypotheses (Phase 6). Display-only until BILLING_ENABLED;
 * authoritative prices live in Stripe, entitlements in the database.
 */
export const PRICING = {
    plusMonthlyUsd: 14,
    plusAnnualUsd: 89,
    decisionPassUsd: 19,
} as const;
