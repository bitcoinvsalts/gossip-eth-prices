import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

export async function insertPrice(price, signatures) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO eth_prices (price, signatures, timestamp) VALUES ($1, $2, $3) RETURNING *',
      [price, signatures, new Date()]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}
