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

    // Check if the database exists
    const checkDbExistsQuery = `SELECT 1 FROM pg_database WHERE datname='${process.env.DB_DATABASE}'`;
    const res = await client.query(checkDbExistsQuery);

    if (res.rowCount === 0) {
      // Create database if it doesn't exist
      await client.query(`CREATE DATABASE ${process.env.DB_DATABASE}`);
      console.log(`Database ${process.env.DB_DATABASE} created successfully.`);
    } else {
      console.log(`Database ${process.env.DB_DATABASE} already exists.`);
    }

    client.release();

    // Connect to the newly created or existing database
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
    dbPool.end(); // Close the connection pool for the new database
  } catch (error) {
    console.error('Error creating database and table:', error);
  } finally {
    await pool.end();
  }
};

createDatabaseAndTable();
