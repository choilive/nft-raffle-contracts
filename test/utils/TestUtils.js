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
  topDonatedAmount,
  tokenAllocation,
  buffer
) => {
  const _raffle = {
    nftContract: nftContract,
    nftOwner: nftOwner,
    raffleID: 0,
    tokenID: tokenID,
    startTime: startTime,
    endTime: endTime,
    minimumDonationAmount: minimumDonationAmount,
    topDonor: topDonor,
    topDonatedAmount: topDonatedAmount,
    tokenAllocation, tokenAllocation,
    buffer: buffer,
    cancelled: false,
  };

  return _raffle;
};

const createOrganizationObject = async (
  name,
  organisationFee,
  walletAddress,
) => {
  const _organisation = {
    name: name,
    organisationID: 0,
    organisationFee: organisationFee,
    walletAddress: walletAddress,
    centralTreasury: ethers.constants.AddressZero,
    contractsDeployed: [],
  };

  return _organisation;
};

const createDonationObject = async (donor, raffleID, amount, timestamp) => {
  const _donation = {
    donor: donor,
    raffleID: raffleID,
    amount: amount,
    timestamp: timestamp,
  };

  return _donation;
};
module.exports = {
  createRaffleObject,
  createDonationObject,
  createOrganizationObject,
  fastForward,
  currentTime,
};
