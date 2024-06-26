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

const emptyDatabase = async () => {
  const client = await pool.connect();
  try {
    const query = 'DELETE FROM eth_prices';
    await client.query(query);
    console.log('All records from eth_prices have been deleted.');
  } catch (error) {
    console.error('Error deleting records from database:', error);
  } finally {
    client.release();
  }
};

emptyDatabase();
