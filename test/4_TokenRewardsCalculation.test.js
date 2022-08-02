const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BigNumber } = require("ethers");
const { constants } = require("./utils/TestConstants");
const {
  createRaffleObject,
  createDonationObject,
  createOrganizationObject,
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
let forwarder, forwarderAddress;
let usdcWhale;
let RaffleInstance;
let NFTContract, NFTInstance;
let RewardTokenContract, RewardTokenInstance;
let TokenRewardsContract, TokenRewardsInstance;
let WrapperContract, WrapperInstance;

let startTime, endTime;
const ERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json");

const USDC = new ethers.Contract(
  constants.POLYGON.USDC,
  ERC20_ABI.abi,
  ethers.provider
);

describe("Token Rewards Contract Tests", function () {
  beforeEach(async () => {
    [owner, daoWallet, organisationWallet, nftAuthor, donor1, donor2, donor3, donor4, forwarder] =
      await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await daoWallet.getAddress();
    organisationWalletAddress = await organisationWallet.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();
    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();
    donor4Address = await donor4.getAddress();
    forwarderAddress = await forwarder.getAddress();

    // deploy ArtToken as RewardsToken
    RewardTokenContract = await ethers.getContractFactory("ArtToken");
    RewardTokenInstance = await RewardTokenContract.connect(owner).deploy(
      "Rewards Token",
      "ART",
      30000
    );

    WrapperContract = await ethers.getContractFactory("Wrapper"); 
    WrapperInstance = await WrapperContract.connect(owner).deploy();

    // Deploy NFT
    NFTContract = await ethers.getContractFactory("ArtizenERC1155");
    NFTInstance = await NFTContract.connect(owner).deploy();

    // Deploy token Rewards Module
    TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
    TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

    // Create Organisation
    let organization1 = await createOrganizationObject(
      "organisation1",
      10,
      organisationWalletAddress
    );
    await WrapperInstance.connect(owner).createOrganization(organization1);

    // Deploy Treasury
    await WrapperInstance.connect(owner).addTreasuryModule(
      1,
      constants.POLYGON.USDC,
      constants.POLYGON.amUSDC,
      constants.POLYGON.AaveIncentivesController,
      constants.POLYGON.AaveLendingPool
    );

    // Deploy Raffle Module
    await WrapperInstance.connect(owner).addNewRaffleModule(
      1,
      constants.POLYGON.USDC,
      forwarderAddress
    );

    // Get Raffle contract instance
    let contractsDeployed = await WrapperInstance.connect(owner)
      .getDeployedContracts(1);

    let raffle1Address = contractsDeployed[0];
    
    RaffleInstance = await ethers.getContractAt(
      "RaffleModule",
      raffle1Address,
      owner
    );

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [constants.POLYGON.USDC_WHALE],
    });

    usdcWhale = await ethers.getSigner(constants.POLYGON.USDC_WHALE);
    usdcWhaleAddress = await usdcWhale.getAddress();

    // setting up donors with USDC
    await USDC.connect(usdcWhale).transfer(
      donor1.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(usdcWhale).transfer(
      donor2.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(usdcWhale).transfer(
      donor3.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(usdcWhale).transfer(
      donor4.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(donor2).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1500", 6)
    );
    await USDC.connect(donor3).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1500", 6)
    );
    await USDC.connect(donor1).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1500", 6)
    );
    await USDC.connect(donor4).approve(
      daoWallet.address,
      ethers.utils.parseUnits("1500", 6)
    );
    await USDC.connect(donor1).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(donor2).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(donor3).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1500", 6)
    );

    await USDC.connect(donor4).approve(
      RaffleInstance.address,
      ethers.utils.parseUnits("1500", 6)
    );
    
    await NFTInstance.connect(owner).addAddressToWhitelist(donor1Address);
    await NFTInstance.connect(owner).addAddressToWhitelist(donor2Address);
    await NFTInstance.connect(owner).addAddressToWhitelist(donor3Address);
    await NFTInstance.connect(owner).addAddressToWhitelist(nftAuthorAddress);
    await NFTInstance.connect(owner).addAddressToWhitelist(daoWalletAddress);
    await NFTInstance.connect(owner).addAddressToWhitelist(ownerAddress);

    // mint NFT to artist
    await NFTInstance.connect(owner).mint(owner.address, 4, "0x", "https://baseURI/");
    await NFTInstance.connect(owner).mint(owner.address, 4, "0x", "https://baseURI/");
    await NFTInstance.connect(owner).mint(owner.address, 4, "0x", "https://baseURI/");

    await NFTInstance.connect(owner).setApprovalForAll(
      RaffleInstance.address,
      true
    );

    // Mint Reward Tokens to daoWallet
    await RewardTokenInstance.connect(owner).mint(organisationWalletAddress, 30000);
    await RewardTokenInstance.connect(organisationWallet).approve(raffle1Address, 30000);
    
    // SETUP
    await WrapperInstance.connect(owner).setProtocolWalletAddress(daoWalletAddress);
    await WrapperInstance.connect(owner).setTokenRewardsCalculationAddress(TokenRewardsInstance.address);
    await WrapperInstance.connect(owner).setProtocolFee(10);

    await RaffleInstance.connect(owner).setNftAuthorWalletAddress(nftAuthorAddress);


    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    await USDC.connect(organisationWallet).approve(RaffleInstance.address, 5000000000);
    await RewardTokenInstance.connect(organisationWallet).approve(RaffleInstance.address, 3000);

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
    await RaffleInstance.connect(owner).createRaffle(raffle);

    // Turn on token rewards in Raffle
    await RaffleInstance.connect(owner).turnOnTokenRewards(
      RewardTokenInstance.address,
      1
    );

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
    await fastForward(constants.TEST.twoMonths);

    await RaffleInstance.connect(owner).sendRewards(1);
    // await RaffleInstance.connect(donor2).claimTokenRewards(1, donor2Address);

    let donorbal1 = await RewardTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let donorbal2 = await RewardTokenInstance.balanceOf(donor2Address);
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

    await fastForward(constants.TEST.oneMonth);
      
    await RaffleInstance.connect(owner).sendRewards(1);

    let donorbal1 = await RewardTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let donorbal2 = await RewardTokenInstance.balanceOf(donor2Address);
    // console.log(donorbal2.toString());

    let donorbal3 = await RewardTokenInstance.balanceOf(donor3Address);
    // console.log(donorbal3.toString());

    expect(donorbal1).to.equal(257);
    expect(donorbal2).to.equal(404);
    expect(donorbal3).to.equal(338);

  });
  it("throws NoRewardsForRaffle if tokenRewards not turned on", async () => {
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

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

    await RaffleInstance.connect(owner).createRaffle(raffle2);

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

    await fastForward(constants.TEST.twoMonths);

    await expect(RaffleInstance.connect(owner).sendRewards(2))
      .to.be.revertedWith("NoRewardsForRaffle()");
  });
  
  /* --- These requires should be in the sendRewards function --- */
  // it("throws CannotClaimRewards() if user hasnt donated", async () => {
  //   await expect(RaffleInstance.connect(donor4).claimTokenRewards(1, donor4Address))
  //   .to.be.revertedWith("CannotClaimRewards()");
  // });
  // it("reverts if user has already claimed", async () => {
  //   await fastForward(constants.TEST.twoMonths);
  //   await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);

  //   await expect(RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address))
  //   .to.be.revertedWith("CannotClaimRewards()");
  // });
  // it("reverts if raffle hasnt ended", async () => {
  //   await expect(RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address))
  //   .to.be.revertedWith("RaffleHasNotEnded()");
  // });
  it("claims correctly for multiple raffles", async () => {
    await fastForward(constants.TEST.twoMonths);

    await RaffleInstance.connect(owner).sendRewards(1);

    let raffle1Donor1Bal = await RewardTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let raffle1Donor2Bal = await RewardTokenInstance.balanceOf(donor2Address);
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

    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    await USDC.connect(organisationWallet).approve(RaffleInstance.address, 5000000000);
    await RewardTokenInstance.connect(organisationWallet).approve(RaffleInstance.address, 30000);

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

    await RaffleInstance.connect(owner).createRaffle(raffle2);

    await RaffleInstance.connect(owner).turnOnTokenRewards(
      RewardTokenInstance.address,
      2
    );

    let raffle2Donation1 = await createDonationObject(
      donor1Address,
      2,
      ethers.utils.parseUnits("150", 6),
      0
    );
    await RaffleInstance.connect(donor1).donate(raffle2Donation1);

    let raffle2Donation2 = await createDonationObject(
      donor2Address,
      2,
      ethers.utils.parseUnits("370", 6),
      0
    );
    await RaffleInstance.connect(donor2).donate(raffle2Donation2);

    await fastForward(constants.TEST.twoMonths);

    await RaffleInstance.connect(owner).sendRewards(2);

    let raffle2Donor1BalAfter = await RewardTokenInstance.balanceOf(donor1Address);
    // console.log(donorbal1.toString());

    let raffle2Donor2BalAfter = await RewardTokenInstance.balanceOf(donor2Address);
    // console.log(donorbal2.toString());

    expect(raffle2Donor1BalAfter).to.equal(raffle1Donor1Bal.add(389));
    expect(raffle2Donor2BalAfter).to.equal(raffle1Donor2Bal.add(610));
  });
});
