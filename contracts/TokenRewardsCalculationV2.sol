pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRaffle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RaffleV2.sol";
import "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

contract TokenRewardsCalculationV2 is Ownable {
    uint256[] donationsToThePowerOfArray;

    function calculateUserRewards(
        uint256 tokensInTheBufferEndOfCycle,
        uint256 totalUserDonation,
        address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) external returns (uint256) {
        uint256 totalMatchUnits = _calculateTotalMatchUnits(
            donorsArray,
            totalDonationPerAddresses
        );
        uint256 userMatchUnits = _calculateUserMatchUnits(
            totalUserDonation,
            totalMatchUnits,
            donorsArray,
            totalDonationPerAddresses
        );
        uint256 userRewards = tokensInTheBufferEndOfCycle *
            (userMatchUnits / totalMatchUnits);

        return userRewards;
    }

    function _calculateUserMatchUnits(
        uint256 totalUserDonation,
        uint256 totalMatchUnits,
        address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) internal returns (uint256) {
        uint256 totalMatchUnits = _calculateTotalMatchUnits(
            donorsArray,
            totalDonationPerAddresses
        );
        uint256 userMatchUnits = FixedPointMathLib.sqrt(totalUserDonation) *
            FixedPointMathLib.sqrt(totalMatchUnits);
        return userMatchUnits;
    }

    function _calculateTotalMatchUnits(
        address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) internal returns (uint256) {
        // const totalMatchUnits = ((user1.totalUserDonation ** (1/2)) + (user2.totalUserDonation ** (1/2))) ** 2;

        // get every donors total donation from cycle to the power of 1/2

        for (uint256 i = 0; i < donorsArray.length; i++) {
            uint256 donationPerAddressToThePowerOf = FixedPointMathLib.sqrt(
                totalDonationPerAddresses[i]
            );
            // push donationPerAddressInto an array
            donationsToThePowerOfArray.push(donationPerAddressToThePowerOf);

            for (uint256 j = 0; j < donationsToThePowerOfArray.length; j++) {
                // adding all elements of an array together
                uint256 sumDonations = 0;
                sumDonations += donationsToThePowerOfArray[i];
                uint256 totalMatchUnits = sumDonations**2;

                return totalMatchUnits;
            }
        }
    }
}
