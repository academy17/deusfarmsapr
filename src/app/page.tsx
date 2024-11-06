"use client"; 
import React from 'react';

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
import WFTM_DEUS_SOLIDLY_ABI from './abis/ftm/WFTM_DEUS_SOLIDLY_ABI.json';
import SOLIDLY_VOTER_ABI from './abis/ftm/SOLIDLY_VOTER_ABI.json';
import SOLIDLY_VOTING_ESCROW from './abis/ftm/SOLIDLY_VOTING_ESCROW_ABI.json';


//BSC - THENA
import BSCFarmComponent from './components/BSCFarmComponent';
import BNB_DEUS_POOL_ABI from "./abis/bnb/BNB_DEUS_POOL_ABI.json";
import BNB_PION_POOL_ABI from "./abis/bnb/BNB_PION_POOL_ABI.json"
import BRIBE_ABI from "./abis/bnb/BRIBE_ABI.json";
import VOTER_ABI from "./abis/bnb/VOTER_ABI.json";
import VOTING_ESCROW_ABI from "./abis/bnb/VOTING_ESCROW_ABI.json";
import BNB_FACTORY_ABI from './abis/bnb/BNB_FACTORY_ABI.json';


//ARBITRUM - RAMSES
import ArbitrumFarmComponent from './components/ArbitrumFarmComponent';
import RAM_VOTER_ESCROW_ABI from './abis/arb/RAM_VOTER_ESCROW_ABI.json';
import WETH_DEUS_RAM_ABI from './abis/arb/WETH_DEUS_RAM_ABI.json';
import USDC_DEUS_RAM_ABI from './abis/arb/USDC_DEUS_RAM_ABI.json';
import RAMSES_VOTER_ABI from './abis/arb/RAMSES_VOTER_ABI.json';
import RAMSES_BRIBE_ABI from './abis/arb/RAMSES_BRIBE_ABI.json';
import RAM_PAIR_FACTORY_ABI from './abis/arb/RAM_PAIR_FACTORY_ABI.json';

//ICHI VAULT - EQUALIZER
import IchiVaultComponent from './components/IchiVaultComponent';
import ICHI_VAULT_ABI from './abis/ftm/ICHI_VAULT_ABI.json';
import ICHI_POOL_ABI from './abis/ftm/ICHI_POOL_ABI.json';

export default function Home() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">DEUS Farms veNFT APRs</h1>
      <p className="text-2xl font-semibold mb-6 text-center text-gray-600"> veNFT APR is calculated as: ((((protocolBribes - returnOnBribes) * bribeTokenPrice) + weeklyVotingFeeRewards) * 52 / veNFTDollarValue)</p>
      <p className="text-2xl font-semibold mb-6 text-center text-gray-600"> Data is reflective of the past epoch.</p>
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
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Fantom: Equalizer</h2>
      {/* WFTM/DEUS Farm */}
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

          {/* WFTM/USDC Ichi Farm */}
      <IchiVaultComponent
      poolName="WFTM/USDC"
      poolAddress="0x2543EAD1e0422c63F79061aAEB2A5818F6ee63E5"
      poolVoteAddress="0x93b1bCE818DE8eDd582df10941E16BAEdb85dB0E"
      poolAbi={ICHI_POOL_ABI}
      vaultAddress="0x5a96473B147b3c3790aF7c16C1D1a2c2A15D160E"
      token0Symbol="WFTM"
      token1Symbol="USDC"
      vaultAbi={ICHI_VAULT_ABI}
      nftId={14707}
      escrowAbi={EQUALIZER_VOTING_ESCROW_ABI}
      escrowAddress="0x8313f3551C4D3984FfbaDFb42f780D0c8763Ce94"
      voterAbi={EQUALIZER_VOTER_ABI}
      voterAddress="0xE3D1A117dF7DCaC2eB0AC8219341bAd92f18dAC1"
      bribeAbi={EQUALIZER_BRIBE_ABI}
      bribeAddress="0x4666f33E4fbE6C8AA9671bD2AEdc46d641451F85"

    />
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">BSC: Thena</h2>
    {/* BNB/DEUS Farm */}
      <BSCFarmComponent
        poolName="BNB/DEUS"
        hyperVisorAddress="0xF07C6760cF104faDe420cFc0BaD1D040205803CA"
        poolAddress="0x6a524C7328eb652248d1a3786f9DB0e74CA961F0"
        token0Symbol="BNB"
        token1Symbol="DEUS"
        abi={BNB_DEUS_POOL_ABI}
        bribeAddress="0xd1604f00F0101c87047cf7E892f04998FB1AE437"
        bribeAbi={BRIBE_ABI}
        voterAddress="0x3A1D0952809F4948d15EBCe8d345962A282C4fCb"
        voterAbi={VOTER_ABI}
        nftId={8}
        escrowAbi={VOTING_ESCROW_ABI}
        escrowAddress="0xfBBF371C9B0B994EebFcC977CEf603F7f31c070D"
        factoryAbi={BNB_FACTORY_ABI}
        factoryAddress="0xAFD89d21BdB66d00817d4153E055830B1c2B3970"
        bribeToken="DEUS"


      />
          {/* PION/DEUS Farm */}
          <BSCFarmComponent
        poolName="PION/BNB"
        hyperVisorAddress="0xdc1e387fc2697f3737ee197712bfef9e1101ccd5"
        poolAddress="0xdc1e387fc2697f3737ee197712bfef9e1101ccd5"
        token0Symbol="PION"
        token1Symbol="BNB"
        abi={BNB_PION_POOL_ABI}
        bribeAddress="0xC6964A544c993B919DDcD28ea7410077c2d093DC"
        bribeAbi={BRIBE_ABI}
        voterAddress="0x3A1D0952809F4948d15EBCe8d345962A282C4fCb"
        voterAbi={VOTER_ABI}
        nftId={8}
        escrowAbi={VOTING_ESCROW_ABI}
        escrowAddress="0xfBBF371C9B0B994EebFcC977CEf603F7f31c070D"
        factoryAbi={BNB_FACTORY_ABI}
        factoryAddress="0xAFD89d21BdB66d00817d4153E055830B1c2B3970"
        bribeToken="PION"
        />
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Fantom: Solidly</h2>
      {/* Solidly Farm */}
      <SolidlyFarmComponent
        poolName="WFTM/DEUS"
        poolAddress="0x15055ca920bc67cda28278c68290845120002b07"
        token0Symbol="WFTM"
        token1Symbol="DEUS"
        solidTokenAddress="0x777cf5ba9c291a1a8f57ff14836f6f9dc5c0f9dd"  
        abi={WFTM_DEUS_SOLIDLY_ABI}
        decimalsToken0={18}
        decimalsToken1={18}
        gaugeAbi={WFTM_DEUS_GAUGE_ABI}
        voterAbi={SOLIDLY_VOTER_ABI}
        voterAddress="0x777bfCbDe82256064742220463c7764954e9a927"
        bribeAbi={EQUALIZER_BRIBE_ABI}
        bribeAddress="0x4666f33E4fbE6C8AA9671bD2AEdc46d641451F85"
        nftId={2}
        escrowAbi={SOLIDLY_VOTING_ESCROW}
        escrowAddress="0x777B2Cc540E5E6824a5ceafB04c5a383874a6Bf5"
      />
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-600">Arbitrum: RAMSES</h2>
      {/* RAMSES WETH/DEUS Farm*/}
      <ArbitrumFarmComponent
        poolName="RAMSES-WETH/DEUS"
        poolId="0x93d98b4caac02385a0ae7caaeadc805f48553f76"
        abi={WETH_DEUS_RAM_ABI}
        token0Symbol="WETH"
        token1Symbol="DEUS"
        decimalsToken0={18}
        decimalsToken1={18}
        bribeAddress="0x42d05d13F951AA7c35Cc14453D594427928bF898"
        bribeAbi={RAMSES_BRIBE_ABI}
        voterAddress="0xAAA2564DEb34763E3d05162ed3f5C2658691f499"
        voterAbi={RAMSES_VOTER_ABI}
        nftId={4}
        escrowAbi={RAM_VOTER_ESCROW_ABI}
        escrowAddress="0xAAA343032aA79eE9a6897Dab03bef967c3289a06"
        pairFactoryAbi={RAM_PAIR_FACTORY_ABI}
        factoryAddress="0xAAA20D08e59F6561f242b08513D36266C5A29415"
      />
      {/* RAMSES USDC/DEUS Farm */}
        <ArbitrumFarmComponent
        poolName="RAMSES-USDC-DEUS"
        poolId="0xFa78086986cA5A111497A07b4200391721eC1035"
        abi={USDC_DEUS_RAM_ABI}
        token0Symbol="USDC"
        token1Symbol="DEUS"
        decimalsToken0={6}
        decimalsToken1={18}
        bribeAddress="0x02624af5E4834C6493d8c7E33Fb9310f8a741B0c"
        bribeAbi={RAMSES_BRIBE_ABI}
        voterAddress="0xAAA2564DEb34763E3d05162ed3f5C2658691f499"
        voterAbi={RAMSES_VOTER_ABI}
        nftId={4}
        escrowAbi={RAM_VOTER_ESCROW_ABI}
        escrowAddress="0xAAA343032aA79eE9a6897Dab03bef967c3289a06"
        pairFactoryAbi={RAM_PAIR_FACTORY_ABI}
        factoryAddress="0xAAA20D08e59F6561f242b08513D36266C5A29415"
      />
    </div>
  );
}
