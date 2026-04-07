// supabase.js
// Single source of truth for the Supabase client
// Imported by all feature JS files
// The anon key is safe to expose — RLS policies are the security layer

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://zujnupfixfexwqedfgpn.supabase.co';   // replace with your project URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1am51cGZpeGZleHdxZWRmZ3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTYzNjQsImV4cCI6MjA4ODgzMjM2NH0.zfJv8Yi9q2KXvFIhAJB4oCALw5-apV6fGYAe5ES9rvM';       // replace with your anon/public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: { eventsPerSecond: 10 },
    },
});

// ─────────────────────────────────────────────────────────────────────
//  Helper: format RWF numbers
// ─────────────────────────────────────────────────────────────────────
export function formatRWF(n) {
    return Number(n || 0).toLocaleString() + ' RWF';
}

// ─────────────────────────────────────────────────────────────────────
//  Helper: normalize Rwandan phone → WhatsApp format
// ─────────────────────────────────────────────────────────────────────
export function normalizePhone(raw) {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('250')) return '+' + digits;
    if (digits.startsWith('0'))   return '+250' + digits.slice(1);
    if (digits.length === 9)      return '+250' + digits;
    return '+' + digits;
}