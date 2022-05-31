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
  IERC20 public USDC;
  uint256 public totalDonations;

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
  }

  struct Donation {
    uint256 raffleID;
    uint256 amount;
    uint256 timestamp;
  }
  mapping(uint256 => Raffle) public raffles;
  // raffleID => amount
  mapping(uint256 => uint256) private totalDonationsPerCycle;
  // raffleID => address => amount
  mapping(uint256 => mapping(address => uint256))
    public totalDonationPerAddressPerCycle;
  // raffleID => address => amount
  mapping(uint256 => mapping(address => Donation[])) public donations;
  // raffleID => addresses array
  mapping(uint256 => address[]) public donorsArrayPerCycle;
  //raffleID => address
  mapping(uint256 => address) topDonor;
  // raffleID => amount
  mapping(uint256 => uint256) highestDonation;

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

  function createRaffle(Raffle memory _raffle) public returns (uint256) {
    require(hasRole(CURATOR_ROLE, msg.sender));
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
  function donate(Donation memory _donation) public payable nonReentrant {
    uint256 raffleId = _donation.raffleID;
    if (raffles[raffleId].endTime < block.timestamp) revert RaffleHasEnded();
    if (_donation.amount <= raffles[raffleId].minimumDonationAmount)
      revert DonationTooLow();

    // donations[raffleId][msg.sender] = _donation; // TODO check this
    _donation.timestamp = block.timestamp; // TODO check this

    totalDonationPerAddressPerCycle[raffleId][msg.sender] += _donation.amount;

    // add amount to total donations per cycle

    totalDonationsPerCycle[raffleId] += _donation.amount;

    donorsArrayPerCycle[raffleId].push(msg.sender);

    uint256 totalDonationPerAddress = getTotalDonationPerAddressPerCycle(
      raffleId,
      msg.sender
    );

    uint256 higestDonationInCycle = getHighestDonationPerCycle(raffleId);
    if (totalDonationPerAddress >= higestDonationInCycle) {
      //if the donation amount is higher than the current highest donation,set msg.sender to top donor
      topDonor[raffleId] = msg.sender;
    }

    //transfer funds to contract
    USDC.transferFrom(msg.sender, DAOWallet, _donation.amount);

    emit DonationPlaced(msg.sender, raffleId, _donation.amount);
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

  // --------------------------------------------------------------
  // INTERNAL STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------
  function _calcRandomDonor(uint256 raffleID) internal view returns (address) {
    uint256 amountOfDonors = donorsArrayPerCycle[raffleID].length;

    uint256 randomIndex = uint256(
      keccak256(abi.encodePacked(block.timestamp, msg.sender))
    ) % amountOfDonors;

    address winner = donorsArrayPerCycle[raffleID][randomIndex];

    return winner;
  }

  //   function _calcTopDonor(uint256 raffleID) internal view returns (address) {
  //     // TODO - check this logic
  //     uint256 amountOfDonors = donorsArrayPerCycle[raffleID].length;
  //     address[] memory donorsArray = donorsArrayPerCycle[raffleID];

  //     // get total donations per cycle for everyone
  //     for (uint256 i = 0; i < amountOfDonors; i++) {
  //       getTotalDonationPerAddressPerCycle(raffleID, donorsArray[i]);
  //     }
  //     // TODO find the highest value and the address to it
  //   }

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
