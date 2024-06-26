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
import { mdns } from '@libp2p/mdns';
import { bootstrap } from '@libp2p/bootstrap'; // Import the bootstrap module
import dotenv from 'dotenv';

dotenv.config();

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

const createLibp2pNode = async (port, retryCount = 0) => {
  try {
    const libp2p = await createLibp2p({
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${port}/ws`],
      },
      transports: [
        webSockets({ filter: filters.all }),
        webRTC(),
        circuitRelayTransport({ discoverRelays: 1 }),
      ],
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: [
        mdns(), // Add mDNS for local network peer discovery
        bootstrap({
          list: [
            '/ip4/127.0.0.1/tcp/15002/ws/p2p/12D3KooWKr3rmsKnuojRd2QbWYE1AYDaFPvQdcGUoSMvRK9iJK2T',
            '/ip4/127.0.0.1/tcp/15003/ws/p2p/12D3KooWKr3rmsKnuojRd2QbWYE1AYDaFPvQdcGUoSMvRK9iJK2U'
          ]
        })
      ],
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

    return libp2p;
  } catch (error) {
    if (retryCount < 5) {
      console.warn(`Port ${port} is not available, trying another port... (${retryCount + 1}/5)`);
      port = Math.floor(Math.random() * (16000 - 15003 + 1)) + 15003;
      return createLibp2pNode(port, retryCount + 1);
    } else {
      throw new Error(`Failed to create libp2p node after ${retryCount + 1} attempts: ${error.message}`);
    }
  }
};

const port = Math.floor(Math.random() * (16000 - 15003 + 1)) + 15003;
const libp2p = await createLibp2pNode(port);

const topic = 'eth-price';

libp2p.services.pubsub.subscribe(topic);
console.log(`Subscribed to topic: ${topic}`);

libp2p.services.pubsub.addEventListener('message', async (event) => {
  try {
    const message = JSON.parse(toString(event.detail.data));
    console.log('Message received:', message);
    const signatures = message.signatures || [];
    const newSignature = signMessage(message.price.toString());

    // Check if this node has already signed the message
    if (signatures.some(sig => sig.r === newSignature.r && sig.s === newSignature.s && sig.v === newSignature.v)) {
      console.log('Signature already exists. Ignoring.');
      return;
    }

    signatures.push(newSignature);

    if (signatures.length >= 3) {
      await saveEthPrice(message.price, signatures);
      console.log('Message saved to DB:', { price: message.price, signatures });
    } else {
      const newMessage = JSON.stringify({ price: message.price, signatures });
      await libp2p.services.pubsub.publish(topic, fromString(newMessage));
      console.log('Republished message:', newMessage);
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

setTimeout(async () => {
  console.log('Starting ETH price fetch and publish cycle...');
  setInterval(async () => {
    console.log('Fetching ETH price...');
    const price = await fetchEthPrice();
    console.log("ETH PRICE", price);
    const message = JSON.stringify({ price, signatures: [signMessage(price.toString())] });
    console.log("MESSAGE", message);

    const subscribers = libp2p.services.pubsub.getSubscribers(topic);
    console.log(`Subscribers: ${subscribers.length}`);
    if (subscribers.length > 0) {
      await libp2p.services.pubsub.publish(topic, fromString(message));
      console.log("PUBLISHED");
    } else {
      console.log("No subscribers found, message not published.");
    }
  }, 30000);
}, 20000); // Increase initial wait time to 20 seconds
