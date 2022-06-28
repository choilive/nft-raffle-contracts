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
let forwarder, forwarderAddress;
let usdcWhale, usdcWhaleAddress;
let RaffleContract, RaffleInstance;
let NFTContract, NFTInstance;
let ArtTokenContract, ArtTokenInstance;
let TokenRewardsContract, TokenRewardsInstance;
let startTime, endTime;
const ERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json");
const { start } = require("repl");

const USDC = new ethers.Contract(
  constants.POLYGON.USDC,
  ERC20_ABI.abi,
  ethers.provider
);

describe("Token Rewards Contract Tests", function () {
  beforeEach(async () => {
    [owner, daoWallet, nftAuthor, donor1, donor2, donor3, curator, forwarder] =
      await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await daoWallet.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();
    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();
    curatorAddress = await curator.getAddress();
    forwarderAddress = await forwarder.getAddress();

    // deploy ArtToken as RewardsToken
    ArtTokenContract = await ethers.getContractFactory("ArtToken");
    ArtTokenInstance = await ArtTokenContract.connect(owner).deploy(
      "Rewards Token",
      "ART",
      3000
    );

    // mint Rewards tokens to rewardWallet
    await ArtTokenInstance.connect(owner).mint(daoWalletAddress, 3000);

    // Deploy Raffle
    RaffleContract = await ethers.getContractFactory("Raffle");
    RaffleInstance = await RaffleContract.connect(owner).deploy(
      constants.POLYGON.USDC,
      forwarderAddress,
      ArtTokenInstance.address
    );

    await ArtTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 3000);
    
    // Give daoWallet CURATOR PERMISSIONS on Raffle contract
    await RaffleInstance.connect(owner).setCuratorRole(daoWalletAddress);
    await RaffleInstance.connect(owner).setDAOWalletAddress(daoWalletAddress);
    // transfer Rewards tokens to buffer
    await RaffleInstance.connect(daoWallet).topUpRewardTokenBalance(1000);

    //Deploy token rewards contract
    TokenRewardsContract = await ethers.getContractFactory("TokenRewards");
    TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy(
        RaffleInstance.address
    );

    await ArtTokenInstance.connect(daoWallet).approve(TokenRewardsInstance.address, 3000);


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
    await USDC.connect(usdcWhale).transfer(
      donor1.address,
      ethers.utils.parseUnits("500", 6)
    );

    await USDC.connect(usdcWhale).transfer(
      donor2.address,
      ethers.utils.parseUnits("500", 6)
    );

    await USDC.connect(usdcWhale).transfer(
      donor3.address,
      ethers.utils.parseUnits("500", 6)
    );

    await USDC.connect(donor2).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1000", 6)
    );
    await USDC.connect(donor3).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1000", 6)
    );
    await USDC.connect(donor1).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1000", 6)
    );
    await USDC.connect(donor1).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1000", 6)
    );

    await USDC.connect(donor2).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1000", 6)
    );

    await USDC.connect(donor3).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1000", 6)
    );

    // mint NFT to artist
    await NFTInstance.connect(owner).mint(owner.address, 1, 4, "0x");
    await NFTInstance.connect(owner).setApprovalForAll(
      RaffleInstance.address,
      true
    );
    
    // Add curator role
    await RaffleInstance.connect(owner).setCuratorRole(curatorAddress);

    // set DAO wallet
    await RaffleInstance.connect(owner).setDAOWalletAddress(daoWalletAddress);

    // set NFT Author address
    await RaffleInstance.connect(curator).setNftAuthorWalletAddress(
      nftAuthorAddress
    );

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    await USDC.connect(daoWallet).approve(RaffleInstance.address, 5000000000);
    
    // Create Raffle
    let newRaffle = await createRaffleObject(
      NFTInstance.address,
      ownerAddress,
      1,
      startTime,
      endTime,
      ethers.utils.parseUnits("25", 6),
      owner.address,
      ethers.utils.parseUnits("0", 6)
    );
    await RaffleInstance.connect(curator).createRaffle(newRaffle);
  });
  
  describe("contract initializes properly", function () {
    it("raffleContractAddress is set on deployment", async () => {
        expect(await TokenRewardsInstance.raffleContractAddress()).to.equal(RaffleInstance.address);
    });
  });

  describe("setter functions", function () {
    it("setRewardTokenAddress works", async () => {
        expect(await TokenRewardsInstance.rewardTokenAddress()).to.equal(ethers.constants.AddressZero);
        await TokenRewardsInstance.connect(owner).setRewardTokenAddress(ArtTokenInstance.address);
        expect(await TokenRewardsInstance.rewardTokenAddress()).to.equal(ArtTokenInstance.address);

        await expect(TokenRewardsInstance.connect(donor1).setRewardTokenAddress(ArtTokenInstance.address))
            .to.be.revertedWith("Ownable: caller is not the owner");

        await expect(TokenRewardsInstance.connect(owner).setRewardTokenAddress(ethers.constants.AddressZero))
            .to.be.revertedWith("ZeroAddressNotAllowed()");
    });
    it("setRewardWalletAddress works", async () => {
        expect(await TokenRewardsInstance.rewardWalletAddress()).to.equal(ethers.constants.AddressZero);
        await TokenRewardsInstance.connect(owner).setRewardWalletAddress(daoWalletAddress);
        expect(await TokenRewardsInstance.rewardWalletAddress()).to.equal(daoWalletAddress);

        await expect(TokenRewardsInstance.connect(donor1).setRewardWalletAddress(daoWalletAddress))
            .to.be.revertedWith("Ownable: caller is not the owner");

        await expect(TokenRewardsInstance.connect(owner).setRewardWalletAddress(ethers.constants.AddressZero))
            .to.be.revertedWith("ZeroAddressNotAllowed()");
    });
  });

  describe("sendRewardsToUser", function () {
    it.only("sendRewardsToUser calculates rewards correctly", async () => {
      await TokenRewardsInstance.connect(owner).setRewardTokenAddress(ArtTokenInstance.address);
      await TokenRewardsInstance.connect(owner).setRewardWalletAddress(daoWalletAddress);

      await RaffleInstance.connect(owner).turnOnTokenRewards(TokenRewardsInstance.address);

      // Donor 1 donates twice
      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("100", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation1);

      let donation2 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("50", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation2);

      // Donor 2 donates twice
      let donation3 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );
      await RaffleInstance.connect(donor2).donate(donation3);

      let donation4 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("70", 6),
        0
      );
      await RaffleInstance.connect(donor2).donate(donation4);

      let donor1RewardBalBefore = await ArtTokenInstance.balanceOf(donor1Address);

      expect(donor1RewardBalBefore).to.equal(0);

      await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);

      let donor1RewardBalAfter = await ArtTokenInstance.balanceOf(donor1Address);

      expect(donor1RewardBalAfter).to.equal(389);
    });
  });
  describe("View functions", function () {
    it("viewDonorClaimableRewards", async () => {
      expect(await TokenRewardsInstance.connect(donor1).viewDonorClaimableRewards(1, donor1Address))
        .to.equal(389);
    });
  });
});