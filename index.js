import Libp2p from 'libp2p';
import TCP from '@libp2p/tcp';
import WebSockets from '@libp2p/websockets';
import { NOISE } from '@chainsafe/libp2p-noise';
import MPLEX from '@libp2p/mplex';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import fetchEthPrice from './fetchPrice.js';
import { insertPrice } from './db.js';
import crypto from 'crypto';
import config from './config.js';

const createNode = async (id) => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0', '/ip4/0.0.0.0/tcp/0/ws'],
    },
    transports: [TCP(), WebSockets()],
    connectionEncryption: [NOISE()],
    streamMuxers: [MPLEX()],
    services: {
      pubsub: gossipsub(),
    },
  });

  node.services.pubsub.addEventListener('message', async (message) => {
    const data = JSON.parse(new TextDecoder().decode(message.detail.data));
    const signatures = data.signatures || [];
    const hash = crypto.createHash('sha256').update(data.price.toString()).digest('hex');
    const signature = crypto.createSign('SHA256').update(hash).sign(node.peerId.privKey).toString('hex');
    signatures.push(signature);

    if (signatures.length >= 3) {
      await insertPrice(data.price, signatures);
    } else {
      data.signatures = signatures;
      node.services.pubsub.publish('eth-price', new TextEncoder().encode(JSON.stringify(data)));
    }
  });

  node.services.pubsub.subscribe('eth-price');

  setInterval(async () => {
    const price = await fetchEthPrice();
    if (price) {
      const data = { price, signatures: [] };
      node.services.pubsub.publish('eth-price', new TextEncoder().encode(JSON.stringify(data)));
    }
  }, config.GOSSIP_INTERVAL);

  return node;
};

const startNodes = async () => {
  const nodes = [];
  for (let i = 0; i < config.NODE_COUNT; i++) {
    const node = await createNode(i);
    nodes.push(node);
    await node.start();
    console.log(`Node ${i} started`);
  }
};

startNodes();
