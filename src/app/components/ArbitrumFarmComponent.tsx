"use client";
import React, { useState, useEffect } from "react";
import Web3 from "web3";
import BN from 'bn.js';
import Moralis from 'moralis';
import {initializeMoralis} from '../utils/moralisHelper';

const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=weth,deus-finance-2,ramses-exchange,usd-coin&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    return {
      WETH: data["weth"]?.usd || 0,
      DEUS: data["deus-finance-2"]?.usd || 0,
      RAM: data["ramses-exchange"]?.usd || 0,
      USDC: data["usd-coin"]?.usd || 0
    };
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return { WETH: 0, DEUS: 0, RAM: 0, USDC: 0 };
  }
};


const fetchRamsesPoolData = async (poolId) => {
  try {
    const response = await fetch(
      "https://kingdom-api-backups.s3.amazonaws.com/ramses_mixed-pairs.json"
    );
    const data = await response.json();

    const pool = data.pairs.find(
      (pair) => pair.id.toLowerCase() === poolId.toLowerCase()
    );
    if (!pool) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }
    const latestDayData = pool.poolDayData?.[0];
    const reserveUSD = latestDayData?.reserveUSD || latestDayData?.tvlUSD || 0;
    return {
      lpApr: pool.lpApr || 0,
      lpPrice: pool.lp_price || 0,
      reserveUSD: Number(reserveUSD),
    };
  } catch (error) {
    console.error("Error fetching RAMSES pool data:", error);
    return null;
  }
};

const calculatePastTimestamp7Days = () => {
  const secondsPerDay = 60 * 60 * 24;
  const timestamp7DaysAgo = Math.floor(Date.now() / 1000) - (7 * secondsPerDay);
  return timestamp7DaysAgo;
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
      chain: "0xa4b1",
      date: date,
    });

    const blockNumber = response.raw.block;

    return blockNumber;
  } catch (e) {
    console.error('Error fetching block number from Moralis:', e);
    return NaN; 
  }
};

const fetchFeeTier = async (poolId, pairFactoryAbi, factoryAddress) => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
    const factoryContract = new web3.eth.Contract(pairFactoryAbi, factoryAddress);

    const fee = await factoryContract.methods.pairFee(poolId).call();

    const feeTier = Number(fee);
    console.log(`Fee tier for pool ${poolId}:`, feeTier);

    return feeTier;
  } catch (error) {
    console.error('Error fetching fee tier from factory contract:', error);
    return null;
  }
};


const calculatePastTimestamp14Days = () => {
  const secondsPerDay = 60 * 60 * 24;
  const timestamp14DaysAgo = Math.floor(Date.now() / 1000) - (14 * secondsPerDay);
  return timestamp14DaysAgo;
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
  console.log()
  let volumeUSD = 0;

  swapEvents.forEach(event => {
    let amount0, amount1;

    if ('amount0In' in event.returnValues && 'amount1In' in event.returnValues) {
      amount0 = event.returnValues.amount0In;
      amount1 = event.returnValues.amount1In;
    } else if ('amount0' in event.returnValues && 'amount1' in event.returnValues) {
      amount0 = event.returnValues.amount0;
      amount1 = event.returnValues.amount1;
    } else {
      console.warn('Unknown event format:', event);
      return;
    }

    const parsedAmount0 = amount0 ? parseFloat(Web3.utils.fromWei(amount0, token0Decimals === 6 ? 'mwei' : 'ether')) : 0;
    const parsedAmount1 = amount1 ? parseFloat(Web3.utils.fromWei(amount1, token1Decimals === 6 ? 'mwei' : 'ether')) : 0;

    if (parsedAmount0 > 0) {
      volumeUSD += Math.abs(parsedAmount0) * (prices[token0Symbol] || 0);
    } else if (parsedAmount1 > 0) {
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
    const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
    const votingEscrowContract = new web3.eth.Contract(escrowAbi, escrowAddress);
    const veNFTBalance = await votingEscrowContract.methods.balanceOfNFT(nftId).call();
    return veNFTBalance; 
  } catch (error) {
    console.error('Error fetching veNFT balance:', error);
    return 0;
  }
};

const RamsesFarmComponent = ({ 
  poolName, 
  poolId,
  abi,
  token0Symbol,
  token1Symbol,
  decimalsToken0,
  decimalsToken1,
  bribeAddress,
  bribeAbi,
  voterAddress,
  voterAbi,
  nftId,
  escrowAbi,
  escrowAddress,
  pairFactoryAbi,
  factoryAddress
}) => {
  const [poolData, setPoolData] = useState(null);
  const [tvl, setTvl] = useState(null);
  const [apr, setApr] = useState(null);
  const [lpPrice, setLpPrice] = useState(null);
  const [error, setError] = useState(null);
  const [prices, setPrices] = useState({ WETH: 0, DEUS: 0, RAM: 0, USDC: 0 });
  const [swapVolume, setSwapVolume] = useState(0);
  const [feeTier, setFeeTier] = useState(0); 
  const [weeklyFees, setWeeklyFees] = useState(0); 
  const [bribes, setBribes] = useState(0);
  const [NFTVotes, setNFTVotes] = useState(0); 
  const [totalPoolVotes, setTotalPoolVotes] = useState(0);
  const [veNFTBalance, setveNFTBalance] = useState(0);


  const fetchSwapVolumeForLastWeekEpoch = async () => {
    try {
      console.log("Starting fetchSwapVolumeForLastWeekEpoch...");
  
      const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
      const pastTimestamp = calculatePastTimestamp7Days();
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp);
      const epochStartBlock = await getBlockFromTimestampMoralis(epochStartNumber);
      const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
      const contract = new web3.eth.Contract(abi, poolId);
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
  
      console.log(`Calculated swap volume in USD: ${volumeUSD}`);
      setSwapVolume(volumeUSD);
    } catch (error) {
      console.error("Error fetching swap volume for last epoch:", error);
      setError("Error fetching swap volume for last epoch");
    }
  };
  
const fetchPoolFeeTier = async () => {
  try {
    let poolFeeTier = null;
    let scale = 100;

    try {
      poolFeeTier = await fetchFeeTier(poolId, pairFactoryAbi, factoryAddress);
      console.log(`Fetched pool fee tier from fetchFeeTier: ${poolFeeTier}`);
    } catch (error) {
      console.warn('fetchFeeTier failed, attempting currentFee() on pool contract.', error);
    }

    if (poolFeeTier === null) {
      try {
        const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
        const poolContract = new web3.eth.Contract(abi, poolId);
        poolFeeTier = await poolContract.methods.currentFee().call();
        console.log(`Fetched pool fee tier from currentFee(): ${poolFeeTier}`);
        scale = 10000;
      } catch (contractError) {
        console.error("Error executing currentFee() on pool contract:", contractError);
        return;
      }
    }

    const feeTierValue = typeof poolFeeTier === 'bigint' ? Number(poolFeeTier) : poolFeeTier;
    const poolFeeTierPercentage = feeTierValue / scale;
    console.log(`Pool fee tier percentage: ${poolFeeTierPercentage}`);
    setFeeTier(poolFeeTierPercentage);
  } catch (error) {
    console.error('Error fetching and setting pool fee tier:', error);
  }
};



const fetchBribesForLastWeekEpoch = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);

    const pastTimestamp = calculatePastTimestamp14Days(); 
    const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp);

    const epochStartBlock = await getBlockFromTimestampMoralis(epochStartNumber);
    const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);

    const bribeContract = new web3.eth.Contract(bribeAbi, bribeAddress);

    const events = await bribeContract.getPastEvents('Bribe', {
      fromBlock: epochStartBlock,
      toBlock: epochEndBlock,
    });

    let totalBribeAmount = 0;

    events.forEach(event => {
      if (event.returnValues.reward.toLowerCase() === '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44') {
        const rewardAmount = web3.utils.fromWei(event.returnValues.amount, 'ether');
        totalBribeAmount += parseFloat(rewardAmount);
      }
    });

    console.log(`Total Bribe Amount for Last Epoch: ${totalBribeAmount}`);
    setBribes(totalBribeAmount);
  } catch (error) {
    console.error('Error fetching bribes for the last epoch:', error);
    setError('Error fetching bribes for the last epoch');
  }
};
  
const fetchNftVotesForEpoch = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
    const pastTimestamp = calculatePastTimestamp14Days(); 
    const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
    const latestTimestamp = Math.floor(Date.now() / 1000);
    const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp);
    const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
    const epochEndBlockFotVotes = epochEndBlock - 10;
          const nftVotesbyId = await getNftVotesForEpoch(nftId, poolId, voterContract, epochEndBlockFotVotes);
          console.log(`nftvotesepoch: ${nftVotesbyId}`);
          const formattedNFTVotes = web3.utils.fromWei(nftVotesbyId, 'ether');
          setNFTVotes(formattedNFTVotes);
  } catch (err) {
    console.error("failed to fetch nft votes", error);
    setError('Error fetching votes by NFT for last week');
  }
};

const fetchTotalPoolVotesForEpoch = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
    const pastTimestamp = calculatePastTimestamp14Days(); 
    const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
    const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp, voterContract);
    const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
    const epochEndBlockForVotes = epochEndBlock - 10;
    
    const totalVotesForPool = await voterContract.methods.weights(poolId).call({}, epochEndBlockForVotes);
    console.log(`totalvotes: ${totalPoolVotes}`);
    const formattedTotalVotes = web3.utils.fromWei(totalVotesForPool, 'ether');
    
    setTotalPoolVotes(formattedTotalVotes);
  } catch (err) {
    console.error("Failed to fetch total pool votes", err);
    setError('Error fetching total pool votes for last week');
  }
};
const fetchVeNFTData = async () => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ARB_RPC_URL);
    const veNFTBalance = await fetchVeNFTBalance(nftId, escrowAbi, escrowAddress);
    console.log(`venftbalance: ${veNFTBalance}`);
    const formattedveNFTBalance = web3.utils.fromWei(veNFTBalance, 'ether');
    setveNFTBalance(formattedveNFTBalance);
  } catch (err) {
    console.error('Error fetching veNFT data:', err);
  }
};

useEffect(() => {
  const fetchData = async () => {
    try {
      const tokenPrices = await fetchTokenPrices();
      setPrices(tokenPrices);
      const poolData = await fetchRamsesPoolData(poolId);
      setPoolData(poolData);

      if (poolData) {
        setTvl(poolData.reserveUSD.toFixed(2));
        setApr(poolData.lpApr.toFixed(2));
        setLpPrice(poolData.lpPrice.toFixed(2));
      } else {
        throw new Error("Failed to fetch pool data");
      }
    } catch (err) {
      setError(err.message || "Error fetching pool data");
    }
  };

  fetchData();
}, [poolId]);

useEffect(() => {
  if (
    poolData &&
    prices.WETH > 0 &&
    prices.DEUS > 0 &&
    prices.RAM > 0 &&
    prices.USDC > 0
  ) {
    console.log("Fetching swap volume...");
    fetchSwapVolumeForLastWeekEpoch();
    fetchPoolFeeTier();

  }
}, [poolData, prices]);



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
      {!error && tvl && (
        <table className="min-w-full table-auto border-collapse bg-white shadow-lg">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Pool</th>
              <th className="py-3 px-6 text-right">TVL (USD)</th>
              <th className="py-3 px-6 text-right">Token0 Price (USD)</th>
              <th className="py-3 px-6 text-right">Token1 Price (USD)</th>
              <th className="py-3 px-6 text-right">LP Price (USD)</th>
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
              <td className="py-3 px-6 text-right">${tvl}</td>
              <td className="py-3 px-6 text-right">${prices[token0Symbol].toFixed(2)}</td>
              <td className="py-3 px-6 text-right">${prices[token1Symbol].toFixed(2)}</td>
              <td className="py-3 px-6 text-right">${lpPrice}</td>
              <td className="py-3 px-6 text-right">{apr}%</td>
              <td className="py-3 px-6 text-right">{swapVolume.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">{`${feeTier.toFixed(2)}%`}</td>
              <td className="py-3 px-6 text-right">{weeklyFees.toFixed(2)}</td>
               <td className="py-3 px-6 text-right">{bribes.toFixed(2)}</td>
               <td className="py-3 px-6 text-right">{Number(NFTVotes).toFixed(2)}</td>
             <td className="py-3 px-6 text-right">{Number(totalPoolVotes).toFixed(2)}</td>
             {(() => {
            const nftVoteFraction = Number(NFTVotes) / Number(totalPoolVotes);
            const nftbribeReturn = Number(bribes) * nftVoteFraction;
            const bribeDifference = nftbribeReturn - Number(bribes) * prices.DEUS;
            const lpFeesReturn = Number(weeklyFees) * nftVoteFraction;
            const annualReturn = (bribeDifference + lpFeesReturn) * 52;
            const tvlForveNFT = Number(veNFTBalance) * prices.RAM;
            const epochAPR = (annualReturn / tvlForveNFT) * 100;
            
            return (
              <td className="py-3 px-6 text-right">
                {Number(epochAPR).toFixed(2)}%
              </td>
            );
          })()}

            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RamsesFarmComponent;


