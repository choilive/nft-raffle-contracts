pragma solidity 0.8.11;

interface IWrapper {
    function getProtocolWalletAddress() external view returns (address);

    function getTokenRewardsCalculationAddress()
        external
        view
        returns (address);

    function getOrgaisationWalletAddess(uint256 organisationID)
        external
        view
        returns (address);

    function getTreasuryAddress(uint256 organisationID)
        external
        view
        returns (address);

    function getFees() external view returns (uint256);
}
