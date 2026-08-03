import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://gushnsrqyjziidhylrsn.supabase.co';
const SUPABASE_KEY = ((import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn('[TRANSCUNHA] Chave do Supabase não configurada no .env. Aplicação utilizando fallback local.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
