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
      30000
    );

    // Deploy Raffle
    RaffleContract = await ethers.getContractFactory("RaffleV2");
    RaffleInstance = await RaffleContract.connect(owner).deploy(
      constants.POLYGON.USDC,
      forwarderAddress
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
      ArtTokenInstance.address,
      1);

    // Mint Reward Tokens to daoWallet
    await ArtTokenInstance.connect(owner).mint(daoWalletAddress, 30000);

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;

    await USDC.connect(daoWallet).approve(RaffleInstance.address, 5000000000);
    await ArtTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 30000);
  });

  describe("Setter functions", function () {
    it("sets up dao wallet address properly", async () => {
      await RaffleInstance.connect(owner).setDAOWalletAddress(daoWalletAddress);
      expect(await RaffleInstance.DAOWallet()).to.equal(daoWalletAddress);
    });

    it("only owner can set up dao wallet address", async () => {
      const adminHash = await RaffleInstance.DEFAULT_ADMIN_ROLE();
      await expect(
        RaffleInstance.connect(donor1).setDAOWalletAddress(daoWalletAddress)
      ).to.be.revertedWith(`AccessControl: account ${donor1Address.toLowerCase()} is missing role ${adminHash.toLowerCase()}`);
    });

    it("sets up nft author address properly", async () => {
      await RaffleInstance.connect(curator).setNftAuthorWalletAddress(
        nftAuthorAddress
      );
      expect(await RaffleInstance.nftAuthorWallet()).to.equal(nftAuthorAddress);
    });

    it("only owner can set up nft wallet address", async () => {
      const curatorHash = await RaffleInstance.CURATOR_ROLE();
      await expect(
        RaffleInstance.connect(donor1).setNftAuthorWalletAddress(
          nftAuthorAddress
        )
      ).to.be.revertedWith(`AccessControl: account ${donor1Address.toLowerCase()} is missing role ${curatorHash.toLowerCase()}`);
    });
    it("setCuratorRole gives correct permissions", async () => {
      // CURATOR_ROLE is set in beforeEach
      const curatorHash = await RaffleInstance.CURATOR_ROLE();
      expect(await RaffleInstance.connect(owner).hasRole(curatorHash, curatorAddress)).to.equal(true);
    });
    it("revokeCuratorRole revokes correct permissions", async () => {
      // CURATOR_ROLE is set in beforeEach
      const curatorHash = await RaffleInstance.CURATOR_ROLE();
      expect(await RaffleInstance.connect(owner).hasRole(curatorHash, curatorAddress)).to.equal(true);
      await RaffleInstance.connect(owner).revokeCuratorRole(curatorAddress);
      expect(await RaffleInstance.connect(owner).hasRole(curatorHash, curatorAddress)).to.equal(false);
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
        BigNumber.from(10),
        1000,
        1000,
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let raffle = await RaffleInstance.getRaffle(1);

      expect(await raffle.nftContract).to.equal(NFTInstance.address);
      expect(await raffle.nftOwner).to.equal(owner.address);
      expect(await raffle.tokenID).to.equal(1);
      expect(await raffle.raffleID).to.equal(1);
      expect(await raffle.startTime).to.equal(startTime);
      expect(await raffle.endTime).to.equal(endTime);
      expect(await raffle.minimumDonationAmount).to.equal(10);
      expect(await raffle.topDonor).to.equal(owner.address);
      expect(await raffle.topDonatedAmount).to.equal(10);
      expect(await raffle.tokenAllocation).to.equal(1000);
      expect(await raffle.buffer).to.equal(1000);
    });

    it("only curator can create raffle", async () => {
      const curatorHash = await RaffleInstance.CURATOR_ROLE();

      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        BigNumber.from(1),
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await expect(
        RaffleInstance.connect(owner).createRaffle(newRaffle)
      ).to.be.revertedWith(
        `AccessControl: account ${ownerAddress.toLowerCase()} is missing role ${curatorHash.toLowerCase()}`
      );
    });

    it("reverts if incorrect times given", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        BigNumber.from(1),
        endTime,
        startTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await expect(
        RaffleInstance.connect(curator).createRaffle(newRaffle)
      ).to.be.revertedWith("IncorrectTimesGiven()");
    });

    it("contract receives NFTs on raffle creation", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      let contractNFTBalance = NFTInstance.balanceOf(RaffleInstance.address, 1);

      expect(await contractNFTBalance).to.equal(4);
    });

    it("emits Raffle created event properly", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      expect(await RaffleInstance.connect(curator).createRaffle(newRaffle))
        .to.emit(RaffleInstance, "RaffleCreated")
        .withArgs(owner.address, 1, startTime, endTime, 10);
    });
  });

  describe("cancelRaffle tests", function () {
    it("reverts if raffle has ended", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      await fastForward(constants.TEST.twoMonths);

      await expect(RaffleInstance.connect(owner).cancelRaffle(1)).to.be.revertedWith("RaffleHasEnded()");
    });
    it("updates raffle.cancelled bool to true", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      let raffle = await RaffleInstance.connect(owner).getRaffle(1);

      expect(raffle.cancelled).to.equal(false);

      await RaffleInstance.connect(owner).cancelRaffle(1);

      raffle = await RaffleInstance.connect(owner).getRaffle(1);

      expect(raffle.cancelled).to.equal(true);
    });
    it("updates donorsArray correctly", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation1);

      let donorsArray = await RaffleInstance.connect(owner).getDonorsPerCycle(1);

      expect(donorsArray.length).to.equal(1);
      expect(donorsArray[0]).to.equal(donor1Address);

      let donation2 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );

      await RaffleInstance.connect(donor2).donate(donation2);

      donorsArray = await RaffleInstance.connect(owner).getDonorsPerCycle(1);

      expect(donorsArray.length).to.equal(2);
      expect(donorsArray[1]).to.equal(donor2Address);

      let donation3 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("250", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation3);

      // Shouldn't add donor1 to the array again
      expect(donorsArray.length).to.equal(2);
    });
    it("refunds donors USDC correctly", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      const donor1BalBefore = await USDC.balanceOf(donor1Address);
      const donor2BalBefore = await USDC.balanceOf(donor2Address);

      let donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation1);

      let donation2 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );

      await RaffleInstance.connect(donor2).donate(donation2);

      let donation3 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("250", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation3);

      const donor1BalAfterDonation = await USDC.balanceOf(donor1Address);
      const donor2BalAfterDonation = await USDC.balanceOf(donor2Address);

      expect(donor1BalAfterDonation).to.equal(donor1BalBefore.sub(ethers.utils.parseUnits("450", 6)));
      expect(donor2BalAfterDonation).to.equal(donor2BalBefore.sub(ethers.utils.parseUnits("300", 6)));

      await RaffleInstance.connect(owner).cancelRaffle(1);

      const donor1BalAfterRefund = await USDC.balanceOf(donor1Address);
      const donor2BalAfterRefund = await USDC.balanceOf(donor2Address);

      expect(donor1BalAfterRefund).to.equal(donor1BalAfterDonation.add(ethers.utils.parseUnits("450", 6)));
      expect(donor2BalAfterRefund).to.equal(donor2BalAfterDonation.add(ethers.utils.parseUnits("300", 6)));
    });
    it("transfers NFTs back to author", async() => {
      expect(await NFTInstance.balanceOf(RaffleInstance.address, 1)).to.equal(0);
      expect(await NFTInstance.balanceOf(ownerAddress, 1)).to.equal(4);

      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      let raffle = await RaffleInstance.connect(owner).getRaffle(1);

      expect(raffle.nftOwner).to.equal(ownerAddress);
      expect(await NFTInstance.balanceOf(RaffleInstance.address, 1)).to.equal(4);
      expect(await NFTInstance.balanceOf(ownerAddress, 1)).to.equal(0);

      await RaffleInstance.connect(owner).cancelRaffle(1);

      expect(await NFTInstance.balanceOf(RaffleInstance.address, 1)).to.equal(0);
      expect(await NFTInstance.balanceOf(ownerAddress, 1)).to.equal(4);
    });
    it("sends rewardTokens to daoWallet", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      expect(await ArtTokenInstance.balanceOf(RaffleInstance.address)).to.equal(1000);
      expect(await ArtTokenInstance.balanceOf(daoWalletAddress)).to.equal(29000);

      await RaffleInstance.connect(owner).cancelRaffle(1);

      expect(await ArtTokenInstance.balanceOf(RaffleInstance.address)).to.equal(0);
      expect(await ArtTokenInstance.balanceOf(daoWalletAddress)).to.equal(30000);
    });
  });

  describe("Donate function", function () {
    it("transfers donation into DAO Wallet, balance reflects", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      let daoBal = await USDC.balanceOf(daoWalletAddress);
      // console.log(daoBal.toString());
      await RaffleInstance.connect(donor1).donate(newDonation);
      let DaoWalletBal = await USDC.balanceOf(daoWalletAddress);
      // console.log(DaoWalletBal.toString());
      expect(await DaoWalletBal).to.equal(daoBal.add(ethers.utils.parseUnits("200", 6)));
    });
    it("creates donation with correct details", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      RaffleInstance.connect(donor1).donate(newDonation);
      let donation = await RaffleInstance.getDonation(1);
      expect(await donation.donor).to.equal(donor1Address);
      expect(await donation.raffleID).to.equal(1);
      expect(await donation.amount).to.equal(ethers.utils.parseUnits("200", 6));
    });
    it("handles donations correctly for multiple raffles", async () => {
      let Raffle1 = await createRaffleObject(
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
      await RaffleInstance.connect(curator).createRaffle(Raffle1);

      let raffle1Donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      RaffleInstance.connect(donor1).donate(raffle1Donation1);

      let raffle1Donation2 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("50", 6),
        0
      );
      RaffleInstance.connect(donor1).donate(raffle1Donation2);

      let raffle1Donation3 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );
      RaffleInstance.connect(donor2).donate(raffle1Donation3);

      let raffle1Donation4 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("70", 6),
        0
      );
      RaffleInstance.connect(donor2).donate(raffle1Donation4);

      let donorsPerCycleArray = await RaffleInstance.connect(owner).getDonorsPerCycle(1);

      expect(donorsPerCycleArray.length).to.equal(2);
      expect(donorsPerCycleArray[0]).to.equal(donor1Address);
      expect(donorsPerCycleArray[1]).to.equal(donor2Address);

      let totalDonationsPerCycle = await RaffleInstance.connect(owner).getTotalDonationsPerCycle(1);
      expect(totalDonationsPerCycle).to.equal(ethers.utils.parseUnits("620", 6));

      let donor1Total = await RaffleInstance.connect(owner).getTotalDonationPerAddressPerCycle(1, donor1Address);
      let donor2Total = await RaffleInstance.connect(owner).getTotalDonationPerAddressPerCycle(1, donor2Address);
      expect(donor1Total).to.equal(ethers.utils.parseUnits("250", 6));
      expect(donor2Total).to.equal(ethers.utils.parseUnits("370", 6));

      // Create second raffle

      await fastForward(constants.TEST.oneMonth);

      startTime = await currentTime();
      endTime = startTime + constants.TEST.oneMonth;

      await NFTInstance.connect(owner).mint(owner.address, 2, 4, "0x");
      await NFTInstance.connect(owner).setApprovalForAll(
        RaffleInstance.address,
        true
      );

      await USDC.connect(daoWallet).approve(RaffleInstance.address, 5000000000);
      await ArtTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 30000);

      const Raffle2 = await createRaffleObject(
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
      await RaffleInstance.connect(curator).createRaffle(Raffle2);

      let raffle2Donation1 = await createDonationObject(
        donor1Address,
        2,
        ethers.utils.parseUnits("100", 6),
        0
      );
      RaffleInstance.connect(donor1).donate(raffle2Donation1);

      let raffle2Donation2 = await createDonationObject(
        donor3Address,
        2,
        ethers.utils.parseUnits("200", 6),
        0
      );
      RaffleInstance.connect(donor3).donate(raffle2Donation2);

      let raffle2Donation3 = await createDonationObject(
        donor3Address,
        2,
        ethers.utils.parseUnits("50", 6),
        0
      );
      RaffleInstance.connect(donor3).donate(raffle2Donation3);
      
      donorsPerCycleArray = await RaffleInstance.connect(owner).getDonorsPerCycle(2);

      expect(donorsPerCycleArray.length).to.equal(2);
      expect(donorsPerCycleArray[0]).to.equal(donor1Address);
      expect(donorsPerCycleArray[1]).to.equal(donor3Address);

      totalDonationsPerCycle = await RaffleInstance.connect(owner).getTotalDonationsPerCycle(2);
      expect(totalDonationsPerCycle).to.equal(ethers.utils.parseUnits("350", 6));

      donor1Total = await RaffleInstance.connect(owner).getTotalDonationPerAddressPerCycle(2, donor1Address);
      donor3Total = await RaffleInstance.connect(owner).getTotalDonationPerAddressPerCycle(2, donor3Address);
      expect(donor1Total).to.equal(ethers.utils.parseUnits("100", 6));
      expect(donor3Total).to.equal(ethers.utils.parseUnits("250", 6));
    });
    it("reverts if raffle has ended", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      await fastForward(endTime);
      let newDonation = await createDonationObject(donor1Address, 1, 5, 0);
      await expect(
        RaffleInstance.connect(donor1).donate(newDonation)
      ).to.be.revertedWith("RaffleHasEnded()");
    });
    it("reverts if donation is too low", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(donor1Address, 1, 5, 0);
      await expect(
        RaffleInstance.connect(donor1).donate(newDonation)
      ).to.be.revertedWith("DonationTooLow()");
    });
    it("emits Donation submitted event properly", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);

      let newDonation = await createDonationObject(donor1Address, 1, 100, 0);
      expect(await RaffleInstance.connect(donor1).donate(newDonation))
        .to.emit(RaffleInstance, "DonationPlaced")
        .withArgs(donor1Address, 1, 100);
    });
  });
  describe("SendRewards function", function () {
    it("calculates winners correctly, NFT reflect in winners balances", async () => {
      // The tokenRewards part of this function is tested in 4_TokenRewardsCalculation.test.js
      // NOTE : this test result for the random donor changes every time you run the test because the random donor is different each time
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      let newDonationTwo = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("150", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(newDonation);
      await RaffleInstance.connect(donor2).donate(newDonationTwo);

      await fastForward(endTime);

      await RaffleInstance.connect(curator).sendRewards(1);

      expect(await NFTInstance.balanceOf(donor1Address, 1)).to.be.at.least(1);
      expect(await NFTInstance.balanceOf(donor1Address, 1)).to.be.at.most(2);
      expect(await NFTInstance.balanceOf(daoWalletAddress, 1)).to.equal(1);
      expect(await NFTInstance.balanceOf(nftAuthorAddress, 1)).to.equal(1);

      // expected random donor, but it can also be donor1
      expect(await NFTInstance.balanceOf(donor2Address, 1)).to.be.at.least(0);
      expect(await NFTInstance.balanceOf(donor2Address, 1)).to.be.at.most(1);
    });
    it("emits events properly", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      let newDonationTwo = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("150", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(newDonation);
      await RaffleInstance.connect(donor2).donate(newDonationTwo);

      await fastForward(endTime);

      expect(await RaffleInstance.connect(curator).sendRewards(1))
        .to.emit(RaffleInstance, "NFTsentToWinner")
        .withArgs(1, donor1Address);
    });
    it("reverts if donation is still active", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(newDonation);

      await expect(
        RaffleInstance.connect(curator).sendRewards(1)
      ).to.be.revertedWith("RaffleHasNotEnded()");
    });
    it("reverts if raffle is cancelled");
  });

  describe("withdraw function tests", function () {
    this.beforeEach(async () => {
      let raffle1 = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        1000,
        1000,
      );
      await RaffleInstance.connect(curator).createRaffle(raffle1);
    });
    it("reverts if insufficient amount is available", async () => {
      await expect(RaffleInstance.connect(owner).withdraw(daoWalletAddress, 2050)).to.be.revertedWith("InsufficientAmount()");
    });
    it("can withdraw", async () => {

      expect(await ArtTokenInstance.balanceOf(ownerAddress)).to.equal(0);

      await RaffleInstance.connect(owner).withdraw(ownerAddress, 100);

      expect(await ArtTokenInstance.balanceOf(ownerAddress)).to.equal(100);
      expect(await ArtTokenInstance.balanceOf(RaffleInstance.address)).to.equal(900);
    });
    it("emits tokensWithdrawnFromContract", async () => {

      await expect(RaffleInstance.connect(owner).withdraw(ownerAddress, 25))
        .to.emit(RaffleInstance, "tokensWithdrawnFromContract")
        .withArgs(ownerAddress, 25);
    });
  });

  describe("View functions", function () {
    it("returns total donations per cycle", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(newDonation);
      await RaffleInstance.connect(donor1).donate(newDonation);

      expect(await RaffleInstance.getTotalDonationsPerCycle(1)).to.equal(
        ethers.utils.parseUnits("400", 6)
      );
    });
    it("returns total donations per address per cycle", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(newDonation);
      await RaffleInstance.connect(donor1).donate(newDonation);

      expect(
        await RaffleInstance.getTotalDonationPerAddressPerCycle(
          1,
          donor1Address
        )
      ).to.equal(ethers.utils.parseUnits("400", 6));
    });
    it("returns highest donation per cycle", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );

      let newDonationTwo = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(newDonation);
      await RaffleInstance.connect(donor2).donate(newDonationTwo);

      expect(await RaffleInstance.getHighestDonationPerCycle(1)).to.equal(
        ethers.utils.parseUnits("300", 6)
      );
    });
    it("returns top donor", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      let newDonationTwo = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(newDonation);
      expect(await RaffleInstance.getTopDonor(1)).to.equal(donor1Address);

      await RaffleInstance.connect(donor2).donate(newDonationTwo);
      expect(await RaffleInstance.getTopDonor(1)).to.equal(donor2Address);
    });
  });

  describe("Turn on Token Rewards", function () {
    it("Tested in 4_TokenRewardsCalculation.test.js", async () => {});
  });

  describe("Claim Token Rewards function", function () {
    it("Tested in 4_TokenRewardsCalculation.test.js", async () => {});
  });
});
