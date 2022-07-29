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
let curator, curatorAddress;
let forwarder, forwarderAddress;
let usdcWhale, usdcWhaleAddress;
let RaffleContract, RaffleInstance;
let NFTContract, NFTInstance;
let ArtTokenContract, ArtTokenInstance;
let TokenRewardsContract, TokenRewardsInstance;
let WrapperContract, WrapperInstance;

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
    [owner, daoWallet, organisationWallet, nftAuthor, donor1, donor2, donor3, curator, forwarder] =
      await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    daoWalletAddress = await daoWallet.getAddress();
    organisationWalletAddress = await organisationWallet.getAddress();
    nftAuthorAddress = await nftAuthor.getAddress();
    donor1Address = await donor1.getAddress();
    donor2Address = await donor2.getAddress();
    donor3Address = await donor3.getAddress();
    curatorAddress = await curator.getAddress();
    forwarderAddress = await forwarder.getAddress();

    WrapperContract = await ethers.getContractFactory("Wrapper");
    WrapperInstance = await WrapperContract.connect(owner).deploy();
  });
  describe("createOrganization", function () {
    it("creates organisation correctly", async () => {
        expect(await WrapperInstance.organisationCount()).to.equal(0);

        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            organisationWalletAddress
        );
        await WrapperInstance.connect(owner).createOrganization(organization1);

        expect(await WrapperInstance.organisationCount()).to.equal(1);

        let organizationID = await WrapperInstance.organisationCount();

        expect(await WrapperInstance.connect(owner).getOrgaisationWalletAddess(organizationID))
            .to.equal(organisationWalletAddress);
        expect(await WrapperInstance.connect(owner).getTreasuryAddress(organizationID))
            .to.equal(ethers.constants.AddressZero);
        let contractsDeployed = await WrapperInstance.connect(owner).getDeployedContracts(organizationID);
        expect(contractsDeployed.length).to.equal(0);
        expect(await WrapperInstance.connect(owner).getOrganisationFee(organizationID))
            .to.equal(10);
    });
    it("throws FeeOutOfRange", async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            101,
            daoWalletAddress
        );
        await expect(WrapperInstance.connect(owner).createOrganization(organization1))
            .to.be.revertedWith("FeeOutOfRange()");
    });
    it("throws NoZeroAddressAllowed", async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            ethers.constants.AddressZero
        );
        await expect(WrapperInstance.connect(owner).createOrganization(organization1))
            .to.be.revertedWith("NoZeroAddressAllowed()");
    });
    it("emits OrganizationCreated",async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            organisationWalletAddress
        );
        expect(await WrapperInstance.connect(owner).createOrganization(organization1))
            .to.emit(WrapperInstance, "OrganizationCreated")
            .withArgs(1, organisationWalletAddress);
    });
  });
  describe("addTreasuryModule", function () {
    beforeEach(async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            organisationWalletAddress
        );
        await WrapperInstance.connect(owner).createOrganization(organization1);
    });
    it("deploys treasuryModule", async () => {
        let organizationID = await WrapperInstance.organisationCount();
        
        expect(await WrapperInstance.connect(owner).getTreasuryAddress(organizationID))
            .to.equal(ethers.constants.AddressZero);
        expect(await WrapperInstance.treasuryExist(organizationID)).to.equal(false);
        
        await WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        );

        expect(await WrapperInstance.connect(owner).getTreasuryAddress(organizationID))
            .to.not.equal(ethers.constants.AddressZero); 

        expect(await WrapperInstance.treasuryExist(organizationID)).to.equal(true);
    });
    it("throws OnlyOneTreasuryPerOrganisation", async () => {
        let organizationID = await WrapperInstance.organisationCount();

        await WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        );
        await expect(WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        )).to.be.revertedWith("OnlyOneTreasuryPerOrganisation()");
    });
    it("emits TreasuryModuleAdded", async () => {
        let organizationID = await WrapperInstance.organisationCount();
        
        expect(await WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        )).to.emit(WrapperInstance, "TreasuryModuleAdded").withArgs(organizationID);
    });
  });
  describe("addNewRaffleModule", function () {
    beforeEach(async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            organisationWalletAddress
        );
        await WrapperInstance.connect(owner).createOrganization(organization1);
    });
    it("creates new raffle module", async () => {
        let organizationID = await WrapperInstance.organisationCount();
        let contractsDeployed = await WrapperInstance.connect(owner).getDeployedContracts(organizationID);
        expect(contractsDeployed.length).to.equal(0);

        await WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        );

        await WrapperInstance.connect(owner).addNewRaffleModule(
            organizationID,
            constants.POLYGON.USDC,
            forwarderAddress
        );
        
        contractsDeployed = await WrapperInstance.connect(owner).getDeployedContracts(organizationID);
        expect(contractsDeployed.length).to.equal(1);

        await WrapperInstance.connect(owner).addNewRaffleModule(
            organizationID,
            constants.POLYGON.USDC,
            forwarderAddress
        );

        contractsDeployed = await WrapperInstance.connect(owner).getDeployedContracts(organizationID);
        expect(contractsDeployed.length).to.equal(2);
    });
    it("throws NeedToCreateTreasuryFirst", async () => {
        let organizationID = await WrapperInstance.organisationCount();

        await expect(WrapperInstance.connect(owner).addNewRaffleModule(
            organizationID,
            constants.POLYGON.USDC,
            forwarderAddress
        )).to.be.revertedWith("NeedToCreateTreasuryFirst()");
    });
    it("emits RaffleModuleAdded", async () => {
        let organizationID = await WrapperInstance.organisationCount();

        await WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        );

        expect(await WrapperInstance.connect(owner).addNewRaffleModule(
            organizationID,
            constants.POLYGON.USDC,
            forwarderAddress
        )).to.emit(WrapperInstance, "RaffleModuleAdded")
        .withArgs(organizationID);
    });
  });
  describe("setter fuctions", function () {
    it("setProtocolWalletAddress", async () => {
        expect(await WrapperInstance.protocolWalletAddress()).to.equal(ethers.constants.AddressZero);

        await WrapperInstance.connect(owner).setProtocolWalletAddress(daoWalletAddress);

        expect(await WrapperInstance.protocolWalletAddress()).to.equal(daoWalletAddress);
    });
    it("only owner can call setProtocolWalletAddress", async () => {
        await expect(WrapperInstance.connect(donor1).setProtocolWalletAddress(daoWalletAddress))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("setTokenRewardsCalculationAddress", async () => {
        let TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
        let TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

        expect(await WrapperInstance.tokenRewardsModuleAddress()).to.equal(ethers.constants.AddressZero);

        await WrapperInstance.connect(owner).setTokenRewardsCalculationAddress(TokenRewardsInstance.address);

        expect(await WrapperInstance.tokenRewardsModuleAddress()).to.equal(TokenRewardsInstance.address);
    });
    it("only owner can call setTokenRewardsCalculationAddress", async () => {
        let TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
        let TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();
        await expect(WrapperInstance.connect(donor1).setTokenRewardsCalculationAddress(TokenRewardsInstance.address))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("setProtocolFee", async () => {
        expect(await WrapperInstance.protocolFee()).to.equal(0);

        await WrapperInstance.connect(owner).setProtocolFee(10);

        expect(await WrapperInstance.protocolFee()).to.equal(10);
    });
    it("throws FeeOutOfRange()", async () => {
        await expect(WrapperInstance.connect(owner).setProtocolFee(101))
            .to.be.revertedWith("FeeOutOfRange()");
    });
    it("only owner can call setProtocolFee", async () => {
        await expect(WrapperInstance.connect(donor1).setProtocolFee(10))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("view functions", function () {
    beforeEach(async () => {
        let organizationID = await WrapperInstance.organisationCount();

        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            organisationWalletAddress
        );
        await WrapperInstance.connect(owner).createOrganization(organization1);

        await WrapperInstance.connect(owner).addTreasuryModule(
            organizationID,
            constants.POLYGON.USDC,
            constants.POLYGON.amUSDC,
            constants.POLYGON.AaveIncentivesController,
            constants.POLYGON.AaveLendingPool
        );

        await WrapperInstance.connect(owner).setProtocolFee(10);
        await WrapperInstance.connect(owner).setProtocolWalletAddress(daoWalletAddress);

    });
    it("getProtocolWalletAddress", async () => {
        expect(await WrapperInstance.connect(owner).getProtocolWalletAddress())
            .to.equal(daoWalletAddress);
    });
    it("getTokenRewardsCalculationAddress", async () => {
        let TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
        let TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

        await WrapperInstance.connect(owner).setTokenRewardsCalculationAddress(TokenRewardsInstance.address);

        expect(await WrapperInstance.tokenRewardsModuleAddress()).to.equal(TokenRewardsInstance.address);
        expect(await WrapperInstance.connect(owner).getTokenRewardsCalculationAddress())
            .to.equal(await WrapperInstance.tokenRewardsModuleAddress());
    });
    it("getOrgaisationWalletAddess", async () => {
        expect(await WrapperInstance.connect(owner).getOrgaisationWalletAddess(1))
            .to.equal(organisationWalletAddress);
    });
    it("getTreasuryAddress", async () => {
        let treasuryAddress = await WrapperInstance.connect(owner).getTreasuryAddress(1);
        let organisationCentralTreasury = await WrapperInstance.organisation(1);
        organisationCentralTreasury = organisationCentralTreasury.centralTreasury;
        expect(treasuryAddress).to.equal(organisationCentralTreasury);
    });
    it("getProtocolFee", async () => {
        expect(await WrapperInstance.connect(owner).getProtocolFee())
            .to.equal(10);
    });
    it("getOrganisationFee", async () => {
        expect(await WrapperInstance.connect(owner).getOrganisationFee(1))
            .to.equal(10);
    });
  });
});
