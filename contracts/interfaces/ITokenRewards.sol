pragma solidity 0.8.11;

interface ITokenRewards {
    function sendRewardsToUser(uint256 raffleID, address donor) external;
}
