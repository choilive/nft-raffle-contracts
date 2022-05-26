pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/interfaces/IArtizenNFT.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFTRaffle is Ownable, AccessControl, ReentrancyGuard {
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
    bool isActive;
  }

  mapping(uint256 => Auction) public raffles;
  mapping(uint256 => bool) public NFTsclaimed;
  mapping(uint256 => address) private highestDonor;
  mapping(address => uint256) public donationPerAddress;
}
