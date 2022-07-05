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
    [owner, daoWallet, nftAuthor, donor1, donor2, donor3, donor4, curator, forwarder] =
      await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await daoWallet.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();
    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();
    donor4Address = await donor4.getAddress();
    curatorAddress = await curator.getAddress();
    forwarderAddress = await forwarder.getAddress();

    // deploy ArtToken as RewardsToken
    ArtTokenContract = await ethers.getContractFactory("ArtToken");
    ArtTokenInstance = await ArtTokenContract.connect(owner).deploy(
      "Rewards Token",
      "ART",
      3000
    );

    // Deploy Raffle
    RaffleContract = await ethers.getContractFactory("RaffleV2");
    RaffleInstance = await RaffleContract.connect(owner).deploy(
      constants.POLYGON.USDC,
      forwarderAddress,
      ArtTokenInstance.address
    );

    // Deploy NFT
    NFTContract = await ethers.getContractFactory("RewardNFT");
    NFTInstance = await NFTContract.connect(owner).deploy();

    // Deploy token Rewards Module
    TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
    TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

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

    await USDC.connect(usdcWhale).transfer(
      donor4.address,
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
    await USDC.connect(donor4).approve(
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

    await USDC.connect(donor4).approve(
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

    // Turn on token rewards in Raffle
    await RaffleInstance.connect(owner).turnOnTokenRewards(
      TokenRewardsInstance.address,
      ArtTokenInstance.address,
      1);

    // Mint Reward Tokens to daoWallet
    await ArtTokenInstance.connect(owner).mint(daoWalletAddress, 30000);

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    await USDC.connect(daoWallet).approve(RaffleInstance.address, 5000000000);
    await ArtTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 3000);

    const raffle = await createRaffleObject(
      NFTInstance.address,
      ownerAddress,
      1,
      startTime,
      endTime,
      ethers.utils.parseUnits("25", 6),
      owner.address,
      ethers.utils.parseUnits("25", 6),
      BigNumber.from(1000),
      BigNumber.from(1000),
    );
    await RaffleInstance.connect(curator).createRaffle(raffle);

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
  });

  it("claimTokenRewards returns correct amount of tokens for two donations", async () => {
      
    await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);
    await RaffleInstance.connect(donor2).claimTokenRewards(1, donor2Address);

    let donorbal1 = await ArtTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let donorbal2 = await ArtTokenInstance.balanceOf(donor2Address);
    // console.log(donorbal2.toString());

    expect(donorbal1).to.equal(389);
    expect(donorbal2).to.equal(610);

  });
  it("claimTokenRewards returns correct amount of tokens for three donations", async () => {

    let donation5 = await createDonationObject(
      donor3Address,
      1,
      ethers.utils.parseUnits("200", 6),
      0
    );
    await RaffleInstance.connect(donor3).donate(donation5);

    let donation6 = await createDonationObject(
      donor3Address,
      1,
      ethers.utils.parseUnits("60", 6),
      0
    );
    await RaffleInstance.connect(donor3).donate(donation6);
      
    await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);
    await RaffleInstance.connect(donor2).claimTokenRewards(1, donor2Address);
    await RaffleInstance.connect(donor3).claimTokenRewards(1, donor3Address);

    let donorbal1 = await ArtTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let donorbal2 = await ArtTokenInstance.balanceOf(donor2Address);
    // console.log(donorbal2.toString());

    let donorbal3 = await ArtTokenInstance.balanceOf(donor3Address);
    // console.log(donorbal3.toString());

    expect(donorbal1).to.equal(257);
    expect(donorbal2).to.equal(404);
    expect(donorbal3).to.equal(338);

  });
  it("throws NoRewardsForRaffle if tokenRewards not turned on", async () => {

    // mint NFT to artist
    await NFTInstance.connect(owner).mint(owner.address, 2, 4, "0x");
    await NFTInstance.connect(owner).setApprovalForAll(
      RaffleInstance.address,
      true
    );

    const raffle2 = await createRaffleObject(
      NFTInstance.address,
      ownerAddress,
      2,
      startTime,
      endTime,
      ethers.utils.parseUnits("25", 6),
      owner.address,
      ethers.utils.parseUnits("25", 6),
      BigNumber.from(1000),
      BigNumber.from(1000),
    );

    await RaffleInstance.connect(curator).createRaffle(raffle2);

    let donation1 = await createDonationObject(
      donor1Address,
      2,
      ethers.utils.parseUnits("100", 6),
      0
    );
    await RaffleInstance.connect(donor1).donate(donation1);

    let donation2 = await createDonationObject(
      donor2Address,
      2,
      ethers.utils.parseUnits("300", 6),
      0
    );
    await RaffleInstance.connect(donor2).donate(donation2);

    await expect(RaffleInstance.connect(donor1).claimTokenRewards(2, donor1Address))
      .to.be.revertedWith("NoRewardsForRaffle()");
  });
  
  it("throws CannotClaimRewards() if user hasnt donated", async () => {
    await expect(RaffleInstance.connect(donor4).claimTokenRewards(1, donor4Address))
    .to.be.revertedWith("CannotClaimRewards()");
  });
  it("reverts if user has already claimed", async () => {
    await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);

    await expect(RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address))
    .to.be.revertedWith("CannotClaimRewards()");

  });
  it("claims correctly for multiple raffles", async () => {

    await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);
    await RaffleInstance.connect(donor2).claimTokenRewards(1, donor2Address);

    let raffle1Donor1Bal = await ArtTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let raffle1Donor2Bal = await ArtTokenInstance.balanceOf(donor2Address);
    // console.log(donorbal2.toString());

    expect(raffle1Donor1Bal).to.equal(389);
    expect(raffle1Donor2Bal).to.equal(610);

    // mint NFT to artist
    await NFTInstance.connect(owner).mint(owner.address, 2, 4, "0x");
    await NFTInstance.connect(owner).setApprovalForAll(
      RaffleInstance.address,
      true
    );
    
    // Create second raffle

    await USDC.connect(daoWallet).approve(RaffleInstance.address, 5000000000);
    await ArtTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 30000);

    const raffle2 = await createRaffleObject(
      NFTInstance.address,
      ownerAddress,
      2,
      startTime,
      endTime,
      ethers.utils.parseUnits("25", 6),
      owner.address,
      ethers.utils.parseUnits("25", 6),
      BigNumber.from(1000),
      BigNumber.from(1000),
    );

    await RaffleInstance.connect(owner).turnOnTokenRewards(
      TokenRewardsInstance.address,
      ArtTokenInstance.address,
      2
    );
    
    await RaffleInstance.connect(curator).createRaffle(raffle2);

    let raffle2Donation1 = await createDonationObject(
      donor3Address,
      2,
      ethers.utils.parseUnits("150", 6),
      0
    );
    await RaffleInstance.connect(donor3).donate(raffle2Donation1);

    let raffle2Donation2 = await createDonationObject(
      donor4Address,
      2,
      ethers.utils.parseUnits("370", 6),
      0
    );
    await RaffleInstance.connect(donor4).donate(raffle2Donation2);

    await RaffleInstance.connect(donor3).claimTokenRewards(2, donor3Address);
    await RaffleInstance.connect(donor4).claimTokenRewards(2, donor4Address);

    let raffle2Donor1Bal = await ArtTokenInstance.balanceOf(donor3Address);
    // console.log(donorbal1.toString());

    let raffle2Donor2Bal = await ArtTokenInstance.balanceOf(donor4Address);
    // console.log(donorbal2.toString());

    expect(raffle2Donor1Bal).to.equal(389);
    expect(raffle2Donor2Bal).to.equal(610);
  });
});
