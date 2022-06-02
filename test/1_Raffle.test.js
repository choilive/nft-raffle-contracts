const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BigNumber } = require("ethers");
const { constants } = require("./utils/TestConstants");
const {
  createRaffleObject,
  createDonationObject,
  fastForward,
  currentTime,
} = require("./utils/TestUtils");

let owner, ownerAddress;
let daoWallet, daoWalletAddress;
let nftAuthor, nftAuthorAddress;
let donor1, donor1Address;
let donor2, donor2Address;
let donor3, donor3Address;
let donor4, donor4Address;
let curator, curatorAddress;
let usdcWhale, usdcWhaleAddress;
let RaffleContract, RaffleInstance;
let NFTContract, NFTInstance;

let startTime, endTime;
const ERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json");
const { start } = require("repl");

const USDC = new ethers.Contract(
  constants.POLYGON.USDC,
  ERC20_ABI.abi,
  ethers.provider
);

describe("Raffle Contract Tests", function () {
  beforeEach(async () => {
    [owner, daoWallet, nftAuthor, donor1, donor2, donor3, curator] =
      await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await owner.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();
    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();
    curatorAddress = await curator.getAddress();

    // Deploy Raffle
    RaffleContract = await ethers.getContractFactory("Raffle");
    RaffleInstance = await RaffleContract.connect(owner).deploy(
      constants.POLYGON.USDC
    );

    // Deploy NFT
    NFTContract = await ethers.getContractFactory("RewardNFT");
    NFTInstance = await NFTContract.connect(owner).deploy();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [constants.POLYGON.USDC_WHALE],
    });

    usdcWhale = await ethers.getSigner(constants.POLYGON.USDC_WHALE);
    usdcWhaleAddress = await usdcWhale.getAddress();

    // setting up donors with USDC
    await USDC.connect(usdcWhale).transfer(donor1.address, 500);
    await USDC.connect(usdcWhale).transfer(donor2.address, 500);
    await USDC.connect(usdcWhale).transfer(donor3.address, 500);

    await USDC.connect(donor2).approve(daoWallet.address, 500);
    await USDC.connect(donor3).approve(daoWallet.address, 500);
    await USDC.connect(donor1).approve(daoWallet.address, 500);
    await USDC.connect(daoWallet).approve(daoWallet.address, 500);

    // mint NFT to artist
    await NFTInstance.connect(owner).mint(owner.address, 1, 4, "0x");
    await NFTInstance.connect(owner).setApprovalForAll(
      RaffleInstance.address,
      true
    );

    // Add curator role
    await RaffleInstance.connect(owner).setCuratorRole(curatorAddress);

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;
  });

  describe("Setter functions", function () {
    it("sets up dao wallet address properly", async () => {
      await RaffleInstance.connect(owner).setDAOWalletAddress(daoWalletAddress);
      expect(await RaffleInstance.DAOWallet()).to.equal(daoWalletAddress);
    });
    it("only owner can set up dao wallet address", async () => {
      await expect(
        RaffleInstance.connect(donor1).setDAOWalletAddress(daoWalletAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("sets up nft author address properly", async () => {
      await RaffleInstance.connect(owner).setNftAuthorWalletAddress(
        nftAuthorAddress
      );
      expect(await RaffleInstance.nftAuthorWallet()).to.equal(nftAuthorAddress);
    });
    it("only owner can set up nft wallet address", async () => {
      await expect(
        RaffleInstance.connect(donor1).setNftAuthorWalletAddress(
          nftAuthorAddress
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("Create raffle function", function () {
    it("creates raffle with correct details", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10)
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let raffle = await RaffleInstance.getRaffle(1);
      console.log(raffle);
      expect(await raffle.nftContract).to.equal(NFTInstance.address);
      expect(await raffle.nftOwner).to.equal(owner.address);
      expect(await raffle.tokenID).to.equal(1);
      expect(await raffle.startTime).to.equal(startTime);
      expect(await raffle.endTime).to.equal(endTime);
      expect(await raffle.minimumDonationAmount).to.equal(10);
      expect(await raffle.topDonor).to.equal(owner.address);
      expect(await raffle.topDonatedAmount).to.equal(10);
    });
    it("only curator can create raffle", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        BigNumber.from(1),
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10)
      );
      await expect(
        RaffleInstance.connect(owner).createRaffle(newRaffle)
      ).to.be.revertedWith(
        "AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0x850d585eb7f024ccee5e68e55f2c26cc72e1e6ee456acf62135757a5eb9d4a10"
      );
    });
    it.only("reverts if incorrect times given", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        BigNumber.from(1),
        endTime,
        startTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10)
      );
      await expect(
        RaffleInstance.connect(curator).createRaffle(newRaffle)
      ).to.be.revertedWith("IncorrectTimesGiven()");
    });
    it("contract receives NFTs on raffle creation", async () => {});
    it("emits Raffle created event properly", async () => {});
  });
  describe("Donate function", function () {
    it("creates donation with correct details", async () => {});
    it("reverts if incorrect times given", async () => {});
    it("reverts if donation is too low", async () => {});
    it("transfers donation into DAO Wallet", async () => {});
    it("emits Donation created event properly", async () => {});
  });
  describe("SendNFTsToWinners function", function () {
    it("reverts if donation is still active", async () => {});
    it("emits events properly", async () => {});
    it("calculates winners correctly,NFT reflect in winners balances", async () => {});
  });
  describe("getDonationCountPerAddressPerCycle function", function () {
    it("returns the number of how many times and address has donated in a raffle", async () => {});
  });
  describe("View functions", function () {
    it("returns raffle object", async () => {});
    it("returns total donations per cycle", async () => {});
    it("returns total donations per address per cycle", async () => {});
    it("returns highest donation per cycle", async () => {});
    it("returns top donor", async () => {});
  });
});
