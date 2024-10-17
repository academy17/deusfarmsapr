"use client";
import React, { useState, useEffect } from "react";
import Web3 from "web3";

// Fetch token prices (SOLID, DEUS, FTM)
const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solidly,deus-finance-2,fantom&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    return {
      SOLID: data["solidlydex"]?.usd || 0,
      DEUS: data["deus-finance-2"]?.usd || 0,
      FTM: data["fantom"]?.usd || 0,
    };
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return { SOLID: 0, DEUS: 0, FTM: 0 };
  }
};

// Main SolidlyFarmComponent
const SolidlyFarmComponent = ({ poolName, poolAddress, token0Symbol, token1Symbol }) => {
  const [reserves, setReserves] = useState({
    reserve0: 0,
    reserve1: 0,
    price0: 0,
    price1: 0,
    tvl: 0,
  });
  const [apr, setApr] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState(null); // Initialize as null

  const web3 = new Web3(process.env.NEXT_PUBLIC_ANKR_FANTOM_RPC_URL);

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
      const price0 = prices.FTM;
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

  // Fetch prices and reserves on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchPrices();
    };

    fetchData();
  }, []); // Empty array ensures this only runs once after the component mounts

  useEffect(() => {
    if (prices) {
      fetchReserves();
    }
  }, [prices]); // Only fetch reserves after prices are available

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
            <td className="py-3 px-6 text-right">{apr ? `${apr}%` : "Calculating..."}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SolidlyFarmComponent;
