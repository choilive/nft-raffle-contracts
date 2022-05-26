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

    event RaffleCreated(uint256 startTime, uint256 endTime);
    event DonationPlaced(address from, uint256 raffleId, uint256 amount);
    event DAOWalletAddressSet(address walletAddress);
}
