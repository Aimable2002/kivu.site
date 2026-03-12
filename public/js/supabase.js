// supabase.js
// Single source of truth for the Supabase client
// Imported by all feature JS files
// The anon key is safe to expose — RLS policies are the security layer

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://zujnupfixfexwqedfgpn.supabase.co';   // replace with your project URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1am51cGZpeGZleHdxZWRmZ3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTYzNjQsImV4cCI6MjA4ODgzMjM2NH0.zfJv8Yi9q2KXvFIhAJB4oCALw5-apV6fGYAe5ES9rvM';       // replace with your anon/public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);