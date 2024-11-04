"use client";
import React, { useState, useEffect } from "react";
import Web3 from "web3";
import BN from 'bn.js';
import Moralis from 'moralis';
import {initializeMoralis} from '../utils/moralisHelper';
import { getBSCWeb3Instance } from '../utils/bscWeb3Helper';

// Fetch token prices (BNB, DEUS, THENA, PION)
const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=wbnb,deus-finance-2,thena,pion&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    return {
      BNB: data["wbnb"]?.usd || 0,
      DEUS: data["deus-finance-2"]?.usd || 0,
      THENA: data["thena"]?.usd || 0,
      PION: data["pion"]?.usd || 0, // Fetch PION price in USD
    };
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return { BNB: 0, DEUS: 0, THENA: 0, PION: 0 };
  }
};

const calculatePastTimestamp14Days = () => {
  const secondsPerDay = 60 * 60 * 24;
  const timestamp14DaysAgo = Math.floor(Date.now() / 1000) - (14 * secondsPerDay);
  return timestamp14DaysAgo;
};

const calculatePastTimestamp7Days = () => {
  const secondsPerDay = 60 * 60 * 24;
  const timestamp14DaysAgo = Math.floor(Date.now() / 1000) - (7 * secondsPerDay);
  return timestamp14DaysAgo;
};

const getEpochBoundsByTimestamp = async (timestamp: number) => {
  // Helper function to find the most recent Thursday at 00:00 UTC
  const getMostRecentThursday = (date: Date) => {
    const day = date.getUTCDay();
    const diff = (7 + day - 4) % 7; // Days to last Thursday
    const recentThursday = new Date(date);
    recentThursday.setUTCDate(date.getUTCDate() - diff);
    recentThursday.setUTCHours(0, 0, 0, 0); // Set to 00:00 UTC
    return recentThursday;
  };

  const inputDate = new Date(timestamp * 1000); // Convert seconds to milliseconds
  const mostRecentThursday = getMostRecentThursday(inputDate);

  // Set `epochEnd` as the most recent Thursday
  const epochEnd = mostRecentThursday;

  // Set `epochStart` as the Thursday a week before `epochEnd`
  const epochStart = new Date(epochEnd);
  epochStart.setUTCDate(epochEnd.getUTCDate() - 7); // Go back 7 days to the previous Thursday

  // Convert dates to Unix timestamps
  const epochStartNumber = Math.floor(epochStart.getTime() / 1000);
  const epochEndNumber = Math.floor(epochEnd.getTime() / 1000);

  return { epochStartNumber, epochEndNumber };
};

const getBlockFromTimestampMoralis = async (timestamp: number): Promise<number | NaN> => {
  try {
    await initializeMoralis();

    const date = new Date(timestamp * 1000).toISOString(); // Convert seconds to milliseconds and format

    const response = await Moralis.EvmApi.block.getDateToBlock({
      chain: "0x38", // BSC chain ID 
      date: date,
    });

    const blockNumber = response.raw.block;

    return blockNumber;
  } catch (e) {
    console.error('Error fetching block number from Moralis:', e);
    return NaN; 
  }
};

const calculate7dSwapVolume = async (
  prices,
  contract,
  fromBlock,
  toBlock,
  token0Symbol,
  token1Symbol,
  token0Decimals = 18,
  token1Decimals = 18
) => {
  const swapEvents = await fetchSwapEvents(contract, fromBlock, toBlock);
  let volumeUSD = 0;

  swapEvents.forEach((event, index) => {
    const { amount0, amount1 } = event.returnValues;

    // Convert amounts to readable values
    const parsedAmount0 = parseFloat(Web3.utils.fromWei(amount0, "ether"));
    const parsedAmount1 = parseFloat(Web3.utils.fromWei(amount1, "ether"));


    // Check if the parsed amounts are valid numbers
    if (!isNaN(parsedAmount0) && parsedAmount0 < 0) {
      // Token0 was sold in the swap
      volumeUSD += Math.abs(parsedAmount0) * (prices[token0Symbol] || 0);
    } else if (!isNaN(parsedAmount1) && parsedAmount1 < 0) {
      // Token1 was sold in the swap
      volumeUSD += Math.abs(parsedAmount1) * (prices[token1Symbol] || 0);
    }
  });

  return volumeUSD;
};

const fetchSwapEvents = async (contract, fromBlock, toBlock) => {
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
};

const fetchFeeTier = async (poolAddress, poolAbi) => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const poolContract = new web3.eth.Contract(poolAbi, poolAddress);
    
    // Call globalState on the pool contract to get the fee
    const globalState = await poolContract.methods.globalState().call();
    
    // Extract the fee and convert it to a number
    const feeTier = Number(globalState.fee);
    return feeTier;
  } catch (error) {
    console.error('Error fetching fee tier from globalState:', error);
    return null;
  }
};

const getNftVotesForEpoch = async (nftId, poolAddress, voterContract, epochEndBlock) => {
  try {
    const nftVotes = await voterContract.methods.votes(nftId, poolAddress).call({}, epochEndBlock);
    console.log(`nftvotes: ${nftVotes}`);
    return nftVotes;
  } catch (error) {
    console.error('Error fetching NFT votes for epoch:', error);
    return 0;
  }
};

const fetchVeNFTBalance = async (nftId, escrowAbi, escrowAddress) => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const votingEscrowContract = new web3.eth.Contract(escrowAbi, escrowAddress);
    const veNFTBalance = await votingEscrowContract.methods.balanceOfNFT(nftId).call();
    return veNFTBalance; 
  } catch (error) {
    console.error('Error fetching veNFT balance:', error);
    return 0;
  }
};

const BSCFarmComponent = ({
  poolName,
  hyperVisorAddress,
  poolAddress,
  token0Symbol,
  token1Symbol,
  abi,
  bribeAddress,
  bribeAbi,
  voterAddress,
  voterAbi,
  nftId,
  escrowAbi,
  escrowAddress
}) => {
  const [reserves, setReserves] = useState({
    reserve0: 0,
    reserve1: 0,
    price0: 0,
    price1: 0,
    tvl: 0,
  });
  const [apr, setApr] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState({ BNB: 0, DEUS: 0, THENA: 0, PION: 0}); 
  const [poolData, setPoolData] = useState(null); // Store pool data once fetched
  const [swapVolume, setSwapVolume] = useState(0);
  const [feeTier, setFeeTier] = useState(0); 
  const [weeklyFees, setWeeklyFees] = useState(0); 
  const [bribes, setBribes] = useState(0);
  const [NFTVotes, setNFTVotes] = useState(0); 
  const [totalPoolVotes, setTotalPoolVotes] = useState(0);
  const [veNFTBalance, setveNFTBalance] = useState(0);


  // Fetch token prices
  const fetchPrices = async () => {
    try {
      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices); // Set prices state
    } catch (err) {
      console.error("Error fetching token prices", err);
      setError("Error fetching token prices");
    }
  };

  // Fetch Pool Data from Thena API
  const fetchPoolData = async () => {
    try {
      const response = await fetch("https://api.thena.fi/api/v1/fusions");
      const result = await response.json();
      const poolData = result.data.find(
        (pool) => pool?.address?.toLowerCase() === hyperVisorAddress.toLowerCase()
      );
      if (!poolData) throw new Error(`Pool with address ${hyperVisorAddress} not found.`);
      setPoolData(poolData);
    } catch (error) {
      console.error("Error fetching pool data from Thena API:", error);
      setError("Error fetching pool data from Thena API");
    }
  };

  // Fetch and calculate reserves and TVL
  const fetchReserves = async () => {
    try {
      if (!prices || !poolData) {
        console.error("Missing prices or pool data for reserve calculations.");
        return;
      }
      
      // Extract reserves from poolData
      const reserve0 = poolData.token0?.reserve || 0;
      const reserve1 = poolData.token1?.reserve || 0;
      const price0 = prices[token0Symbol];
      const price1 = prices[token1Symbol];

      if (price0 && price1) {
        const tvl = reserve0 * price0 + reserve1 * price1;
        setReserves({
          reserve0: Number(reserve0),
          reserve1: Number(reserve1),
          price0,
          price1,
          tvl,
        });
      } else {
        throw new Error("Prices not available for tokens");
      }
    } catch (error) {
      console.error("Error fetching token balances from the contract:", error);
      setError("Error fetching token balances from the contract");
    }
  };

  const fetchSwapVolumeForLastWeekEpoch = async () => {
    try {
      const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
      const pastTimestamp = calculatePastTimestamp7Days(); // Timestamp from 14 days ago
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp);
      const epochStartBlock = await getBlockFromTimestampMoralis(epochStartNumber);
      const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
      const contract = new web3.eth.Contract(abi, poolAddress);
      const token0Decimals = token0Symbol === 'USDC' ? 6 : 18;
      const token1Decimals = token1Symbol === 'DEUS' ? 18 : 18;
  
      const volumeUSD = await calculate7dSwapVolume(
        prices,
        contract,
        epochStartBlock,
        epochEndBlock, 
        token0Symbol,
        token1Symbol,
        token0Decimals,
        token1Decimals
      );
      console.log(`swapvolume: ${volumeUSD}`);
      setSwapVolume(volumeUSD);
    } catch (error) {
      console.error('Error fetching swap volume for last epoch:', error);
      setError('Error fetching swap volume for last epoch');
    }
  };

// Function to fetch and set the pool fee tier in percentage
const fetchPoolFeeTier = async () => {
  try {
    const poolFeeTier = await fetchFeeTier(poolAddress, abi);
    console.log(`poolfeetier: ${poolFeeTier}`);
    const poolFeeTierPercentage = poolFeeTier / 10000;
    console.log(`poolfeetierpct: ${poolFeeTierPercentage}`);
    setFeeTier(poolFeeTierPercentage);
  } catch (error) {
    console.error('Error fetching and setting pool fee tier:', error);
  }
};


const fetchBribesForLastWeekEpoch = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const latestTimestamp = Math.floor(Date.now() / 1000);
    const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(latestTimestamp);
    const epochStartBlock = await getBlockFromTimestampMoralis(epochStartNumber);
    const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
    
    const bribeContract = new web3.eth.Contract(bribeAbi, bribeAddress);
    const events = await bribeContract.getPastEvents('RewardAdded', {
      fromBlock: epochStartBlock,
      toBlock: epochEndBlock,
    });

    let totalBribeAmount = 0;
    events.forEach(event => {
      // Check if the rewardToken matches the desired address
      if (event.returnValues.rewardToken.toLowerCase() === '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44') {
        const rewardAmount = web3.utils.fromWei(event.returnValues.reward, 'ether');
        totalBribeAmount += parseFloat(rewardAmount);
      }
    });

    setBribes(totalBribeAmount);
  } catch (error) {
    console.error('Error fetching bribes:', error);
    setError('Error fetching bribes for last week');
  }
};

const fetchNftVotesForEpoch = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const pastTimestamp = calculatePastTimestamp14Days(); 
    const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
    const latestTimestamp = Math.floor(Date.now() / 1000);
    const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp);
    const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
    const epochEndBlockFotVotes = epochEndBlock - 10;
          const nftVotesbyId = await getNftVotesForEpoch(nftId, hyperVisorAddress, voterContract, epochEndBlockFotVotes);
          const formattedNFTVotes = web3.utils.fromWei(nftVotesbyId, 'ether');
          setNFTVotes(formattedNFTVotes);
  } catch (err) {
    console.error("failed to fetch nft votes", error);
    setError('Error fetching votes by NFT for last week');
  }
};

const fetchTotalPoolVotesForEpoch = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const pastTimestamp = calculatePastTimestamp14Days(); 
    const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
    const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp, voterContract);
    const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
    const epochEndBlockForVotes = epochEndBlock - 10;
    
    const totalVotesForPool = await voterContract.methods.weights(hyperVisorAddress).call({}, epochEndBlockForVotes);
    
    const formattedTotalVotes = web3.utils.fromWei(totalVotesForPool, 'ether');
    
    setTotalPoolVotes(formattedTotalVotes);
  } catch (err) {
    console.error("Failed to fetch total pool votes", err);
    setError('Error fetching total pool votes for last week');
  }
};
const fetchVeNFTData = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const veNFTBalance = await fetchVeNFTBalance(nftId, escrowAbi, escrowAddress);
    console.log(`venftbalance: ${veNFTBalance}`);
    const formattedveNFTBalance = web3.utils.fromWei(veNFTBalance, 'ether');
    setveNFTBalance(formattedveNFTBalance); // Now it will accept the number type
  } catch (err) {
    console.error('Error fetching veNFT data:', err);
  }
};


  useEffect(() => {
    fetchPoolData();
  }, [poolAddress]); // Fetch prices and pool data once when component mounts

  useEffect(() => {
    const fetchPricesOnce = async () => {
      try {
        const tokenPrices = await fetchTokenPrices();
        console.log("Fetched token prices:", tokenPrices);
        setPrices(tokenPrices); 
      } catch (error) {
        console.error('Error fetching token prices:', error);
        setError('Error fetching token prices');
      }
    };
  
    fetchPricesOnce();
  }, []);

  useEffect(() => {
    if (prices && poolData) {
      console.log("Prices and pool data available, calculating reserves...");
      fetchReserves();
    } else {
      console.log("Waiting for prices and pool data to be available...");
    }
  }, [prices, poolData]); // Calculate reserves only when both prices and poolData are available

  useEffect(() => {
    if (reserves.tvl > 0 && prices.DEUS > 0) {
      console.log(`fetching swap volume...`);
      fetchSwapVolumeForLastWeekEpoch();
      fetchPoolFeeTier();
    }
  }, [reserves.tvl, prices.DEUS]); 

  useEffect(() => {
    if (feeTier > 0 && swapVolume > 0) {
      const weeklyPoolFees = (swapVolume * (feeTier / 100));
      setWeeklyFees(weeklyPoolFees);
    }
  }, [feeTier, swapVolume]); 

  useEffect(() => {
    fetchBribesForLastWeekEpoch();
    fetchNftVotesForEpoch();
    fetchTotalPoolVotesForEpoch(); 
    fetchVeNFTData(); 
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
            <th className="py-3 px-6 text-right">Last Epoch Volume (USD)</th>
            <th className="py-3 px-6 text-right">PoolFeeTier (%)</th>
            <th className="py-3 px-6 text-right">7d Fees</th>
            <th className="py-3 px-6 text-right">Pool Bribes</th>
            <th className="py-3 px-6 text-right">veNFT Votes for Pool</th>
            <th className="py-3 px-6 text-right">Total Votes for Pool</th>
            <th className="py-3 px-6 text-right">Annualized veNFT APR (%)</th>

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
            <td className="py-3 px-6 text-right">{apr ? `${apr}%` : "Calculating..."}</td>
            <td className="py-3 px-6 text-right">{swapVolume.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{`${feeTier.toFixed(2)}%`}</td>
            <td className="py-3 px-6 text-right">{weeklyFees.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{bribes.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{Number(NFTVotes).toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{Number(totalPoolVotes).toFixed(2)}</td>
            {(() => {
            const nftVoteFraction = Number(NFTVotes) / Number(totalPoolVotes); // Fraction of votes
            const nftbribeReturn = Number(bribes) * nftVoteFraction; // Bribe return in USD
            const bribeDifference = nftbribeReturn - Number(bribes) * prices.DEUS;
            const lpFeesReturn = Number(weeklyFees) * nftVoteFraction; // LP fees return
            const annualReturn = (bribeDifference + lpFeesReturn) * 52; // Annual return
            const tvlForveNFT = Number(veNFTBalance) * prices.THENA; // TVL for  veNFT 
            const epochAPR = (annualReturn / tvlForveNFT) * 100; // APR in percentage
            
            return (
              <td className="py-3 px-6 text-right">
                {Number(epochAPR).toFixed(2)}%
              </td>
            );
          })()}


          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BSCFarmComponent;
