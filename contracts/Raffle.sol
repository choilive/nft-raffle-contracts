pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Raffle is Ownable, AccessControl, ReentrancyGuard {
  // TODO - implement access control!
  address public DAOWallet;
  address public nftAuthorWallet;
  uint256 public raffleCount;
  IERC20 public USDC;
  uint256 public totalDonations;
  // -------------------------------------------------------------
  // STORAGE
  // --------------------------------------------------------------
  struct Raffle {
    address nftContract; // address of NFT contract
    uint256[] tokenIDs;
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
  mapping(uint256 => uint256) private totalDonationsPerCycle;
  mapping(uint256 => mapping(address => uint256))
    public totalDonationPerAddressPerCycle;
  mapping(uint256 => mapping(address => Donation[])) public donations;
  mapping(uint256 => address[]) public donorsArrayPerCycle;
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
    // TODO - only curator can create raffle!!
    //TODO // IArtizenNFT NftContract = IArtizenNFT(_raffle.nftContract);
    if (_raffle.startTime > _raffle.endTime) revert IncorrectTimesGiven();

    raffleCount++;
    raffles[raffleCount] = _raffle;

    emit RaffleCreated(
      _raffle.startTime,
      _raffle.endTime,
      _raffle.minimumDonationAmount
    );

    //TODO  transfer NFTs to contract ADD quantity!!
    // NftContract.transferFrom(_raffle.nftOwner, address(this), _raffle.tokenID);

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
    //transfer funds to contract
    USDC.transferFrom(msg.sender, DAOWallet, _donation.amount);

    emit DonationPlaced(msg.sender, raffleId, _donation.amount);
  }

  function sendNFTRewards(uint256 raffleID) public onlyOwner {
    // Recepients:
    // 1. top donor in raffle
    //2. random donor in raffle
    // 3. DAO wallet
    // 4. artist who created the artwork
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

  function getDonorsPerCycle(uint256 raffleID) public view returns (address[]) {
    return donorsArrayPerCycle[raffleID];
  }
}
