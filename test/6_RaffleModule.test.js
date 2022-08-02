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
let RaffleInstance;
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

describe("Raffle Module Tests", function () {
  beforeEach(async () => {
    [owner, daoWallet, organisationWallet, nftAuthor, donor1, donor2, donor3, forwarder] =
      await ethers.getSigners();

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
      ethers.utils.parseUnits("1000", 6)

    );

    await USDC.connect(usdcWhale).transfer(
      donor2.address,
      ethers.utils.parseUnits("1000", 6)

    );

    await USDC.connect(usdcWhale).transfer(
      donor3.address,

      ethers.utils.parseUnits("1000", 6)

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
    await NFTInstance.connect(owner).mint(owner.address, 4, "0x", "https://baseURI/");
    await NFTInstance.connect(owner).mint(owner.address, 4, "0x", "https://baseURI/");
    await NFTInstance.connect(owner).mint(owner.address, 4, "0x", "https://baseURI/");

    TokenRewardsContract = await ethers.getContractFactory("TokenRewardsCalculationV2");
    TokenRewardsInstance = await TokenRewardsContract.connect(owner).deploy();

    // Create Organisation
    let organization1 = await createOrganizationObject(
      "organisation1",
      10,
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

    await WrapperInstance.connect(owner).setProtocolWalletAddress(daoWalletAddress);
    await WrapperInstance.connect(owner).setTokenRewardsCalculationAddress(TokenRewardsInstance.address);
    await WrapperInstance.connect(owner).setProtocolFee(10);

    await WrapperInstance.connect(owner).addNewRaffleModule(
      organizationID,
      constants.POLYGON.USDC,
      forwarderAddress
    );

    let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

    let raffle1Address = deployedContractsArray[0];

    treasuryAddress = await WrapperInstance.connect(owner).getTreasuryAddress(1);

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

    await NFTInstance.connect(owner).setApprovalForAll(
      raffle1Address,
      true
    );

    // Mint and approve REWARD TOKEN to organisation wallet
    await RewardTokenInstance.connect(owner).mint(organisationWalletAddress, 30000);
    await RewardTokenInstance.connect(organisationWallet).approve(raffle1Address, 30000);

    // set times
    startTime = await currentTime();
    endTime = startTime + constants.TEST.oneMonth;
  });
  
  describe("Create raffle function", function () {
    this.beforeEach(async () => {
      let raffle1Address;
      let organizationID;
      
      organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

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
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);
    });
    it("creates raffle with correct details", async () => {
      let raffle = await RaffleInstance.raffles(1);

      expect(await raffle.nftContract).to.equal(NFTInstance.address);
      expect(await raffle.nftOwner).to.equal(owner.address);
      expect(await raffle.tokenID).to.equal(1);
      expect(await raffle.raffleID).to.equal(1);
      expect(await raffle.startTime).to.equal(startTime);
      expect(await raffle.endTime).to.equal(endTime);
      expect(await raffle.minimumDonationAmount).to.equal(ethers.utils.parseUnits("25", 6));
      expect(await raffle.topDonor).to.equal(owner.address);
      expect(await raffle.topDonatedAmount).to.equal(ethers.utils.parseUnits("25", 6));
      expect(await raffle.tokenAllocation).to.equal(1000);
      expect(await raffle.buffer).to.equal(1000);
    });

    it("only curator can create raffle", async () => {
      let newRaffle2 = await createRaffleObject(
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
        RaffleInstance.connect(donor1).createRaffle(newRaffle2)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("reverts if incorrect times given", async () => {
      let newRaffle2 = await createRaffleObject(
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
        RaffleInstance.connect(owner).createRaffle(newRaffle2)
      ).to.be.revertedWith("IncorrectTimesGiven()");
    });
    it("contract receives NFTs on raffle creation", async () => {
      let contractNFTBalance = await NFTInstance.balanceOf(RaffleInstance.address, 1);

      expect(contractNFTBalance).to.equal(4);
    });
    it("emits Raffle created event properly", async () => {
      let newRaffle2 = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        2,
        startTime,
        endTime,
        BigNumber.from(10),
        owner.address,
        BigNumber.from(10),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      expect(await RaffleInstance.connect(owner).createRaffle(newRaffle2))
        .to.emit(RaffleInstance, "RaffleCreated")
        .withArgs(owner.address, 2, startTime, endTime, 10);
    });
  });
  
  describe("cancelRaffle tests", function () {

    this.beforeEach(async () => {

      let organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

      raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );
      await RaffleInstance.connect(owner).setNftAuthorWalletAddress(nftAuthorAddress);

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
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);


      await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, organizationID);

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

      let organisation1 = await WrapperInstance.organisation(1);
    });
    it("reverts if raffle has ended", async () => {
      await fastForward(constants.TEST.twoMonths);

      await expect(RaffleInstance.connect(owner).cancelRaffle(1)).to.be.revertedWith("RaffleHasEnded()");
    });

    it("updates raffle.cancelled bool to true", async () => {

      let TreasuryInstance = await ethers.getContractAt(
        "TreasuryModule",
        treasuryAddress,
        owner
      );

      await TreasuryInstance.connect(owner).approveRaffleContract(
        raffle1Address
      );
      
      let raffle = await RaffleInstance.raffles(1);

      expect(raffle.cancelled).to.equal(false);

      await RaffleInstance.connect(owner).cancelRaffle(1);

      raffle = await RaffleInstance.raffles(1);

      expect(raffle.cancelled).to.equal(true);
    });
    it("updates donorsArray correctly", async () => {
      let donorsArray = await RaffleInstance.connect(owner).getDonorsPerCycle(1);

      expect(donorsArray.length).to.equal(2);
      expect(donorsArray[0]).to.equal(donor1Address);

      donation3 = await createDonationObject(
        donor3Address,
        1,
        ethers.utils.parseUnits("100", 6),
        0
      );

      await RaffleInstance.connect(donor3).donate(donation3);

      donorsArray = await RaffleInstance.connect(owner).getDonorsPerCycle(1);

      expect(donorsArray.length).to.equal(3);
      expect(donorsArray[2]).to.equal(donor3Address);

      let donation4 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("250", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation4);

      // Shouldn't add donor1 to the array again
      expect(donorsArray.length).to.equal(3);
    });
    it("refunds donors USDC correctly", async () => {
      let TreasuryInstance = await ethers.getContractAt(
        "TreasuryModule",
        treasuryAddress,
        owner
      );

      await TreasuryInstance.connect(owner).approveRaffleContract(
        raffle1Address
      );
      
      const donor1BalBefore = await USDC.balanceOf(donor1Address);
      const donor2BalBefore = await USDC.balanceOf(donor2Address);

      let donation3 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );
      await RaffleInstance.connect(donor1).donate(donation3);

      let donation4 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("300", 6),
        0
      );

      await RaffleInstance.connect(donor2).donate(donation4);

      const donor1BalAfterDonation = await USDC.balanceOf(donor1Address);
      const donor2BalAfterDonation = await USDC.balanceOf(donor2Address);

      expect(donor1BalAfterDonation).to.equal(donor1BalBefore.sub(ethers.utils.parseUnits("200", 6)));
      expect(donor2BalAfterDonation).to.equal(donor2BalBefore.sub(ethers.utils.parseUnits("300", 6)));

      await RaffleInstance.connect(owner).cancelRaffle(1);

      const donor1BalAfterRefund = await USDC.balanceOf(donor1Address);
      const donor2BalAfterRefund = await USDC.balanceOf(donor2Address);


      let protocolFeePercent = await WrapperInstance.connect(owner).getProtocolFee();
      let donation1ProtocolFee = (ethers.utils.parseUnits("200", 6) * protocolFeePercent) / 100;
      let donation2ProtocolFee = (ethers.utils.parseUnits("300", 6) * protocolFeePercent) / 100;
      let donation3ProtocolFee = (ethers.utils.parseUnits("200", 6) * protocolFeePercent) / 100;
      let donation4ProtocolFee = (ethers.utils.parseUnits("300", 6) * protocolFeePercent) / 100;

      let donor1TotalProtocolFee = donation1ProtocolFee + donation3ProtocolFee;
      let donor2TotalProtocolFee = donation2ProtocolFee + donation4ProtocolFee;

      let donor1Refund = ethers.utils.parseUnits("400", 6) - donor1TotalProtocolFee;
      let donor2Refund = ethers.utils.parseUnits("600", 6) - donor2TotalProtocolFee;

      expect(donor1BalAfterRefund).to.equal(donor1BalAfterDonation.add(donor1Refund));
      expect(donor2BalAfterRefund).to.equal(donor2BalAfterDonation.add(donor2Refund));

    });
    it("transfers NFTs back to author", async() => {
      expect(await NFTInstance.balanceOf(RaffleInstance.address, 2)).to.equal(0);
      expect(await NFTInstance.balanceOf(ownerAddress, 2)).to.equal(4);

      let Raffle2 = await createRaffleObject(
        NFTInstance.address,
        ownerAddress,
        2,
        startTime,
        endTime,
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(owner).createRaffle(Raffle2);


      organizationID = await WrapperInstance.organisationCount();

      await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, organizationID);

      let raffle = await RaffleInstance.raffles(2);


      expect(raffle.nftOwner).to.equal(ownerAddress);
      expect(await NFTInstance.balanceOf(RaffleInstance.address, 2)).to.equal(4);
      expect(await NFTInstance.balanceOf(ownerAddress, 2)).to.equal(0);

      await RaffleInstance.connect(owner).cancelRaffle(2);

      expect(await NFTInstance.balanceOf(RaffleInstance.address, 2)).to.equal(0);
      expect(await NFTInstance.balanceOf(ownerAddress, 2)).to.equal(4);
    });

    it("sends rewardTokens to orgaisationWallet", async () => {
      let TreasuryInstance = await ethers.getContractAt(
        "TreasuryModule",
        treasuryAddress,
        owner
      );

      await TreasuryInstance.connect(owner).approveRaffleContract(
        raffle1Address
      );

      expect(await RewardTokenInstance.balanceOf(RaffleInstance.address)).to.equal(1000);
      expect(await RewardTokenInstance.balanceOf(organisationWalletAddress)).to.equal(29000);

      await RaffleInstance.connect(owner).cancelRaffle(1);

      expect(await RewardTokenInstance.balanceOf(RaffleInstance.address)).to.equal(0);
      expect(await RewardTokenInstance.balanceOf(organisationWalletAddress)).to.equal(30000);
    });
  });

  describe("donate", function () {
    this.beforeEach(async () => {
      let raffle1Address;
      let organizationID;
      
      organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

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
        BigNumber.from(1000),
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
    it("donation processes correctly", async () => {
      let organizationID = await WrapperInstance.organisationCount();
      
      let treasuryAddress = await WrapperInstance.connect(owner).getTreasuryAddress(organizationID);
      let protocolFeePercentage = await WrapperInstance.connect(owner).getProtocolFee();
      let protocolFee = (ethers.utils.parseUnits("200", 6) * protocolFeePercentage) / 100;

      
      expect(await USDC.balanceOf(treasuryAddress)).to.equal(ethers.utils.parseUnits("200", 6).sub(protocolFee));
    });
    it("creates donation with correct details", async () => {
      let donation = await RaffleInstance.donations(1);

      expect(await donation.donor).to.equal(donor1Address);
      expect(await donation.raffleID).to.equal(1);
      expect(await donation.amount).to.equal(ethers.utils.parseUnits("200", 6));
    });
    it("handles donations correctly for multiple raffles", async () => {
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
      await RewardTokenInstance.connect(daoWallet).approve(RaffleInstance.address, 30000);

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
      await RaffleInstance.connect(owner).createRaffle(Raffle2);

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
      await fastForward(endTime);
      let newDonation = await createDonationObject(donor1Address, 1, 5, 0);
      await expect(
        RaffleInstance.connect(donor1).donate(newDonation)
      ).to.be.revertedWith("RaffleHasEnded()");
    });
    it("reverts if donation is too low", async () => {
      let newDonation = await createDonationObject(donor1Address, 1, 5, 0);
      await expect(
        RaffleInstance.connect(donor1).donate(newDonation)
      ).to.be.revertedWith("DonationTooLow()");
    });
    it("emits Donation submitted event properly", async () => {
      let newDonation = await createDonationObject(donor1Address, 1, ethers.utils.parseUnits("100", 6), 0);
      expect(await RaffleInstance.connect(donor1).donate(newDonation))
        .to.emit(RaffleInstance, "DonationPlaced")
        .withArgs(donor1Address, 1, ethers.utils.parseUnits("100", 6));
    });
  });

  describe("TurnOnTokenRewards", function () {
    this.beforeEach(async () => {
      let organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

      let raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );

      // await RewardTokenInstance.connect(daoWallet).approve(raffle1Address, 30000);
      
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
      await RaffleInstance.connect(owner).createRaffle(newRaffle);
    });
    it("reverts on zero address", async () => {
      await expect(RaffleInstance.connect(owner).turnOnTokenRewards(ethers.constants.AddressZero, 1))
        .to.be.revertedWith("ZeroAddressNotAllowed()");
    });
    it("updates bool n tokenRewardsActivated mapping", async () => {
      expect(await RaffleInstance.tokenRewardsActivated(1)).to.equal(false);

      await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, 1);

      expect(await RaffleInstance.tokenRewardsActivated(1)).to.equal(true);
    });
    it("transfers reward tokens to contract", async () => {
      expect(await RewardTokenInstance.balanceOf(RaffleInstance.address))
        .to.equal(0);
      
        await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, 1);

        expect(await RewardTokenInstance.balanceOf(RaffleInstance.address))
        .to.equal(1000);
    });
    it("emits RewardTokenAddressSet", async () => {
      await expect(RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, 1))
        .to.emit(RaffleInstance, "RewardTokenAddressSet")
        .withArgs(RewardTokenInstance.address);
    });
  });

  describe("SendRewards function", function () {
    this.beforeEach(async () => {
      let organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

      raffle1Address = deployedContractsArray[0];

      RaffleInstance = await ethers.getContractAt(
        "RaffleModule",
        raffle1Address,
        owner
      );

      await RaffleInstance.connect(owner).setNftAuthorWalletAddress(nftAuthorAddress);

      
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
      await RaffleInstance.connect(owner).createRaffle(newRaffle);


      await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, 1);
    });
    it("calculates winners correctly, NFT reflect in winners balances", async () => {
      // The tokenRewards part of this function is tested in 4_TokenRewardsCalculation.test.js
      // NOTE : this test result for the random donor changes every time you run the test because the random donor is different each time
      let raffle = await RaffleInstance.connect(owner).raffles(1);


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

      await RaffleInstance.connect(owner).sendRewards(1);

      expect(await NFTInstance.balanceOf(donor1Address, 1)).to.be.at.least(1);
      expect(await NFTInstance.balanceOf(donor1Address, 1)).to.be.at.most(2);
      expect(await NFTInstance.balanceOf(organisationWalletAddress, 1)).to.equal(1);
      expect(await NFTInstance.balanceOf(nftAuthorAddress, 1)).to.equal(1);

      // expected random donor, but it can also be donor1
      expect(await NFTInstance.balanceOf(donor2Address, 1)).to.be.at.least(0);
      expect(await NFTInstance.balanceOf(donor2Address, 1)).to.be.at.most(1);
    });
    it("emits events properly", async () => {
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

      expect(await RaffleInstance.connect(owner).sendRewards(1))
        .to.emit(RaffleInstance, "NFTsentToWinner")
        .withArgs(1, donor1Address);
    });
    it("reverts if donation is still active", async () => {
      let newDonation = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("200", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(newDonation);

      await expect(
        RaffleInstance.connect(owner).sendRewards(1)
      ).to.be.revertedWith("RaffleHasNotEnded()");
    });

    it("reverts if raffle is cancelled", async () => {
      await RaffleInstance.connect(owner).cancelRaffle(1);

      await expect(RaffleInstance.connect(owner).sendRewards(1))
        .to.be.revertedWith("RaffleCancelled()");
    });

  });
  describe("withdraw function tests", function () {
    this.beforeEach(async () => {
      let organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

      let raffle1Address = deployedContractsArray[0];

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
        ethers.utils.parseUnits("100", 6),
        owner.address,
        ethers.utils.parseUnits("100", 6),
        BigNumber.from(1000),
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);

      await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, 1);
    });
    it("reverts if insufficient amount is available", async () => {
      await expect(RaffleInstance.connect(owner).withdraw(ownerAddress, 2050))
        .to.be.revertedWith("InsufficientAmount()");
    });
    it("can withdraw", async () => {
      expect(await RewardTokenInstance.balanceOf(ownerAddress)).to.equal(0);

      await RaffleInstance.connect(owner).withdraw(ownerAddress, 100);

      expect(await RewardTokenInstance.balanceOf(ownerAddress)).to.equal(100);
      expect(await RewardTokenInstance.balanceOf(RaffleInstance.address)).to.equal(900);
    });
    it("emits tokensWithdrawnFromContract", async () => {
      await expect(RaffleInstance.connect(owner).withdraw(ownerAddress, 25))
        .to.emit(RaffleInstance, "tokensWithdrawnFromContract")
        .withArgs(ownerAddress, 25);
    });
  });

  describe("View functions", function () {
    this.beforeEach(async () => {
      let organizationID = await WrapperInstance.organisationCount();

      let deployedContractsArray = await WrapperInstance.connect(owner)
        .getDeployedContracts(organizationID);

      let raffle1Address = deployedContractsArray[0];

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
        BigNumber.from(1000),
      );
      await RaffleInstance.connect(owner).createRaffle(newRaffle);

      await RaffleInstance.connect(owner).setNftAuthorWalletAddress(nftAuthorAddress);


      await RaffleInstance.connect(owner).turnOnTokenRewards(RewardTokenInstance.address, 1);

      let donor1Donation1 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("50", 6),

        0
      );

      let donor2Donation1 = await createDonationObject(
        donor2Address,
        1,
        ethers.utils.parseUnits("200", 6),

        0
      );

      let donor1Donation2 = await createDonationObject(
        donor1Address,
        1,
        ethers.utils.parseUnits("100", 6),
        0
      );

      await RaffleInstance.connect(donor1).donate(donor1Donation1);
      await RaffleInstance.connect(donor2).donate(donor2Donation1);
      await RaffleInstance.connect(donor1).donate(donor1Donation2);
    });
    it("getDonorsPerCycle", async () => {
      let donorsList = await RaffleInstance.connect(owner).getDonorsPerCycle(1);
      expect(donorsList[0]).to.equal(donor1Address);
      expect(donorsList[1]).to.equal(donor2Address);

      let donor3Donation1 = await createDonationObject(
        donor3Address,
        1,
        ethers.utils.parseUnits("400", 6),
        0
      );
      await RaffleInstance.connect(donor3).donate(donor3Donation1);

      donorsList = await RaffleInstance.connect(owner).getDonorsPerCycle(1);

      expect(donorsList[2]).to.equal(donor3Address);
    });
    it("returns total donations per address per cycle", async () => {
      expect(
        await RaffleInstance.getTotalDonationPerAddressPerCycle(
          1,
          donor1Address
        )

      ).to.equal(ethers.utils.parseUnits("150", 6));


      expect(
        await RaffleInstance.getTotalDonationPerAddressPerCycle(
          1,
          donor2Address
        )
      ).to.equal(ethers.utils.parseUnits("200", 6));
    });
    it("returns highest donation per cycle", async () => {
      expect(await RaffleInstance.getHighestDonationPerCycle(1)).to.equal(
        ethers.utils.parseUnits("200", 6)

      );

      let donor3Donation1 = await createDonationObject(
        donor3Address,
        1,
        ethers.utils.parseUnits("400", 6),
        0
      );
      await RaffleInstance.connect(donor3).donate(donor3Donation1);

      expect(await RaffleInstance.getHighestDonationPerCycle(1)).to.equal(
        ethers.utils.parseUnits("400", 6)
      );
    });
    it("returns top donor", async () => {
      expect(await RaffleInstance.getTopDonor(1)).to.equal(donor2Address);

      let donor3Donation1 = await createDonationObject(
        donor3Address,
        1,
        ethers.utils.parseUnits("400", 6),
        0
      );
      await RaffleInstance.connect(donor3).donate(donor3Donation1);
      expect(await RaffleInstance.getTopDonor(1)).to.equal(donor3Address);
    });
    it("getTokenBuffer", async () => {
      expect(await RaffleInstance.connect(owner).getTokenBuffer(1))
        .to.equal(1000);
    });

    it("getTokensInTheBufferEndOfCycle", async () => {
      expect(await RaffleInstance.connect(owner).getTokensInTheBufferEndOfCycle(1))
        .to.equal(1000);
      
      await fastForward(constants.TEST.twoMonths);

      await RaffleInstance.connect(owner).sendRewards(1);

      expect(await RaffleInstance.connect(owner).getTokensInTheBufferEndOfCycle(1))
        .to.equal(1); 
    });

  });

  describe("Turn on Token Rewards", function () {
    it("Tested in 4_TokenRewardsCalculation.test.js", async () => {});
  });

  describe("Claim Token Rewards function", function () {
    it("Tested in 4_TokenRewardsCalculation.test.js", async () => {});
  });
});
