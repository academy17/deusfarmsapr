"use client";
import React, { useState, useEffect } from "react";

// Fetch token prices (WETH, DEUS, RAM)
const fetchTokenPrices = async () => {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=wrapped-ethereum,deus-finance-2,ramses-exchange&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`
    );
    const data = await response.json();
    return {
      WETH: data["wrapped-ethereum"]?.usd || 0,
      DEUS: data["deus-finance-2"]?.usd || 0,
      RAM: data["ramses-exchange"]?.usd || 0,
    };
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return { WETH: 0, DEUS: 0, RAM: 0 };
  }
};

// Fetch data from RAMSES API for a specific pool
const fetchRamsesPoolData = async (poolId) => {
  try {
    const response = await fetch(
      "https://kingdom-api-backups.s3.amazonaws.com/ramses_mixed-pairs.json"
    );
    const data = await response.json();

    // Find the pool with the specified ID
    const pool = data.pairs.find(
      (pair) => pair.id.toLowerCase() === poolId.toLowerCase()
    );
    if (!pool) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    // Fetch the latest reserveUSD from the poolDayData array
    const latestDayData = pool.poolDayData?.[0];
    if (!latestDayData || !latestDayData.reserveUSD) {
      throw new Error(`No reserveUSD found for pool ID ${poolId}`);
    }

    return {
      lpApr: pool.lpApr || 0,
      lpPrice: pool.lp_price || 0,
      reserveUSD: Number(latestDayData.reserveUSD) || 0,
    };
  } catch (error) {
    console.error("Error fetching RAMSES pool data:", error);
    return null;
  }
};

const RamsesFarmComponent = ({ poolName, poolId }) => {
  const [tvl, setTvl] = useState(null);
  const [apr, setApr] = useState(null);
  const [lpPrice, setLpPrice] = useState(null);
  const [error, setError] = useState(null);
  const [prices, setPrices] = useState({ WETH: 0, DEUS: 0, RAM: 0 });

  // Fetch RAMSES pool data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch token prices
        const tokenPrices = await fetchTokenPrices();
        setPrices(tokenPrices);

        // Fetch RAMSES pool data
        const poolData = await fetchRamsesPoolData(poolId);
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

  return (
    <div className="mb-10">
      {error && <p className="text-red-500">{error}</p>}
      {!error && tvl && (
        <table className="min-w-full table-auto border-collapse bg-white shadow-lg">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Pool</th>
              <th className="py-3 px-6 text-right">TVL (USD)</th>
              <th className="py-3 px-6 text-right">WETH Price (USD)</th>
              <th className="py-3 px-6 text-right">DEUS Price (USD)</th>
              <th className="py-3 px-6 text-right">RAM Price (USD)</th>
              <th className="py-3 px-6 text-right">LP Price (USD)</th>
              <th className="py-3 px-6 text-right">LP APR (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="py-3 px-6">{poolName}</td>
              <td className="py-3 px-6 text-right">${tvl}</td>
              <td className="py-3 px-6 text-right">${prices.WETH.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">${prices.DEUS.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">${prices.RAM.toFixed(2)}</td>
              <td className="py-3 px-6 text-right">${lpPrice}</td>
              <td className="py-3 px-6 text-right">{apr}%</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RamsesFarmComponent;
