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

    // Turn on token rewards in Raffle
    await RaffleInstance.connect(owner).turnOnTokenRewards(
      TokenRewardsInstance.address,
      ArtTokenInstance.address);

    // Mint Reward Tokens to daoWallet
    await ArtTokenInstance.connect(owner).mint(daoWalletAddress, 3000);

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    await USDC.connect(daoWallet).approve(RaffleInstance.address, 5000000000);
    await ArtTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 3000);
  });

  describe("Token Rewards Calculation", function () {
    beforeEach(async () => {
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
    it("claim token rewards returns correct amount of reward tokens", async () => {
        
        
        // let tokensInBuffer = await RaffleInstance.connect(owner).getTokensInTheBufferEndOfCycle(1);
        // console.log(tokensInBuffer.toString())
        await RaffleInstance.connect(donor1).claimTokenRewards(1, donor1Address);
        await RaffleInstance.connect(donor2).claimTokenRewards(1, donor2Address);
        // let donoationArray = await RaffleInstance.connect(owner).getAllDonationsPerAddressesArray();
        // console.log(donoationArray);
        // tokensInBuffer = await RaffleInstance.connect(owner).getTokensInTheBufferEndOfCycle(1);
        // console.log(tokensInBuffer.toString())

        

        // donoationArray = await RaffleInstance.connect(owner).getAllDonationsPerAddressesArray();
        // console.log(donoationArray);

        let bal = await ArtTokenInstance.balanceOf(donor1Address);
        console.log(bal.toString());

        
        let bal2 = await ArtTokenInstance.balanceOf(donor2Address);
        console.log(bal2.toString());

        // let donation1 = await RaffleInstance.connect(donor1).getTotalDonationPerAddressPerCycle(1, donor1Address);
        // let donation2 = await RaffleInstance.connect(donor2).getTotalDonationPerAddressPerCycle(1, donor2Address);

        // console.log(donation1.toString());
        // console.log(donation2.toString());

        // let totalMatchUnits = await TokenRewardsInstance.connect(owner).calculateTotalMatchUnits([150,370]);
        // console.log(totalMatchUnits.toString());
    });
  });
});
