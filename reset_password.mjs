import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gushnsrqyjziidhylrsn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const SQL = `
-- Reset da senha para dllogtransporte15@gmail.com no Supabase SQL Editor:
INSERT INTO app_users (id, email, name, profile, password, active, require_password_change)
VALUES (
  gen_random_uuid(),
  'dllogtransporte15@gmail.com',
  'DL Logística',
  'Diretor',
  'ANITA2020',
  true,
  false
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = 'ANITA2020',
  active = true,
  require_password_change = false,
  password_updated_at = NOW();
`;

console.log('=== SQL PARA EXECUTAR NO SUPABASE SQL EDITOR ===');
console.log('Link: https://supabase.com/dashboard/project/gushnsrqyjziidhylrsn/sql/new');
console.log('');
console.log(SQL);

if (SUPABASE_KEY && !SUPABASE_KEY.includes('placeholder')) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  supabase
    .from('app_users')
    .upsert({
      email: 'dllogtransporte15@gmail.com',
      name: 'DL Logística',
      profile: 'Diretor',
      password: 'ANITA2020',
      active: true,
      require_password_change: false,
      password_updated_at: new Date().toISOString()
    }, { onConflict: 'email' })
    .then(({ data, error }) => {
      if (error) console.error('Erro ao atualizar via API:', error);
      else console.log('✅ Senha atualizada com sucesso via API Supabase!');
    });
}
