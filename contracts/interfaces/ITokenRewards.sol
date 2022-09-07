pragma solidity 0.8.16;

interface ITokenRewards {
    function sendRewardsToUser(uint256 raffleID, address donor) external;
}
