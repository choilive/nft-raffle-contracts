pragma solidity 0.8.11;

interface Wrapper {
    function setTokenRewardsCalculationAddress(
        address _tokenRewardsModuleAddress
    ) external returns (address);

    function setProtocolFee(uint256 _protocolFee) external returns (uint256);
}
