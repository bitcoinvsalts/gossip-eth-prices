import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const createDatabaseAndTable = async () => {
  // Connect to the default 'postgres' database
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: 'postgres'  // Default database
  });

  try {
    const client = await pool.connect();

    // Create database if it doesn't exist
    await client.query(`CREATE DATABASE ${process.env.DB_DATABASE}`);
    console.log(`Database ${process.env.DB_DATABASE} created successfully.`);

    client.release();

    // Connect to the newly created database
    const dbPool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    const dbClient = await dbPool.connect();

    // Create table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS eth_prices (
        id SERIAL PRIMARY KEY,
        price NUMERIC NOT NULL,
        signatures JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await dbClient.query(createTableQuery);
    console.log('Table eth_prices created successfully.');

    dbClient.release();
  } catch (error) {
    console.error('Error creating database and table:', error);
  } finally {
    pool.end();
  }
};

createDatabaseAndTable();
