# Simplified Chainlink Node System

## Overview

This project is a simplified version of Chainlink using Node.js and libp2p. It sets up a system of gossiping nodes that, every 30 seconds, fetches and signs the price of ETH from a freely available API (e.g., CoinGecko) and emits it to a libp2p gossip network. The nodes successively sign the message and re-emit it. When a message receives at least 3 signatures and if it has been at least 30 seconds since the latest message from any node has been written, a node writes this message to a shared PostgreSQL instance.

## Project Structure

- `package.json`: js package information file.
- `index.js`: Main script to initialize and start the libp2p nodes.
- `config.js`: Configuration file for the project.
- `db.js`: Contains database connection and insertion logic.
- `fetchPrice.js`: Fetches the current price of ETH from a public API.

## Installation

1. Clone the repository:

   git clone https://github.com/bitcoinvsalts/gossip-eth-prices
   cd gossip-eth-prices

2. Install the dependencies:

    npm install

3. Edit the .env file

4. Start the nodes:

    node run start

