import axios from 'axios';
import config from './config.js';

const fetchEthPrice = async () => {
  try {
    const response = await axios.get(config.ETH_API_URL);
    return response.data.ethereum.usd;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return null;
  }
};

export default fetchEthPrice;
