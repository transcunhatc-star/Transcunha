import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gushnsrqyjziidhylrsn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const SQL = `
-- Criar usuário Admin ("admin" e "admin@transcunha.com.br") no Supabase SQL Editor:
INSERT INTO app_users (id, email, name, profile, password, active, require_password_change)
VALUES 
(
  gen_random_uuid(),
  'admin',
  'Administrador do Sistema',
  'Diretor',
  'mauricio15',
  true,
  false
),
(
  gen_random_uuid(),
  'admin@transcunha.com.br',
  'Administrador do Sistema',
  'Diretor',
  'mauricio15',
  true,
  false
)
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  profile = EXCLUDED.profile,
  active = true,
  require_password_change = false,
  password_updated_at = NOW();
`;

console.log('=== SQL PARA CRIAR USUÁRIO ADMIN NO SUPABASE ===');
console.log('Link do SQL Editor: https://supabase.com/dashboard/project/gushnsrqyjziidhylrsn/sql/new');
console.log('');
console.log(SQL);

if (SUPABASE_KEY && !SUPABASE_KEY.includes('placeholder')) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  supabase
    .from('app_users')
    .upsert([
      {
        email: 'admin',
        name: 'Administrador do Sistema',
        profile: 'Diretor',
        password: 'mauricio15',
        active: true,
        require_password_change: false,
        password_updated_at: new Date().toISOString()
      },
      {
        email: 'admin@transcunha.com.br',
        name: 'Administrador do Sistema',
        profile: 'Diretor',
        password: 'mauricio15',
        active: true,
        require_password_change: false,
        password_updated_at: new Date().toISOString()
      }
    ], { onConflict: 'email' })
    .then(({ data, error }) => {
      if (error) console.error('Erro ao criar usuário via API:', error);
      else console.log('✅ Usuário admin criado com sucesso via API Supabase!');
    });
}
