pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Wrapper is Ownable {

uint256 public constant SCALE = 10000; // Scale is 10 000
uint256 public protocolFee;



  struct Organization {
    string name, // should we register name on-chain
    address[] contractsDeployed,
    address walletAddress,
    uint organizationID // organization centracl wallet address
  }


  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

event OrganizationCreated(string name);
event RaffleModuleAdded(uint organizationID,address module);
event TreasuryModuleAdded(uint organizationID,address module);

  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

  error FeeOutOfRange();

    // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  constructor() {

  }
   // --------------------------------------------------------------
  // PUBLIC FUNCTIONS
  // --------------------------------------------------------------


  function createOrganization() public {

  }
  function createNewRaffleContract() public{}
  function createNewTreasuryContract() public {}

    // --------------------------------------------------------------
  // ONLY OWNER FUNCTIONS
  // --------------------------------------------------------------

  function setProtocolFee(uint _protocolFee) public onlyOwner returns(uint){
         require(
            _protocolFee < SCALE
        ) revert FeeOutOfRange();

        protocolFee = _protocolFee;
        return protocolFee;
  }
}
