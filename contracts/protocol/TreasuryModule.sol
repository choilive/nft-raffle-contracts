pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "contracts/interfaces/AaveIntegration/ILendingPool.sol";
import "contracts/interfaces/AaveIntegration/IAToken.sol";
import "contracts/interfaces/AaveIntegration/IAaveIncentivesController.sol";
import "contracts/interfaces/IWrapper.sol";

// TODO need to check who is the owner if you deploy it from a wrapper!!!!!!!
contract TreasuryModule {
    uint256 constant SCALE = 10000; // Scale is 10 000

    IERC20 public USDC;
    IAToken public aUSDC;
    IAaveIncentivesController public AaveIncentivesController;
    ILendingPool public AaveLendingPool;

    address public USDCAddress; // needed for lending pool ops
    address public aaveLendingPoolAddress;

    address public wrapperContractAddress;

    uint256 organisationFeeBalance;

    // raffleContractAddress => raffleID => total amount of donations
    mapping(address => mapping(uint256 => uint256)) totaldonationsPerRaffle;
    // ------------------------------------------ //
    //                  EVENTS                    //
    // ------------------------------------------ //

    event USDCWithdrawal(uint256 amountWithdrawn);
    event USDCWithdrawalAdmin(address indexed recipient, uint256 amount);
    event USDCMovedFromAaveToTreasury(uint256 amount);
    event USDCMovedFromTreasuryToAave(uint256 amount);
    event ProtocolFeesReduced(uint256 amount);
    event DonationReceivedFromRaffle(
        uint256 raffleID,
        uint256 amount,
        address raffleContract
    );
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
    /**
        @notice this function get's called by the Raffle externally after every donation
        @param raffleID id of raffle donation is made to
        @param amount amount of donation
        @param organisationID id of organisation
        @param raffleContractAddress address of raffle contract
    */
    function processDonationFromRaffle(
        uint256 raffleID,
        uint256 amount,
        uint256 organisationID,
        address raffleContractAddress
    ) external {
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
        totaldonationsPerRaffle[raffleContractAddress][
            raffleID
        ] += amountAfterFees;

        emit DonationReceivedFromRaffle(
            raffleID,
            amount,
            raffleContractAddress
        );
    }

    /**
        @notice withdraws function to organisation wallet address that was set in wrapper
         @param amount amount to withdraw
        @param organisationID id of organisation

    */
    function withdrawFundsToOrganisationWallet(
        uint256 amount,
        uint256 organisationID
    ) public onlyOrganisation(organisationID) {
        if (USDC.balanceOf(address(this)) < amount) revert InsufficentFunds();

        address organisationWallet = IWrapper(wrapperContractAddress)
            .getOrgaisationWalletAddess(organisationID);
        USDC.transferFrom(address(this), organisationWallet, amount);

        emit FundsWithdrawnToOrganisationWallet(amount, organisationWallet);
    }

    // ** AAVE DEPOSIT AND WITHDRAWAL ** //
    /**
        @notice depositing funds to Aave
         @param amount amount to withdraw
    
    */
    function depositToAave(uint256 amount, uint256 organisationID)
        public
        onlyOrganisation(organisationID)
    {
        if (amount > 0) revert NoZeroDeposits();
        if (USDC.balanceOf(address(this)) < amount) revert InsufficentFunds();
        AaveLendingPool.deposit(USDCAddress, amount, address(this), 0);

        emit FundsDepositedToAave(amount);
    }

    /**
        @notice withdraw funds from Aave to treasury
         @param amount amount to withdraw
    
    */
    function withdrawFromAave(uint256 amount, uint256 organisationID)
        public
        onlyOrganisation(organisationID)
    {
        uint256 AaveBalance = getUSDCInAave();
        if (amount > 0) revert NoZeroWithDrawals();
        if (amount > AaveBalance) revert InsufficentFunds();
        AaveLendingPool.withdraw(USDCAddress, amount, address(this));

        emit FundsWithdrawnFromAave(amount);
    }

    /**
        @notice claims rewards earned in Aave
         @param _amountToClaim amount to withdraw
         @param _assets asset of the reward
    
    */
    function claimAaveRewards(
        address[] calldata _assets,
        uint256 _amountToClaim,
        uint256 organisationID
    ) external onlyOrganisation(organisationID) {
        AaveIncentivesController.claimRewards(
            _assets,
            _amountToClaim,
            msg.sender
        );
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

    function getTotalDonationsPerRaffle(
        address raffleContractAddress,
        uint256 raffleID
    ) public view returns (uint256) {
        return totaldonationsPerRaffle[raffleContractAddress][raffleID];
    }

    function getUSDCInAave() public view returns (uint256) {
        uint256 USDCInAave = aUSDC.balanceOf(address(this));
        return USDCInAave;
    }

    function getUSDCFromTreasury() public view returns (uint256) {
        uint256 USDCInTreasury = USDC.balanceOf(address(this));
        return USDCInTreasury;
    }

    // --------------------------------------------------------------
    // INTERNAL FUNCTIONS
    // --------------------------------------------------------------

    modifier onlyOrganisation(uint256 organisationID) {
        address organisationWallet = IWrapper(wrapperContractAddress)
            .getOrgaisationWalletAddess(organisationID);
        require(msg.sender == organisationWallet);
        _;
    }
}
