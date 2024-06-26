import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export const saveEthPrice = async (price, signatures) => {
  const client = await pool.connect();
  try {
    const query = 'INSERT INTO eth_prices(price, signatures) VALUES($1, $2)';
    const values = [price, JSON.stringify(signatures)];
    await client.query(query, values);
  } finally {
    client.release();
  }
};
