pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/interfaces/AaveIntegration/ILendingPool.sol";
import "contracts/interfaces/AaveIntegration/IAToken.sol";
import "contracts/interfaces/AaveIntegration/IAaveIncentivesController.sol";
import "contracts/interfaces/IWrapper.sol";

// TODO need to check who is the owner if you deploy it from a wrapper!!!!!!!
contract TreasuryModule is Ownable {
    uint256 public treasuryBalance;
    uint256 constant SCALE = 10000; // Scale is 10 000

    IERC20 public USDC;
    IAToken public aUSDC;
    IAaveIncentivesController public AaveIncentivesController;
    ILendingPool public AaveLendingPool;

    address public USDCAddress; // needed for lending pool ops
    address public aaveLendingPoolAddress;

    address public raffleModuleAddress;
    address public wrapperContractAddress;

    // ------------------------------------------ //
    //                  EVENTS                    //
    // ------------------------------------------ //

    event USDCWithdrawal(uint256 amountWithdrawn);
    event USDCWithdrawalAdmin(address indexed recipient, uint256 amount);
    event USDCMovedFromAaveToTreasury(uint256 amount);
    event USDCMovedFromTreasuryToAave(uint256 amount);
    event ProtocolFeesReduced(uint256 amount);

    // raffleID => total amount of donations
    mapping(uint256 => uint256) totaldonationsPerRaffle;
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
    }

    // TODO this needs to be called from the raffle on donation
    function processDonationFromRaffle(uint256 raffleID, uint256 amount)
        external
    {
        if (msg.sender != raffleModuleAddress)
            revert OnlyRegisteredModulesCanCallThisFunction();
        require(USDC.transfer(address(this), amount), "DONATION FAILED");

        // TODO need to check how the protocol fees will be taken
        totaldonationsPerRaffle[raffleID] += amount;
    }

    function withdrawFundsToOrganisationWallet(uint256 amount)
        public
        onlyOwner
    {
        if (USDC.balanceOf(address(this)) < amount) revert InsufficentFunds();
    }

    // ** AAVE DEPOSIT AND WITHDRAWAL ** //

    function depositToAave(uint256 amount) public onlyOwner {
        if (amount > 0) revert NoZeroDeposits();
        if (USDC.balanceOf(address(this)) < amount) revert InsufficentFunds();
        AaveLendingPool.deposit(USDCAddress, amount, address(this), 0);
    }

    function withdrawFromAave(uint256 amount) public onlyOwner {
        if (amount > 0) revert NoZeroWithDrawals();
        AaveLendingPool.withdraw(USDCAddress, amount, address(this));
    }
}
