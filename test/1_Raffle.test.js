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
    await RaffleInstance.connect(owner).setNftAuthorWalletAddress(
      nftAuthorAddress
    );

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
    it("reverts if incorrect times given", async () => {
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
    it("contract receives NFTs on raffle creation", async () => {
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
        BigNumber.from(10)
      );
      expect(await RaffleInstance.connect(curator).createRaffle(newRaffle))
        .to.emit(RaffleInstance, "RaffleCreated")
        .withArgs(owner.address, 1, startTime, endTime, 10);
    });
  });
  describe("Donate function", function () {
    it("creates donation with correct details", async () => {
      // TODO finish this one
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
      // TODO get block timstamp correctly
      let newDonation = await createDonationObject(donor1Address, 1, 100, 0);
      RaffleInstance.connect(donor1).donate(newDonation);
      let donorBalance = await USDC.balanceOf(donor1Address);
    });
    it("reverts if raffle hasn't ended", async () => {
      // TODO
      // let newRaffle = await createRaffleObject(
      //   NFTInstance.address,
      //   ownerAddress,
      //   1,
      //   startTime,
      //   endTime,
      //   BigNumber.from(10),
      //   owner.address,
      //   BigNumber.from(10)
      // );
      // await RaffleInstance.connect(curator).createRaffle(newRaffle);
      // // TODO get block timstamp correctly
      // let newDonation = await createDonationObject(donor1Address, 1, 5, 0);
      // await expect(
      //   RaffleInstance.connect(donor1).donate(newDonation)
      // ).to.be.revertedWith("DonationTooLow()");
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
        BigNumber.from(10)
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      // TODO get block timstamp correctly
      let newDonation = await createDonationObject(donor1Address, 1, 5, 0);
      await expect(
        RaffleInstance.connect(donor1).donate(newDonation)
      ).to.be.revertedWith("DonationTooLow()");
    });
    it("transfers donation into DAO Wallet,balance reflects", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6)
      );
      await RaffleInstance.connect(curator).createRaffle(newRaffle);
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(newDonation);
      let DaoWalletBal = await USDC.balanceOf(daoWalletAddress);
      console.log(DaoWalletBal.toString());
      expect(await DaoWalletBal).to.equal(ethers.utils.parseUnits("200", 6));
    });
    it("emits Donation created event properly", async () => {
      // TODO check this one!
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
      // TODO get block timstamp correctly
      let newDonation = await createDonationObject(donor1Address, 1, 100, 0);
      expect(await RaffleInstance.connect(donor1).donate(newDonation))
        .to.emit(RaffleInstance, "DonationPlaced")
        .withArgs(donor1Address, 1, 100, 0);
    });
  });
  describe("SendNFTsToWinners function", function () {
    it("calculates winners correctly,NFT reflect in winners balances", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6)
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

      await RaffleInstance.connect(owner).sendNFTRewards(1);

      expect(await NFTInstance.balanceOf(donor1Address, 1)).to.equal(1);
      expect(await NFTInstance.balanceOf(daoWalletAddress, 1)).to.equal(1);
      expect(await NFTInstance.balanceOf(nftAuthorAddress, 1)).to.equal(1);
      expect(await NFTInstance.balanceOf(donor2Address, 1)).to.equal(1);
    });
    it("emits events properly", async () => {
      // TODO
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
        ethers.utils.parseUnits("100", 6)
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
        RaffleInstance.connect(owner).sendNFTRewards(1)
      ).to.be.revertedWith("RaffleHasNotEnded()");
    });
  });
  describe("getDonationCountPerAddressPerCycle function", function () {
    it("returns the number of how many times and address has donated in a raffle", async () => {
      // TODO fix this function
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6)
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
        await RaffleInstance.getDonationCountPerAddressPerCycle(
          donor1Address,
          1
        )
      ).to.equal(2);
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
        ethers.utils.parseUnits("100", 6)
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
        ethers.utils.parseUnits("100", 6)
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
      // TODO - doesn't return higest amount correctly
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6)
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
      await RaffleInstance.connect(donor2).donate(newDonationTwo);

      let total = await RaffleInstance.getTotalDonationsPerCycle(1);
      console.log(total.toString());

      expect(await RaffleInstance.getHighestDonationPerCycle(1)).to.equal(
        ethers.utils.parseUnits("300", 6)
      );
    });
    it.only("returns top donor", async () => {
      let newRaffle = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        1,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6)
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
      await RaffleInstance.connect(donor2).donate(newDonationTwo);

      expect(await RaffleInstance.getTopDonor(1)).to.equal(donor2Address);
    });
  });
});
