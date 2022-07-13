pragma solidity 0.8.11;
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Wrapper is AccessControl {

  struct Organization {
    string name, // should we register name on-chain
    address[] contractsDeployed,
  }


  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

event OrganizationCreated(string name);
event RaffleModuleAdded(uint organizationID,address module);
event TreasuryModuleAdded(uint organizationID,address module);

   // --------------------------------------------------------------
  // PUBLIC FUNCTIONS
  // --------------------------------------------------------------


  function registerOrganization() public
  function createNewRaffleContract() public{}
  function createNewTreasuryContract() public {}

    // --------------------------------------------------------------
  // ONLY OWNER FUNCTIONS
  // --------------------------------------------------------------

  function setFees(uint fee) public onlyOwner returns(uint){
    // set organization fee going back to protocol
  }
}
