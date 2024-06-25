import { createLibp2p } from 'libp2p';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { dcutr } from '@libp2p/dcutr';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import * as filters from '@libp2p/websockets/filters';
import { multiaddr } from '@multiformats/multiaddr';
import { fromString, toString } from 'uint8arrays';
import axios from 'axios';
import { saveEthPrice } from './db.js';
import pkg from 'ethereumjs-util';
const { ecsign, toBuffer, bufferToHex } = pkg;
import crypto from 'crypto';
import { identify } from '@libp2p/identify';

const privateKey = crypto.randomBytes(32);

const fetchEthPrice = async () => {
  const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  return response.data.ethereum.usd;
};

const signMessage = (message) => {
  const messageHash = crypto.createHash('sha256').update(message).digest();
  const { r, s, v } = ecsign(messageHash, privateKey);
  return { r: bufferToHex(r), s: bufferToHex(s), v };
};

const isBootstrapNode = process.env.BOOTSTRAP_NODE === 'true';
const bootstrapNodeAddr = '/ip4/127.0.0.1/tcp/15002/ws/p2p/12D3KooWLcBfktPoaD2V39VnGrnPkZuckaSUAo7rgNBPMS9HYiYX';

const libp2p = await createLibp2p({
  addresses: {
    listen: isBootstrapNode ? ['/ip4/0.0.0.0/tcp/15002/ws'] : ['/ip4/0.0.0.0/tcp/15003/ws'],
  },
  transports: [
    webSockets({ filter: filters.all }),
    webRTC(),
    circuitRelayTransport({ discoverRelays: 1 }),
  ],
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
  peerDiscovery: [],
  services: {
    identify: identify(),
    pubsub: gossipsub(),
    dcutr: dcutr(),
  },
  connectionManager: {
    minConnections: 0,
    dialTimeout: 60000 // 60 seconds
  }
});

const topic = 'eth-price';

libp2p.services.pubsub.subscribe(topic);
console.log(`Subscribed to topic: ${topic}`);

libp2p.services.pubsub.addEventListener('message', async (event) => {
  try {
    const message = JSON.parse(toString(event.detail.data));
    console.log('Message received:', message);
    const signatures = message.signatures || [];
    const newSignature = signMessage(message.price.toString());
    signatures.push(newSignature);

    if (signatures.length >= 3) {
      await saveEthPrice(message.price, signatures);
    } else {
      const newMessage = JSON.stringify({ price: message.price, signatures });
      await libp2p.services.pubsub.publish(topic, fromString(newMessage));
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

libp2p.addEventListener('peer:discovery', (peer) => {
  if (peer && peer.id) {
    console.log(`Discovered peer: ${peer.id.toString()}`);
  }
});

libp2p.addEventListener('peer:connect', (connection) => {
  if (connection && connection.remotePeer) {
    console.log(`Connected to peer: ${connection.remotePeer.toString()}`);
  }
});

libp2p.addEventListener('peer:disconnect', (connection) => {
  if (connection && connection.remotePeer) {
    console.log(`Disconnected from peer: ${connection.remotePeer.toString()}`);
  }
});

await libp2p.start();
console.log('Node started.');

if (isBootstrapNode) {
  const multiaddrs = libp2p.getMultiaddrs();
  if (multiaddrs.length > 0) {
    console.log('Bootstrap node addresses:');
    multiaddrs.forEach(addr => console.log(addr.toString()));
  } else {
    console.log('No multiaddresses found.');
  }
} else {
  const dialBootstrapNode = async (retryCount = 0) => {
    try {
      await libp2p.dial(multiaddr(bootstrapNodeAddr));
      console.log(`Dialed bootstrap node at ${bootstrapNodeAddr}`);
    } catch (error) {
      console.error(`Failed to dial bootstrap node: ${error.message}`);
      if (retryCount < 5) {
        console.log(`Retrying to dial bootstrap node... (${retryCount + 1}/5)`);
        setTimeout(() => dialBootstrapNode(retryCount + 1), 5000);
      }
    }
  };
  await dialBootstrapNode();
}

if (!isBootstrapNode) {
  setInterval(async () => {
    console.log('Fetching ETH price...');
    const price = await fetchEthPrice();
    console.log("ETH PRICE", price);
    const message = JSON.stringify({ price, signatures: [signMessage(price.toString())] });
    console.log("MESSAGE", message);
    await libp2p.services.pubsub.publish(topic, fromString(message));
    console.log("PUBLISHED");
  }, 10000);
}
