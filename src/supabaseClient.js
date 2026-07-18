import { createClient } from '@supabase/supabase-js';

// =========================================================================
// 💡 PASTE YOUR SUPABASE CONFIGURATION HERE
// Replace the values below with your actual Supabase URL and Anon/Public Key.
// =========================================================================
export const SUPABASE_URL = "https://wekfavkjkmhoezmeakgx.supabase.co/rest/v1/";
export const SUPABASE_PUBLIC_KEY = "sb_publishable_EkuA_7V_ykqQD4ckOZm3SA__qIdQWjH";
// =========================================================================

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

