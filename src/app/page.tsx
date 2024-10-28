"use client"; // Add this at the top
import React from 'react';

//wethdeus bribes 0xcf66F70B7d88749C1Fd2c4287Dc637ca24BA3AF2
//usdcdeus bribes 0x3C5247C06CEB60Fd09177a71A513658454602613

//BASE - AERODROME
import BaseFarmComponent from './components/BaseFarmComponent';
import WETH_DEUS_AERO_ABI from './abis/base/WETH_DEUS_AERO_ABI.json';
import WETH_DEUS_GAUGE_CONTRACT_ABI from './abis/base/WETH_DEUS_GAUGE_ABI.json';
import USDC_DEUS_AERO_ABI from './abis/base/USDC_DEUS_AERO_ABI.json';
import USDC_DEUS_GAUGE_CONTRACT_ABI from './abis/base/USDC_DEUS_GAUGE_ABI.json';
import POOL_FACTORY_ABI from './abis/base/POOL_FACTORY_ABI.json';
import BASE_VOTER_ABI from './abis/base/BASE_VOTER_ABI.json';
import WETH_DEUS_BRIBE_ABI from './abis/base/WETH_DEUS_BRIBE_ABI.json';
import USDC_DEUS_BRIBE_ABI from './abis/base/USDC_DEUS_BRIBE_ABI.json';
import AERO_ESCROW_ABI from './abis/base/AERO_ESCROW_ABI.json'
//veNFT ID's: 8421
//veNFT IDs: 40814
//escrow address: 0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4

//FANTOM - EQUALIZER
import FantomFarmComponent from './components/FantomFarmComponent';
import WFTM_DEUS_ABI from './abis/ftm/WFTM_DEUS_ABI.json';
import WFTM_DEUS_GAUGE_ABI from './abis/ftm/WFTM_DEUS_GAUGE_ABI.json';
import EQUALIZER_FACTORY_ABI from './abis/ftm/EQUALIZER_FACTORY_ABI.json';
import EQUALIZER_VOTER_ABI from './abis/ftm/EQUALIZER_VOTER_ABI.json';
import EQUALIZER_BRIBE_ABI from './abis/ftm/EQUALIZER_BRIBE_ABI.json';
import EQUALIZER_VOTING_ESCROW_ABI from './abis/ftm/EQUALIZER_VOTING_ESCROW_ABI.json';


//FANTOM - SOLIDLY
import SolidlyFarmComponent from './components/SolidlyFarmComponent';

//BSC - THENA
import BSCFarmComponent from './components/BSCFarmComponent';

//ARBITRUM - RAMSES
import ArbitrumFarmComponent from './components/ArbitrumFarmComponent';


export default function Home() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">DEUS Farms veNFT APRs</h1>
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">BASE: Aerodrome</h2>
      <p className="text-2xl font-semibold mb-6 text-center text-gray-600"> veNFT APR is calculated as bribes-bribeReturn</p>
      {/* WETH/DEUS Farm */}
      {/*

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
        factoryAbi={POOL_FACTORY_ABI}
        factoryAddress="0x420DD381b31aEf6683db6B902084cB0FFECe40Da"
        voterAbi={BASE_VOTER_ABI}
        voterAddress="0x16613524e02ad97eDfeF371bC883F2F5d6C480A5"
        bribeAbi={WETH_DEUS_BRIBE_ABI}
        bribeAddress="0x3C5247C06CEB60Fd09177a71A513658454602613"
        nftId={8421}
        escrowAbi={AERO_ESCROW_ABI}
        escrowAddress="0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4"
      />
       */}
      {/* USDC/DEUS Farm */}
      {/*
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
        factoryAbi={POOL_FACTORY_ABI}
        factoryAddress="0x420DD381b31aEf6683db6B902084cB0FFECe40Da"
        voterAbi={BASE_VOTER_ABI}
        voterAddress="0x16613524e02ad97eDfeF371bC883F2F5d6C480A5"
        bribeAbi={USDC_DEUS_BRIBE_ABI}
        bribeAddress="0xcf66F70B7d88749C1Fd2c4287Dc637ca24BA3AF2"
        nftId={8421}
        escrowAbi={AERO_ESCROW_ABI}
        escrowAddress="0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4"

      />
      */}
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Fantom: Equalizer</h2>
      {/* WFTM/EQUAL Farm */}
      <FantomFarmComponent
      poolName="WFTM/DEUS"
      poolAddress="0xC55759453BEddb449Df6c66c105d632e322098B3"
      gaugeAddress="0x6b518B63c7ae6575276fdE8E250d4aF165F3A456"
      token0Symbol="WFTM"
      token1Symbol="DEUS"
      equalTokenAddress="0x3Fd3A0c85B70754eFc07aC9Ac0cbBDCe664865A6"  
      abi={WFTM_DEUS_ABI}
      decimalsToken0={18}
      decimalsToken1={18}
      gaugeAbi={WFTM_DEUS_GAUGE_ABI}
      factoryAbi={EQUALIZER_FACTORY_ABI}
      factoryAddress="0xc6366EFD0AF1d09171fe0EBF32c7943BB310832a"
      voterAbi={EQUALIZER_VOTER_ABI}
      voterAddress="0xE3D1A117dF7DCaC2eB0AC8219341bAd92f18dAC1"
      bribeAbi={EQUALIZER_BRIBE_ABI}
      bribeAddress="0x4666f33E4fbE6C8AA9671bD2AEdc46d641451F85"
      nftId={14707}
      escrowAbi={EQUALIZER_VOTING_ESCROW_ABI}
      escrowAddress="0x8313f3551C4D3984FfbaDFb42f780D0c8763Ce94"

    />



      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">BSC: Thena</h2>

      {/* BNB/DEUS Farm */}
      <BSCFarmComponent
        poolName="BNB/DEUS"
        poolAddress="0xF07C6760cF104faDe420cFc0BaD1D040205803CA"
        token0Symbol="BNB"
        token1Symbol="DEUS"
      />


      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Fantom: Solidly</h2>

      {/* Solidly Farm */}
      <SolidlyFarmComponent
        poolName="WFTM/DEUS"
        poolAddress="0x15055Ca920BC67cdA28278C68290845120002b07"
        token0Symbol="WFTM"
        token1Symbol="DEUS"
      />

      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Arbitrum: RAMSES</h2>
      {/* RAMSES WETH/DEUS Farm */}
      <ArbitrumFarmComponent
        poolName="RAMSES-WETH/DEUS"
        poolId="0x93d98b4caac02385a0ae7caaeadc805f48553f76"
      />
    </div>

    


  );
}
