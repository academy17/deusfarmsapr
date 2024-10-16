"use client"; // Add this at the top
import React from 'react';

//BASE
import BaseFarmComponent from './BaseFarmComponent';
import WETH_DEUS_AERO_ABI from './abis/base/WETH_DEUS_AERO_ABI.json';
import WETH_DEUS_GAUGE_CONTRACT_ABI from './abis/base/WETH_DEUS_GAUGE_ABI.json';
import USDC_DEUS_AERO_ABI from './abis/base/USDC_DEUS_AERO_ABI.json';
import USDC_DEUS_GAUGE_CONTRACT_ABI from './abis/base/USDC_DEUS_GAUGE_ABI.json';


//FANTOM
import FantomFarmComponent from './FantomFarmComponent';
import WFTM_DEUS_ABI from './abis/ftm/WFTM_DEUS_ABI.json';
import WFTM_DEUS_GAUGE_ABI from './abis/ftm/WFTM_DEUS_GAUGE_ABI.json';

// Import components
import BSCFarmComponent from './BSCFarmComponent';


const equalTokenAddress = '0x3Fd3A0c85B70754eFc07aC9Ac0cbBDCe664865A6'; // EQUAL token address


export default function Home() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">DEUS DEX veNFT APRs</h1>
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">BASE: Aerodrome</h2>

      {/* WETH/DEUS Farm */}
      <BaseFarmComponent
        poolName="WETH/DEUS"
        poolAddress="0x9e4CB8b916289864321661CE02cf66aa5BA63C94"
        gaugeAddress="0x7eC1926A50D2D253011cC9891935eBc476713bb1"
        token0Symbol="WETH"
        token1Symbol="DEUS"
        abi={WETH_DEUS_AERO_ABI}
        gaugeAbi={WETH_DEUS_GAUGE_CONTRACT_ABI}
        decimalsToken0={18}
        decimalsToken1={18}
      />

      {/* USDC/DEUS Farm */}
      <BaseFarmComponent
        poolName="USDC/DEUS"
        poolAddress="0xf185f82A1948d014baE23d30b06FA8Da35110315"
        gaugeAddress="0xC5170E37875cfD19872692E1086C49F205b5Fca6"
        token0Symbol="USDC"
        token1Symbol="DEUS"
        abi={USDC_DEUS_AERO_ABI}
        gaugeAbi={USDC_DEUS_GAUGE_CONTRACT_ABI}
        decimalsToken0={6}
        decimalsToken1={18}
      />

      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Fantom: Equalizer</h2>
      {/* WFTM/EQUAL Farm */}
      <FantomFarmComponent
      poolName="WFTM/DEUS"
      poolAddress="0xC55759453BEddb449Df6c66c105d632e322098B3"
      gaugeAddress="0x6b518B63c7ae6575276fdE8E250d4aF165F3A456"
      token0Symbol="WFTM"
      token1Symbol="DEUS"
      equalTokenAddress={equalTokenAddress}  // Pass EQUAL token address for reward calculation
      abi={WFTM_DEUS_ABI}
      gaugeAbi={WFTM_DEUS_GAUGE_ABI}
      decimalsToken0={18}
      decimalsToken1={18}
    />

      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">BSC: Thena</h2>

      {/* BNB/DEUS Farm */}
      <BSCFarmComponent
        poolName="BNB/DEUS"
        poolAddress="0xF07C6760cF104faDe420cFc0BaD1D040205803CA"
        token0Symbol="BNB"
        token1Symbol="DEUS"
      />

    </div>

    


  );
}
