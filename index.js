import { createLibp2p } from 'libp2p';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { mplex } from '@libp2p/mplex';
import { noise } from '@chainsafe/libp2p-noise';
import { bootstrap } from '@libp2p/bootstrap';
import { identifyService } from '@libp2p/identify';
import { MemoryBlockstore } from 'blockstore-core';
import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

async function insertPrice(price, signatures) {
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

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0', '/ip4/127.0.0.1/tcp/0/ws']
    },
    transports: [
      tcp(),
      webSockets()
    ],
    streamMuxers: [
      mplex()
    ],
    connectionEncryption: [
      noise()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/ip4/127.0.0.1/tcp/15002/ws/p2p/QmPeer1',
          '/ip4/127.0.0.1/tcp/15003/ws/p2p/QmPeer2'
        ]
      })
    ],
    services: {
      pubsub: gossipsub(),
      identify: identifyService()
    },
    datastore: new MemoryBlockstore()
  });

  return node;
};

const main = async () => {
  const node = await createNode();

  node.services.pubsub.addEventListener('message', async (message) => {
    const decodedMessage = new TextDecoder().decode(message.detail.data);
    console.log(`${message.detail.topic}: ${decodedMessage}`);

    // Here you should handle signing the message and re-emitting it.
    // Also, if the message has at least 3 signatures, insert it into the database.
  });

  node.services.pubsub.subscribe('eth-price');

  setInterval(async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      const price = data.ethereum.usd;

      // Sign the message and publish it
      const message = { price, timestamp: new Date().toISOString(), signatures: [] };
      node.services.pubsub.publish('eth-price', new TextEncoder().encode(JSON.stringify(message)));
    } catch (error) {
      console.error('Error fetching ETH price:', error);
    }
  }, 30000);
};

main().catch(console.error);
