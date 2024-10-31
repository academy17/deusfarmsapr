"use client";
import React, { useState, useEffect } from "react";
import Web3 from "web3";
import BN from 'bn.js';
import Moralis from 'moralis';
import {initializeMoralis} from '../utils/moralisHelper';
import { getWeb3Instance } from '../utils/fantomWeb3Helper';


// Fetch token prices (SOLID, DEUS, FTM)
const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solidlydex,deus-finance-2,fantom&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    return {
      SOLID: data["solidlydex"]?.usd || 0,
      DEUS: data["deus-finance-2"]?.usd || 0,
      WFTM: data["fantom"]?.usd || 0,
    };
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return { SOLID: 0, DEUS: 0, FTM: 0 };
  }
};

const fetchRewardRate = async (gaugeAbi, gaugeAddress, solidlyTokenAddress) => {
  try {
    const web3 = new Web3(process.env.NEXT_PUBLIC_ANKR_FANTOM_RPC_URL);
    const gauge = new web3.eth.Contract(gaugeAbi, gaugeAddress);
    const rewardTokenRate = await gauge.methods.rewardRate(solidlyTokenAddress).call();
    return rewardTokenRate;
  } catch (error) {
    console.error('Error fetching reward rate:', error);
    return null;
  }
};

const calculateAPR = (rewardRate, solidlyPrice, tvl) => {
  const rewardRatePerSecond = BigInt(rewardRate);
  const decimals = BigInt(10 ** 18);
  const secondsInDay = BigInt(86400);
  const daysInYear = BigInt(365);
  const annualEmissions = (rewardRatePerSecond * secondsInDay * daysInYear) / decimals;
  const annualEmissionsUSD = Number(annualEmissions) * solidlyPrice;
  const apr = (annualEmissionsUSD * 100) / tvl;
  return apr.toFixed(2);
};

const fetchSwapEvents = async (contract, fromBlock, toBlock) => {
  return await contract.getPastEvents('Swap', {
    fromBlock,
    toBlock,
  });
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
  console.log(`Initial volUSD: ${volumeUSD}`);

  swapEvents.forEach((event, index) => {
    const { amount0, amount1 } = event.returnValues;

    // Convert amounts to readable values
    const parsedAmount0 = parseFloat(Web3.utils.fromWei(amount0, "ether"));
    const parsedAmount1 = parseFloat(Web3.utils.fromWei(amount1, "ether"));

    console.log(`Event ${index} - Parsed Amount0: ${parsedAmount0}, Parsed Amount1: ${parsedAmount1}`);

    // Check if the parsed amounts are valid numbers
    if (!isNaN(parsedAmount0) && parsedAmount0 < 0) {
      // Token0 was sold in the swap
      volumeUSD += Math.abs(parsedAmount0) * (prices[token0Symbol] || 0);
    } else if (!isNaN(parsedAmount1) && parsedAmount1 < 0) {
      // Token1 was sold in the swap
      volumeUSD += Math.abs(parsedAmount1) * (prices[token1Symbol] || 0);
    }
  });

  console.log(`Final volUSD after processing: ${volumeUSD}`);
  return volumeUSD;
};



/*
const fetchFeeTier = async (poolAddress, _stable, factoryAbi, factoryAddress) => {
  try {
    const web3 = getWeb3Instance();
    const factoryContract = new web3.eth.Contract(factoryAbi, factoryAddress);
    const feeTier = await factoryContract.methods.getRealFee(poolAddress).call();
    const feeTierNumber = Number(feeTier);
    return feeTierNumber;
  } catch (error) {
    console.error('Error fetching fee tier:', error);
    return null;
  }
};
*/
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
      chain: "0xfa", // Fantom chain ID 
      date: date,
    });

    const blockNumber = response.raw.block;

    return blockNumber;
  } catch (e) {
    console.error('Error fetching block number from Moralis:', e);
    return NaN; 
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
    const web3 = getWeb3Instance();
    const votingEscrowContract = new web3.eth.Contract(escrowAbi, escrowAddress);
    const veNFTBalance = await votingEscrowContract.methods.balanceOfNFT(nftId).call();
    return veNFTBalance; 
  } catch (error) {
    console.error('Error fetching veNFT balance:', error);
    return 0;
  }
};


// Main SolidlyFarmComponent
const SolidlyFarmComponent = ({
  poolName,
  poolAddress,
  gaugeAddress,
  token0Symbol,
  token1Symbol,
  solidTokenAddress,
  abi,
  decimalsToken0,
  decimalsToken1,
  gaugeAbi,
  voterAbi,
  voterAddress,
  bribeAbi,
  bribeAddress,
  nftId, 
  escrowAbi,  
  escrowAddress
}) => {
  const [reserves, setReserves] = useState({ reserve0: 0, reserve1: 0, price0: 0, price1: 0, tvl: 0 });
  const [apr, setApr] = useState(null);
  const [swapVolume, setSwapVolume] = useState(0);
  const [feeTier, setFeeTier] = useState(0); 
  const [weeklyFees, setWeeklyFees] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState({ SOLID: 0, DEUS: 0, WFTM: 0}); 
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

  // Fetch Reserves for wFTM and DEUS in the LP contract
  const fetchReserves = async () => {
    try {
      // Token contract addresses
      const web3 = new Web3(process.env.NEXT_PUBLIC_ANKR_FANTOM_RPC_URL);
      const wFTMAddress = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"; // wFTM
      const DEUSAddress = "0xDE55B113A27Cc0c5893CAa6Ee1C020b6B46650C0"; // DEUS
  
      // ABI for balanceOf function
      const tokenABI = [
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      ];
  
      // Create contract instances for wFTM and DEUS
      const wFTMContract = new web3.eth.Contract(tokenABI, wFTMAddress);
      const DEUSContract = new web3.eth.Contract(tokenABI, DEUSAddress);
  
      // Query the balances of wFTM and DEUS in the LP contract
      const wFTMBalance = await wFTMContract.methods.balanceOf(poolAddress).call();
      const DEUSBalance = await DEUSContract.methods.balanceOf(poolAddress).call();
  
      // Fetch token prices
      if (!prices) return;
      const price0 = prices.WFTM;
      const price1 = prices.DEUS;

      if (!price0 || !price1) {
        throw new Error("Prices not available for tokens");
      }

      // Set the reserves and TVL
      const reserve0 = BigInt(wFTMBalance) / BigInt(10 ** 18); // wFTM has 18 decimals
      const reserve1 = BigInt(DEUSBalance) / BigInt(10 ** 18); // DEUS has 18 decimals
      const tvl = Number(reserve0) * price0 + Number(reserve1) * price1;
  
      setReserves({
        reserve0: Number(reserve0),
        reserve1: Number(reserve1),
        price0,
        price1,
        tvl,
      });
    } catch (error) {
      console.error("Error fetching token balances from the contract:", error);
      setError("Error fetching token balances from the contract");
    }
  };

  const fetchSwapVolumeForLastWeekEpoch = async () => {
    try {
      const web3 = new Web3(process.env.NEXT_PUBLIC_ANKR_FANTOM_RPC_URL);
      const pastTimestamp = calculatePastTimestamp7Days(); // Timestamp from 14 days ago
      const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp, voterContract);
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
      console.log(`SWAPvolume: ${volumeUSD}`);
      setSwapVolume(volumeUSD);
    } catch (error) {
      console.error('Error fetching swap volume for last epoch:', error);
      setError('Error fetching swap volume for last epoch');
    }
  };


  const fetchPoolFeeTier = async () => {
    try {
      const poolFeeTier = 50;
      const poolFeeTierPercentage = poolFeeTier / 100;
      setFeeTier(poolFeeTierPercentage);
      console.log(`poolFeeTierPercentage: ${poolFeeTierPercentage}`);

    }
    catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAPR = async () => {
    try {
      const rewardRate = await fetchRewardRate(gaugeAbi, gaugeAddress, solidTokenAddress); // Pass EQUAL token address
      if (rewardRate && reserves.tvl && prices.EQUAL) { // Ensure EQUAL price is used
        const aprValue = calculateAPR(rewardRate, prices.EQUAL, reserves.tvl); // Use EQUAL price in APR calculation
        setApr(aprValue);
      }
    } catch (err) {
      setError('Error fetching APR');
    }
  };

  const fetchBribesForLastWeekEpoch = async () => {
    try {
      const web3 = getWeb3Instance();
      const latestTimestamp = Math.floor(Date.now() / 1000);
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(latestTimestamp);
      const epochStartBlock = await getBlockFromTimestampMoralis(epochStartNumber);
      console.log(`epochStartBlock: ${epochStartBlock}`);
      const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
      console.log(`epochEndBlock: ${epochEndBlock}`);
      const bribeContract = new web3.eth.Contract(bribeAbi, bribeAddress);
      const events = await bribeContract.getPastEvents('DepositBribe', {
        fromBlock: epochStartBlock,
        toBlock: epochEndBlock,
        filter: {
          token: '0xDE55B113A27Cc0c5893CAa6Ee1C020b6B46650C0',  // Replace with the token address if needed
        },
      });
  
      // Calculate total bribe amount
      let totalBribeAmount = 0;
      events.forEach(event => {
        const bribeAmount = event.returnValues && event.returnValues.amount 
          ? web3.utils.fromWei(event.returnValues.amount, 'ether') 
          : 0;
        totalBribeAmount += parseFloat(bribeAmount);
      });
  
      setBribes(totalBribeAmount);
    } catch (error) {
      console.error('Error fetching bribes:', error);
      setError('Error fetching bribes for last week');
    }
  };


  const fetchNftVotesForEpoch = async () => {
    try {
      const web3 = getWeb3Instance();
      const pastTimestamp = calculatePastTimestamp14Days(); 
      const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
      const latestTimestamp = Math.floor(Date.now() / 1000);
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(latestTimestamp);
      const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
      const epochEndBlockFotVotes = epochEndBlock - 10;
            const nftVotesbyId = await getNftVotesForEpoch(nftId, poolAddress, voterContract, epochEndBlockFotVotes);
            const formattedNFTVotes = web3.utils.fromWei(nftVotesbyId, 'ether');
            setNFTVotes(formattedNFTVotes);
    } catch (err) {
      console.error("failed to fetch nft votes", error);
      setError('Error fetching votes by NFT for last week');
    }
  };
  
  const fetchTotalPoolVotesForEpoch = async () => {
    try {
      const web3 = getWeb3Instance();
      const pastTimestamp = calculatePastTimestamp14Days(); 
      const voterContract = new web3.eth.Contract(voterAbi, voterAddress);
      const { epochStartNumber, epochEndNumber } = await getEpochBoundsByTimestamp(pastTimestamp, voterContract);
      const epochEndBlock = await getBlockFromTimestampMoralis(epochEndNumber);
      const epochEndBlockForVotes = epochEndBlock - 10;
      
      const totalVotesForPool = await voterContract.methods.weights(poolAddress).call({}, epochEndBlockForVotes);
      
      const formattedTotalVotes = web3.utils.fromWei(totalVotesForPool, 'ether');
      
      setTotalPoolVotes(formattedTotalVotes);
    } catch (err) {
      console.error("Failed to fetch total pool votes", err);
      setError('Error fetching total pool votes for last week');
    }
  };
  const fetchVeNFTData = async () => {
    try {
      const web3 = getWeb3Instance();
      const veNFTBalance = await fetchVeNFTBalance(nftId, escrowAbi, escrowAddress);
      const formattedveNFTBalance = web3.utils.fromWei(veNFTBalance, 'ether');
      console.log(`nftBalance: ${veNFTBalance}`);
      setveNFTBalance(formattedveNFTBalance); // Now it will accept the number type
    } catch (err) {
      console.error('Error fetching veNFT data:', err);
    }
  };

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
    if (prices.DEUS && prices.WFTM) {
      console.log("Prices available for DEUS and WFTM, fetching reserves...");
      fetchReserves();
    } else {
      console.log("Prices not yet available for DEUS or WFTM");
    }
  }, [prices]); 
  
  useEffect(() => {
    if (reserves.tvl > 0 && prices.SOLID > 0 && prices.WFTM > 0 && prices.DEUS > 0) {
      console.log("All required prices and reserves are available, fetching swap volume and pool fee tier...");
      fetchSwapVolumeForLastWeekEpoch();
      fetchPoolFeeTier();
    } else {
      console.log("Waiting for prices and reserves to be populated:", {
        tvl: reserves.tvl,
        prices,
      });
    }
  }, [reserves, prices.SOLID, prices.WFTM, prices.DEUS]); 
  
  useEffect(() => {
    if (feeTier > 0 && swapVolume > 0) {
      const weeklyPoolFees = (swapVolume * (feeTier / 100));
      console.log(`Calculated weekly pool fees: ${weeklyPoolFees}`);
      setWeeklyFees(weeklyPoolFees);
    }
  }, [feeTier, swapVolume]); 
  
  useEffect(() => {
    console.log("Fetching bribes and NFT data...");
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
            <td className="py-3 px-6 text-right">{apr ? `${apr}%` : 'Calculating...'}</td>
            <td className="py-3 px-6 text-right">{swapVolume.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{`${feeTier.toFixed(2)}%`}</td>
            <td className="py-3 px-6 text-right">{weeklyFees.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{bribes.toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{Number(NFTVotes).toFixed(2)}</td>
            <td className="py-3 px-6 text-right">{Number(totalPoolVotes).toFixed(2)}</td>
            {(() => {
            const nftVoteFraction = Number(NFTVotes) / Number(totalPoolVotes);
            console.log(`nftVoteFraction: ${nftVoteFraction}`);

            const nftbribeReturn = Number(bribes) * nftVoteFraction;
            console.log(`nftbribeReturn (USD): ${nftbribeReturn}`);

            const bribeDifference = nftbribeReturn - Number(bribes) * prices.DEUS;
            console.log(`bribeDifference: ${bribeDifference}`);

            const lpFeesReturn = Number(weeklyFees) * nftVoteFraction;
            console.log(`lpFeesReturn: ${lpFeesReturn}`);

            const annualReturn = (bribeDifference + lpFeesReturn) * 52;
            console.log(`annualReturn: ${annualReturn}`);

            const tvlForveNFT = Number(veNFTBalance) * prices.SOLID;
            console.log(`tvlForveNFT: ${tvlForveNFT}`);

            const epochAPR = (annualReturn / tvlForveNFT) * 100;
            console.log(`epochAPR (%): ${epochAPR}`);

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

export default SolidlyFarmComponent;
