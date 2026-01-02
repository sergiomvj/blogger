import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuração robusta para MariaDB no Easypanel
const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'webserver',
    // No Easypanel, conexões internas via rede Docker costumam falhar com SSL "auto"
    // Vamos desabilitar SSL explicitamente para resolver o erro "reading communication packets"
    ssl: false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000 // 20 segundos para evitar timeouts prematuros
};

console.log(`[DB] Tentando conectar ao Host: ${connectionConfig.host}:${connectionConfig.port}`);

export const pool = mysql.createPool(connectionConfig);

// Teste de conexão com log detalhado
pool.query('SELECT 1').then(() => {
    console.log('✅ Conexão com o Banco de Dados estabelecida com sucesso!');
}).catch(err => {
    console.error('❌ Erro Crítico de Conexão com o Banco:', err.message);
    console.error('Dica: Verifique se o Host Interno e a Senha no Easypanel estão corretos.');
});
