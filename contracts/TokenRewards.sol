pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRaffle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Raffle.sol";

contract TokenRewards is Ownable {
  // TODO where do we get the tokensInTheBufferEndOfCycle number?
  IERC20 public rewardToken;
  address rewardTokenAddress;
  address rewardWalletAddress; // wallet to pay rewards from (can also be treasury address)
  address raffleContractAddress;

  // -------------------------------------------------------------
  // STORAGE
  // --------------------------------------------------------------

  mapping(uint256 => mapping(address => bool)) rewardsClaimedPerCycle;
  mapping(address => uint256) totalRewardsClaimedPerAddress;

  // // --------------------------------------------------------------
  // // EVENTS
  // // --------------------------------------------------------------

  event RewardTokenAddressSet(address tokenAddress);
  event RewardWalletAddressSet(address walletAddress);
  event RaffleContractAddressSet(address contractAddress);
  event RewardsClaimedPerCycle(address donor, uint256 raffleID, uint256 amount);

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------

  error CannotClaimRewards();
  error ZeroAddressNotAllowed();
  error RewardsClaimedForCycle();

  // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  constructor() {}

  // --------------------------------------------------------------
  // STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------

  function setRewardTokenAddress(address _rewardTokenAddress) public onlyOwner {
    if (_rewardTokenAddress == address(0)) revert ZeroAddressNotAllowed();
    rewardTokenAddress = _rewardTokenAddress;
    emit RewardTokenAddressSet(_rewardTokenAddress);
  }

  function setRewardWalletAddress(address _rewardWalletAddress)
    public
    onlyOwner
  {
    if (_rewardWalletAddress == address(0)) revert ZeroAddressNotAllowed();
    rewardWalletAddress = _rewardWalletAddress;
    emit RewardWalletAddressSet(_rewardWalletAddress);
  }

  function setRaffleContractAddress(address _raffleContractAddress)
    public
    onlyOwner
  {
    if (_raffleContractAddress == address(0)) revert ZeroAddressNotAllowed();
    raffleContractAddress = _raffleContractAddress;
    emit RaffleContractAddressSet(_raffleContractAddress);
  }

  // Send out rewards logic
  function sendRewardsToUser(uint256 raffleID, address donor) external {
    // TODO should this be called with a claimRewards function from the raffle contract?
    if (!rewardsClaimedPerCycle[raffleID][donor])
      revert RewardsClaimedForCycle();

    // calculate amount
    uint256 rewardsToPay = _calculateUserRewards(raffleID, donor);
    // transfer amount to donor
    IERC20(rewardTokenAddress).transferFrom(
      rewardWalletAddress,
      donor,
      rewardsToPay
    );
  }

  // --------------------------------------------------------------
  //  INTERNAL STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------

  function _calculateTotalMatchUnits(uint256 raffleID)
    internal
    returns (uint256)
  {
    // TODO
    // need every donors total donation from cycle
    address[] memory donorsArray = IRaffle(raffleContractAddress)
      .getDonorsPerCycle(raffleID);

    for (uint256 i = 0; i < donorsArray.length; i++) {
      IRaffle(raffleContractAddress).getTotalDonationPerAddressPerCycle(
        raffleID,
        donorsArray[i]
      );
    }
  }

  function _calculateMatchUnitsPerDonor(uint256 raffleID, address donor)
    internal
    returns (uint256)
  {
    // TODO const user1MatchUnits = (user1.totalUserDonation ** (1/2)) * (totalMatchUnits ** (1/2))

    uint256 totalDonationsPerDonor = IRaffle(raffleContractAddress)
      .getTotalDonationPerAddressPerCycle(raffleID, donor);

    uint256 totalMatchUnitsPerCycle = _calculateTotalMatchUnits(raffleID);

    uint256 matchUnitsPerDonor = ((totalDonationsPerDonor**1 / 2)) *
      (((totalMatchUnitsPerCycle)**1 / 2));

    return matchUnitsPerDonor;
  }

  function _calculateUserRewards(uint256 raffleID, address donor)
    internal
    returns (uint256)
  {
    // TODO
    uint256 tokensInTheBufferEndOfCycle = IRaffle(raffleContractAddress)
      .getTokensInTheBufferEndOfCycle(); // need to discuss this!!
    uint256 donorMatchUnits = _calculateMatchUnitsPerDonor(raffleID, donor);
    uint256 totalMatchUnits = _calculateTotalMatchUnits(raffleID);
  }

  // --------------------------------------------------------------
  //  FUNCTIONS
  // --------------------------------------------------------------

  function getTotalRewardsClaimedPerUser(address donor)
    public
    view
    returns (uint256)
  {
    return totalRewardsClaimedPerAddress[donor];
  }
}
