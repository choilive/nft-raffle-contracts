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

    WrapperContract = await ethers.getContractFactory("Wrapper");
    WrapperInstance = await WrapperContract.connect(owner).deploy();
  });
  describe.only("createOrganization", function () {
    it("creates organisation correctly", async () => {
        expect(await WrapperInstance.organisationCount()).to.equal(0);

        let organization1 = await createOrganizationObject(
            "organisation1",
            ethers.utils.parseUnits("10", 6),
            daoWalletAddress
        );
        await WrapperInstance.connect(owner).createOrganization(organization1);

        expect(await WrapperInstance.organisationCount()).to.equal(1);

        let organizationID = await WrapperInstance.organisationCount();
        let organizationObject = await WrapperInstance.connect(owner).getOrganisationDetails(organizationID);

        expect(organizationObject.name).to.equal("organisation1");
        expect(organizationObject.organisationID).to.equal(1);
        expect(organizationObject.organisationFee).to.equal(ethers.utils.parseUnits("10", 6));
        expect(organizationObject.walletAddress).to.equal(daoWalletAddress);
        expect(organizationObject.centralTreasury).to.equal(ethers.constants.AddressZero);
        expect(organizationObject.contractsDeployed.length).to.equal(0);
    });
    it("throws FeeOutOfRange", async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            10,
            daoWalletAddress
        );
        await expect(WrapperInstance.connect(owner).createOrganization(organization1))
            .to.be.revertedWith("FeeOutOfRange()");
    });
    it("throws NoZeroAddressAllowed", async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            ethers.utils.parseUnits("10", 6),
            ethers.constants.AddressZero
        );
        await expect(WrapperInstance.connect(owner).createOrganization(organization1))
            .to.be.revertedWith("NoZeroAddressAllowed()");
    });
    it("emits OrganizationCreated",async () => {
        let organization1 = await createOrganizationObject(
            "organisation1",
            ethers.utils.parseUnits("10", 6),
            daoWalletAddress
        );
        expect(await WrapperInstance.connect(owner).createOrganization(organization1))
            .to.emit(WrapperInstance, "OrganizationCreated")
            .withArgs(1, daoWalletAddress);
    });
  });
  describe("addTreasuryModule", function () {});
});
