/**
 * Cloud workspace layer (opt-in accounts).
 *
 * Everything here is lazy: supabase-js is only imported once the user
 * actually interacts with account features, so calculator and workflow
 * pages stay light for the (majority) local-only audience.
 *
 * Free-tier rule enforced by a DB unique constraint: one saved case per
 * decision type per user.
 */

import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/features.ts';
import type { DecisionCase } from '../../tools/decision/schema.ts';
import { parseStoredCase } from '../../tools/decision/schema.ts';

let clientPromise: Promise<SupabaseClient> | null = null;

export function getClient(): Promise<SupabaseClient> {
    if (!clientPromise) {
        clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
        );
    }
    return clientPromise;
}

export async function getSession(): Promise<Session | null> {
    const supabase = await getClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
}

/** Send a magic sign-in link (and one-time code) to the given email. */
export async function sendSignInEmail(email: string, redirectPath: string): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
    });
    return { error: error ? error.message : null };
}

/** Verify a one-time code typed from the sign-in email. */
export async function verifyEmailCode(email: string, code: string): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    return { error: error ? error.message : null };
}

export async function signOut(): Promise<void> {
    const supabase = await getClient();
    await supabase.auth.signOut();
}

export type Plan = 'free' | 'plus' | 'decision_pass';

/** Client-side plan lookup for UI gating only — real enforcement is in DB triggers/RLS. */
export async function getPlan(): Promise<Plan> {
    const supabase = await getClient();
    const { data } = await supabase
        .from('entitlements')
        .select('plan, status, current_period_end')
        .maybeSingle();
    if (!data || data.status !== 'active') return 'free';
    if (data.current_period_end && new Date(data.current_period_end) < new Date()) return 'free';
    return (data.plan as Plan) ?? 'free';
}

export interface CloudCaseMeta {
    id: string;
    decision_type: string;
    title: string;
    updated_at: string;
}

export async function listCases(): Promise<CloudCaseMeta[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
        .from('decision_cases')
        .select('id, decision_type, title, updated_at')
        .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
}

function friendlyDbError(message: string): string {
    if (message.includes('CASE_LIMIT_FREE')) {
        return 'Free accounts store one decision case. Delete the stored case under Account first (Plus will lift this limit).';
    }
    if (message.includes('CASE_LIMIT_MAX')) {
        return 'You have reached the maximum number of stored cases.';
    }
    if (message.includes('SHARE_REQUIRES_PLUS')) {
        return 'Share links are a Plus feature.';
    }
    return message;
}

/**
 * Save a case. With targetId, updates that stored case (always allowed);
 * without, inserts a new one (plan limits enforced by the database).
 * Returns the stored row id on success.
 */
export async function saveCase(
    userId: string,
    c: DecisionCase,
    targetId?: string | null,
): Promise<{ id: string | null; error: string | null }> {
    const supabase = await getClient();
    const row = {
        user_id: userId,
        decision_type: c.decisionType,
        title: c.title || 'Untitled decision',
        schema_version: c.version,
        data: c,
        updated_at: new Date().toISOString(),
    };
    if (targetId) {
        const { error } = await supabase.from('decision_cases').update(row).eq('id', targetId);
        if (!error) return { id: targetId, error: null };
        return { id: null, error: friendlyDbError(error.message) };
    }
    const { data, error } = await supabase.from('decision_cases').insert(row).select('id').single();
    if (error) return { id: null, error: friendlyDbError(error.message) };
    return { id: data.id, error: null };
}

export interface LoadedCase {
    id: string;
    decisionCase: DecisionCase;
}

/** Load the most recently updated stored case of a type. */
export async function loadCase(decisionType: string): Promise<LoadedCase | null> {
    const supabase = await getClient();
    const { data, error } = await supabase
        .from('decision_cases')
        .select('id, data')
        .eq('decision_type', decisionType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error || !data) return null;
    const parsed = parseStoredCase(data.data);
    return parsed ? { id: data.id, decisionCase: parsed } : null;
}

export async function loadCaseById(id: string): Promise<LoadedCase | null> {
    const supabase = await getClient();
    const { data, error } = await supabase.from('decision_cases').select('id, data').eq('id', id).maybeSingle();
    if (error || !data) return null;
    const parsed = parseStoredCase(data.data);
    return parsed ? { id: data.id, decisionCase: parsed } : null;
}

export async function deleteCase(id: string): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.from('decision_cases').delete().eq('id', id);
    return { error: error ? error.message : null };
}

/** Download every stored case as a JSON file (data portability). */
export async function exportAllCases(): Promise<void> {
    const supabase = await getClient();
    const { data, error } = await supabase.from('decision_cases').select('decision_type, title, data, created_at, updated_at');
    if (error) throw new Error(error.message);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), cases: data ?? [] }, null, 2)], {
        type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'econified-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------- shares

export interface ShareMeta {
    id: string;
    title: string;
    decision_type: string;
    created_at: string;
    expires_at: string | null;
    revoked: boolean;
}

/** Create a read-only share link (Plus — enforced by a DB trigger). */
export async function createShareLink(
    userId: string,
    c: DecisionCase,
    expiresDays: number | null = 90,
): Promise<{ url: string | null; error: string | null }> {
    const supabase = await getClient();
    const { data, error } = await supabase
        .from('shared_reports')
        .insert({
            user_id: userId,
            decision_type: c.decisionType,
            title: c.title || 'Untitled decision',
            snapshot: c,
            expires_at: expiresDays ? new Date(Date.now() + expiresDays * 86400_000).toISOString() : null,
        })
        .select('id')
        .single();
    if (error) return { url: null, error: friendlyDbError(error.message) };
    return { url: `${window.location.origin}/shared/?id=${data.id}`, error: null };
}

export async function listShares(): Promise<ShareMeta[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
        .from('shared_reports')
        .select('id, title, decision_type, created_at, expires_at, revoked')
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function revokeShare(id: string): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.from('shared_reports').update({ revoked: true }).eq('id', id);
    return { error: error ? error.message : null };
}

/** Public fetch of a shared report by exact token (works signed out). */
export async function fetchSharedReport(
    shareId: string,
): Promise<{ title: string; decisionCase: DecisionCase; created_at: string } | null> {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc('get_shared_report', { share_id: shareId });
    if (error || !data) return null;
    const parsed = parseStoredCase(data.snapshot);
    if (!parsed) return null;
    return { title: data.title, decisionCase: parsed, created_at: data.created_at };
}

// ---------------------------------------------------------------- versions

export interface VersionMeta {
    id: number;
    saved_at: string;
}

export async function listVersions(caseId: string): Promise<VersionMeta[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
        .from('case_versions')
        .select('id, saved_at')
        .eq('case_id', caseId)
        .order('saved_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
}

/** Restore a snapshot: writes the version's data back onto the stored case. */
export async function restoreVersion(caseId: string, versionId: number): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { data, error } = await supabase.from('case_versions').select('data').eq('id', versionId).single();
    if (error || !data) return { error: error?.message ?? 'Version not found' };
    const { error: updateError } = await supabase
        .from('decision_cases')
        .update({ data: data.data, updated_at: new Date().toISOString() })
        .eq('id', caseId);
    return { error: updateError ? updateError.message : null };
}

// ---------------------------------------------------------------- billing

export type CheckoutPlan = 'plus_monthly' | 'plus_annual' | 'decision_pass';

/** Start a Stripe Checkout session; resolves to a redirect URL. */
export async function startCheckout(plan: CheckoutPlan): Promise<{ url: string | null; error: string | null }> {
    const supabase = await getClient();
    const { data, error } = await supabase.functions.invoke('create-checkout', {
        method: 'POST',
        body: { plan },
    });
    if (error) return { url: null, error: error.message };
    return { url: data?.url ?? null, error: data?.url ? null : 'No checkout URL returned' };
}

/** Open the Stripe billing portal (cancel, invoices, payment method). */
export async function openBillingPortal(): Promise<{ url: string | null; error: string | null }> {
    const supabase = await getClient();
    const { data, error } = await supabase.functions.invoke('create-portal', { method: 'POST' });
    if (error) return { url: null, error: error.message };
    return { url: data?.url ?? null, error: data?.url ? null : 'No portal URL returned' };
}

/** Whether this user's plan is managed by Stripe (shows Manage billing). */
export async function hasStripeBilling(): Promise<boolean> {
    const supabase = await getClient();
    const { data } = await supabase.from('entitlements').select('source, stripe_customer_id').maybeSingle();
    return !!data?.stripe_customer_id && data.source === 'stripe';
}

/** Permanently delete the account and all stored data via the delete-account edge function. */
export async function deleteAccount(): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { error: error.message };
    await supabase.auth.signOut();
    return { error: null };
}
