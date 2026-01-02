import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Tenta pegar a URL única ou monta a partir das variáveis individuais do Easypanel/Docker
const connectionConfig = process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'autowriter',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

export const pool = mysql.createPool(connectionConfig);

// Teste de conexão silencioso
pool.query('SELECT 1').catch(err => {
    console.error('❌ Database connection failed:', err.message);
});
