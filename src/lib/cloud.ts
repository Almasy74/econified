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

/** Upsert the user's saved case for this decision type (free tier: one per type). */
export async function saveCase(userId: string, c: DecisionCase): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.from('decision_cases').upsert(
        {
            user_id: userId,
            decision_type: c.decisionType,
            title: c.title || 'Untitled decision',
            schema_version: c.version,
            data: c,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,decision_type' },
    );
    return { error: error ? error.message : null };
}

export async function loadCase(decisionType: string): Promise<DecisionCase | null> {
    const supabase = await getClient();
    const { data, error } = await supabase
        .from('decision_cases')
        .select('data')
        .eq('decision_type', decisionType)
        .maybeSingle();
    if (error || !data) return null;
    return parseStoredCase(data.data);
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

/** Permanently delete the account and all stored data via the delete-account edge function. */
export async function deleteAccount(): Promise<{ error: string | null }> {
    const supabase = await getClient();
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { error: error.message };
    await supabase.auth.signOut();
    return { error: null };
}
