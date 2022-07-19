pragma solidity 0.8.11;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "./interfaces/ILendingPool.sol";
// import "./interfaces/IAToken.sol";
// import "./interfaces/IAaveIncentivesController.sol";
// import "../interface/IWrapper.sol";

// contract Treasury is Ownable {
//   // Tracks grant donations and grant admin fees held (in Treasury or Aave)
//   // Rest of USDC is protocol fees or Aave yield (also owned by protocol)
//   uint256 public treasuryBalance;
//   uint256 constant SCALE = 10000; // Scale is 10 000

//   IERC20 public USDC;
//   IAToken public aUSDC;
//   IAaveIncentivesController public AaveIncentivesController;
//   ILendingPool public AaveLendingPool;

//   address public USDCAddress; // needed for lending pool ops
//   address public aaveLendingPoolAddress;
//   bool public isShutdown;

//   // connected module addresses

//   address public override artizenCoreAddress;
//   address public donationsModuleAddress;
//   address public raffleModuleAddress;

//   // ------------------------------------------ //
//   //                  EVENTS                    //
//   // ------------------------------------------ //

//   event USDCWithdrawal(uint256 amountWithdrawn);
//   event USDCWithdrawalAdmin(address indexed recipient, uint256 amount);
//   event USDCMovedFromAaveToTreasury(uint256 amount);
//   event USDCMovedFromTreasuryToAave(uint256 amount);
//   event ProtocolFeesReduced(uint256 amount);
//   event DepositFromDonationModule(uint256 amount, address from);
//   event DepositFromArtizenCore(
//     uint256 amountDeposited,
//     uint256 protocolFeeOnDeposit
//   );
//   event DepositFromAuctionModule(uint256 amount, address from);

//   // ------------------------------------------ //
//   //                 MAPPINGS             //
//   // ------------------------------------------ //

//   // keeps track of donations incoming from donations module
//   mapping(address => uint256) fundsFromDirectDonations;
//   // keeps track of funds coming in from Artizen Core
//   mapping(address => uint256) fundsFromArtizenCore;
//   // keeps track of funds coming in from raffle module
//   mapping(address => uint256) fundsfromRaffle;

//   // ------------------------------------------ //
//   //               CUSTOM ERRORS            //
//   // ------------------------------------------ //

//   error OnyAcceptsDepositFromArtizenModules();

//   // ------------------------------------------ //
//   //                 CONSTRUCTOR                //
//   // ------------------------------------------ //

//   constructor(
//     address _USDC,
//     address _aUSDC,
//     address _aaveIncentivesController,
//     address _lendingPool
//   ) {
//     USDCAddress = _USDC;
//     aaveLendingPoolAddress = _lendingPool;
//     USDC = IERC20(_USDC);
//     aUSDC = IAToken(_aUSDC);
//     AaveIncentivesController = IAaveIncentivesController(
//       _aaveIncentivesController
//     );
//     AaveLendingPool = ILendingPool(_lendingPool);

//     // Infinite approve Aave for USDC deposits
//     USDC.approve(_lendingPool, type(uint256).max);
//   }

//   // ------------------------------------------ //
//   //      PUBLIC STATE-MODIFYING FUNCTIONS      //
//   // ------------------------------------------ //

//   // Takes from grant USDC balance
//   function withdraw(address _recipient, uint256 _amount)
//     external
//     override
//     notShutdown
//     onlyOwnerOrArtizenCore
//   {
//     // Check withdraw isn't sending USDC to zero address
//     // TODO change to custom errors
//     require(_recipient != address(0), "ART_T: WITHDRAW TO ZERO ADDRESS");

//     // check if enough grant funds in treasury + Aave
//     require(treasuryBalance >= _amount, "ART_T: GRANT USDC TOO LOW");

//     (uint256 _USDCInTreasury, uint256 _USDCInAave) = getUSDCInTreasuryAndAave();

//     // Sanity check: grant USDC tracker always <= total actual USDC balances
//     // NOTE: If this fails, Artizen team should deposit USDC into this contract
//     // to allow withdrawals to be processed
//     require(
//       _USDCInTreasury + _USDCInAave >= treasuryBalance,
//       "ART_T: SANITY CHECK FAILED"
//     );

//     // Account for withdraw
//     treasuryBalance -= _amount;

//     if (_USDCInTreasury < _amount) {
//       // Withdraw difference from Aave - enough guaranteed by require above
//       _withdrawFromAave(_amount - _USDCInTreasury);
//       emit USDCMovedFromAaveToTreasury(_amount - _USDCInTreasury);
//     }

//     require(USDC.transfer(_recipient, _amount), "ART_T: WITHDRAW FAILED");

//     emit USDCWithdrawal(_amount);
//   }

//   function deposit(uint256 _amount)
//     external
//     override
//     notShutdown
//     onlyOwnerOrArtizenCore
//   {
//     require(
//       USDC.transferFrom(artizenCoreAddress, address(this), _amount),
//       "ART_T: DEPOSIT FAILED"
//     );

//     uint256 _protocolFee = IWrapper(wrapperAddress).getFees();

//     uint256 _feesEarnedOnDeposit = ((_amount * _protocolFee) / SCALE);

//     // accounting for increase in grant funds (excl. protocol fee)

//     fundsFromArtizenCore[artizenCoreAddress] += _amount;
//     treasuryBalance += (_amount - _feesEarnedOnDeposit);

//     // Deposits new USDC directly into Aave
//     _depositToAave(_amount);

//     // emit event with amount deposited, and fee taken by protocol
//     emit DepositFromArtizenCore(_amount, _feesEarnedOnDeposit);
//   }

//   function processDepositFromModules(
//     address from,
//     uint256 amount,
//     uint256 depositToAave
//   ) external {
//     if (from == donationsModuleAddress) {
//       if (from != donationsModuleAddress)
//         revert OnyAcceptsDepositFromArtizenModules();

//       fundsFromDirectDonations[donationsModuleAddress] +=
//         amount -
//         depositToAave;
//       treasuryBalance += amount - depositToAave;
//       emit DepositFromDonationModule(amount, donationsModuleAddress);

//       _depositToAave(depositToAave); // TODO this deposits everything to Aave straight

//       emit USDCMovedFromTreasuryToAave(amount);
//     }
//     if (from == raffleModuleAddress) {
//       if (from != raffleModuleAddress)
//         revert OnyAcceptsDepositFromArtizenModules();
//       fundsfromRaffle[raffleModuleAddress] += (amount - depositToAave);
//       treasuryBalance += (amount - depositToAave);
//       emit DepositFromAuctionModule(amount, raffleModuleAddress);

//       _depositToAave(depositToAave);
//       emit USDCMovedFromTreasuryToAave(amount);
//     }
//   }

//   function moveEnoughUSDCFromAaveToTreasury(uint256 _amount)
//     external
//     override
//     notShutdown
//     onlyOwnerOrArtizenCore
//   {
//     (uint256 _USDCInTreasury, uint256 _USDCInAave) = getUSDCInTreasuryAndAave();

//     require(
//       _USDCInTreasury + _USDCInAave >= _amount,
//       "ART_T: INSUFFICIENT USDC IN TOTAL"
//     );

//     if (_USDCInTreasury < _amount) {
//       // Withdraw remainder and emit event
//       _withdrawFromAave(_amount - _USDCInTreasury);
//       emit USDCMovedFromAaveToTreasury(_amount - _USDCInTreasury);
//     }
//   }

//   // Reduce protocol fee by increasing treasuryBalance
//   function reduceProtocolFeesEarned(uint256 _amount)
//     external
//     override
//     notShutdown
//     onlyOwnerOrArtizenCore
//   {
//     // NOTE: This only modifies the internal fee accounting to enable full refunds to grants
//     // Artizen is responsible for ensuring that enough USDC is available in this Treasury contract
//     // and/or the Treasury's Aave deposits to fulfil all refunds to the cancelled grant.

//     treasuryBalance += _amount;

//     emit ProtocolFeesReduced(_amount);
//   }

//   // ------------------------------------------ //
//   //     INTERNAL STATE-MODIFYING FUNCTIONS     //
//   // ------------------------------------------ //
//   function _depositToAave(uint256 _amount) internal {
//     require(_amount > 0, "ART_T: NO ZERO DEPOSITS");
//     AaveLendingPool.deposit(USDCAddress, _amount, address(this), 0);
//   }

//   function _withdrawFromAave(uint256 _amount) internal {
//     require(_amount > 0, "ART_T: NO ZERO WITHDRAWS");
//     treasuryBalance += _amount;
//     AaveLendingPool.withdraw(USDCAddress, _amount, address(this));
//   }

//   // ------------------------------------------ //
//   //           ONLY OWNER FUNCTIONS             //
//   // ------------------------------------------ //
//   // For Artizen team to withdraw USDC revenue
//   function withdrawAdmin(address _recipient, uint256 _amount)
//     external
//     override
//     notShutdown
//     onlyOwner
//   {
//     (uint256 _USDCInTreasury, uint256 _USDCInAave) = getUSDCInTreasuryAndAave();

//     // Check enough USDC in Treasury + Aave to honor all grant funds owed
//     require(
//       (_USDCInTreasury + _USDCInAave - treasuryBalance) >= _amount,
//       "ART_T: NOT ENOUGH NON-GRANT USDC"
//     );

//     if (_USDCInTreasury < _amount) {
//       // Withdraw difference from Aave - enough guaranteed by require above
//       _withdrawFromAave(_USDCInTreasury - _amount);
//     }

//     // Only takes from protocol USDC
//     require(USDC.transfer(_recipient, _amount), "ART_T: ADMIN WITHDRAW FAILED");

//     emit USDCWithdrawalAdmin(_recipient, _amount);
//   }

//   function moveUSDCFromTreasuryToAave(uint256 _amountUSDC)
//     external
//     override
//     notShutdown
//     onlyOwner
//   {
//     _depositToAave(_amountUSDC);

//     emit USDCMovedFromTreasuryToAave(_amountUSDC);
//   }

//   function moveUSDCFromAaveToTreasury(uint256 _amountUSDC)
//     external
//     override
//     onlyOwner
//   {
//     _withdrawFromAave(_amountUSDC);

//     emit USDCMovedFromAaveToTreasury(_amountUSDC);
//   }

//   // Claim rewards in wMATIC and send to owner wallet
//   function claimAaveRewards(address[] calldata _assets, uint256 _amountToClaim)
//     external
//     override
//     notShutdown
//     onlyOwner
//   {
//     AaveIncentivesController.claimRewards(_assets, _amountToClaim, msg.sender);
//   }

//   function setLendingPool(address _lendingPool)
//     external
//     override
//     onlyOwner
//     notShutdown
//   {
//     require(_lendingPool != address(0), "ART_T: NO ZERO ADDRESS");
//     AaveLendingPool = ILendingPool(_lendingPool);
//     // Infinite approve Aave for USDC deposits
//     USDC.approve(_lendingPool, type(uint256).max);
//   }

//   function setCoreAddress(address _core) external onlyOwner notShutdown {
//     require(_core != address(0), "ART_T: NO ZERO ADDRESS");
//     artizenCoreAddress = _core;
//     // Infinite approve Core for USDC withdraws
//     USDC.approve(_core, type(uint256).max);
//   }

//   function setDonationModuleAddress(address _donationModule)
//     external
//     onlyOwner
//     notShutdown
//   {
//     require(_donationModule != address(0), "ART_T: NO ZERO ADDRESS");
//     donationsModuleAddress = _donationModule;
//     USDC.approve(_donationModule, type(uint256).max);
//   }

//   function setRaffleModuleAddress(address _raffleModuleAddress)
//     public
//     onlyOwner
//     notShutdown
//   {
//     require(_raffleModuleAddress != address(0), "ART_T: NO ZERO ADDRESS");

//     raffleModuleAddress = _raffleModuleAddress;
//     // Infinite approve Core for USDC withdraws
//     USDC.approve(_raffleModuleAddress, type(uint256).max);
//   }

//   function setTokenAddresses(address _USDC, address _aUSDC)
//     external
//     override
//     onlyOwner
//     notShutdown
//   {
//     require(
//       _USDC != address(0) && _aUSDC != address(0),
//       "ART_T: NO ZERO ADDRESS"
//     );
//     USDCAddress = _USDC;
//     USDC = IERC20(_USDC);
//     aUSDC = IAToken(_aUSDC);
//     USDC.approve(artizenCoreAddress, type(uint256).max);
//     USDC.approve(aaveLendingPoolAddress, type(uint256).max);
//   }

//   function setAaveIncentivesController(address _newController)
//     external
//     override
//     onlyOwner
//     notShutdown
//   {
//     require(_newController != address(0), "ART_T: NO ZERO ADDRESS");
//     AaveIncentivesController = IAaveIncentivesController(_newController);
//   }

//   function shutdown(bool _isShutdown) external override onlyOwner {
//     isShutdown = _isShutdown;
//   }

//   // ------------------------------------------ //
//   //             VIEW FUNCTIONS                 //
//   // ------------------------------------------ //

//   function getUSDCInTreasuryAndAave()
//     public
//     view
//     override
//     returns (uint256, uint256)
//   {
//     uint256 USDCInTreasury = USDC.balanceOf(address(this));
//     uint256 USDCInAave = aUSDC.balanceOf(address(this));
//     return (USDCInTreasury, USDCInAave);
//   }

//   // all funds in Treasury/Aave less funds owed to grants/admins
//   function getTotalUSDCOwnedByArtizen()
//     external
//     view
//     override
//     returns (uint256)
//   {
//     (uint256 _USDCInTreasury, uint256 _USDCInAave) = getUSDCInTreasuryAndAave();
//     return (_USDCInTreasury + _USDCInAave - treasuryBalance);
//   }

//   function getFundsFromDonations(address donationsModuleAddress)
//     public
//     view
//     returns (uint256)
//   {
//     return fundsFromDirectDonations[donationsModuleAddress];
//   }

//   // ------------------------------------------ //
//   //                MODIFIERS                   //
//   // ------------------------------------------ //

//   modifier onlyArtizenCore() {
//     require(
//       msg.sender == artizenCoreAddress,
//       "ART_T: ONLY ARTIZEN CORE ALLOWED"
//     );
//     _;
//   }

//   modifier onlyOwnerOrArtizenCore() {
//     require(
//       msg.sender == artizenCoreAddress || msg.sender == owner(),
//       "ART_T: ONLY OWNER OR CORE"
//     );
//     _;
//   }

//   modifier notShutdown() {
//     require(!isShutdown, "ART_T: CONTRACT IS SHUTDOWN");
//     _;
//   }
// }
