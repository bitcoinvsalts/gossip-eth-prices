import dotenv from 'dotenv';
dotenv.config();

export default {
  NODE_COUNT: process.env.NODE_COUNT || 3,
  ETH_API_URL: process.env.ETH_API_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_DATABASE: process.env.DB_DATABASE || 'eth_prices',
  GOSSIP_INTERVAL: process.env.GOSSIP_INTERVAL || 30000,
};
