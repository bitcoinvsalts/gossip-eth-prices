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

const sortSignatures = (signatures) => {
  return signatures.sort((a, b) => {
    const aStr = a.r + a.s + a.v;
    const bStr = b.r + b.s + b.v;
    return aStr.localeCompare(bStr);
  });
};

export const saveEthPrice = async (price, signatures) => {
  const client = await pool.connect();
  try {
    const sortedSignatures = sortSignatures(signatures);
    const query = 'SELECT COUNT(*) FROM eth_prices WHERE price = $1 AND signatures = $2';
    const values = [price, JSON.stringify(sortedSignatures)];
    const res = await client.query(query, values);
    if (res.rows[0].count === '0') {
      const insertQuery = 'INSERT INTO eth_prices(price, signatures) VALUES($1, $2)';
      const insertValues = [price, JSON.stringify(sortedSignatures)];
      await client.query(insertQuery, insertValues);
      console.log('Price and signatures saved to the database.');
    } else {
      console.log('Duplicate record found. Skipping insertion.');
    }
  } finally {
    client.release();
  }
};
