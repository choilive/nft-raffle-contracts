pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RaffleModule.sol";

contract Wrapper is Ownable {
    uint256 public constant SCALE = 10000; // Scale is 10 000
    uint256 public protocolFee;
    uint256 public organizationCount;
    address public tokenRewardsModuleAddress;
    address public protocolWalletAddress;

    struct Organization {
        string name; //TODO do we need this on chain?
        address[] contractsDeployed;
        address walletAddress; // wallet address given by organization
        uint256 organizationID;
    }

    mapping(uint256 => Organization) organizations;

    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event OrganizationCreated(uint256 id, address walletAddress);
    event RaffleModuleAdded(uint256 organizationID, address module);
    event TreasuryModuleAdded(uint256 organizationID, address module);

    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    error FeeOutOfRange();
    error NoZeroAddressAllowed();

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------

    constructor() {}

    // --------------------------------------------------------------
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------

    function createOrganization(Organization memory _organization)
        public
        returns (uint256)
    {
        if (_organization.walletAddress == address(0))
            revert NoZeroAddressAllowed();
        organizationCount++;
        _organization.organizationID = organizationCount;
        organizations[organizationCount] = _organization;
        emit OrganizationCreated(
            _organization.organizationID,
            _organization.walletAddress
        );
        return organizationCount;
    }

    function addNewRaffleModule(
        uint256 organizationID,
        address _usdc,
        address _forwarder
    ) public returns (address raffleModuleAddress) {
        RaffleModule _raffleModule = new RaffleModule(_usdc, _forwarder);
        raffleModuleAddress = address(_raffleModule);

        // register deployed contract with organization

        address[] storage organizationContracts = organizations[organizationID]
            .contractsDeployed;
        organizationContracts.push(raffleModuleAddress);

        emit RaffleModuleAdded(organizationID, raffleModuleAddress);
    }

    function addTreasuryContract(uint256 organizationID)
        public
        returns (address)
    {}

    // --------------------------------------------------------------
    // ONLY OWNER FUNCTIONS
    // --------------------------------------------------------------

    function setProtocolWalletAddress(address _protocolWalletAddress)
        public
        onlyOwner
    {
        protocolWalletAddress = _protocolWalletAddress;
    }

    function setTokenRewardsCalculationAddress(
        address _tokenRewardsModuleAddress
    ) public onlyOwner {
        tokenRewardsModuleAddress = _tokenRewardsModuleAddress;
    }

    function setProtocolFee(uint256 _protocolFee)
        public
        onlyOwner
        returns (uint256)
    {
        if (_protocolFee < SCALE) revert FeeOutOfRange();
        protocolFee = _protocolFee;
        return protocolFee;
    }
}
