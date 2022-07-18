pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RaffleModule.sol";
import "./TreasuryModule.sol";

contract Wrapper is Ownable {
    uint256 public constant SCALE = 10000; // Scale is 10 000
    uint256 public protocolFee;
    uint256 public organisationCount;
    address public tokenRewardsModuleAddress;
    address public protocolWalletAddress;

    struct Organisation {
        string name; //TODO do we need this on chain?
        address[] contractsDeployed;
        address walletAddress; // wallet address given by organization
        uint256 organisationID;
    }

    mapping(uint256 => Organisation) organisation;

    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event OrganizationCreated(uint256 id, address walletAddress);
    event RaffleModuleAdded(uint256 organisationID, address module);
    event TreasuryModuleAdded(uint256 organisationID, address module);

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

    function createOrganization(Organisation memory _organisation)
        public
        returns (uint256)
    {
        if (_organisation.walletAddress == address(0))
            revert NoZeroAddressAllowed();
        organisationCount++;
        _organisation.organisationID = organisationCount;
        organisation[organisationCount] = _organisation;
        emit OrganizationCreated(
            _organisation.organisationID,
            _organisation.walletAddress
        );
        return organisationCount;
    }

    function addTreasuryModule(uint256 organisationID)
        public
        returns (address treasuryModuleAddress)
    {
        // TODO should an organization only allowed to have 1 treasury?
        TreasuryModule _treasuryModule = new TreasuryModule();
        treasuryModuleAddress = address(_treasuryModule);

        address[] storage organisationContracts = organisation[organisationID]
            .contractsDeployed;
        organisationContracts.push(treasuryModuleAddress);

        emit TreasuryModuleAdded(organisationID, treasuryModuleAddress);
    }

    function addNewRaffleModule(
        uint256 organisationID,
        address _usdc,
        address _forwarder
    ) public returns (address raffleModuleAddress) {
        RaffleModule _raffleModule = new RaffleModule(_usdc, _forwarder);
        raffleModuleAddress = address(_raffleModule);

        // register deployed contract with organization

        address[] storage organisationContracts = organisation[organisationID]
            .contractsDeployed;
        organisationContracts.push(raffleModuleAddress);

        emit RaffleModuleAdded(organisationID, raffleModuleAddress);
    }

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

    // --------------------------------------------------------------
    // VIEW FUNCTIONS
    // --------------------------------------------------------------

    function getOrganisationDetails(uint256 organisationID) public view {}
}
