
const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
    console.error('Erro inesperado no PostgreSQL:', err.message);
});

const testConnection = async () => {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS banco,
                current_schema() AS schema,
                NOW() AS horario
        `);

        console.log('Conexão com PostgreSQL realizada!');
        console.log(result.rows[0]);

        return true;

    } catch (error) {
        console.error('Falha na conexão:', error.message);
        return false;
    }
};

const query = async (text, params = []) => {
    return await pool.query(text, params);
};

const transaction = async (callback) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await callback(client);

        await client.query('COMMIT');

        return result;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};
