"use client";
import React, { useState, useEffect } from "react";
import Web3 from "web3";
import BN from 'bn.js';
import Moralis from 'moralis';
import {initializeMoralis} from '../utils/moralisHelper';
import { getBSCWeb3Instance } from '../utils/bscWeb3Helper';

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
      PION: data["pion"]?.usd || 0,
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
  const getMostRecentThursday = (date: Date) => {
    const day = date.getUTCDay();
    const diff = (7 + day - 4) % 7;
    const recentThursday = new Date(date);
    recentThursday.setUTCDate(date.getUTCDate() - diff);
    recentThursday.setUTCHours(0, 0, 0, 0);
    return recentThursday;
  };

  const inputDate = new Date(timestamp * 1000);
  const mostRecentThursday = getMostRecentThursday(inputDate);

  const epochEnd = mostRecentThursday;

  const epochStart = new Date(epochEnd);
  epochStart.setUTCDate(epochEnd.getUTCDate() - 7);

  const epochStartNumber = Math.floor(epochStart.getTime() / 1000);
  const epochEndNumber = Math.floor(epochEnd.getTime() / 1000);

  return { epochStartNumber, epochEndNumber };
};

const getBlockFromTimestampMoralis = async (timestamp: number): Promise<number | NaN> => {
  try {
    await initializeMoralis();

    const date = new Date(timestamp * 1000).toISOString();

    const response = await Moralis.EvmApi.block.getDateToBlock({
      chain: "0x38",
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
  token0Decimals,
  token1Decimals
) => {
  const swapEvents = await fetchSwapEvents(contract, fromBlock, toBlock);
  let volumeUSD = 0;

  swapEvents.forEach(event => {
    let amount0, amount1;

    if ('amount0Out' in event.returnValues && 'amount1Out' in event.returnValues) {
      // Use outgoing amounts for more accurate swap volume
      amount0 = event.returnValues.amount0Out;
      amount1 = event.returnValues.amount1Out;
    } else if ('amount0' in event.returnValues && 'amount1' in event.returnValues) {
      // Handle alternative format with amount0 and amount1
      amount0 = event.returnValues.amount0;
      amount1 = event.returnValues.amount1;
    } else {
      console.warn('Unknown event format:', event);
      return;
    }

    // Convert amounts to USD values based on token decimals
    const parsedAmount0 = amount0 ? parseFloat(Web3.utils.fromWei(amount0, token0Decimals === 6 ? 'mwei' : 'ether')) : 0;
    const parsedAmount1 = amount1 ? parseFloat(Web3.utils.fromWei(amount1, token1Decimals === 6 ? 'mwei' : 'ether')) : 0;

    // Calculate volume in USD using the outgoing amounts
    if (parsedAmount0 > 0) {
      volumeUSD += parsedAmount0 * (prices[token0Symbol] || 0);
    }
    if (parsedAmount1 > 0) {
      volumeUSD += parsedAmount1 * (prices[token1Symbol] || 0);
    }
  });

  console.log(`Calculated 7-day swap volume in USD: ${volumeUSD}`);
  return volumeUSD;
};



const fetchSwapEvents = async (contract, fromBlock, toBlock) => {
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
};

const fetchFeeTier = async (poolAddress, poolAbi, factoryAbi, factoryAddress) => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_BSC_RPC_URL);
    const poolContract = new web3.eth.Contract(poolAbi, poolAddress);
    const factoryContract = new web3.eth.Contract(factoryAbi, factoryAddress);

    // First, attempt to fetch fee from globalState
    try {
      const globalState = await poolContract.methods.globalState().call();
      const feeTier = Number(globalState.fee);
      console.log(`Fetched fee tier from globalState: ${feeTier}`);
      return { feeTier, scale: 10000 }; // Scale by 10000 for this method
    } catch (error) {
      console.warn("globalState().fee fetch failed, attempting getFee(false)", error);
    }

    // Fallback: call getFee(false) if globalState().fee fails
    try {
      const fee = await factoryContract.methods.getFee(false).call();
      const feeTier = Number(fee);
      console.log(`Fetched fee tier from getFee(false): ${feeTier}`);
      return { feeTier, scale: 100 }; // Scale by 100 for getFee(false)
    } catch (error) {
      console.error("Error executing getFee(false) on pool contract:", error);
      return null; // Exit if both methods fail
    }
  } catch (error) {
    console.error('Error fetching fee tier from pool contract:', error);
    return null;
  }
};


const getNftVotesForEpoch = async (nftId, poolAddress, voterContract, epochEndBlock) => {
  try {
    const nftVotes = await voterContract.methods.votes(nftId, poolAddress).call({}, epochEndBlock);
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
  escrowAddress,
  factoryAbi,
  factoryAddress,
  bribeToken
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
  const [poolData, setPoolData] = useState(null);
  const [swapVolume, setSwapVolume] = useState(0);
  const [feeTier, setFeeTier] = useState(0); 
  const [weeklyFees, setWeeklyFees] = useState(0); 
  const [bribes, setBribes] = useState(0);
  const [NFTVotes, setNFTVotes] = useState(0); 
  const [totalPoolVotes, setTotalPoolVotes] = useState(0);
  const [veNFTBalance, setveNFTBalance] = useState(0);


  const fetchPrices = async () => {
    try {
      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices);
    } catch (err) {
      console.error("Error fetching token prices", err);
      setError("Error fetching token prices");
    }
  };

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

  const fetchReserves = async () => {
    try {
      if (!prices || !poolData) {
        console.error("Missing prices or pool data for reserve calculations.");
        return;
      }
      
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
      const pastTimestamp = calculatePastTimestamp7Days();
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

const fetchPoolFeeTier = async () => {
  try {
    const { feeTier, scale } = await fetchFeeTier(poolAddress, abi, factoryAbi, factoryAddress);
    console.log(`poolfeetier: ${feeTier}`);
    
    // Calculate percentage based on the returned scale
    const poolFeeTierPercentage = feeTier / scale;
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
    const primaryRewardToken = '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44';
    const secondaryRewardToken = '0xb8067235c9b71feec069af151fdf0975dfbdfba5';

    let totalBribeAmount = 0;

    // Helper function to accumulate bribes for a given rewardToken
    const accumulateBribes = (events, rewardToken) => {
      events.forEach(event => {
        const eventRewardToken = event.returnValues.rewardToken?.toLowerCase();
        console.log(`Event rewardToken: ${eventRewardToken}, reward: ${event.returnValues.reward}`);
        
        if (eventRewardToken === rewardToken) {
          const rewardAmount = web3.utils.fromWei(event.returnValues.reward, 'ether');
          totalBribeAmount += parseFloat(rewardAmount);
        }
      });
    };

    // First attempt with primaryRewardToken
    console.log(`Fetching bribes with primary reward token: ${primaryRewardToken}`);
    let events = await bribeContract.getPastEvents('RewardAdded', {
      fromBlock: epochStartBlock,
      toBlock: epochEndBlock,
    });
    accumulateBribes(events, primaryRewardToken);

    // If no bribes found with primary token, try secondaryRewardToken
    if (totalBribeAmount === 0) {
      console.warn(`No bribes found for ${primaryRewardToken}, retrying with secondary reward token: ${secondaryRewardToken}`);
      
      // Re-fetch events to ensure any filtering issues are avoided
      events = await bribeContract.getPastEvents('RewardAdded', {
        fromBlock: epochStartBlock,
        toBlock: epochEndBlock,
      });
      accumulateBribes(events, secondaryRewardToken);
    }

    console.log(`Total Bribe Amount: ${totalBribeAmount}`);
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
    setveNFTBalance(formattedveNFTBalance);
  } catch (err) {
    console.error('Error fetching veNFT data:', err);
  }
};


  useEffect(() => {
    fetchPoolData();
  }, [poolAddress]);

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
  }, [prices, poolData]);

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
              const nftVoteFraction = Number(NFTVotes) / Number(totalPoolVotes);
              console.log(`NFT Votes: ${NFTVotes}`);
              console.log(`Total Pool Votes: ${totalPoolVotes}`);
              console.log(`NFT Vote Fraction: ${nftVoteFraction}`);

              const nftbribeReturn = Number(bribes) * nftVoteFraction;
              console.log(`Bribes: ${bribes}`);
              console.log(`NFT Bribe Return: ${nftbribeReturn}`);

              const bribeDifference = (nftbribeReturn - Number(bribes)) * prices[bribeToken];
              console.log(`Bribe Token Price: ${prices[bribeToken]}`);
              console.log(`Bribe Difference: ${bribeDifference}`);

              const lpFeesReturn = Number(weeklyFees) * nftVoteFraction;
              console.log(`Weekly Fees: ${weeklyFees}`);
              console.log(`LP Fees Return: ${lpFeesReturn}`);

              const annualReturn = (bribeDifference + lpFeesReturn) * 52;
              console.log(`Annual Return: ${annualReturn}`);

              const tvlForveNFT = Number(veNFTBalance) * prices.THENA;
              console.log(`veNFT Balance: ${veNFTBalance}`);
              console.log(`Price of THENA: ${prices.THENA}`);
              console.log(`TVL for veNFT: ${tvlForveNFT}`);

              const epochAPR = (annualReturn / tvlForveNFT) * 100;
              console.log(`Epoch APR: ${epochAPR}`);

            
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
