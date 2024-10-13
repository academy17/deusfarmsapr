"use client";
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import WETH_DEUS_AERO_ABI from './abis/WETH_DEUS_AERO_ABI.json';
import USDC_DEUS_AERO_ABI from './abis/USDC_DEUS_AERO_ABI.json';
import POOL_FACTORY_ABI from './abis/POOL_FACTORY_ABI.json';
import WETH_DEUS_GAUGE_CONTRACT_ABI from './abis/WETH_DEUS_GAUGE_ABI.json';
import USDC_DEUS_GAUGE_CONTRACT_ABI from './abis/WETH_DEUS_GAUGE_ABI.json';
const WETHDEUSAddress = '0x9e4CB8b916289864321661CE02cf66aa5BA63C94';
const USDCDEUSAddress = '0xf185f82A1948d014baE23d30b06FA8Da35110315';
const AEROFactoryAddress = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';
const WETHDEUSGaugeAddress = '0x7eC1926A50D2D253011cC9891935eBc476713bb1';
const USDCDEUSGaugeAddress = '0xC5170E37875cfD19872692E1086C49F205b5Fca6';


const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=weth,usd-coin,deus-finance-2,aerodrome-finance&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    return {
      WETH: data['weth']?.usd || 0,
      USDC: data['usd-coin']?.usd || 0,
      DEUS: data['deus-finance-2']?.usd || 0,
      AERO: data['aerodrome-finance']?.usd || 0,
    };
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return { WETH: 0, USDC: 0, DEUS: 0, AERO: 0 };
  }
};

const fetchRewardRate = async (abi, contractAddress) => {
  try {
    const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
    const gauge = new web3.eth.Contract(abi, contractAddress);
    const rewardTokenRate = await gauge.methods.rewardRate().call();
    return(rewardTokenRate);
  } catch (error) {
    console.error('Error fetching RewardRate for pools:', error);
    return null;
  }
}

const calculateAPR = (rewardRate, tokenPrice, tvl) => {
  const rewardRatePerSecond = BigInt(rewardRate); 
  const decimals = BigInt(10 ** 18); 
  const secondsInDay = BigInt(86400);
  const daysInYear = BigInt(365);
  const annualEmissions = (rewardRatePerSecond * secondsInDay * daysInYear) / decimals;
  const annualEmissionsUSD = Number(annualEmissions) * tokenPrice;
  const apr = (annualEmissionsUSD / tvl) * 100; 
  return apr.toFixed(2);
};

const fetchSwapEvents = async (contract, fromBlock) => {
  const toBlock = 'latest';
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
};
const calculate7dSwapVolume = async (prices) => {
  const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
  const currentBlock = await web3.eth.getBlockNumber();
  const blocksPerWeek = 60 * 60 * 24 * 7 / 2; // BASE blocks persecond
  const fromBlock = Number(currentBlock) - blocksPerWeek;
  const wethDeusContract = new web3.eth.Contract(WETH_DEUS_AERO_ABI, WETHDEUSAddress);
  const usdcDeusContract = new web3.eth.Contract(USDC_DEUS_AERO_ABI, USDCDEUSAddress);
  const wethDeusSwaps = await fetchSwapEvents(wethDeusContract, fromBlock);
  const usdcDeusSwaps = await fetchSwapEvents(usdcDeusContract, fromBlock);
  let wethDeusVolumeUSD = 0;
  let usdcDeusVolumeUSD = 0;

wethDeusSwaps.forEach((event) => {
  const amount0In = Number(event.returnValues.amount0In) / Math.pow(10, 18); // WETH has 18 decimals
  const amount1In = Number(event.returnValues.amount1In) / Math.pow(10, 18); // DEUS has 18 decimals
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
    return feeTierNumber;
  } catch (error) {
    console.error('Error fetching fee tier:', error);
    return null;
  }
};

export default function Home() {
  const [aprWETH, setAprWETH] = useState(null); 
  const [aprUSDC, setAprUSDC] = useState(null); 
  const [feeTierUSDC, setFeeTierUSDC] = useState(null); 
  const [feeTierWETH, setFeeTierWETH] = useState(null);
  const [reserves, setReserves] = useState<any[]>([]);
  const [prices, setPrices] = useState({ WETH: 0, DEUS: 0, USDC: 0, AERO: 0 });
  const [wethDeusVolume, setWethDeusVolume] = useState(0);
  const [usdcDeusVolume, setUsdcDeusVolume] = useState(0); 
  const [error, setError] = useState<string | null>(null);

  const fetchReserves = async () => {
    try {
      const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
      const data = [];

      const wethDeusContract = new web3.eth.Contract(WETH_DEUS_AERO_ABI, WETHDEUSAddress);
      const wethDeusReserves = await wethDeusContract.methods.getReserves().call();
      const reserve0WETH = BigInt(wethDeusReserves._reserve0);
      const reserve1DEUS_WETH = BigInt(wethDeusReserves._reserve1);

      const usdcDeusContract = new web3.eth.Contract(USDC_DEUS_AERO_ABI, USDCDEUSAddress);
      const usdcDeusReserves = await usdcDeusContract.methods.getReserves().call();
      const reserve0USDC = BigInt(usdcDeusReserves._reserve0);
      const reserve1DEUS_USDC = BigInt(usdcDeusReserves._reserve1);

      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices);

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

      setReserves(data);
    } catch (err) {
      console.error('Error fetching reserves:', err);
      setError('Error fetching reserves');
    }
  };

  const fetchSwapVolume = async (prices) => {
    try {
      const { wethDeusVolumeUSD, usdcDeusVolumeUSD } = await calculate7dSwapVolume(prices);
      setWethDeusVolume(wethDeusVolumeUSD); 
      setUsdcDeusVolume(usdcDeusVolumeUSD); 
    } catch (error) {
      console.error('Error fetching swap volume:', error);
      setError('Error fetching swap volume');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tokenPrices = await fetchTokenPrices();
        setPrices(tokenPrices); 
        await fetchReserves();
        await fetchSwapVolume(tokenPrices);

        const USDCDEUSTier = await fetchFeeTier(USDCDEUSAddress, false); // Example: stable = false
        const WETHDEUSTier = await fetchFeeTier(WETHDEUSAddress, false);  // Example: stable = true

        setFeeTierUSDC(USDCDEUSTier);
        setFeeTierWETH(WETHDEUSTier);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data');
      }
    };
    
    fetchData(); // Trigger fetching when component mounts
  }, []);



  useEffect(() => {
    if (reserves.length > 0) {
      const fetchAPRForPools = async () => {
        try {
          // Fetch reward rate and calculate APR for WETH/DEUS
          const rewardRateWETH = await fetchRewardRate(WETH_DEUS_GAUGE_CONTRACT_ABI, WETHDEUSGaugeAddress);
          const tvlWETH = reserves.find(pool => pool.name === 'WETH/DEUS')?.tvl || 0;
          console.log(`RewardRate WETH: ${rewardRateWETH}`);
          console.log(`TVLWETH: ${tvlWETH}`);
          if (rewardRateWETH && tvlWETH) {
            const aprWETHValue = calculateAPR(rewardRateWETH, prices.AERO, tvlWETH);
            setAprWETH(aprWETHValue);
          }
  
          // Fetch reward rate and calculate APR for USDC/DEUS
          const rewardRateUSDC = await fetchRewardRate(USDC_DEUS_GAUGE_CONTRACT_ABI, USDCDEUSGaugeAddress);
          const tvlUSDC = reserves.find(pool => pool.name === 'USDC/DEUS')?.tvl || 0;
          if (rewardRateUSDC && tvlUSDC) {
            const aprUSDCValue = calculateAPR(rewardRateUSDC, prices.AERO, tvlUSDC);
            setAprUSDC(aprUSDCValue);
          }
        } catch (error) {
          console.error('Error fetching APR:', error);
          setError('Error fetching APR');
        }
      };
  
      fetchAPRForPools();
    }
  }, [reserves, prices.AERO]); // Runs when reserves and prices are populated
  

  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">DEUS DEX Staking APRs</h1>
      <h2 className="text-2xl font-bold mb-6 text-center">BASE: Aerodrome</h2>
  
      {error && (
        <p className="text-red-500 font-semibold text-center mb-4">{error}</p>
      )}
  
      <div className="overflow-x-auto mb-10">
        <table className="min-w-full table-auto border-collapse bg-white shadow-lg">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Pool</th>
              <th className="py-3 px-6 text-right">Reserve (Token0)</th>
              <th className="py-3 px-6 text-right">Reserve (Token1)</th>
              <th className="py-3 px-6 text-right">Token0 Price (USD)</th>
              <th className="py-3 px-6 text-right">Token1 Price (USD)</th>
              <th className="py-3 px-6 text-right">TVL (USD)</th>
              <th className="py-3 px-6 text-right">7D Swap Volume (USD)</th>
              <th className="py-3 px-6 text-right">LP APR (%)</th>
            </tr>
          </thead>
          <tbody>
            {/* WETH/DEUS Row */}
            <tr className="border-b hover:bg-gray-50">
              <td className="py-3 px-6">WETH/DEUS</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'WETH/DEUS')?.reserve0.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'WETH/DEUS')?.reserve1.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'WETH/DEUS')?.price0.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'WETH/DEUS')?.price1.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'WETH/DEUS')?.tvl.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{wethDeusVolume.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{aprWETH ? `${aprWETH}%` : 'Calculating...'}</td>
            </tr>
  
            {/* USDC/DEUS Row */}
            <tr className="border-b hover:bg-gray-50">
              <td className="py-3 px-6">USDC/DEUS</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'USDC/DEUS')?.reserve0.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'USDC/DEUS')?.reserve1.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'USDC/DEUS')?.price0.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'USDC/DEUS')?.price1.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{reserves.find(pool => pool.name === 'USDC/DEUS')?.tvl.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{usdcDeusVolume.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{aprUSDC ? `${aprUSDC}%` : 'Calculating...'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
    
  

}
