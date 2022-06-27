pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRaffle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Raffle.sol";

contract TokenRewardsCalculationV2 is Ownable {
  function calculateUserRewards(
    uint256 tokensInTheBufferEndOfCycle,
    uint256 totalUserDonation,
  ) external returns (uint256) {
    uint256 totalMatchUnits = _calculateTotalMatchUnits();
    uint256 userMatchUnits = _calculateUserMatchUnits(totalUserDonation,totalMatchUnits);
    uint256 userRewards = tokensInTheBufferEndOfCycle *
      (userMatchUnits / totalMatchUnits);
  }

  function _calculateUserMatchUnits(
    uint256 totalUserDonation,
    uint256 totalMatchUnits
  ) internal returns (uint256) {
    uint256 totalMatchUnits = _calculateTotalMatchUnits();
    uint256 userMatchUnits = (totalUserDonation**(1 / 2)) *
      (totalMatchUnits**(1 / 2));
    return userMatchUnits;
  }

  function _calculateTotalMatchUnits() internal returns (uint256) {}
}
