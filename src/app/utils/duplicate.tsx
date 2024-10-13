"use client";
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import WETH_DEUS_AERO_ABI from './abis/WETH_DEUS_AERO_ABI.json';
import USDC_DEUS_AERO_ABI from './abis/USDC_DEUS_AERO_ABI.json';

const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=weth,usd-coin,deus-finance-2&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();

    return {
      WETH: data['weth']?.usd || 0,
      USDC: data['usd-coin']?.usd || 0,
      DEUS: data['deus-finance-2']?.usd || 0,
    };
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return { WETH: 0, USDC: 0, DEUS: 0 };
  }
};

// New function to fetch swap events and calculate volume
const fetchSwapEvents = async (contract, fromBlock) => {
  const toBlock = 'latest';
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
};

const calculate24HourSwapVolume = async () => {
  const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);

  // Get current block number
  const currentBlock = await web3.eth.getBlockNumber();
  const blocksPerDay = 60 * 60 * 24 / 2; // Base Block Time

  // Calculate block number from 24 hours ago
  const fromBlock = Number(currentBlock) - blocksPerDay;

  // Define contracts
  const wethDeusContract = new web3.eth.Contract(WETH_DEUS_AERO_ABI, '0x9e4CB8b916289864321661CE02cf66aa5BA63C94');
  const usdcDeusContract = new web3.eth.Contract(USDC_DEUS_AERO_ABI, '0xf185f82A1948d014baE23d30b06FA8Da35110315');

  // Fetch swap events for WETH/DEUS
  const wethDeusSwaps = await fetchSwapEvents(wethDeusContract, fromBlock);

  // Fetch swap events for USDC/DEUS
  const usdcDeusSwaps = await fetchSwapEvents(usdcDeusContract, fromBlock);

  let wethDeusVolume = 0;
  let usdcDeusVolume = 0;

  // Calculate total volume for WETH/DEUS
  wethDeusSwaps.forEach((event) => {
    wethDeusVolume += Number(event.returnValues.amount0In) / Math.pow(10, 18); // WETH has 18 decimals
    wethDeusVolume += Number(event.returnValues.amount0Out) / Math.pow(10, 18);
  });

  // Calculate total volume for USDC/DEUS
  usdcDeusSwaps.forEach((event) => {
    usdcDeusVolume += Number(event.returnValues.amount0In) / Math.pow(10, 6); // USDC has 6 decimals
    usdcDeusVolume += Number(event.returnValues.amount0Out) / Math.pow(10, 6);
  });

  return { wethDeusVolume, usdcDeusVolume };
};

export default function Home() {
  const [reserves, setReserves] = useState<any[]>([]);
  const [prices, setPrices] = useState({ WETH: 0, DEUS: 0, USDC: 0 });
  const [swapVolume, setSwapVolume] = useState(0); // Add state to track swap volume
  const [error, setError] = useState<string | null>(null);

  const fetchReserves = async () => {
    try {
      const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
      const data = [];

      // Fetch WETH/DEUS reserves
      const wethDeusContract = new web3.eth.Contract(WETH_DEUS_AERO_ABI, '0x9e4CB8b916289864321661CE02cf66aa5BA63C94');
      const wethDeusReserves = await wethDeusContract.methods.getReserves().call();
      const reserve0WETH = BigInt(wethDeusReserves._reserve0);
      const reserve1DEUS_WETH = BigInt(wethDeusReserves._reserve1);

      // Fetch USDC/DEUS reserves
      const usdcDeusContract = new web3.eth.Contract(USDC_DEUS_AERO_ABI, '0xf185f82A1948d014baE23d30b06FA8Da35110315');
      const usdcDeusReserves = await usdcDeusContract.methods.getReserves().call();
      const reserve0USDC = BigInt(usdcDeusReserves._reserve0);
      const reserve1DEUS_USDC = BigInt(usdcDeusReserves._reserve1);

      // Fetch token prices from an external API
      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices);

      // Normalize reserves and calculate TVL
      data.push({
        name: 'WETH/DEUS',
        reserve0: Number(reserve0WETH) / Math.pow(10, 18), // WETH has 18 decimals
        reserve1: Number(reserve1DEUS_WETH) / Math.pow(10, 18), // DEUS has 18 decimals
        price0: tokenPrices.WETH,
        price1: tokenPrices.DEUS,
        tvl: (Number(reserve0WETH) / Math.pow(10, 18)) * tokenPrices.WETH +
             (Number(reserve1DEUS_WETH) / Math.pow(10, 18)) * tokenPrices.DEUS
      });

      data.push({
        name: 'USDC/DEUS',
        reserve0: Number(reserve0USDC) / Math.pow(10, 6), // USDC has 6 decimals
        reserve1: Number(reserve1DEUS_USDC) / Math.pow(10, 18), // DEUS has 18 decimals
        price0: tokenPrices.USDC,
        price1: tokenPrices.DEUS,
        tvl: (Number(reserve0USDC) / Math.pow(10, 6)) * tokenPrices.USDC +
             (Number(reserve1DEUS_USDC) / Math.pow(10, 18)) * tokenPrices.DEUS
      });

      // Update state with the normalized reserves and TVL
      setReserves(data);
    } catch (err) {
      console.error('Error fetching reserves:', err);
      setError('Error fetching reserves');
    }
  };

  const fetchSwapVolume = async () => {
    try {
      const { wethDeusVolume, usdcDeusVolume } = await calculate24HourSwapVolume();
      setSwapVolume(wethDeusVolume + usdcDeusVolume); // Update state with total swap volume
    } catch (error) {
      console.error('Error fetching swap volume:', error);
      setError('Error fetching swap volume');
    }
  };

  useEffect(() => {
    fetchReserves(); // Fetch reserves on component mount
    fetchSwapVolume(); // Fetch swap volume on component mount
  }, []);

  return (
    <div>
      <h1>Liquidity Pool Reserves</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Pool</th>
            <th>Reserve (Token0)</th>
            <th>Reserve (Token1)</th>
            <th>Token0 Price (USD)</th>
            <th>Token1 Price (USD)</th>
            <th>TVL (USD)</th>
          </tr>
        </thead>
        <tbody>
          {reserves.map((pool, index) => (
            <tr key={index}>
              <td>{pool.name}</td>
              <td>{pool.reserve0.toFixed(2)}</td>
              <td>{pool.reserve1.toFixed(2)}</td>
              <td>{pool.price0.toFixed(2)}</td>
              <td>{pool.price1.toFixed(2)}</td>
              <td>{pool.tvl.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>24-Hour Swap Volume: {swapVolume.toFixed(2)} USD</h2>
    </div>
  );
}
