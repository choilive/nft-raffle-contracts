pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Raffle is Ownable, AccessControl, ReentrancyGuard {
  // TODO - implement access control!
  address public DAOWallet;
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
    bool isActive;
  }
  mapping(uint256 => Raffle) public raffles;
  mapping(uint256 => bool) public nftsClaimed;
  mapping(uint256 => address) private highestDonor;
  mapping(address => uint256) public donationPerAddress;
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

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------
  error IncorrectTimesGiven();
  error ZeroAddressNotAllowed();

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

  function createRaffle(Raffle memory _raffle) public returns (uint256) {
    // TODO - only curator can create raffle!!
    IArtizenNFT NftContract = IArtizenNFT(_raffle.nftContract);
    if (_raffle.startTime > _raffle.endTime) revert IncorrectTimesGiven();

    raffleCount++;
    raffles[raffleCount] = _raffle;
    raffles[raffleCount].isActive = true; // TODO

    emit RaffleCreated(
      _raffle.startTime,
      _raffle.endTime,
      _raffle.minimumDonationAmount
    );

    //TODO  transfer NFTs to contract ADD quantity!!
    NftContract.transferFrom(_raffle.nftOwner, address(this), _raffle.tokenID);

    return raffleCount;
  }
}
