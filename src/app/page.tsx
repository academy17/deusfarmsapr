"use client";
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import WETH_DEUS_AERO_ABI from './abis/WETH_DEUS_AERO_ABI.json';
import USDC_DEUS_AERO_ABI from './abis/USDC_DEUS_AERO_ABI.json';
import POOL_FACTORY_ABI from './abis/POOL_FACTORY_ABI.json';
const WETHDEUSAddress = '0x9e4CB8b916289864321661CE02cf66aa5BA63C94';
const USDCDEUSAddress = '0xf185f82A1948d014baE23d30b06FA8Da35110315';
const AEROFactoryAddress = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

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
const fetchSwapEvents = async (contract, fromBlock) => {
  const toBlock = 'latest';
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
};
const calculate24HourSwapVolume = async (prices) => {
  const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);

  // Get current block number
  const currentBlock = await web3.eth.getBlockNumber();
  const blocksPerDay = 60 * 60 * 24 / 2; // Base block time

  // Calculate block number from 24 hours ago
  const fromBlock = Number(currentBlock) - blocksPerDay;

  // Define contracts for WETH/DEUS and USDC/DEUS pools
  const wethDeusContract = new web3.eth.Contract(WETH_DEUS_AERO_ABI, WETHDEUSAddress);
  const usdcDeusContract = new web3.eth.Contract(USDC_DEUS_AERO_ABI, USDCDEUSAddress);

  // Fetch swap events for WETH/DEUS
  const wethDeusSwaps = await fetchSwapEvents(wethDeusContract, fromBlock);

  // Fetch swap events for USDC/DEUS
  const usdcDeusSwaps = await fetchSwapEvents(usdcDeusContract, fromBlock);

  let wethDeusVolumeUSD = 0;
  let usdcDeusVolumeUSD = 0;

// Calculate total volume for WETH/DEUS in USD
wethDeusSwaps.forEach((event) => {
  const amount0In = Number(event.returnValues.amount0In) / Math.pow(10, 18); // WETH has 18 decimals
  const amount1In = Number(event.returnValues.amount1In) / Math.pow(10, 18); // DEUS has 18 decimals

  // Only count the token that is coming into the pool
  wethDeusVolumeUSD += amount0In * prices.WETH; // WETH coming into the pool
  wethDeusVolumeUSD += amount1In * prices.DEUS; // DEUS coming into the pool
});

// Calculate total volume for USDC/DEUS in USD
usdcDeusSwaps.forEach((event) => {
  const amount0In = Number(event.returnValues.amount0In) / Math.pow(10, 6); // USDC has 6 decimals
  const amount1In = Number(event.returnValues.amount1In) / Math.pow(10, 18); // DEUS has 18 decimals

  // Only count the token that is coming into the pool
  usdcDeusVolumeUSD += amount0In * prices.USDC; // USDC coming into the pool
  usdcDeusVolumeUSD += amount1In * prices.DEUS; // DEUS coming into the pool
});



  return { wethDeusVolumeUSD, usdcDeusVolumeUSD };
};

const fetchFeeTier = async (poolAddress, _stable) => {
  try {
    const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
    const poolContract = new web3.eth.Contract(POOL_FACTORY_ABI, AEROFactoryAddress);
    const feeTier = await poolContract.methods.getFee(poolAddress, _stable).call();
    const feeTierNumber = Number(feeTier);
    console.log(`Fee tier for the Aerodrome pool: ${feeTierNumber}`);
    return feeTierNumber;
  } catch (error) {
    console.error('Error fetching fee tier:', error);
    return null;
  }
};




export default function Home() {
  const [feeTierUSDC, setFeeTierUSDC] = useState(null); // State to store the fee tier for pool 1
  const [feeTierWETH, setFeeTierWETH] = useState(null); // State to store the fee tier for pool 2
  const [reserves, setReserves] = useState<any[]>([]);
  const [prices, setPrices] = useState({ WETH: 0, DEUS: 0, USDC: 0 });
  const [wethDeusVolume, setWethDeusVolume] = useState(0); // State to track WETH/DEUS swap volume in USD
  const [usdcDeusVolume, setUsdcDeusVolume] = useState(0); // State to track USDC/DEUS swap volume in USD
  const [error, setError] = useState<string | null>(null);

  const fetchReserves = async () => {
    try {
      const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
      const data = [];

      // Fetch WETH/DEUS reserves
      const wethDeusContract = new web3.eth.Contract(WETH_DEUS_AERO_ABI, WETHDEUSAddress);
      const wethDeusReserves = await wethDeusContract.methods.getReserves().call();
      const reserve0WETH = BigInt(wethDeusReserves._reserve0);
      const reserve1DEUS_WETH = BigInt(wethDeusReserves._reserve1);

      // Fetch USDC/DEUS reserves
      const usdcDeusContract = new web3.eth.Contract(USDC_DEUS_AERO_ABI, USDCDEUSAddress);
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



  const fetchSwapVolume = async (prices) => {
    try {
      const { wethDeusVolumeUSD, usdcDeusVolumeUSD } = await calculate24HourSwapVolume(prices);
      setWethDeusVolume(wethDeusVolumeUSD); // Update state with WETH/DEUS swap volume in USD
      setUsdcDeusVolume(usdcDeusVolumeUSD); // Update state with USDC/DEUS swap volume in USD
    } catch (error) {
      console.error('Error fetching swap volume:', error);
      setError('Error fetching swap volume');
    }
  };


  // Run once when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch token prices first
        const tokenPrices = await fetchTokenPrices();
        setPrices(tokenPrices); // Update the prices state
        

        // Fetch reserves once prices are available
        await fetchReserves();

        // Fetch swap volume once prices are available
        await fetchSwapVolume(tokenPrices);

        // Fetch the fee tier for two different pools
        const USDCDEUSTier = await fetchFeeTier(USDCDEUSAddress, false, POOL_FACTORY_ABI); // Example: stable = false
        const WETHDEUSTier = await fetchFeeTier(WETHDEUSAddress, false, POOL_FACTORY_ABI);  // Example: stable = true

        // Store the fee tiers
        setFeeTierUSDC(USDCDEUSTier);
        setFeeTierWETH(WETHDEUSTier);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data');
      }
    };
    
    fetchData(); // Trigger fetching when component mounts
  }, []); // Empty dependency array ensures this runs only once on mount




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

      <h3>24-Hour Swap Volume for WETH/DEUS: {wethDeusVolume.toFixed(2)} USD</h3>
      <h3>24-Hour Swap Volume for USDC/DEUS: {usdcDeusVolume.toFixed(2)} USD</h3>

      {/* Display the fee tiers for the two pools */}
      <h2>Fee Tier for WETHDEUS: {feeTierWETH ? (feeTierWETH / 100).toFixed(2) : 'Loading...'}%</h2>
      <h2>Fee Tier for USDCDEUS: {feeTierUSDC ? (feeTierUSDC / 100).toFixed(2) : 'Loading...'}%</h2>

    
    </div>
  );
}
