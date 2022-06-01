const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const { constants } = require("./TestConstants");

const fastForward = async (seconds) => {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
};

const currentTime = async () => {
  const { timestamp } = await ethers.provider.getBlock("latest");
  return timestamp;
};

const createRaffleObject = async (
  nftContract,
  nftOwner,
  tokenID,
  startTime,
  endTime,
  minimumDonationAmount,
  topDonor,
  topDonatedAmount
) => {
  const _raffle = {
    nftContract: nftContract,
    nftOwner: nftOwner,
    tokenID: tokenID,
    startTime: startTime,
    endTime: endTime,
    minimumDonationAmount: minimumDonationAmount,
    topDonor: topDonor,
    topDonatedAmount: topDonatedAmount,
  };

  return _raffle;
};

const createDonationObject = async (raffleID, amount) => {
  const _donation = {
    raffleID: raffleID,
    amount: amount,
  };

  return _donation;
};
module.exports = {
  createRaffleObject,
  createDonationObject,
  fastForward,
  currentTime,
};
