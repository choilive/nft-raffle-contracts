pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRaffle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Raffle.sol";

import "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

contract TokenRewards is Ownable {
    IERC20 public rewardToken;
    // TODO Maybe make these addresses private because they contain funds?
    address public rewardTokenAddress;
    address public rewardWalletAddress; // wallet to pay rewards from (can also be treasury address)
    address public raffleContractAddress;

    uint256 private immutable SCALE = 1000;

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
    event RewardsClaimedPerCycle(
        address donor,
        uint256 raffleID,
        uint256 amount
    );

    // --------------------------------------------------------------
    // CUSTOM ERRORS
    // --------------------------------------------------------------

    error CannotClaimRewards();
    error ZeroAddressNotAllowed();
    error RewardsClaimedForCycle();
    error CannotCallThisFunction();

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------

    constructor(address _raffleContractAddress) {
        raffleContractAddress = _raffleContractAddress;
    }

    // --------------------------------------------------------------
    // STATE-MODIFYING FUNCTIONS
    // --------------------------------------------------------------
    /**
        @notice sets the address of the reward token contract
        @param _rewardTokenAddress address of contract
    */
    function setRewardTokenAddress(address _rewardTokenAddress)
        public
        onlyOwner
    {
        if (_rewardTokenAddress == address(0)) revert ZeroAddressNotAllowed();
        rewardTokenAddress = _rewardTokenAddress;
        emit RewardTokenAddressSet(_rewardTokenAddress);
    }

    /**
        @notice sets the address of the wallet holding reward tokens
        @param _rewardWalletAddress address of wallet
    */
    function setRewardWalletAddress(address _rewardWalletAddress)
        public
        onlyOwner
    {
        if (_rewardWalletAddress == address(0)) revert ZeroAddressNotAllowed();
        rewardWalletAddress = _rewardWalletAddress;
        emit RewardWalletAddressSet(_rewardWalletAddress);
    }

    //   function setRaffleContractAddress(address _raffleContractAddress)
    //     public
    //     onlyOwner
    //   {
    //     if (_raffleContractAddress == address(0)) revert ZeroAddressNotAllowed();
    //     raffleContractAddress = _raffleContractAddress;
    //     emit RaffleContractAddressSet(_raffleContractAddress);
    //   }

    // Send out rewards logic
    /**
        @notice external function for sending out rewards, to be called by the Raffle contract
        @param raffleID ID of the raffle cycle
         @param donor address of donor
    */
    function sendRewardsToUser(uint256 raffleID, address donor) external {
        if (msg.sender != raffleContractAddress)
            revert CannotCallThisFunction();
        if (rewardsClaimedPerCycle[raffleID][donor])
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

    /**
        @notice internal function for total match units calculation
        @param raffleID ID of the raffle cycle
    */
    function _calculateTotalMatchUnits(uint256 raffleID)
        internal
        view
        returns (uint256)
    {
        // get every donors total donation from cycle
        address[] memory donorsArray = IRaffle(raffleContractAddress)
            .getDonorsPerCycle(raffleID);

        uint256 totalMatchUnits = 0;
        uint256 sumDonations = 0;

        for (uint256 i = 0; i < donorsArray.length; i++) {
            uint256 donationPerAddressToThePowerOf = FixedPointMathLib.sqrt(
                IRaffle(raffleContractAddress)
                    .getTotalDonationPerAddressPerCycle(
                        raffleID,
                        donorsArray[i]
                    )
            );

            sumDonations += donationPerAddressToThePowerOf;
        }

        totalMatchUnits = sumDonations**2;

        return totalMatchUnits;
    }

    /**
        @notice internal function to calculate match units for each donor
        @param raffleID ID of the raffle cycle
         @param donor address of donor
    */
    function _calculateMatchUnitsPerDonor(uint256 raffleID, address donor)
        internal
        view
        returns (uint256)
    {
        uint256 totalDonationsPerDonor = IRaffle(raffleContractAddress)
            .getTotalDonationPerAddressPerCycle(raffleID, donor);

        uint256 totalMatchUnitsPerCycle = _calculateTotalMatchUnits(raffleID);

        uint256 sqrtTotalDonationsPerDonor = FixedPointMathLib.sqrt(
            totalDonationsPerDonor
        );
        uint256 sqrtTotalMatchUnits = FixedPointMathLib.sqrt(
            totalMatchUnitsPerCycle
        );

        uint256 matchUnitsPerDonor = sqrtTotalDonationsPerDonor *
            sqrtTotalMatchUnits;

        return matchUnitsPerDonor;
    }

    /**
        @notice internal function to calculate rewards for each donor
        @param raffleID ID of the raffle cycle
         @param donor address of donor
    */
    function _calculateUserRewards(uint256 raffleID, address donor)
        internal
        view
        returns (uint256)
    {
        uint256 tokensInTheBufferEndOfCycle = IRaffle(raffleContractAddress)
            .getTokensInTheBufferEndOfCycle();
        uint256 donorMatchUnits = _calculateMatchUnitsPerDonor(raffleID, donor);
        uint256 totalMatchUnits = _calculateTotalMatchUnits(raffleID);

        uint256 donorDivTotal = (donorMatchUnits * SCALE) / totalMatchUnits;

        uint256 rewardsToBePaid = tokensInTheBufferEndOfCycle * donorDivTotal;

        return rewardsToBePaid / SCALE;
    }

    // --------------------------------------------------------------
    //  VIEW FUNCTIONS
    // --------------------------------------------------------------

    function getTotalRewardsClaimedPerUser(address donor)
        public
        view
        returns (uint256)
    {
        return totalRewardsClaimedPerAddress[donor];
    }

    function viewDonorClaimableRewards(uint256 _raffleId, address _donor)
        public
        view
        returns (uint256)
    {
        uint256 claimableRewards = _calculateUserRewards(_raffleId, _donor);
        return claimableRewards;
    }
}
