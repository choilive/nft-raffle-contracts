pragma solidity 0.8.11;

interface ITreasuryModule {
    function processDonationFromRaffle(
        uint256 raffleID,
        uint256 amount,
        uint256 organisationID
    ) external;
}
