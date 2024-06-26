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

const getEthPrices = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM eth_prices ORDER BY timestamp DESC');
    console.log('ETH Prices:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Price: ${row.price}`);
      console.log(`Signatures: ${JSON.stringify(row.signatures, null, 2)}`);
      console.log(`Timestamp: ${row.timestamp}`);
      console.log('----------------------');
    });
    console.log(`Total Raws: ${result.rows.length}`);
    console.log('----------------------');
  } catch (error) {
    console.error('Error retrieving data from the database:', error);
  } finally {
    client.release();
  }
};

getEthPrices();
