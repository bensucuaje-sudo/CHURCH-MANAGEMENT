import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
