pragma solidity 0.8.16;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./interfaces/ITokenRewardsCalculation.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract RaffleV2 is
  Ownable,
  AccessControl,
  ReentrancyGuard,
  BaseRelayRecipient,
  VRFConsumerBaseV2
{
  uint256 public raffleCount;
  uint256 public donationCount;

  IERC20 immutable USDC;
  IERC20 public REWARD_TOKEN;

  address public tokenRewardsModuleAddress;
  address public DAOWallet;
  address public nftAuthorWallet;

  // bool optionalTokenRewards;

  // ** CHAINLINK ** //

  VRFCoordinatorV2Interface COORDINATOR;

  // TODO this configuration is for Goerli,gotta change this for other chain deployment!

  uint64 s_subscriptionId;
  address vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D;
  bytes32 s_keyHash =
    0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;
  uint32 callbackGasLimit = 40000;
  uint16 requestConfirmations = 3;
  uint32 numWords = 1;
  uint256 private constant REQUEST_IN_PROGRESS = 42;
  // ** Access Control **//
  bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

  string public override versionRecipient = "2.2.6";

  // -------------------------------------------------------------
  // STORAGE
  // --------------------------------------------------------------
  struct Raffle {
    address nftContract; // address of NFT contract
    address nftOwner;
    uint256 raffleID;
    uint256 tokenID;
    uint256 startTime;
    uint256 endTime;
    uint256 donationCount;
    uint256 minimumDonationAmount;
    address topDonor;
    uint256 topDonatedAmount;
    uint256 tokenAllocation;
    bool cancelled;
    bool ended;
  }

  struct Donation {
    address donor;
    uint256 raffleID;
    uint256 amount;
    uint256 timestamp;
  }
  mapping(uint256 => Raffle) public raffles;
  // raffleID => amount
  mapping(uint256 => Donation) public donations;
  // RaffleID => token rewards activated
  mapping(uint256 => bool) public tokenRewardsActivated;

  mapping(uint256 => uint256) private totalDonationsPerCycle;
  // raffleID => address => amount
  mapping(uint256 => mapping(address => uint256))
    public totalDonationPerAddressPerCycle;
  // raffleID => addresses array
  mapping(uint256 => address[]) public donorsArrayPerCycle;
  // Mapping to ensure donor does not get added to donorsArrayPerCycle twice and get two refunds
  // raffleID => donor => donated
  mapping(uint256 => mapping(address => bool)) public donorExistsInArray;
  //raffleID => address
  mapping(uint256 => address) topDonor;
  // raffleID => amount
  mapping(uint256 => uint256) highestDonation;
  //  raffleID => address => donationIDs
  mapping(uint256 => mapping(address => uint256[])) donationCountPerAddressPerCycle;
  //raffleID => account => if they've claimed funds already
  mapping(uint256 => mapping(address => bool)) rewardsClaimedPerCycle;
  mapping(address => uint256) totalRewardsClaimedPerAddress;

  // RaffleID => allDonationsPerAdrressArray
  mapping(uint256 => uint256[]) allDonationsPerAddresses;

  // ** CHAINLINK VRF ** //

  //requestID => raffleID
  mapping(uint256 => uint256) raffleRequests;
  //raffleID => result
  mapping(uint256 => uint256) results;

  // raffleID => address
  mapping(uint256 => address) winner;

  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

  event RaffleCreated(
    address nftOwner,
    uint256 tokenID,
    uint256 startTime,
    uint256 endTime,
    uint256 minimumDonationAmount
  );
  event DonationPlaced(address from, uint256 raffleId, uint256 amount);
  event DAOWalletAddressSet(address walletAddress);
  event RewardTokenAddressSet(address tokenAddress);
  event TokenRewardsModuleAddressSet(address tokenRewardsModuleAddress);
  event nftAuthorWalletAddressSet(address nftAuthorWallet);
  event NFTsentToWinner(uint256 raffleID, address winner);
  event RewardTokenBalanceToppedUp(uint256 amount);
  event tokensWithdrawnFromContract(address account, uint256 amount);
  event donationsWithdrawnFromContract(address account, uint256 amount);
  event RewardsClaimedPerCycle(address donor, uint256 raffleID, uint256 amount);
  event RewardsTransferred(
    uint256 raffleID,
    address donor,
    uint256 amountToPay
  );
  event DonationsTransferred(
    address DAOWallet,
    uint256 raffleID,
    uint256 amount
  );

  event ResultReturned(uint256 requestId, uint256 randomIndex);
  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------
  error IncorrectTimesGiven();
  error ZeroAddressNotAllowed();
  error RaffleHasEnded();
  error DonationTooLow();
  error RaffleHasNotEnded();
  error InsufficientAmount();
  error RaffleCancelled();
  error CannotClaimRewards();
  error NoRewardsForRaffle();
  error AmountsNotEqual();
  error NoMoreTokensToClaim();
  error InitialAmountHasToBeZero();
  error MinimumDonationCantBeZero();
  error FailedTransaction();

  // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  constructor(
    address _usdc,
    address _forwarder,
    uint64 subscriptionId
  ) VRFConsumerBaseV2(vrfCoordinator) {
    if (_usdc == address(0)) revert ZeroAddressNotAllowed();
    if (_forwarder == address(0)) revert ZeroAddressNotAllowed();
    if (vrfCoordinator == address(0)) revert ZeroAddressNotAllowed();

    _setTrustedForwarder(_forwarder);
    USDC = IERC20(_usdc);

    // Sets deployer as DEFAULT_ADMIN_ROLE
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
    s_subscriptionId = subscriptionId;
  }

  // --------------------------------------------------------------
  // STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------

  /**
        @notice sets DAO wallet address for transfering funds
        @param _DAOWallet address of DAO wallet
    */
  function setDAOWalletAddress(address _DAOWallet)
    public
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    if (_DAOWallet == address(0)) revert ZeroAddressNotAllowed();
    DAOWallet = _DAOWallet;
    emit DAOWalletAddressSet(_DAOWallet);
  }

  /**
        @notice sets NFT author wallet address for transfering NFT at the end of raffle cycle
        @param _nftAuthorWallet address of NFT author wallet
    */
  function setNftAuthorWalletAddress(address _nftAuthorWallet)
    public
    onlyRole(CURATOR_ROLE)
  {
    if (_nftAuthorWallet == address(0)) revert ZeroAddressNotAllowed();
    nftAuthorWallet = _nftAuthorWallet;
    emit nftAuthorWalletAddressSet(_nftAuthorWallet);
  }

  /**
        @notice sets curator address for curator role
        @param  curator address of curator wallet
    */
  function setCuratorRole(address curator) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(CURATOR_ROLE, curator);
  }

  function revokeCuratorRole(address curator)
    public
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    revokeRole(CURATOR_ROLE, curator);
  }

  function turnOnTokenRewards(
    address _tokenRewardsModuleAddress,
    address _rewardTokenAddress,
    uint256 _raffleID
  ) public onlyRole(CURATOR_ROLE) {
    if (
      _rewardTokenAddress == address(0) ||
      _tokenRewardsModuleAddress == address(0)
    ) revert ZeroAddressNotAllowed();
    REWARD_TOKEN = IERC20(_rewardTokenAddress);
    tokenRewardsModuleAddress = _tokenRewardsModuleAddress;
    tokenRewardsActivated[_raffleID] = true;

    // transfer reward tokens to contract
    _topUpRewardTokenBalance(_raffleID, raffles[_raffleID].tokenAllocation);
    emit RewardTokenAddressSet(_rewardTokenAddress);
    emit TokenRewardsModuleAddressSet(_tokenRewardsModuleAddress);
  }

  /**
        @notice function for withdrawing reward token from contract
         @param  account address to withdraw tokens to
        @param  amount amount of tokens to be withdrawn
       
    */
  function withdrawRewardTokens(address account, uint256 amount)
    public
    onlyRole(CURATOR_ROLE)
  {
    if (REWARD_TOKEN.balanceOf(address(this)) < amount)
      revert InsufficientAmount();

    bool status = REWARD_TOKEN.transfer(account, amount);
    if (status == false) revert FailedTransaction();

    emit tokensWithdrawnFromContract(account, amount);
  }

  /**
        @notice function for withdrawing donations from contract
         @param  account address to withdraw tokens to
        @param  amount amount of tokens to be withdrawn
       
    */
  function withdrawDonations(address account, uint256 amount)
    public
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    if (USDC.balanceOf(address(this)) < amount) revert InsufficientAmount();
    USDC.approve(address(this), amount);
    bool status = USDC.transferFrom(address(this), account, amount);
    if (status == false) revert FailedTransaction();

    emit donationsWithdrawnFromContract(account, amount);
  }

  /**
        @notice creates a raffle
        @param _raffle object contains parameters for raffle created
    */
  function createRaffle(Raffle memory _raffle)
    public
    onlyRole(CURATOR_ROLE)
    returns (uint256)
  {
    address nftContractAddress = _raffle.nftContract;
    if (_raffle.startTime > _raffle.endTime) revert IncorrectTimesGiven();
    revert AmountsNotEqual();
    if (_raffle.topDonatedAmount > 0) revert InitialAmountHasToBeZero();
    if (_raffle.minimumDonationAmount <= 0) revert MinimumDonationCantBeZero();

    raffleCount++;
    // Set the id of the raffle in the raffle struct
    _raffle.raffleID = raffleCount;
    raffles[raffleCount] = _raffle;

    emit RaffleCreated(
      _raffle.nftOwner,
      _raffle.tokenID,
      _raffle.startTime,
      _raffle.endTime,
      _raffle.minimumDonationAmount
    );

    IERC1155(nftContractAddress).safeTransferFrom(
      _raffle.nftOwner,
      address(this),
      _raffle.tokenID,
      4,
      ""
    );

    return raffleCount;
  }

  /**
        @notice cancels an existing raffle, refunds donors and sends NFT back to artist
        @param raffleID id of raffle
    */
  function cancelRaffle(uint256 raffleID) public onlyRole(CURATOR_ROLE) {
    if (
      (raffles[raffleID].ended == true) ||
      (getTotalDonationsPerCycle(raffleID) > 0 &&
        raffles[raffleID].endTime < block.timestamp)
    ) revert RaffleHasEnded(); // check this logic
    raffles[raffleID].cancelled = true;

    // refund donors
    address[] memory donorsArray = getDonorsPerCycle(raffleID);
    for (uint256 i = 0; i < donorsArray.length; i++) {
      uint256 refundPerAddress = getTotalDonationPerAddressPerCycle(
        raffleID,
        donorsArray[i]
      );

      bool status = USDC.transfer(donorsArray[i], refundPerAddress);
      if (status == false) revert FailedTransaction();
    }

    // send NFTs back to owner

    uint256 refundTokenID = raffles[raffleID].tokenID;
    address tokenOwner = raffles[raffleID].nftOwner;
    address nftContractAddress = raffles[raffleID].nftContract;

    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      tokenOwner,
      refundTokenID,
      4,
      ""
    );

    // transfers reward tokens back to DAO Wallet

    uint256 refundAmount = raffles[raffleID].tokenAllocation;
    raffles[raffleID].tokenAllocation = 0;

    if (tokenRewardsActivated[raffleID] == true) {
      withdrawRewardTokens(DAOWallet, refundAmount);
    }
  }

  /**
        @notice creates a donation on an raffle
        @param _donation object contains parameters for donation created
    */
  function donate(Donation memory _donation)
    public
    nonReentrant
    returns (uint256)
  {
    uint256 raffleId = _donation.raffleID;

    // Loading Raffle obj into memory for top donor calc
    Raffle memory currentRaffle = raffles[raffleId];

    if (raffles[raffleId].endTime < block.timestamp) revert RaffleHasEnded();
    if (_donation.amount < raffles[raffleId].minimumDonationAmount)
      revert DonationTooLow();
    donationCount++;
    _donation.timestamp = block.timestamp;
    donations[donationCount] = _donation;

    // add amount to total donations per address per cycle
    totalDonationPerAddressPerCycle[raffleId][_msgSender()] += _donation.amount;

    // add amount to total donations per cycle
    totalDonationsPerCycle[raffleId] += _donation.amount;

    if (donorExistsInArray[raffleId][_msgSender()] == false) {
      donorsArrayPerCycle[raffleId].push(_msgSender());
      donorExistsInArray[raffleId][_msgSender()] = true;
    }

    uint256 donorsTotalDonationsInRaffle = totalDonationPerAddressPerCycle[
      raffleId
    ][_msgSender()];
    uint256 topDonation = currentRaffle.topDonatedAmount;

    currentRaffle.donationCount++;

    // Calculate top donor and amount and update in Raffle obj
    if (currentRaffle.topDonor == _msgSender()) {
      // dont change top donor, just change amount
      currentRaffle.topDonatedAmount += _donation.amount;

      // Update raffle in storage
      raffles[raffleId] = currentRaffle;
    } else if (donorsTotalDonationsInRaffle > topDonation) {
      // New top donor, update both fiels in Raffle obj
      currentRaffle.topDonatedAmount = donorsTotalDonationsInRaffle;
      highestDonation[raffleId] = donorsTotalDonationsInRaffle;
      currentRaffle.topDonor = _msgSender();
      topDonor[raffleId] = _msgSender();

      // Update raffle in storage
      raffles[raffleId] = currentRaffle;
    }

    //transfer funds to contract
    bool status = USDC.transferFrom(
      _msgSender(),
      address(this),
      _donation.amount
    );
    if (status == false) revert FailedTransaction();

    emit DonationPlaced(_msgSender(), raffleId, _donation.amount);

    return donationCount;
  }

  /**
        @notice distributes NFTs to winners at the end of a raffle cycle
        @param raffleID id of raffle
    */
  function sendRewards(uint256 raffleID) public onlyRole(CURATOR_ROLE) {
    if (raffles[raffleID].endTime > block.timestamp) revert RaffleHasNotEnded();
    if (raffles[raffleID].cancelled == true) revert RaffleCancelled();
    if (raffles[raffleID].ended == true) revert RaffleHasEnded();

    raffles[raffleID].ended = true;

    // calculate randomDonor
    _calculateRandomDonorChainlink(raffleID);
    address randomDonor = winner[raffleID];

    // get topDonor

    address topDonor = getTopDonor(raffleID);

    address nftContractAddress = raffles[raffleID].nftContract;
    uint256 tokenID = raffles[raffleID].tokenID;

    // transfer to random donor
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      topDonor,
      tokenID,
      1,
      ""
    );

    emit NFTsentToWinner(raffleID, topDonor);

    // transfer to random donor
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      randomDonor,
      tokenID,
      1,
      ""
    );

    emit NFTsentToWinner(raffleID, randomDonor);
    // transfer to DAO Wallet
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      DAOWallet,
      tokenID,
      1,
      ""
    );
    emit NFTsentToWinner(raffleID, DAOWallet);
    // transfer to NFT author
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      nftAuthorWallet,
      tokenID,
      1,
      ""
    );
    emit NFTsentToWinner(raffleID, nftAuthorWallet);

    // send token rewards to all donors in raffle
    address[] memory donorsArray = getDonorsPerCycle(raffleID);

    if (tokenRewardsActivated[raffleID] == true) {
      _buildAllDonationsPerAddresses(raffleID);
      for (uint256 i = 0; i < donorsArray.length; i++) {
        claimTokenRewards(raffleID, donorsArray[i]);
      }
    }

    // Send Raffle total donations to DAOWallet
    uint256 totalDonations = getTotalDonationsPerCycle(raffleID);
    USDC.transferFrom(address(this), DAOWallet, totalDonations);
    emit DonationsTransferred(DAOWallet, raffleID, totalDonations);
  }

  function claimTokenRewards(uint256 raffleID, address donor) internal {
    if (tokenRewardsActivated[raffleID] == false) revert NoRewardsForRaffle();
    if (!donorExistsInArray[raffleID][donor]) revert CannotClaimRewards();
    if (rewardsClaimedPerCycle[raffleID][donor] == true)
      revert CannotClaimRewards();
    if (raffles[raffleID].endTime > block.timestamp) revert RaffleHasNotEnded();

    uint256 totalUserDonation = getTotalDonationPerAddressPerCycle(
      raffleID,
      donor
    );

    uint256[]
      storage allDonationsPerAddress = _getAllDonationsPerAddressesArray(
        raffleID
      );

    uint256 tokenAllocation = raffles[raffleID].tokenAllocation;
    // call rewards calculation contract
    uint256 amountToPay = ITokenRewardsCalculation(tokenRewardsModuleAddress)
      .calculateUserRewards(
        tokenAllocation,
        totalUserDonation,
        allDonationsPerAddress
      );
    rewardsClaimedPerCycle[raffleID][donor] = true;
    totalRewardsClaimedPerAddress[donor] += amountToPay;

    raffles[raffleID].tokenAllocation -= amountToPay;

    //transferring rewards to donor
    bool status = REWARD_TOKEN.transfer(donor, amountToPay);
    if (status == false) revert FailedTransaction();

    emit RewardsTransferred(raffleID, donor, amountToPay);
  }

  // --------------------------------------------------------------
  // EXTERNAL FUNCTIONS
  // --------------------------------------------------------------

  function onERC1155Received(
    address operator,
    address from,
    uint256 id,
    uint256 value,
    bytes memory data
  ) external pure returns (bytes4) {
    // 0xf23a6e61 = bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)")
    return 0xf23a6e61;
  }

  // --------------------------------------------------------------
  // INTERNAL STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------

  function _buildAllDonationsPerAddresses(uint256 raffleID) internal {
    address[] memory donorsArray = getDonorsPerCycle(raffleID);

    //get all donation from all addresses donated from the cycle and push it into an array
    for (uint256 i = 0; i < donorsArray.length; i++) {
      uint256 donationPerAddress = getTotalDonationPerAddressPerCycle(
        raffleID,
        donorsArray[i]
      );
      allDonationsPerAddresses[raffleID].push(donationPerAddress);
    }
  }

  //   function _calcRandomDonor(uint256 raffleID) internal view returns (address) {
  //     uint256 amountOfDonors = donorsArrayPerCycle[raffleID].length;

  //     uint256 randomIndex = uint256(
  //       keccak256(
  //         abi.encodePacked(
  //           block.timestamp,
  //           block.number,
  //           block.difficulty,
  //           raffleID
  //         )
  //       )
  //     ) % amountOfDonors;

  //     address winner = donorsArrayPerCycle[raffleID][randomIndex];

  //     return winner;
  //   }

  function _calculateRandomDonorChainlink(uint256 raffleID)
    public
    onlyRole(CURATOR_ROLE)
    returns (uint256 requestId)
  {
    requestId = COORDINATOR.requestRandomWords(
      s_keyHash,
      s_subscriptionId,
      requestConfirmations,
      callbackGasLimit,
      numWords
    );

    raffleRequests[requestId] = raffleID;
    results[raffleID] = REQUEST_IN_PROGRESS;
  }

  function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
    internal
    override
  {
    uint256 raffleID = raffleRequests[requestId];

    address[] memory donorsArray = getDonorsPerCycle(raffleID);
    uint256 randomIndex = (randomWords[0] % donorsArray.length) + 1;
    results[raffleRequests[requestId]] = randomIndex;
    winner[raffleID] = donorsArray[randomIndex];
    emit ResultReturned(requestId, randomIndex);
  }

  /**
        @notice transfers reward tokens to the contract
        @param  amount amount of tokens to be transferred
    */
  function _topUpRewardTokenBalance(uint256 raffleID, uint256 amount) internal {
    raffles[raffleID].tokenAllocation = amount;
    bool status = REWARD_TOKEN.transferFrom(DAOWallet, address(this), amount);
    if (status == false) revert FailedTransaction();

    emit RewardTokenBalanceToppedUp(amount);
  }

  // *** BICONOMY *** //

  function setTrustedForwarder(address _forwarder) public onlyOwner {
    _setTrustedForwarder(_forwarder);
  }

  function _msgSender()
    internal
    view
    override(Context, BaseRelayRecipient)
    returns (address sender)
  {
    sender = BaseRelayRecipient._msgSender();
  }

  function _msgData()
    internal
    view
    override(Context, BaseRelayRecipient)
    returns (bytes calldata)
  {
    return BaseRelayRecipient._msgData();
  }

  function _getAllDonationsPerAddressesArray(uint256 raffleID)
    internal
    view
    returns (uint256[] storage)
  {
    return allDonationsPerAddresses[raffleID];
  }

  // --------------------------------------------------------------
  // VIEW FUNCTIONS
  // --------------------------------------------------------------

  function getRaffle(uint256 raffleID) public view returns (Raffle memory) {
    return raffles[raffleID];
  }

  function getDonation(uint256 donationID)
    public
    view
    returns (Donation memory)
  {
    return donations[donationID];
  }

  function getTotalDonationsPerCycle(uint256 raffleID)
    public
    view
    returns (uint256)
  {
    return totalDonationsPerCycle[raffleID];
  }

  function getDonorsPerCycle(uint256 raffleID)
    public
    view
    returns (address[] memory)
  {
    return donorsArrayPerCycle[raffleID];
  }

  function getTotalDonationPerAddressPerCycle(uint256 raffleID, address account)
    public
    view
    returns (uint256)
  {
    return totalDonationPerAddressPerCycle[raffleID][account];
  }

  function getHighestDonationPerCycle(uint256 raffleID)
    public
    view
    returns (uint256)
  {
    return highestDonation[raffleID];
  }

  function getTopDonor(uint256 raffleID) public view returns (address) {
    return topDonor[raffleID];
  }

  function getTokensInTheBufferEndOfCycle(uint256 raffleID)
    public
    view
    returns (uint256)
  {
    return raffles[raffleID].tokenAllocation;
  }

  // --------------------------------------------------------------
  // OWNABLE MODIFICATIONS
  // --------------------------------------------------------------

  // TODO - check override
  function renounceOwnership(address newOwner) public onlyOwner {
    if (newOwner == address(0)) revert ZeroAddressNotAllowed();
    _transferOwnership(newOwner);
  }
}
