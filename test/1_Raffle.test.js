const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { constants } = require("./utils/TestConstants");
const { BigNumber } = require("ethers");

let owner, ownerAddress;
let daoWallet, daoWalletAddress;
let nftAuthor, nftAuthorAddress;
let donor1, donor1Address;
let donor2, donor2Address;
let donor3, donor3Address;
let donor4, donor4Address;
let usdcWhale, usdcWhaleAddress;
let RaffleContract, RaffleInstance;
let NFTContract, NFTInstance;

const ERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

const USDC = new ethers.Contract(
  constants.POLYGON.USDC,
  ERC20_ABI.abi,
  ethers.provider
);

describe("Raffle Contract Tests", function () {
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
    RaffleContract = await ethers.getContractFactory("Raffle");
    RaffleInstance = await RaffleContract.connect(owner).deploy(
      constants.POLYGON.USDC
    );

    // Deploy NFT
    NFTContract = await ethers.getContractFactory("RewardNFT");
    NFTInstance = await NFTContract.connect(owner).deploy();

    // await hre.network.provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [constants.POLYGON.USDC_WHALE],
    // });

    // usdcWhale = await ethers.getSigner(constants.POLYGON.USDC_WHALE);
    // usdcWhaleAddress = await usdcWhale.getAddress();
    // console.log("here?");
    // console.log(await USDC.balanceOf(usdcWhale.address).toString());
    // // setting up donors with USDC
    // await USDC.connect(usdcWhale).transfer(donor1.address, 500);
    // await USDC.connect(usdcWhale).transfer(donor2.address, 500);
    // await USDC.connect(usdcWhale).transfer(donor3.address, 500);

    // await USDC.connect(donor2).approve(daoWallet.address, 500);
    // await USDC.connect(donor3).approve(daoWallet.address, 500);
    // await USDC.connect(donor1).approve(daoWallet.address, 500);
    // await USDC.connect(daoWallet).approve(daoWallet.address, type(uint256).max);

    // // mint NFT to artist
    // await NFTInstance.connect(owner).mint(owner.address, 1, 4, "");
    // await NFTInstance.connect(owner).setApprovalForAll(
    //   RaffleInstance.address,
    //   true
    // );
  });

  describe("Setter functions", function () {
    it("sets up dao wallet address properly", async () => {
      await RaffleInstance.connect(owner).setDAOWalletAddress(daoWalletAddress);
      expect(await RaffleInstance.DAOWallet()).to.equal(daoWalletAddress);
    });
    it("only owner can set up dao wallet address", async () => {});
    it("sets up nft author address properly", async () => {
      await RaffleInstance.connect(owner).setNftAuthorWalletAddress(
        nftAuthorAddress
      );
      expect(await RaffleInstance.nftAuthorWallet()).to.equal(nftAuthorAddress);
    });
    it("only owner can set up nft wallet address", async () => {});
  });
});
