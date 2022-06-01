const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { constants } = require("../utils/TestConstants");
const { BigNumber } = require("ethers");

let owner, ownerAddress;
let daoWallet, daoWallet;
let nftAuthor, nftAuthorAddress;
let donor1, donor1Address;
let donor2, donor2Address;
let donor3, donor3Address;
let donor4, donor4Address;

let RaffleContract, RaffleInstance;
let NFTContract, NFTInstance;

const ERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json");
const IAToken_ABI = require("../artifacts/contracts/interfaces/IAToken.sol/IAToken.json");
const USDC = new ethers.Contract(
  constants.POLYGON.USDC,
  ERC20_ABI.abi,
  ethers.provider
);

describe("TreasuryV2 Tests", function () {
  beforeEach(async () => {
    [owner, daoWallet, nftAuthor, donor1, donor2, donor3] =
      await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await owner.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();

    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();

    // Deploy Raffle
    RaffleContract = await ethers.getContractFactory("DonationsModule");
    RaffleInstance = await DonationContract.connect(owner).deploy(
      constants.POLYGON.USDC
    );

    // Deploy NFT
    NFTContract = await ethers.getContractFactory("RewardNFT");
    NFTInstance = await NFTContract.connect(owner).deploy();
  });

  describe("Setter functions", function () {
    it("sets up dao wallet address properly", async () => {});

    it("sets up nft author address properly", async () => {});
  });
});
