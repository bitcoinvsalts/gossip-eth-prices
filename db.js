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
    // Check if the message is a duplicate before inserting
    const isDuplicate = await isDuplicateMessage(client, price, signatures);
    if (isDuplicate) {
      console.log('Duplicate message detected. Not saving to the database.');
      return;
    }

    const query = 'INSERT INTO eth_prices(price, signatures) VALUES($1, $2)';
    const values = [price, JSON.stringify(signatures)];
    await client.query(query, values);
    console.log('Record saved successfully.');
  } catch (error) {
    console.error('Error saving ETH price:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const isDuplicateMessage = async (client, price, signatures) => {
  try {
    const query = 'SELECT * FROM eth_prices WHERE price = $1 AND signatures @> $2::jsonb';
    const values = [price, JSON.stringify(signatures)];
    const result = await client.query(query, values);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error checking for duplicate message:', error);
    throw error;
  }
};
