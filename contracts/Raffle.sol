pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract Raffle is Ownable, AccessControl, ReentrancyGuard {
  // TODO - implement access control!
  address public DAOWallet;
  address public nftAuthorWallet;
  uint256 public raffleCount;
  uint256 public donationCount;
  IERC20 public USDC;

  bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");
  // -------------------------------------------------------------
  // STORAGE
  // --------------------------------------------------------------
  struct Raffle {
    address nftContract; // address of NFT contract
    address nftOwner;
    uint256 tokenID;
    uint256 startTime;
    uint256 endTime;
    uint256 minimumDonationAmount;
    address topDonor;
    uint256 topDonatedAmount;
  }

  struct Donation {
    uint256 raffleID;
    uint256 amount;
    uint256 timestamp;
  }
  mapping(uint256 => Raffle) public raffles;
  mapping(uint256 => Donation) public donations;
  // raffleID => amount
  mapping(uint256 => uint256) private totalDonationsPerCycle;
  // raffleID => address => amount
  mapping(uint256 => mapping(address => uint256))
    public totalDonationPerAddressPerCycle;
  // raffleID => addresses array
  mapping(uint256 => address[]) public donorsArrayPerCycle;
  //raffleID => address
  mapping(uint256 => address) topDonor;
  // raffleID => amount
  mapping(uint256 => uint256) highestDonation;
  // address => raffleID => donationIDs
  mapping(address => mapping(uint256 => uint256[])) donationCountPerAddressPerCycle;

  // // --------------------------------------------------------------
  // // EVENTS
  // // --------------------------------------------------------------

  event RaffleCreated(
    uint256 startTime,
    uint256 endTime,
    uint256 minimumDonationAmount
  );
  event DonationPlaced(address from, uint256 raffleId, uint256 amount);
  event DAOWalletAddressSet(address walletAddress);
  event nftAuthorWalletAddressSet(address nftAuthorWallet);

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------
  error IncorrectTimesGiven();
  error ZeroAddressNotAllowed();
  error RaffleHasEnded();
  error DonationTooLow();
  error RaffleHasNotEnded();

  // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  constructor(address _usdc) {
    USDC = IERC20(_usdc);
    USDC.approve(address(this), type(uint256).max);
  }

  // --------------------------------------------------------------
  // STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------

  /**
        @notice sets DAO wallet address for transfering funds
        @param _DAOWallet address of DAO wallet
    */
  function setDAOWalletAddress(address _DAOWallet) public onlyOwner {
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
    onlyOwner
  {
    if (_nftAuthorWallet == address(0)) revert ZeroAddressNotAllowed();
    nftAuthorWallet = _nftAuthorWallet;
    emit nftAuthorWalletAddressSet(_nftAuthorWallet);
  }

  function setCuratorRole(address curator) public onlyOwner {
    _grantRole(CURATOR_ROLE, curator);
  }

  function createRaffle(Raffle memory _raffle)
    public
    onlyRole(CURATOR_ROLE)
    returns (uint256)
  {
    address nftContractAddress = _raffle.nftContract;
    if (_raffle.startTime > _raffle.endTime) revert IncorrectTimesGiven();

    raffleCount++;
    raffles[raffleCount] = _raffle;

    emit RaffleCreated(
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
        @notice creates a donation on an raffle
        @param _donation object contains parameters for donation created
    */
  function donate(Donation memory _donation)
    public
    payable
    nonReentrant
    returns (uint256)
  {
    uint256 raffleId = _donation.raffleID;

    // Loading Raffle obj into memory for top donor calc
    Raffle memory currentRaffle = raffles[raffleId];

    if (raffles[raffleId].endTime < block.timestamp) revert RaffleHasEnded();
    if (_donation.amount <= raffles[raffleId].minimumDonationAmount)
      revert DonationTooLow();
    donationCount++;
    _donation.timestamp = block.timestamp;
    donations[donationCount] = _donation;

    // add amount to total donations per address per cycle
    totalDonationPerAddressPerCycle[raffleId][msg.sender] += _donation.amount;

    // add amount to total donations per cycle
    totalDonationsPerCycle[raffleId] += _donation.amount;

    donorsArrayPerCycle[raffleId].push(msg.sender);

    uint256 donorsTotalDonationsInRaffle = totalDonationPerAddressPerCycle[
      raffleId
    ][msg.sender];
    uint256 topDonation = currentRaffle.topDonatedAmount;
    // Calculate top donor and amount and update in Raffle obj

    if (currentRaffle.topDonor == msg.sender) {
      // dont change top donor, just change amount
      currentRaffle.topDonatedAmount += _donation.amount;

      // Update raffle in storage
      raffles[raffleId] = currentRaffle;
    } else if (donorsTotalDonationsInRaffle > topDonation) {
      // New top donor, update both fiels in Raffle obj
      currentRaffle.topDonatedAmount = donorsTotalDonationsInRaffle;
      highestDonation[raffleId] = topDonation;
      currentRaffle.topDonor = msg.sender;
      topDonor[raffleId] = msg.sender;

      // Update raffle in storage
      raffles[raffleId] = currentRaffle;
    }

    //transfer funds to contract
    USDC.transferFrom(msg.sender, DAOWallet, _donation.amount);

    emit DonationPlaced(msg.sender, raffleId, _donation.amount);

    return donationCount;
  }

  function sendNFTRewards(uint256 raffleID) public onlyOwner {
    if (raffles[raffleID].endTime > block.timestamp) revert RaffleHasNotEnded();

    // calculate randomDonor
    address randomDonor = _calcRandomDonor(raffleID);

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

    // transfer to random donor
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      randomDonor,
      tokenID,
      1,
      ""
    );

    // transfer to DAO Wallet
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      DAOWallet,
      tokenID,
      1,
      ""
    );

    // transfer to NFT author
    IERC1155(nftContractAddress).safeTransferFrom(
      address(this),
      nftAuthorWallet,
      tokenID,
      1,
      ""
    );
  }

  function getDonationCountPerAddressPerCycle(address donor, uint256 raffleID)
    public
    returns (uint256)
  {
    uint256[] storage singleDonaitons = donationCountPerAddressPerCycle[donor][
      raffleID
    ];
    uint256 singleDonationsCount = singleDonaitons.length;
    return singleDonationsCount;
  }

  // --------------------------------------------------------------
  // INTERNAL STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------
  function _calcRandomDonor(uint256 raffleID) internal view returns (address) {
    uint256 amountOfDonors = donorsArrayPerCycle[raffleID].length;

    uint256 randomIndex = uint256(
      keccak256(
        abi.encodePacked(
          block.timestamp,
          block.number,
          block.difficulty,
          raffleID
        )
      )
    ) % amountOfDonors;

    address winner = donorsArrayPerCycle[raffleID][randomIndex];

    return winner;
  }

  // --------------------------------------------------------------
  // VIEW FUNCTIONS
  // --------------------------------------------------------------

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
}
