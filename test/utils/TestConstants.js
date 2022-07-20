const { BigNumber } = require("@ethersproject/bignumber");
const { ethers } = require("hardhat");

const CONSTANTS = {
  POLYGON: {
    AaveLendingPool: "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf",
    AaveIncentivesController: "0x357D51124f59836DeD84c8a1730D72B749d8BC23",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    amUSDC: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
    USDC_WHALE: "0xF977814e90dA44bFA03b6295A0616a897441aceC",
  },
  TEST: {
    oneMonth: 2629800,
    twoMonths: 2629800 * 2,
  },
};

module.exports = {
  constants: CONSTANTS,
};
