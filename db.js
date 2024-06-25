import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

export const saveEthPrice = async (price, signatures) => {
  const client = await pool.connect();
  try {
    const query = 'INSERT INTO eth_prices(price, signatures, timestamp) VALUES($1, $2, $3)';
    const values = [price, signatures, new Date().toISOString()];
    await client.query(query, values);
  } finally {
    client.release();
  }
};