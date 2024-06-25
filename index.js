import { createLibp2p } from 'libp2p';
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
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
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

const bootstrapNodes = [
  '/ip4/127.0.0.1/tcp/9090/ws/p2p/YourBootstrapNodePeerId' // Replace with actual bootstrap node addresses
];

const libp2p = await createLibp2p({
  addresses: {
    listen: ['/webrtc'],
  },
  transports: [
    webSockets({ filter: filters.all }),
    webRTC(),
    circuitRelayTransport({ discoverRelays: 1 }),
  ],
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
  peerDiscovery: [
    bootstrap({
      list: bootstrapNodes,
    }),
  ],
  services: {
    identify: identify(),
    pubsub: gossipsub(),
    dcutr: dcutr(),
  },
  connectionManager: {
    minConnections: 0,
  }
});

const topic = 'eth-price';

const logPeers = () => {
  const peers = libp2p.getPeers();
  console.log('Connected peers:', peers.map(peer => peer.toString()));
};

const logSubscribedTopics = () => {
  const subscribedTopics = libp2p.services.pubsub.getTopics();
  console.log('Subscribed topics:', subscribedTopics);
};

libp2p.addEventListener('peer:connect', (event) => {
  logPeers();
  console.log('Connected to peer:', event.detail.remotePeer.toString());
});
libp2p.addEventListener('peer:disconnect', (event) => {
  logPeers();
  console.log('Disconnected from peer:', event.detail.remotePeer.toString());
});

libp2p.services.pubsub.subscribe(topic);
libp2p.services.pubsub.addEventListener('subscription-change', logSubscribedTopics);

libp2p.services.pubsub.addEventListener('message', async (event) => {
  console.log('Message received:', event.detail);
  const message = JSON.parse(toString(event.detail.data));
  const signatures = message.signatures || [];
  const newSignature = signMessage(message.price.toString());
  signatures.push(newSignature);

  if (signatures.length >= 3) {
    await saveEthPrice(message.price, signatures);
  } else {
    const newMessage = JSON.stringify({ price: message.price, signatures });
    await libp2p.services.pubsub.publish(topic, fromString(newMessage));
  }
});

setInterval(async () => {
  console.log('Fetching ETH price...');
  const price = await fetchEthPrice();
  console.log("ETH PRICE", price);
  const message = JSON.stringify({ price, signatures: [signMessage(price.toString())] });
  console.log("MESSAGE", message);

  try {
    await libp2p.services.pubsub.publish(topic, fromString(message));
    console.log("PUBLISHED");
  } catch (error) {
    console.error('PublishError:', error.message);
  }
}, 30000);

console.log('Node started.');
