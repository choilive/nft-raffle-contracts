pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/interfaces/AaveIntegration/ILendingPool.sol";
import "contracts/interfaces/AaveIntegration/IAToken.sol";
import "contracts/interfaces/AaveIntegration/IAaveIncentivesController.sol";
import "contracts/interfaces/IWrapper.sol";

// TODO need to check who is the owner if you deploy it from a wrapper!!!!!!!
contract TreasuryModule is Ownable {
  uint256 constant SCALE = 10000; // Scale is 10 000

  IERC20 public USDC;
  IAToken public aUSDC;
  IAaveIncentivesController public AaveIncentivesController;
  ILendingPool public AaveLendingPool;

  address public USDCAddress; // needed for lending pool ops
  address public aaveLendingPoolAddress;

  address public raffleModuleAddress;
  address public wrapperContractAddress;

  uint256 organisationFeeBalance;

  // raffleID => total amount of donations
  mapping(uint256 => uint256) totaldonationsPerRaffle;
  // ------------------------------------------ //
  //                  EVENTS                    //
  // ------------------------------------------ //

  event USDCWithdrawal(uint256 amountWithdrawn);
  event USDCWithdrawalAdmin(address indexed recipient, uint256 amount);
  event USDCMovedFromAaveToTreasury(uint256 amount);
  event USDCMovedFromTreasuryToAave(uint256 amount);
  event ProtocolFeesReduced(uint256 amount);
  event RaffleModuleAddressSet(address raffleModuleAddress);
  event DonationReceivedFromRaffle(uint256 raffleID, uint256 amount);
  event FundsWithdrawnToOrganisationWallet(
    uint256 amount,
    address organisationWallet
  );
  event ProtocolFeesPaidOnDonation(uint256 amount);
  event FundsDepositedToAave(uint256 amount);
  event FundsWithdrawnFromAave(uint256 amount);

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------

  error ZeroAddressNotAllowed();
  error OnlyRegisteredModulesCanCallThisFunction();
  error NoZeroDeposits();
  error NoZeroWithDrawals();
  error InsufficentFunds();

  // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  constructor(
    address _USDC,
    address _aUSDC,
    address _aaveIncentivesController,
    address _lendingPool,
    address _wrapperContractAddress
  ) {
    USDCAddress = _USDC;
    aaveLendingPoolAddress = _lendingPool;
    USDC = IERC20(_USDC);
    aUSDC = IAToken(_aUSDC);
    AaveIncentivesController = IAaveIncentivesController(
      _aaveIncentivesController
    );
    AaveLendingPool = ILendingPool(_lendingPool);

    wrapperContractAddress = _wrapperContractAddress;
    // Infinite approve Aave for USDC deposits
    USDC.approve(_lendingPool, type(uint256).max);
  }

  // --------------------------------------------------------------
  // STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------

  function setRaffleModuleAddress(address _raffleModuleAddress)
    public
    onlyOwner
  {
    if (_raffleModuleAddress == address(0)) revert ZeroAddressNotAllowed();

    raffleModuleAddress = _raffleModuleAddress;

    emit RaffleModuleAddressSet(_raffleModuleAddress);
  }

  // TODO this needs to be called from the raffle on donation
  function processDonationFromRaffle(
    uint256 raffleID,
    uint256 amount,
    uint256 organisationID
  ) external {
    if (msg.sender != raffleModuleAddress)
      revert OnlyRegisteredModulesCanCallThisFunction();
    require(USDC.transfer(address(this), amount), "DONATION FAILED");

    // get protocol and organisation fees
    uint256 protocolFee = IWrapper(wrapperContractAddress).getProtocolFee();
    uint256 organisationFee = IWrapper(wrapperContractAddress)
      .getOrganisationFee(organisationID);
    uint256 protocolFeesEarned = (amount * protocolFee) / SCALE;
    uint256 organisationFeesEarned = (amount * protocolFee) / SCALE;

    // add organisation fee to balance
    organisationFeeBalance += organisationFeesEarned;

    // transfer protocol fee to protocol wallet
    _transferProtocolFee(protocolFeesEarned);

    // update total donations for raffle
    uint256 amountAfterFees = amount -
      (protocolFeesEarned + organisationFeesEarned);
    totaldonationsPerRaffle[raffleID] += amountAfterFees;

    emit DonationReceivedFromRaffle(raffleID, amount);
  }

  function withdrawFundsToOrganisationWallet(
    uint256 amount,
    address organisationWallet
  ) public onlyOwner {
    if (USDC.balanceOf(address(this)) < amount) revert InsufficentFunds();
    USDC.transferFrom(address(this), organisationWallet, amount);

    emit FundsWithdrawnToOrganisationWallet(amount, organisationWallet);
  }

  // ** AAVE DEPOSIT AND WITHDRAWAL ** //

  function depositToAave(uint256 amount) public onlyOwner {
    if (amount > 0) revert NoZeroDeposits();
    if (USDC.balanceOf(address(this)) < amount) revert InsufficentFunds();
    AaveLendingPool.deposit(USDCAddress, amount, address(this), 0);

    emit FundsDepositedToAave(amount);
  }

  function withdrawFromAave(uint256 amount) public onlyOwner {
    if (amount > 0) revert NoZeroWithDrawals();
    AaveLendingPool.withdraw(USDCAddress, amount, address(this));

    emit FundsWithdrawnFromAave(amount);
  }

  function claimAaveRewards(address[] calldata _assets, uint256 _amountToClaim)
    external
    onlyOwner
  {
    AaveIncentivesController.claimRewards(_assets, _amountToClaim, msg.sender);
  }

  // --------------------------------------------------------------
  // INTERNAL FUNCTIONS
  // --------------------------------------------------------------

  function _transferProtocolFee(uint256 amount) internal {
    address protocolWallet = IWrapper(wrapperContractAddress)
      .getProtocolWalletAddress();
    USDC.transferFrom(address(this), protocolWallet, amount);
    emit ProtocolFeesPaidOnDonation(amount);
  }

  // --------------------------------------------------------------
  // VIEW FUNCTIONS
  // --------------------------------------------------------------

  function getTotalDonationsPerRaffle(uint256 raffleID)
    public
    view
    returns (uint256)
  {
    return totaldonationsPerRaffle[raffleID];
  }
}
