const { BigNumber } = require("@ethersproject/bignumber");
const { ethers } = require("hardhat");

const CONSTANTS = {
  POLYGON: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
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
