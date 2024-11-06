import Web3 from 'web3';

// Array of multiple RPC URLs for BSC (for load distribution and fallback)
const rpcUrls = [
  `https://bsc-dataseed.binance.org/`,
  `https://rpc.ankr.com/bsc/${process.env.NEXT_PUBLIC_ANKR_KEY}`,
  `https://bsc-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`,
  `https://bsc-dataseed1.defibit.io/` // Add more providers if needed
];

// Helper function to add delay (in milliseconds)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Web3 instance with retry logic
export const getBSCWeb3Instance = (rpcIndex = 0): Web3 | null => {
  if (rpcIndex >= rpcUrls.length) {
    console.error('All BSC RPC providers failed');
    return null;
  }

  const rpcUrl = rpcUrls[rpcIndex];
  try {
    const provider = new Web3.providers.HttpProvider(rpcUrl, { timeout: 10000 }); // Timeout of 10 seconds
    const web3 = new Web3(provider);
    return web3;
  } catch (error) {
    console.error(`Failed to connect to ${rpcUrl}, trying next provider...`, error);
    return getBSCWeb3Instance(rpcIndex + 1); // Retry with the next provider
  }
};

// Retry function that wraps async logic
export const retryWeb3Operation = async <T>(fn: () => Promise<T>, maxAttempts = rpcUrls.length, delayTime = 2000): Promise<T> => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Error on attempt ${attempts + 1}:`, error);
      attempts += 1;
      if (attempts < maxAttempts) {
        await delay(delayTime);
      }
    }
  }
  throw new Error('Max retry attempts reached.');
};
