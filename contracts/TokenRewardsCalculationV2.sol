pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRaffle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RaffleV2.sol";
import "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

contract TokenRewardsCalculationV2 is Ownable {
    uint256[] donationsToThePowerOfArray;

    uint256 private immutable SCALE = 1000;

    function calculateUserRewards(
        uint256 tokensInTheBufferEndOfCycle,
        uint256 totalUserDonation,
        // address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) external returns (uint256) {
        uint256 totalMatchUnits = _calculateTotalMatchUnits(
            // donorsArray,
            totalDonationPerAddresses
        );
        uint256 userMatchUnits = _calculateUserMatchUnits(
            totalUserDonation,
            // totalMatchUnits,
            // donorsArray,
            totalDonationPerAddresses
        );

        uint256 scaledUpMath = (userMatchUnits * SCALE) / totalMatchUnits;
        uint256 userRewards = tokensInTheBufferEndOfCycle * scaledUpMath;

        return userRewards / SCALE;
    }

    function _calculateUserMatchUnits(
        uint256 totalUserDonation,
        // uint256 totalMatchUnits,
        // address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) internal returns (uint256) {
        uint256 totalMatchUnits = _calculateTotalMatchUnits(
            // donorsArray,
            totalDonationPerAddresses
        );
        uint256 userMatchUnits = FixedPointMathLib.sqrt(totalUserDonation) *
            FixedPointMathLib.sqrt(totalMatchUnits);
        return userMatchUnits;
    }

    function _calculateTotalMatchUnits(
        // address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) internal returns (uint256) {
        // const totalMatchUnits = ((user1.totalUserDonation ** (1/2)) + (user2.totalUserDonation ** (1/2))) ** 2;

        // get every donors total donation from cycle to the power of 1/2

        uint256 sumDonations = 0;
        uint256 totalMatchUnits = 0;

        for (uint256 i = 0; i < totalDonationPerAddresses.length; i++) {
            uint256 donationPerAddressToThePowerOf = FixedPointMathLib.sqrt(
                totalDonationPerAddresses[i]
            );

            sumDonations += donationPerAddressToThePowerOf;
        }

        totalMatchUnits = sumDonations**2;

        return totalMatchUnits;
        
    }
}
