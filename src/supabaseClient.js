import { createClient } from '@supabase/supabase-js';

// =========================================================================
// 💡 PASTE YOUR SUPABASE CONFIGURATION HERE
// Replace the values below with your actual Supabase URL and Anon/Public Key.
// =========================================================================
export const SUPABASE_URL = "https://wekfavkjkmhoezmeakgx.supabase.co";
export const SUPABASE_PUBLIC_KEY = "sb_publishable_EkuA_7V_ykqQD4ckOZm3SA__qIdQWjH";
// =========================================================================

// Clean up the URL in case the REST API endpoint is pasted instead of the Project URL
const cleanUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').trim();

export const supabase = createClient(cleanUrl, SUPABASE_PUBLIC_KEY);

