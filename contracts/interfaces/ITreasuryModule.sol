pragma solidity 0.8.16;

interface ITreasuryModule {
    function processDonationFromRaffle(
        uint256 raffleID,
        uint256 amount,
        uint256 organisationID,
        address raffleContractAddress
    ) external;
}
