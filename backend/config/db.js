
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function conectarBD() {
    try {
        await pool.query('SELECT NOW()');
        console.log('PostgreSQL conectado correctamente');
    } catch (error) {
        console.error('Error de conexión:', error.message);
        throw error;
    }
}

module.exports = { pool, conectarBD };
