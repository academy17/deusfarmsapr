"use client";
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import Moralis from 'moralis';
import {initializeMoralis} from '../utils/moralisHelper';

//FIXME: Bribes
//NOTE: Use Unix timestamp instead of block number

// Fetch token prices from Coingecko
const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=weth,usd-coin,deus-finance-2,aerodrome-finance&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    console.log(`prices: ${data}`);
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

// Fetch reward rate from gauge contract
const fetchRewardRate = async (gaugeAbi, gaugeAddress) => {
  try {
    const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
    const gauge = new web3.eth.Contract(gaugeAbi, gaugeAddress);
    const rewardTokenRate = await gauge.methods.rewardRate().call();
    return rewardTokenRate;
  } catch (error) {
    console.error('Error fetching reward rate:', error);
    return null;
  }
};

// Calculate APR based on reward rate and TVL
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

// Fetch swap events for the last 7 days
const fetchSwapEvents = async (contract, fromBlock) => {
  const toBlock = 'latest';
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
};

// Calculate the 7-day swap volume for a given pool
const calculate7dSwapVolume = async (prices, contract, fromBlock, token0Symbol, token1Symbol, token0Decimals = 18, token1Decimals = 18) => {
  const swapEvents = await fetchSwapEvents(contract, fromBlock);
  let volumeUSD = 0;

  swapEvents.forEach((event) => {
    // Adjust token amounts based on their decimals
    const amount0In = Number(event.returnValues.amount0In) / Math.pow(10, token0Decimals); 
    const amount1In = Number(event.returnValues.amount1In) / Math.pow(10, token1Decimals); 

    // Calculate volume in USD based on token prices
    volumeUSD += amount0In * prices[token0Symbol]; 
    volumeUSD += amount1In * prices[token1Symbol];
  });

  return volumeUSD;
};

const fetchFeeTier = async (poolAddress, _stable, factoryAbi, factoryAddress) => {
  try {
    const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
    const poolContract = new web3.eth.Contract(factoryAbi, factoryAddress);
    const feeTier = await poolContract.methods.getFee(poolAddress, _stable).call();
    const feeTierNumber = Number(feeTier);
    return feeTierNumber;
  } catch (error) {
    console.error('Error fetching fee tier:', error);
    return null;
  }
};

// External function to calculate past block number
// Calculate the Unix timestamp for 14 days ago
const calculatePastTimestamp = () => {
  const secondsPerDay = 60 * 60 * 24;
  const timestamp14DaysAgo = Math.floor(Date.now() / 1000) - (14 * secondsPerDay);
  console.log(`pastTimestamp: ${timestamp14DaysAgo}`);
  return timestamp14DaysAgo;
};

// External function to get epoch start and end using the voter contract based on Unix timestamp
 const getEpochBoundsByTimestamp = async (timestamp, voterContract) => {
  const epochStart = await voterContract.methods.epochVoteStart(timestamp).call();
  const epochEnd = await voterContract.methods.epochVoteEnd(timestamp).call();  // Convert to numbers
  const epochStartNumber = Number(epochStart);
  const epochEndNumber = Number(epochEnd);
  console.log(`epochStartNumber: ${epochStartNumber}`);
  console.log(`epochEndNumber: ${epochEndNumber}`);
  
  return { epochStartNumber, epochEndNumber };
};

const getBlockFromTimestampMoralis = async (timestamp: number): Promise<number | NaN> => {
  try {
    // Initialize Moralis once
    await initializeMoralis();

    const date = new Date(timestamp * 1000).toISOString(); // Convert seconds to milliseconds and format

    // Call Moralis API to get block number for the given timestamp on Base chain
    const response = await Moralis.EvmApi.block.getDateToBlock({
      chain: "0x2105", // Base chain ID for Base network
      date: date,
    });

    // Extract the block number from the response
    const blockNumber = response.raw.block;
    console.log(`Block number for timestamp ${timestamp}:`, blockNumber);

    return blockNumber;
  } catch (e) {
    console.error('Error fetching block number from Moralis:', e);
    return NaN; // Return NaN in case of error
  }
};




const BaseFarmComponent = ({
  poolName,
  poolAddress,
  gaugeAddress,
  token0Symbol,
  token1Symbol,
  abi,
  decimalsToken0,
  decimalsToken1,
  gaugeAbi,
  factoryAbi,
  factoryAddress,
  voterAbi,
  voterAddress,
  bribeAbi,
  bribeAddress
}) => {
  const [reserves, setReserves] = useState({ reserve0: 0, reserve1: 0, price0: 0, price1: 0, tvl: 0 });
  const [apr, setApr] = useState(null);
  const [swapVolume, setSwapVolume] = useState(0);
  const [feeTier, setFeeTier] = useState(0); 
  const [weeklyFees, setWeeklyFees] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState({ WETH: 0, USDC: 0, DEUS: 0, AERO: 0 });
  const [bribes, setBribes] = useState(0);

  const fetchPrices = async () => {
    try {
      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices);
    } catch (err) {
      console.error('Error fetching token prices', err);
      setError('Error fetching token prices');
    }
  };

  // Fetch pool reserves
  const fetchReserves = async () => {
    try {
      const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
      const contract = new web3.eth.Contract(abi, poolAddress);
      const poolReserves = await contract.methods.getReserves().call();
  
      const reserve0 = BigInt(poolReserves._reserve0) / BigInt(10 ** decimalsToken0);
      const reserve1 = BigInt(poolReserves._reserve1) / BigInt(10 ** decimalsToken1);
  
      // Ensure prices are available
      const token0Price = prices[token0Symbol] || 0; 
      const token1Price = prices[token1Symbol] || 0;
  
      // Check if prices are fetched, otherwise return 0
      if (!token0Price || !token1Price) {
        console.error(`Prices not found for symbols: ${token0Symbol}, ${token1Symbol}`);
        return;
      }
  
      setReserves({
        reserve0: Number(reserve0),
        reserve1: Number(reserve1),
        price0: token0Price,
        price1: token1Price,
        tvl: Number(reserve0) * token0Price + Number(reserve1) * token1Price,
      });
    } catch (err) {
      console.error('Error fetching reserves', err);
      setError('Error fetching reserves');
    }
  };
  
// Fetch 7-day swap volume for the pool
  const fetchSwapVolumeForPool = async () => {
    try {
      const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
      /*
      const currentBlock = await web3.eth.getBlockNumber();
      const blocksPerWeek = 60 * 60 * 24 * 7 / 2; // BASE blocks per second
      const fromBlock = Number(currentBlock) - blocksPerWeek;
      */
      const currentBlock = 21168000; // Static block number for example
      const blocksPerWeek = 60 * 60 * 24 * 7 / 2; // BASE blocks per second
      const fromBlock = Number(currentBlock) - blocksPerWeek;

      const contract = new web3.eth.Contract(abi, poolAddress);

      // Adjust token decimals based on your pool
      const token0Decimals = token0Symbol === 'USDC' ? 6 : 18; // USDC has 6 decimals, others have 18
      const token1Decimals = token1Symbol === 'DEUS' ? 18 : 18; // Assuming DEUS has 18 decimals

      const volumeUSD = await calculate7dSwapVolume(
        prices, 
        contract, 
        fromBlock, 
        token0Symbol, 
        token1Symbol, 
        token0Decimals, 
        token1Decimals
      );

      setSwapVolume(volumeUSD);
    } catch (error) {
      console.error('Error fetching swap volume:', error);
      setError('Error fetching swap volume');
    }
  };

  const fetchPoolFeeTier = async () => {
    try {
      const poolFeeTier = await fetchFeeTier(poolAddress, false, factoryAbi, factoryAddress);
      const poolFeeTierPercentage = poolFeeTier / 100;
      setFeeTier(poolFeeTierPercentage);

    }
    catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Fetch APR for the pool
  const fetchAPR = async () => {
    try {
      const rewardRate = await fetchRewardRate(gaugeAbi, gaugeAddress);
      if (rewardRate && reserves.tvl && prices.AERO) {
        const aprValue = calculateAPR(rewardRate, prices.AERO, reserves.tvl);
        setApr(aprValue);
      }
    } catch (err) {
      setError('Error fetching APR');
    }
  };

  // Fetch NotifyReward events within the epoch bounds and sum the amounts
  const fetchBribesForLastWeekEpoch = async () => {
    try {
      const web3 = new Web3(`https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`);
      const pastTimestamp = calculatePastTimestamp(); // Get the Unix timestamp from 14 days ago
      const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
      const bribeContract = new web3.eth.Contract(bribeAbi, bribeAddress);
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp, voterContract);
      console.log(`epochStartNumber2: ${epochStartNumber}`);
      console.log(`epochEndNumber2: ${epochEndNumber}`);
      const epochStartBlock = await getBlockFromTimestampMoralis(epochStartNumber);
      const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
      console.log(`epochStartBlock: ${epochStartBlock}`);
      console.log(`epochEndBlock: ${epochEndBlock}`);
    // Step 3: Fetch NotifyReward events using the filter option for the reward address
    const events = await bribeContract.getPastEvents('NotifyReward', {
      fromBlock: epochStartBlock,
      toBlock: epochEndBlock,
      filter: {
        reward: '0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44', // Filter by reward address
      }
    });

    // Log the events to inspect their structure
  
      // Log the events to inspect their structure
      console.log('Fetched NotifyReward events:', events);
  
      // Step 4: Sum the reward amounts
      let totalBribeAmount = 0;
      events.forEach(event => {
        // Log each event to check the presence of the 'amount' field
        console.log('Event:', event);
        
        // Check if the 'amount' field is defined before processing
        const rewardAmount = event.returnValues && event.returnValues.amount 
          ? web3.utils.fromWei(event.returnValues.amount, 'ether') 
          : 0; // Default to 0 if 'amount' is undefined
        
        totalBribeAmount += parseFloat(rewardAmount);
      });
  
      // Step 5: Set the total bribe amount in the component's state
      setBribes(totalBribeAmount);
    } catch (error) {
      console.error('Error fetching bribes:', error);
      setError('Error fetching bribes for last week');
    }
  };
  


  // Fetch data when the component is mounted
  useEffect(() => {
    const fetchPricesOnce = async () => {
      try {
        const tokenPrices = await fetchTokenPrices();
        setPrices(tokenPrices); // Set prices state
      } catch (error) {
        console.error('Error fetching token prices:', error);
        setError('Error fetching token prices');
      }
    };
  
    fetchPricesOnce();
  }, []);
  
  useEffect(() => {
    if (prices.WETH && prices.USDC && prices.DEUS && prices.AERO) {
      fetchReserves(); // Fetch reserves only after prices are available
    }
  }, [prices]); // Dependency on prices


  useEffect(() => {
    if (reserves.tvl > 0 && prices.AERO > 0) {
      fetchAPR();
    }
    fetchSwapVolumeForPool();
    fetchPoolFeeTier();
  }, [reserves, prices.AERO]);

  useEffect(() => {
    if (feeTier > 0 && swapVolume > 0) {
      const weeklyPoolFees = (swapVolume * (feeTier / 100));
      setWeeklyFees(weeklyPoolFees);
    }
  }, [feeTier, swapVolume]); // Dependencies on feeTier and swapVolume
    
    // Fetch bribes when voter contract is ready
    useEffect(() => {
      fetchBribesForLastWeekEpoch(); // Fetch bribes only when the contract is initialized
  }, []);

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
            <th className="py-3 px-6 text-right">7d Swap Volume (USD)</th>
            <th className="py-3 px-6 text-right">PoolFeeTier (%)</th>
            <th className="py-3 px-6 text-right">7d Fees</th>
            <th className="py-3 px-6 text-right">Pool Bribes</th>



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
            <td className="py-3 px-6 text-right">{swapVolume.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{`${feeTier.toFixed(2)}%`}</td>
            <td className="py-3 px-6 text-right">{weeklyFees.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{bribes.toFixed(2)}</td>




          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BaseFarmComponent;
