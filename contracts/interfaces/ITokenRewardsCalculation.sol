pragma solidity 0.8.11;

interface ITokenRewardsCalculation {
    function calculateUserRewards(
        uint256 tokensInTheBufferEndOfCycle,
        uint256 totalUserDonation,
        // address[] memory donorsArray,
        uint256[] memory totalDonationPerAddresses
    ) external returns (uint256);
}
