# Gossip ETH Prices

## Overview

This project is a simplified version of Chainlink using Node.js and libp2p. It sets up a system of gossiping nodes that, every 30 seconds, fetches and signs the price of ETH from a freely available API (e.g., CoinGecko) and emits it to a libp2p gossip network. The nodes successively sign the message and re-emit it. When a message receives at least 3 signatures and if it has been at least 30 seconds since the latest message from any node has been written, a node writes this message to a shared PostgreSQL instance.

## Prerequisites

- Node.js (v16 or later)
- Docker
- Docker Compose

## Project Structure

- `package.json`: js package information file.
- `index.js`: Main script to initialize and start the libp2p nodes.
- `config.js`: Configuration file for the project.
- `db.js`: Contains database connection and insertion logic.
- `fetchPrice.js`: Fetches the current price of ETH from a public API.

## Installation

1. Clone the repository:

   `git clone https://github.com/bitcoinvsalts/gossip-eth-prices`
   `cd gossip-eth-prices`

2. Run PostgreSQL:

    `docker-compose up -d`

3. Edit the following environment variables in the .env file:

    - DB_HOST
    - DB_PORT
    - DB_USER
    - DB_PASSWORD
    - DB_DATABASE

4. Install the dependencies:

    `npm install`

5. Create the table in the database

   `npm run db`

6. Start the Bootstrap node:

    `npm run bootstrap`

7. Start the first nodes:

    - Set the BOOTSTRAP_ADDRESS environment variable in the .env using the address of the previously Bootstrap node deployed.

    `npm run start`

8. Start the second nodes:

    `npm run start`

9. Start the third nodes:

    `npm run start`

10. Show the data in the database:

    `npm run show`

For more information, contact me at herve76@gmail.com

