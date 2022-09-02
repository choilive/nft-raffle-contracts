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
let forwarder, forwarderAddress;
let usdcWhale;
let NFTContract, NFTInstance;
let RewardTokenContract, RewardTokenInstance;
let TokenRewardsContract, TokenRewardsInstance;
let WrapperContract, WrapperInstance;
let RaffleInstance, TreasuryInstance;
let treasuryAddress;

let startTime, endTime;
const ERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json");
const { start } = require("repl");

const USDC = new ethers.Contract(
  constants.POLYGON.USDC,
  ERC20_ABI.abi,
  ethers.provider
);

const amUSDC = new ethers.Contract(
  constants.POLYGON.amUSDC,
  ERC20_ABI.abi,
  ethers.provider
);

describe("Treasury Module Tests", function () {
  beforeEach(async () => {
    [
      owner,
      daoWallet,
      organisationWallet,
      nftAuthor,
      donor1,
      donor2,
      donor3,
      forwarder,
    ] = await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await daoWallet.getAddress();
    organisationWalletAddress = await organisationWallet.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();
    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();
    forwarderAddress = await forwarder.getAddress();

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

    WrapperContract = await ethers.getContractFactory("Wrapper");
    WrapperInstance = await WrapperContract.connect(owner).deploy();

    // deploy ArtToken as RewardsToken
    RewardTokenContract = await ethers.getContractFactory("ArtToken");
    RewardTokenInstance = await RewardTokenContract.connect(owner).deploy(
      "Rewards Token",
      "ART",
      30000
    );

    // Deploy NFT
    NFTContract = await ethers.getContractFactory("ArtizenERC1155");
    NFTInstance = await NFTContract.connect(owner).deploy();

    await NFTInstance.connect(owner).addAddressToWhitelist(donor1Address);
    await NFTInstance.connect(owner).addAddressToWhitelist(donor2Address);
    await NFTInstance.connect(owner).addAddressToWhitelist(donor3Address);
    await NFTInstance.connect(owner).addAddressToWhitelist(nftAuthorAddress);
    await NFTInstance.connect(owner).addAddressToWhitelist(daoWalletAddress);
    await NFTInstance.connect(owner).addAddressToWhitelist(ownerAddress);

    // mint NFT to artist
    await NFTInstance.connect(owner).mint(
      owner.address,
      4,
      "0x",
      "https://baseURI/"
    );
    await NFTInstance.connect(owner).mint(
      owner.address,
      4,
      "0x",
      "https://baseURI/"
    );
    await NFTInstance.connect(owner).mint(
      owner.address,
      4,
      "0x",
      "https://baseURI/"
    );

    TokenRewardsContract = await ethers.getContractFactory(
      "TokenRewardsCalculationV2"
    );
    TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

    // Create Organisation
    let organization1 = await createOrganizationObject(
      "organisation1",
      1,

      organisationWalletAddress
    );
    await WrapperInstance.connect(owner).createOrganization(organization1);

    let organizationID = await WrapperInstance.organisationCount();

    await WrapperInstance.connect(owner).addTreasuryModule(
      organizationID,
      constants.POLYGON.USDC,
      constants.POLYGON.amUSDC,
      constants.POLYGON.AaveIncentivesController,
      constants.POLYGON.AaveLendingPool
    );

    treasuryAddress = await WrapperInstance.connect(owner).getTreasuryAddress(
      organizationID
    );

    // SET OWNER AS ADMIN IN TREASURY
    TreasuryInstance = await ethers.getContractAt(
      "TreasuryModule",
      treasuryAddress,
      owner
    );

    await WrapperInstance.connect(owner).setProtocolWalletAddress(
      daoWalletAddress
    );
    await WrapperInstance.connect(owner).setTokenRewardsCalculationAddress(
      TokenRewardsInstance.address
    );
    await WrapperInstance.connect(owner).setProtocolFee(1);

    await WrapperInstance.connect(owner).addNewRaffleModule(
      organizationID,
      constants.POLYGON.USDC,
      forwarderAddress
    );

    let deployedContractsArray = await WrapperInstance.connect(
      owner
    ).getDeployedContracts(organizationID);

    let raffle1Address = deployedContractsArray[0];

    await USDC.connect(donor1).approve(
      raffle1Address,
      ethers.utils.parseUnits("1000", 6)
    );

    await USDC.connect(donor2).approve(
      raffle1Address,
      ethers.utils.parseUnits("1000", 6)
    );

    await USDC.connect(donor3).approve(
      raffle1Address,
      ethers.utils.parseUnits("1000", 6)
    );

    await NFTInstance.connect(owner).setApprovalForAll(raffle1Address, true);

    // Mint and approve REWARD TOKEN to organisation wallet
    await RewardTokenInstance.connect(owner).mint(
      organisationWalletAddress,
      30000
    );
    await RewardTokenInstance.connect(organisationWallet).approve(
      raffle1Address,
      30000
    );

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    // set NFT Author address
    // console.log("Curator: " + curatorAddress);
    // console.log("Owner: " + ownerAddress);
    // console.log("Wrapper: " + WrapperInstance.address);
  });
  describe("processDonationFromRaffle", function () {
    this.beforeEach(async () => {
      let raffle1Address;
      let organizationID;

      organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(
        owner
      ).getDeployedContracts(organizationID);

      raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );

      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("25", 6),
        owner.address,
        ethers.utils.parseUnits("25", 6),
        BigNumber.from(1000),
        BigNumber.from(1000)
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);
    });
    it("deducts the correct protocol fee", async () => {
      let treasuryAddress = await WrapperInstance.connect(
        owner
      ).getTreasuryAddress(1);

      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      let donation2 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("100", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(donation1);

      let treasuryBalAfterDonation1 = await USDC.balanceOf(treasuryAddress);
      let protocolFeePercentage = await WrapperInstance.connect(
        owner
      ).getProtocolFee();

      let protocolFee1 =
        (ethers.utils.parseUnits("200", 6) * protocolFeePercentage) / 100;

      expect(treasuryBalAfterDonation1).to.equal(
        ethers.utils.parseUnits("200", 6).sub(protocolFee1)
      );

      await RaffleInstance.connect(donor2).donate(donation2);

      treasuryBalAfterDonation2 = await USDC.balanceOf(treasuryAddress);

      let protocolFee2 =
        (ethers.utils.parseUnits("100", 6) * protocolFeePercentage) / 100;

      let donationAfterProtocolFee = ethers.utils
        .parseUnits("100", 6)
        .sub(protocolFee2);
      expect(treasuryBalAfterDonation2).to.equal(
        treasuryBalAfterDonation1.add(donationAfterProtocolFee)
      );

      // Check that dao wallet has received fees

      expect(await USDC.balanceOf(daoWalletAddress)).to.equal(
        protocolFee1 + protocolFee2
      );
    });
    it("updates organisationFee balance", async () => {
      let treasuryAddress = await WrapperInstance.connect(
        owner
      ).getTreasuryAddress(1);

      let TreasuryInstance = await ethers.getContractAt(
        "TreasuryModule",
        treasuryAddress,
        owner
      );
      expect(await TreasuryInstance.organisationFeeBalance()).to.equal(0);

      let organisationFeePercentage = await WrapperInstance.connect(
        owner
      ).getOrganisationFee(1);

      let organisationFee = ethers.utils
        .parseUnits("200", 6)
        .mul(organisationFeePercentage)
        .div(10000);

      await RaffleInstance.connect(donor1).donate(donation1);

      expect(await TreasuryInstance.organisationFeeBalance()).to.equal(
        organisationFee
      );

      let secondOrganisationFee = ethers.utils
        .parseUnits("200", 6)
        .mul(organisationFeePercentage)
        .div(10000);

      await RaffleInstance.connect(donor2).donate(donation2);

      expect(await TreasuryInstance.organisationFeeBalance()).to.equal(
        organisationFee.add(secondOrganisationFee)
      );
    });
  });
  describe("withdrawFundsToOrganisationWallet", function () {
    this.beforeEach(async () => {
      let raffle1Address;
      let organizationID;

      organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(
        owner
      ).getDeployedContracts(organizationID);

      raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );

      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("25", 6),
        owner.address,
        ethers.utils.parseUnits("25", 6),
        BigNumber.from(1000),
        BigNumber.from(1000)
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);

      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(donation1);
    });
    it("withdraws to organisation wallet", async () => {
      let organisationFeePercentage = await WrapperInstance.connect(
        owner
      ).getOrganisationFee(1);
      let organisationFee = ethers.utils
        .parseUnits("200", 6)
        .mul(organisationFeePercentage)
        .div(100);

      expect(await USDC.balanceOf(organisationWalletAddress)).to.equal(0);

      await TreasuryInstance.connect(owner).withdrawFundsToOrganisationWallet(
        organisationFee,
        1
      );

      expect(await USDC.balanceOf(organisationWalletAddress)).to.equal(
        organisationFee
      );
    });
    it("throws InsufficentFunds", async () => {
      await expect(
        TreasuryInstance.connect(owner).withdrawFundsToOrganisationWallet(
          ethers.utils.parseUnits("1000"),
          1
        )
      ).to.be.revertedWith("InsufficentFunds()");
    });
  });
  describe("Aave tests", function () {
    this.beforeEach(async () => {
      let raffle1Address;
      let organizationID;
      let treasuryAddress;

      organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(
        owner
      ).getDeployedContracts(organizationID);

      raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );

      treasuryAddress = await WrapperInstance.connect(owner).getTreasuryAddress(
        organizationID
      );

      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("25", 6),
        owner.address,
        ethers.utils.parseUnits("25", 6),
        BigNumber.from(1000),
        BigNumber.from(1000)
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);

      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(donation1);
    });
    it("deposits correctly into aave", async () => {
      let protocolFeePercentage = await WrapperInstance.connect(
        owner
      ).getProtocolFee();

      let protocolFee1 =
        (ethers.utils.parseUnits("200", 6) * protocolFeePercentage) / 100;
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(ethers.utils.parseUnits("200", 6).sub(protocolFee1));

      await TreasuryInstance.connect(owner).depositToAave(
        ethers.utils.parseUnits("100", 6)
      );

      expect(await amUSDC.balanceOf(TreasuryInstance.address)).to.equal(
        ethers.utils.parseUnits("100", 6)
      );

      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(
        ethers.utils.parseUnits("198", 6).sub(ethers.utils.parseUnits("100", 6))
      );
    });
    it("deposit throws noZeroDeposits", async () => {
      await expect(
        TreasuryInstance.connect(owner).depositToAave(0)
      ).to.be.revertedWith("NoZeroDeposits()");
    });
    it("deposit throws InsufficentFunds", async () => {
      await expect(
        TreasuryInstance.connect(owner).depositToAave(
          ethers.utils.parseUnits("1000", 6)
        )
      ).to.be.revertedWith("InsufficentFunds()");
    });
    it("withdraws correctly from aave", async () => {
      let protocolFeePercentage = await WrapperInstance.connect(
        owner
      ).getProtocolFee();

      let protocolFee1 =
        (ethers.utils.parseUnits("200", 6) * protocolFeePercentage) / 100;
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(ethers.utils.parseUnits("200", 6).sub(protocolFee1));

      await TreasuryInstance.connect(owner).depositToAave(
        ethers.utils.parseUnits("100", 6)
      );

      expect(await amUSDC.balanceOf(TreasuryInstance.address)).to.equal(
        ethers.utils.parseUnits("100", 6)
      );
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(
        ethers.utils.parseUnits("198", 6).sub(ethers.utils.parseUnits("100", 6))
      );

      await TreasuryInstance.connect(owner).withdrawFromAave(
        ethers.utils.parseUnits("100", 6)
      );

      expect(await amUSDC.balanceOf(TreasuryInstance.address)).to.equal(0);
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(ethers.utils.parseUnits("198", 6));
    });
    it("withdraw throws NoZeroWithDrawals()", async () => {
      await expect(
        TreasuryInstance.connect(owner).withdrawFromAave(0)
      ).to.be.revertedWith("NoZeroWithDrawals()");
    });
    it("deposit throws InsufficentFunds", async () => {
      await expect(
        TreasuryInstance.connect(owner).withdrawFromAave(
          ethers.utils.parseUnits("1000", 6)
        )
      ).to.be.revertedWith("InsufficentFunds()");
    });
    it("claims rewards correctly from aave", async () => {
      let protocolFeePercentage = await WrapperInstance.connect(
        owner
      ).getProtocolFee();

      let protocolFee1 =
        (ethers.utils.parseUnits("200", 6) * protocolFeePercentage) / 100;
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(ethers.utils.parseUnits("200", 6).sub(protocolFee1));

      await TreasuryInstance.connect(owner).depositToAave(
        ethers.utils.parseUnits("100", 6)
      );

      expect(await amUSDC.balanceOf(TreasuryInstance.address)).to.equal(
        ethers.utils.parseUnits("100", 6)
      );
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(
        ethers.utils.parseUnits("198", 6).sub(ethers.utils.parseUnits("100", 6))
      );

      expect(await amUSDC.balanceOf(TreasuryInstance.address)).to.equal(
        ethers.utils.parseUnits("100", 6)
      );

      await fastForward(constants.TEST.twoMonths);

      await TreasuryInstance.connect(owner).claimAaveRewards(
        [constants.POLYGON.amUSDC],
        1000
      );

      expect(await amUSDC.balanceOf(TreasuryInstance.address)).to.equal(
        100199736
      );
    });
  });
  describe("View Functions", function () {
    this.beforeEach(async () => {
      let raffle1Address;
      let organizationID;
      let treasuryAddress;

      organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(
        owner
      ).getDeployedContracts(organizationID);

      raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );

      treasuryAddress = await WrapperInstance.connect(owner).getTreasuryAddress(
        organizationID
      );

      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("25", 6),
        owner.address,
        ethers.utils.parseUnits("25", 6),
        BigNumber.from(1000),
        BigNumber.from(1000)
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);

      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(donation1);
    });
    it("getTotalDonationsPerRaffle", async () => {
      let organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(
        owner
      ).getDeployedContracts(organizationID);

      let raffle1Address = deployedContractsArray[0];

      let organisationFeePercent = await WrapperInstance.getOrganisationFee(
        organizationID
      );
      let protocolFeePercent = await WrapperInstance.getProtocolFee();
      let organisationFee = ethers.utils
        .parseUnits("200", 6)
        .mul(organisationFeePercent)
        .div(100);
      let protocolFee = ethers.utils
        .parseUnits("200", 6)
        .mul(protocolFeePercent)
        .div(100);

      let fees = organisationFee.add(protocolFee);

      let treasuryBal = await USDC.balanceOf(treasuryAddress);

      expect(
        await TreasuryInstance.connect(owner).getTotalDonationsPerRaffle(
          raffle1Address,
          1
        )
      ).to.equal(treasuryBal.sub(organisationFee));
    });
    it("getUSDCInAave", async () => {
      let protocolFeePercentage = await WrapperInstance.connect(
        owner
      ).getProtocolFee();

      let protocolFee1 =
        (ethers.utils.parseUnits("200", 6) * protocolFeePercentage) / 100;
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(ethers.utils.parseUnits("200", 6).sub(protocolFee1));

      await TreasuryInstance.connect(owner).depositToAave(
        ethers.utils.parseUnits("100", 6)
      );

      expect(await TreasuryInstance.connect(owner).getUSDCInAave()).to.equal(
        ethers.utils.parseUnits("100", 6)
      );
    });
    it("getUSDCFromTreasury", async () => {
      let treasuryBal = await USDC.balanceOf(treasuryAddress);
      expect(
        await TreasuryInstance.connect(owner).getUSDCFromTreasury()
      ).to.equal(treasuryBal);
    });
  });
});
