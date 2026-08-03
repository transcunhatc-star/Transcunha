import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis do .env e .env.local (se existir)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

// O usuário precisa fornecer a URL de conexão do banco de dados (geralmente começa com postgres:// ou postgresql://)
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('❌ ERRO CRÍTICO: String de conexão com o banco não encontrada!');
  console.error('Por favor, adicione DATABASE_URL no seu arquivo .env ou .env.local');
  console.error('Exemplo: DATABASE_URL="postgresql://postgres.[sua-ref]:[senha]@aws-0-[região].pooler.supabase.com:6543/postgres"');
  process.exit(1);
}

const sql = postgres(dbUrl, {
  ssl: 'require', // Supabase exige SSL
  max: 1 // Usamos apenas 1 conexão para rodar a migração
});

async function runMigration() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Arquivo não encontrado: ${schemaPath}`);
    }

    console.log('📖 Lendo arquivo schema.sql...');
    const query = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executando migrações no banco de dados...');
    
    // O pacote postgres tem o comando `sql.unsafe` para rodar strings SQL diretas
    await sql.unsafe(query);

    console.log('✅ Migração executada com sucesso! Todas as tabelas e políticas foram aplicadas/atualizadas.');
  } catch (error) {
    console.error('❌ Ocorreu um erro ao executar a migração:');
    console.error(error.message || error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
