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
let NFTContract, NFTInstance;
let RewardTokenContract, RewardTokenInstance;
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
    NFTContract = await ethers.getContractFactory("RewardNFT");
    NFTInstance = await NFTContract.connect(owner).deploy();

    TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
    TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

    // Create Organisation
    let organization1 = await createOrganizationObject(
        "organisation1",
        ethers.utils.parseUnits("10", 6),
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

    await WrapperInstance.connect(owner).setProtocolWalletAddress(daoWalletAddress);
    await WrapperInstance.connect(owner).setTokenRewardsCalculationAddress(TokenRewardsInstance.address);
    await WrapperInstance.connect(owner).setProtocolFee(ethers.utils.parseUnits("10", 6));
  });
});
