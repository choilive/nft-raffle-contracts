pragma solidity 0.8.11;

interface IRaffle {
    function getTotalDonationsPerCycle(uint256 raffleID)
        external
        view
        returns (uint256);

    function getDonorsPerCycle(uint256 raffleID)
        external
        view
        returns (address[] memory);

    function getTotalDonationPerAddressPerCycle(
        uint256 raffleID,
        address account
    ) external view returns (uint256);

    function getHighestDonationPerCycle(uint256 raffleID)
        external
        view
        returns (uint256);

    function getTopDonor(uint256 raffleID) external view returns (address);

    function getTokensInTheBufferEndOfCycle() external view returns (uint256);
}
