"use client";
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

const fetchTokenPrices = async () => {
    const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=wrapped-fantom,usd-coin,deus-finance-2,equalizer-dex&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
      );
      const data = await response.json();

      return {
        WFTM: data['wrapped-fantom']?.usd || 0,
        USDC: data['usd-coin']?.usd || 0,
        DEUS: data['deus-finance-2']?.usd || 0,
        EQUAL: data['equalizer-dex']?.usd || 0, 
      };
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return { WFTM: 0, USDC: 0, DEUS: 0, EQUAL: 0 };
    }
  };

const fetchRewardRate = async (gaugeAbi, gaugeAddress, equalTokenAddress) => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ANKR_FANTOM_RPC_URL);
    const gauge = new web3.eth.Contract(gaugeAbi, gaugeAddress);
    const rewardTokenRate = await gauge.methods.rewardRate(equalTokenAddress).call();
    return rewardTokenRate;
  } catch (error) {
    console.error('Error fetching reward rate:', error);
    return null;
  }
};

const calculateAPR = (rewardRate, equalPrice, tvl) => {
  const rewardRatePerSecond = BigInt(rewardRate);
  const decimals = BigInt(10 ** 18);
  const secondsInDay = BigInt(86400);
  const daysInYear = BigInt(365);
  const annualEmissions = (rewardRatePerSecond * secondsInDay * daysInYear) / decimals;
  const annualEmissionsUSD = Number(annualEmissions) * equalPrice;
  const apr = (annualEmissionsUSD * 100) / tvl;
  return apr.toFixed(2);
};

const FantomFarmComponent = ({
  poolName,
  poolAddress,
  gaugeAddress,
  token0Symbol,
  token1Symbol,
  equalTokenAddress,
  abi,
  gaugeAbi,
  decimalsToken0,
  decimalsToken1,
}) => {
  const [reserves, setReserves] = useState({ reserve0: 0, reserve1: 0, price0: 0, price1: 0, tvl: 0 });
  const [apr, setApr] = useState(null);
  const [swapVolume, setSwapVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState({ WFTM: 0, USDC: 0, DEUS: 0, EQUAL: 0 }); 
  const fetchPrices = async () => {
    try {
      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices);
    } catch (err) {
      console.error('Error fetching token prices', err);
      setError('Error fetching token prices');
    }
  };

  const fetchReserves = async () => {
    try {
      const web3 = new Web3(process.env.NEXT_PUBLIC_ANKR_FANTOM_RPC_URL);
      const contract = new web3.eth.Contract(abi, poolAddress);
      const poolReserves = await contract.methods.getReserves().call();

      const reserve0 = BigInt(poolReserves._reserve0) / BigInt(10 ** decimalsToken0);
      const reserve1 = BigInt(poolReserves._reserve1) / BigInt(10 ** decimalsToken1);

      const tokenPrices = await fetchTokenPrices();

      setReserves({
        reserve0: Number(reserve0),
        reserve1: Number(reserve1),
        price0: tokenPrices[token0Symbol],
        price1: tokenPrices[token1Symbol],
        tvl: Number(reserve0) * tokenPrices[token0Symbol] + Number(reserve1) * tokenPrices[token1Symbol],
      });
    } catch (err) {
      console.error('Error fetching reserves', err);
      setError('Error fetching reserves');
    }
  };

  const fetchAPR = async () => {
    try {
      const rewardRate = await fetchRewardRate(gaugeAbi, gaugeAddress, equalTokenAddress); // Pass EQUAL token address
      if (rewardRate && reserves.tvl && prices.EQUAL) { // Ensure EQUAL price is used
        const aprValue = calculateAPR(rewardRate, prices.EQUAL, reserves.tvl); // Use EQUAL price in APR calculation
        setApr(aprValue);
      }
    } catch (err) {
      setError('Error fetching APR');
    }
  };

  useEffect(() => {
    fetchPrices(); 
    fetchReserves(); 
  }, [poolAddress]);

  useEffect(() => {
    if (reserves.tvl > 0 && prices.EQUAL > 0) {
      fetchAPR();
    }
  }, [reserves, prices.EQUAL]);

  return (
    <div className="mb-10">
      {error && <p className="text-red-500">{error}</p>}
      <table className="min-w-full table-auto border-collapse bg-white shadow-lg">
        <thead>
          <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">Pool</th>
            <th className="py-3 px-6 text-right">Reserve (Token0)</th>
            <th className="py-3 px-6 text-right">Reserve (Token1)</th>
            <th className="py-3 px-6 text-right">Token0 Price (USD)</th>
            <th className="py-3 px-6 text-right">Token1 Price (USD)</th>
            <th className="py-3 px-6 text-right">TVL (USD)</th>
            <th className="py-3 px-6 text-right">LP APR (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b hover:bg-gray-50">
            <td className="py-3 px-6">{poolName}</td>
            <td className="py-3 px-6 text-right">{reserves.reserve0.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{reserves.reserve1.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{reserves.price0.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{reserves.price1.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{reserves.tvl.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{apr ? `${apr}%` : 'Calculating...'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default FantomFarmComponent;
