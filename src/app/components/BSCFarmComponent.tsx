"use client";
import React, { useState, useEffect } from "react";

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

const BSCFarmComponent = ({
  poolName,
  poolAddress,
  token0Symbol,
  token1Symbol,
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
  const [prices, setPrices] = useState(null); // Initialize as null
  const [poolData, setPoolData] = useState(null); // Store pool data once fetched

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
  const fetchPoolData = async (poolAddress) => {
    try {
      // Ensure that poolAddress is passed correctly
      if (!poolAddress || typeof poolAddress !== "string") {
        throw new Error("Pool address is missing or invalid.");
      }
      const response = await fetch("https://api.thena.fi/api/v1/fusions");
      const result = await response.json();

      // Ensure the API response has the correct structure
      if (result && Array.isArray(result.data)) {
        const poolData = result.data.find(
          (pool) => pool?.address?.toLowerCase() === poolAddress.toLowerCase()
        );

        if (!poolData) {
          throw new Error(`Pool with address ${poolAddress} not found.`);
        }

        setPoolData(poolData); // Save pool data after fetching

        return poolData;
      } else {
        throw new Error("Unexpected response structure from Thena API");
      }
    } catch (error) {
      console.error("Error fetching pool data from Thena API:", error);
      setError("Error fetching pool data from Thena API");
      return null;
    }
  };

  // First useEffect to fetch prices only once
  useEffect(() => {
    const fetchPricesOnce = async () => {
      await fetchPrices();
    };

    fetchPricesOnce();
  }, []); // Empty array ensures this only runs once after the component mounts

  // Second useEffect to fetch pool data after prices are available
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (prices) {
          // Prices are available, now fetch the pool data
          await fetchPoolData(poolAddress);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    if (prices) {
      fetchData(); // Only fetch data once prices are available
    }
  }, [prices, poolAddress]); // Only run this effect when prices and poolAddress are available

  // Now you can calculate the TVL and APR using the fetched prices and pool data
  useEffect(() => {
    if (poolData && prices) {
      // Calculate TVL
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
      }
    }
  }, [poolData, prices]); // This effect runs when both poolData and prices are available

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

export default BSCFarmComponent;
